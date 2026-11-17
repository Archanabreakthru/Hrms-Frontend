// Celestial HRMS Auth Context - strictly typed role-based access
// Integrated with Database-backed Auth Service API
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { CurrentUser, Employee } from '../types/hrms';
import { personaUsers } from '../db/initialData';
import { db, initDatabase, subscribeToDB } from '../db/storage';
import { authApi } from './authApi';

export const Celestial_SESSION_KEY = 'orbyx_hrms_authenticated_user_id';
export const Celestial_ACCESS_TOKEN_KEY = 'orbyx_hrms_access_token';
export const Celestial_REFRESH_TOKEN_KEY = 'orbyx_hrms_refresh_token';

interface AuthContextType {
  currentUser: CurrentUser;
  currentEmployee?: Employee | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  allPersonas: CurrentUser[];
  login: (usernameOrEmail: string, passwordInput: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  canAccessModule: (module: 'hr' | 'organization' | 'clients' | 'service_records' | 'leave' | 'payroll' | 'expenses' | 'assets' | 'attendance' | 'reports' | 'settings') => boolean;
  canViewConfidentialSalary: (targetEmployeeId: string) => boolean;
  canManageOrganization: () => boolean;
  canProcessPayroll: () => boolean;
  canApproveRequestFor: (requesterEmployeeId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function enrichPersonaWithLiveEmployee(persona: CurrentUser): CurrentUser {
  const emp = db.getEmployeeById(persona.employeeId);
  if (!emp) return persona;
  const desig = db.getDesignations().find((d) => d.id === emp.designationId);
  const fullName = `${emp.firstName} ${emp.lastName}`.trim();
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    fullName || persona.name
  )}&background=4f46e5&color=fff&size=256`;
  return {
    ...persona,
    name: fullName || persona.name,
    email: emp.officialEmail || emp.email || persona.email,
    departmentId: emp.departmentId || persona.departmentId,
    designationTitle: desig?.title || persona.designationTitle,
    avatarUrl: emp.avatarUrl && emp.avatarUrl.trim() ? emp.avatarUrl : fallbackAvatar
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeUser, setActiveUser] = useState<CurrentUser | null>(() => {
    initDatabase();
    try {
      const rawUser = localStorage.getItem('celestial_hrms_user_profile');
      if (rawUser) return JSON.parse(rawUser);
    } catch {
      // ignore
    }
    const savedUserId = localStorage.getItem(Celestial_SESSION_KEY);
    if (!savedUserId) return null;

    const exists = personaUsers.find((p) => p.id === savedUserId);
    return exists || null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dbTick, setDbTick] = useState(0);

  useEffect(() => {
    return subscribeToDB(() => {
      setDbTick((t) => t + 1);
    });
  }, []);

  // Live session restoration & verification from backend /auth/me
  useEffect(() => {
    const token = localStorage.getItem(Celestial_ACCESS_TOKEN_KEY);
    if (token) {
      authApi.getMe(token).then((data) => {
        if (data && (data.user || data.id)) {
          const u = data.user || data;
          const role = u.roleCode || u.role || 'employee';
          const restored: CurrentUser = {
            id: u.id,
            name: u.username || u.name || (u.email ? u.email.split('@')[0] : 'Admin'),
            username: u.username,
            email: u.email || '',
            role: role,
            employeeId: u.employeeId || '',
            departmentId: u.departmentId || '',
            designationTitle: role === 'super_admin' ? 'Super Administrator' : (u.designationTitle || (role === 'hr_admin' ? 'HR Manager' : 'Staff')),
            avatarUrl: u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || u.email || 'Admin')}&background=4f46e5&color=fff&size=256`
          };
          setActiveUser(restored);
          localStorage.setItem('celestial_hrms_user_profile', JSON.stringify(restored));
          localStorage.setItem(Celestial_SESSION_KEY, restored.id);
        }
      }).catch(() => {});
    }
  }, []);

  const allPersonas = useMemo(() => {
    void dbTick;
    return personaUsers.map(enrichPersonaWithLiveEmployee);
  }, [dbTick]);

  const currentUser = useMemo(() => {
    if (activeUser) return activeUser;
    // Provide a fallback reference so internal components don't crash before login mounts
    return allPersonas[0];
  }, [activeUser, allPersonas]);

  const currentEmployee = useMemo(() => {
    void dbTick;
    if (!currentUser) return null;
    return db.getEmployeeById(currentUser.employeeId) || null;
  }, [currentUser, dbTick]);

  // True only when a valid session token is established in state
  const isAuthenticated = activeUser !== null;

  // Authenticate using database backend
  const login = async (
    usernameOrEmail: string,
    passwordInput: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    try {
      // 1. Attempt genuine database-backed authentication via API Gateway / Auth Service
      const backendRes = await authApi.login(usernameOrEmail, passwordInput);
      if (backendRes.success && backendRes.user) {
        if (backendRes.accessToken) localStorage.setItem(Celestial_ACCESS_TOKEN_KEY, backendRes.accessToken);
        if (backendRes.refreshToken) localStorage.setItem(Celestial_REFRESH_TOKEN_KEY, backendRes.refreshToken);

        // Verified backend user context
        const u = backendRes.user;
        const role = (u.role || (u as any).roleCode || 'employee') as any;
        const matched: CurrentUser = {
          id: u.id,
          name: u.username || u.name || u.email.split('@')[0],
          username: u.username,
          email: u.email,
          role: role,
          employeeId: u.employeeId || '',
          departmentId: u.departmentId || '',
          designationTitle: role === 'super_admin' ? 'Super Administrator' : (u.designationTitle || (role === 'hr_admin' ? 'HR Manager' : 'Staff')),
          avatarUrl: u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || u.email)}&background=4f46e5&color=fff&size=256`
        };

        setActiveUser(matched);
        localStorage.setItem('celestial_hrms_user_profile', JSON.stringify(matched));
        localStorage.setItem(Celestial_SESSION_KEY, matched.id);

        db.logAudit({
          actorUserId: matched.id,
          actorName: matched.name,
          actorRole: matched.role,
          action: 'LOGIN',
          module: 'SYSTEM',
          entityId: matched.id,
          entityName: matched.name,
          description: `Database-backed login successful for ${matched.name} (${matched.role})`
        });

        return { success: true };
      }

      // Return explicit backend error (e.g. invalid credentials, account locked/suspended)
      return { 
        success: false, 
        error: backendRes.error || 'Authentication failed. Please check your credentials and try again.' 
      };
    } catch (err: any) {
      return { 
        success: false, 
        error: err.message || 'Unable to connect to authentication server. Please check your network connection or contact IT support.' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Secure logout handler
  const logout = () => {
    if (activeUser) {
      db.logAudit({
        actorUserId: activeUser.id,
        actorName: activeUser.name,
        actorRole: activeUser.role,
        action: 'LOGIN',
        module: 'SYSTEM',
        entityId: activeUser.id,
        entityName: activeUser.name,
        description: `User ${activeUser.name} signed out.`
      });
    }

    setActiveUser(null);
    localStorage.removeItem('celestial_hrms_user_profile');
    localStorage.removeItem(Celestial_SESSION_KEY);
    const refreshToken = localStorage.getItem(Celestial_REFRESH_TOKEN_KEY);
    authApi.logout(refreshToken || undefined);
    localStorage.removeItem(Celestial_ACCESS_TOKEN_KEY);
    localStorage.removeItem(Celestial_REFRESH_TOKEN_KEY);
  };

  // Module Access checks (Strictly internal Celestial roles only)
  const canAccessModule = (
    module: 'hr' | 'organization' | 'clients' | 'service_records' | 'leave' | 'payroll' | 'expenses' | 'assets' | 'attendance' | 'reports' | 'settings'
  ): boolean => {
    if (!isAuthenticated || !currentUser) return false;

    const roleLower = String(currentUser.role || '').toLowerCase();
    // Super Admin has root access to all administrative modules
    if (roleLower === 'super_admin' || roleLower === 'admin') {
      return true;
    }

    // HR Admin has full access to all business modules and organization setup
    if (roleLower === 'hr_admin') {
      return true;
    }

    if (roleLower.includes('client') || roleLower.includes('external')) return false;

    if (module === 'settings') return false;
    if (module === 'organization') return roleLower === 'senior_manager';
    if (module === 'clients') return true; // Employees see only their own client assignments in the module.
    if (module === 'service_records') return true; // Access granted to internal roles with role-scoped RBAC within the page.

    if (module === 'reports') {
      return roleLower === 'senior_manager';
    }

    if (roleLower === 'senior_manager') {
      return true;
    }

    if (roleLower === 'reporting_manager') {
      return true;
    }

    if (roleLower === 'employee') {
      return true;
    }

    return false;
  };

  // Field-level access: Salary, Bank info
  const canViewConfidentialSalary = (targetEmployeeId: string): boolean => {
    if (!isAuthenticated || !currentUser) return false;
    const r = String(currentUser.role || '').toLowerCase();
    if (r === 'super_admin' || r === 'admin' || r === 'hr_admin') return true;
    return currentUser.employeeId === targetEmployeeId;
  };

  const canManageOrganization = (): boolean => {
    if (!isAuthenticated || !currentUser) return false;
    const r = String(currentUser.role || '').toLowerCase();
    return r === 'super_admin' || r === 'admin' || r === 'hr_admin';
  };

  const canProcessPayroll = (): boolean => {
    if (!isAuthenticated || !currentUser) return false;
    const r = String(currentUser.role || '').toLowerCase();
    return r === 'super_admin' || r === 'admin' || r === 'hr_admin';
  };

  // Hierarchy check: Manager can approve if employee reports to them. Self-approval strictly forbidden!
  const canApproveRequestFor = (requesterEmployeeId: string): boolean => {
    if (!isAuthenticated || !currentUser) return false;
    if (requesterEmployeeId === currentUser.employeeId) return false; // Self-approval prohibited
    const r = String(currentUser.role || '').toLowerCase();
    if (r === 'super_admin' || r === 'admin' || r === 'hr_admin') return true;
    const requester = db.getEmployeeById(requesterEmployeeId);
    if (!requester) return false;
    return requester.reportingManagerId === currentUser.employeeId;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentEmployee,
        isAuthenticated,
        isLoading,
        allPersonas,
        login,
        logout,
        canAccessModule,
        canViewConfidentialSalary,
        canManageOrganization,
        canProcessPayroll,
        canApproveRequestFor
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
