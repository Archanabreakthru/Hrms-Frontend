import React from 'react';
import { useAuth } from '../../services/authContext';
import { HRDashboard } from './HRDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { EmployeeDashboard } from './EmployeeDashboard';
import { NavTab } from '../layout/Sidebar';
import { NavigationContext } from '../../types/hrms';

interface DashboardHubProps {
  onNavigate: (tab: NavTab, context?: NavigationContext) => void;
  onOpenApplyLeave?: () => void;
  onOpenSubmitExpense?: () => void;
}

export const DashboardHub: React.FC<DashboardHubProps> = ({
  onNavigate,
  onOpenApplyLeave,
  onOpenSubmitExpense
}) => {
  const { currentUser } = useAuth();
  const roleLower = String(currentUser?.role || '').toLowerCase();

  if (roleLower === 'hr_admin' || roleLower === 'super_admin' || roleLower === 'admin') {
    return <HRDashboard onNavigate={onNavigate} />;
  }

  if (roleLower === 'senior_manager' || roleLower === 'reporting_manager') {
    return <ManagerDashboard onNavigate={onNavigate} />;
  }

  return (
    <EmployeeDashboard
      onNavigate={onNavigate}
      onOpenApplyLeave={onOpenApplyLeave}
      onOpenSubmitExpense={onOpenSubmitExpense}
    />
  );
};

