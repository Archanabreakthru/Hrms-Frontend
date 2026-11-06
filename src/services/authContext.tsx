// Orbyx HRMS Auth Context - strictly typed role-based access
// Updated for Individual User Login & Development Session Management
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { CurrentUser, Employee } from '../types/hrms';
import { personaUsers } from '../db/initialData';
import { db, initDatabase, subscribeToDB } from '../db/storage';
import { validateDevCredentials } from './devCredentials';

export const ORBYX_SESSION_KEY = 'orbyx_hrms_authenticated_user_id';

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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(() => {
    initDatabase();
    // Validate stored development session on application startup
    const savedUserId = localStorage.getItem(ORBYX_SESSION_KEY);
    if (!savedUserId) return null; // No default user!

    // Verify stored user exists in canonical user definitions
    const exists = personaUsers.find((p) => p.id === savedUserId);
    if (!exists) {
      localStorage.removeItem(ORBYX_SESSION_KEY);
      return null;
    }
    return exists.id;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dbTick, setDbTick] = useState(0);

  useEffect(() => {
    return subscribeToDB(() => {
      setDbTick((t) => t + 1);
    });
  }, []);

  const allPersonas = useMemo(() => {
    void dbTick;
    return personaUsers.map(enrichPersonaWithLiveEmployee);
  }, [dbTick]);

  const currentUser = useMemo(() => {
    if (!selectedUserId) {
      // Provide a fallback reference so internal components don't crash before login mounts
      return allPersonas[0];
    }
    return allPersonas.find((p) => p.id === selectedUserId) || allPersonas[0];
  }, [allPersonas, selectedUserId]);

  const currentEmployee = useMemo(() => {
    void dbTick;
    if (!currentUser) return null;
    return db.getEmployeeById(currentUser.employeeId) || null;
  }, [currentUser, dbTick]);

  // True only when a valid session token is established in state
  const isAuthenticated = selectedUserId !== null;

  // Authenticate using individual temporary credentials
  const login = async (
    usernameOrEmail: string,
    passwordInput: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    try {
      // Small simulated async delay for natural UI feel
      await new Promise((resolve) => setTimeout(resolve, 250));

      const validation = validateDevCredentials(usernameOrEmail, passwordInput);
      if (!validation.success || !validation.userId) {
        return { success: false, error: validation.error || 'Authentication failed.' };
      }

      const target = personaUsers.find((p) => p.id === validation.userId);
      if (!target) {
        return { success: false, error: 'User identity record not found in system.' };
      }

      // Validate account status from live employee roster
      const emp = db.getEmployeeById(target.employeeId);
      if (emp && emp.status !== 'Active') {
        return {
          success: false,
          error: `Account for ${target.name} is currently ${emp.status}. Access denied.`
        };
      }

      setSelectedUserId(target.id);
      localStorage.setItem(ORBYX_SESSION_KEY, target.id);

      const enriched = enrichPersonaWithLiveEmployee(target);
      db.logAudit({
        actorUserId: enriched.id,
        actorName: enriched.name,
        actorRole: enriched.role,
        action: 'LOGIN',
        module: 'SYSTEM',
        entityId: enriched.id,
        entityName: enriched.name,
        description: `Individual development login successful for ${enriched.name} (${enriched.role})`
      });

      return { success: true };
    } finally {
      setIsLoading(false);
    }
  };

  // Secure logout handler
  const logout = () => {
    if (selectedUserId) {
      const activeUser = allPersonas.find((p) => p.id === selectedUserId);
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
    }

    setSelectedUserId(null);
    localStorage.removeItem(ORBYX_SESSION_KEY);
  };

  // Module Access checks (Strictly internal Orbyx roles only)
  const canAccessModule = (
    module: 'hr' | 'organization' | 'clients' | 'service_records' | 'leave' | 'payroll' | 'expenses' | 'assets' | 'attendance' | 'reports' | 'settings'
  ): boolean => {
    if (!isAuthenticated) return false;

    const roleLower = String(currentUser.role).toLowerCase();
    if (roleLower.includes('client') || roleLower.includes('external')) return false;
    if (currentUser.role === 'hr_admin') return true;

    if (module === 'settings') return false;
    if (module === 'organization') return currentUser.role === 'senior_manager';
    if (module === 'clients') return true; // Employees see only their own client assignments in the module.
    if (module === 'service_records') return true; // Access granted to internal roles with role-scoped RBAC within the page.

    if (module === 'reports') {
      // Organization-wide Reports and Analytics is strictly for HR Admin and Senior Management (Dr. Selvakumar)
      return currentUser.role === 'senior_manager';
    }

    if (currentUser.role === 'senior_manager') {
      return true;
    }

    if (currentUser.role === 'reporting_manager') {
      return true;
    }

    if (currentUser.role === 'employee') {
      // Employees access self-service views and directory
      return true;
    }

    return false;
  };

  // Field-level access: Salary, Bank info
  const canViewConfidentialSalary = (targetEmployeeId: string): boolean => {
    if (!isAuthenticated) return false;
    if (currentUser.role === 'hr_admin') return true;
    // Employees and managers can view only their own salary
    return currentUser.employeeId === targetEmployeeId;
  };

  const canManageOrganization = (): boolean => {
    return isAuthenticated && currentUser.role === 'hr_admin';
  };

  const canProcessPayroll = (): boolean => {
    return isAuthenticated && currentUser.role === 'hr_admin';
  };

  // Hierarchy check: Manager can approve if employee reports to them. Self-approval strictly forbidden!
  const canApproveRequestFor = (requesterEmployeeId: string): boolean => {
    if (!isAuthenticated) return false;
    if (requesterEmployeeId === currentUser.employeeId) return false; // Self-approval prohibited
    if (currentUser.role === 'hr_admin') return true;
    const requester = db.getEmployeeById(requesterEmployeeId);
    if (!requester) return false;
    // Direct report check
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
