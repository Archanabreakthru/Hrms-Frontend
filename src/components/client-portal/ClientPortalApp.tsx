// Orbyx HRMS - Client Portal Root Container (Revised Specification)
// Direct flow: Client Manager Login -> One Single Attendance Verification Page
import React, { useState } from 'react';
import { ClientManagerProfile, DEFAULT_CLIENT_MANAGER } from './mockClientData';
import { ClientManagerLogin } from './ClientManagerLogin';
import { ClientManagerAttendanceVerification } from './ClientManagerAttendanceVerification';

const CLIENT_MANAGER_SESSION_KEY = 'orbyx_client_manager_session';

interface ClientPortalAppProps {
  onReturnToHRMS?: () => void;
}

export const ClientPortalApp: React.FC<ClientPortalAppProps> = ({ onReturnToHRMS }) => {
  const [currentManager, setCurrentManager] = useState<ClientManagerProfile | null>(() => {
    try {
      const raw = localStorage.getItem(CLIENT_MANAGER_SESSION_KEY);
      if (raw) {
        return JSON.parse(raw) as ClientManagerProfile;
      }
    } catch {
      // Ignore parse failure
    }
    return null;
  });

  const handleLoginSuccess = (mgr: ClientManagerProfile) => {
    localStorage.setItem(CLIENT_MANAGER_SESSION_KEY, JSON.stringify(mgr));
    setCurrentManager(mgr);
    try {
      window.history.pushState(null, '', '#client-portal');
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(CLIENT_MANAGER_SESSION_KEY);
    setCurrentManager(null);
    try {
      window.history.pushState(null, '', '#client-portal/login');
    } catch {
      // ignore
    }
  };

  if (!currentManager) {
    return (
      <ClientManagerLogin
        onLoginSuccess={handleLoginSuccess}
        onReturnToHRMS={onReturnToHRMS}
      />
    );
  }

  return (
    <ClientManagerAttendanceVerification
      manager={currentManager}
      onLogout={handleLogout}
      onReturnToHRMS={onReturnToHRMS}
    />
  );
};
