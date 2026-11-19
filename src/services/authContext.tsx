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
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        const isBootstrap =
          parsed.role === 'super_admin' ||
          parsed.username === 'bootstrap_admin' ||
          parsed.email === 'arunarchana2034@gmail.com' ||
          parsed.email === 'admin@orbyx.internal';
        if (isBootstrap) {
          parsed.name = 'Bootstrap Administrator';
          parsed.username = 'bootstrap_admin';
          parsed.avatarUrl = 'https://ui-avatars.com/api/?name=Bootstrap+Administrator&background=4f46e5&color=fff&size=256';
        }
        return parsed;
      }
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
          const isBootstrap =
            role === 'super_admin' ||
            u.username === 'bootstrap_admin' ||
            u.email === 'arunarchana2034@gmail.com' ||
            u.email === 'admin@orbyx.internal';

          const resolvedName = isBootstrap
            ? 'Bootstrap Administrator'
            : (u.name || u.username || (u.email ? u.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Admin'));

          const restored: CurrentUser = {
            id: u.id,
            name: resolvedName,
            username: u.username || (isBootstrap ? 'bootstrap_admin' : undefined),
            email: u.email || '',
            role: role,
            employeeId: u.employeeId || '',
            departmentId: u.departmentId || '',
            designationTitle: role === 'super_admin' ? 'Super Administrator' : (u.designationTitle || (role === 'hr_admin' ? 'HR Manager' : 'Staff')),
            avatarUrl: isBootstrap
              ? 'https://ui-avatars.com/api/?name=Bootstrap+Administrator&background=4f46e5&color=fff&size=256'
              : (u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(resolvedName)}&background=4f46e5&color=fff&size=256`),
            permissions: u.permissions || (data as any).permissions || []
          };
          setActiveUser(restored);
          localStorage.setItem('celestial_hrms_user_profile', JSON.stringify(restored));
          localStorage.setItem(Celestial_SESSION_KEY, restored.id);
        }
      }).catch((err: any) => {
        if (err?.status === 401 || err?.code === 'UNAUTHORIZED' || err?.message?.includes('expired')) {
          setActiveUser(null);
          localStorage.removeItem('celestial_hrms_user_profile');
          localStorage.removeItem(Celestial_SESSION_KEY);
          localStorage.removeItem(Celestial_ACCESS_TOKEN_KEY);
          localStorage.removeItem(Celestial_REFRESH_TOKEN_KEY);
        }
      });
    }

    const onSessionExpired = () => {
      setActiveUser(null);
      localStorage.removeItem('celestial_hrms_user_profile');
      localStorage.removeItem(Celestial_SESSION_KEY);
      localStorage.removeItem(Celestial_ACCESS_TOKEN_KEY);
      localStorage.removeItem(Celestial_REFRESH_TOKEN_KEY);
    };
    window.addEventListener('orbyx:session_expired', onSessionExpired);
    return () => window.removeEventListener('orbyx:session_expired', onSessionExpired);
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
        const isBootstrap =
          role === 'super_admin' ||
          u.username === 'bootstrap_admin' ||
          u.email === 'arunarchana2034@gmail.com' ||
          u.email === 'admin@orbyx.internal';

        const resolvedName = isBootstrap
          ? 'Bootstrap Administrator'
          : (u.name || u.username || (u.email ? u.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Admin'));

        const matched: CurrentUser = {
          id: u.id,
          name: resolvedName,
          username: u.username || (isBootstrap ? 'bootstrap_admin' : undefined),
          email: u.email,
          role: role,
          employeeId: u.employeeId || '',
          departmentId: u.departmentId || '',
          designationTitle: role === 'super_admin' ? 'Super Administrator' : (u.designationTitle || (role === 'hr_admin' ? 'HR Manager' : 'Staff')),
          avatarUrl: isBootstrap
            ? 'https://ui-avatars.com/api/?name=Bootstrap+Administrator&background=4f46e5&color=fff&size=256'
            : (u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(resolvedName)}&background=4f46e5&color=fff&size=256`),
          permissions: (u as any).permissions || []
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

  // Module Access checks (Dynamic permissions + built-in fallback)
  const canAccessModule = (
    module: 'hr' | 'organization' | 'clients' | 'service_records' | 'leave' | 'payroll' | 'expenses' | 'assets' | 'attendance' | 'reports' | 'settings'
  ): boolean => {
    if (!isAuthenticated || !currentUser) return false;

    const roleLower = String(currentUser.role || '').toLowerCase();
    // Super Admin has root access to all administrative modules
    if (roleLower === 'super_admin' || roleLower === 'admin') {
      return true;
    }

    // Dynamic role permission evaluation
    if (currentUser.permissions && currentUser.permissions.length > 0) {
      if (currentUser.permissions.includes('*')) return true;
      const perms = currentUser.permissions;

      switch (module) {
        case 'organization':
          return perms.some((p) => p.startsWith('org.') || p.startsWith('system.'));
        case 'hr':
          return perms.some((p) => p.startsWith('employee.'));
        case 'attendance':
          return perms.some((p) => p.startsWith('attendance.'));
        case 'leave':
          return perms.some((p) => p.startsWith('leave.'));
        case 'payroll':
          return perms.some((p) => p.startsWith('payroll.'));
        case 'expenses':
          return perms.some((p) => p.startsWith('expense.'));
        case 'assets':
          return perms.some((p) => p.startsWith('asset.'));
        case 'clients':
          return perms.some((p) => p.startsWith('client.'));
        case 'service_records':
          return perms.some((p) => p.includes('service_records') || p.startsWith('employee.'));
        case 'reports':
          return perms.some((p) => p.includes('report') || p.startsWith('payroll.') || p.startsWith('attendance.'));
        case 'settings':
          return perms.some((p) => p.startsWith('system.') || p.startsWith('auth.'));
      }
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
    if (currentUser.permissions?.some((p) => p === 'employee.salary.read' || p === '*')) return true;
    return currentUser.employeeId === targetEmployeeId;
  };

  const canManageOrganization = (): boolean => {
    if (!isAuthenticated || !currentUser) return false;
    const r = String(currentUser.role || '').toLowerCase();
    if (r === 'super_admin' || r === 'admin' || r === 'hr_admin') return true;
    if (currentUser.permissions?.some((p) => p.startsWith('org.') || p === '*')) return true;
    return false;
  };

  const canProcessPayroll = (): boolean => {
    if (!isAuthenticated || !currentUser) return false;
    const r = String(currentUser.role || '').toLowerCase();
    if (r === 'super_admin' || r === 'admin' || r === 'hr_admin') return true;
    if (currentUser.permissions?.some((p) => p === 'payroll.process' || p.startsWith('payroll.') || p === '*')) return true;
    return false;
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
