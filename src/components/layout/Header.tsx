import React from 'react';
import { UserProfileDropdown } from './UserProfileDropdown';
import { NotificationDropdown } from './NotificationDropdown';
import { GlobalAttendanceAction } from '../attendance/GlobalAttendanceAction';
import { ExternalLink } from 'lucide-react';
import { NavTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavTab;
  onNavigate?: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate }) => {
  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: { title: 'Executive Overview', subtitle: 'Workforce operational metrics and daily status' },
    organization: { title: 'Organization Setup', subtitle: 'Legal entity, branches, departments, designations & governance structure' },
    employees: { title: 'Employee Setup', subtitle: 'Employee directory, my reportees & reporting hierarchy' },
    service_records: { title: 'Service Records & Milestones', subtitle: 'Career milestones, appointments, confirmations, promotions, transfers & work anniversaries' },
    clients: { title: 'Client Management', subtitle: 'Client organizations, employee deployments, assignment lifecycle & 2-stage attendance verification' },
    leave: { title: 'Leave & Absence Management', subtitle: 'Leave applications, approvals, balance ledgers & calendar' },
    attendance: { title: 'Shifts & Attendance', subtitle: 'Check-in/check-out station, manual attendance entries, corrections & shift schedules' },
    expenses: { title: 'Expense Management', subtitle: 'Employee reimbursement claims, salary advances, travel petty cash & payouts' },
    payroll: { title: 'Payroll & Compensation', subtitle: 'Salary structures, monthly processing, MD approval, payslips & statutory compliance' },
    assets: { title: 'Asset Management', subtitle: 'Hardware, email accounts, software licenses, subscriptions & access lifecycle' },
    policies: { title: 'Enterprise Policies & Rules Hub', subtitle: 'Centralized HR, leave, attendance, payroll, statutory, expense & asset rules' },
    reports: { title: 'Operational Analytics & Reports', subtitle: 'Aggregated cross-module exports and statutory summaries' },
    settings: { title: 'System Settings & Governance', subtitle: 'User accounts, RBAC matrix, system preferences & audit logs' }
  };

  const currentMeta = titles[currentTab] || { title: 'Dashboard', subtitle: 'HRMS' };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold text-slate-900 tracking-tight truncate">{currentMeta.title}</h1>
        </div>
        <p className="text-[11px] text-slate-500 hidden sm:block truncate">{currentMeta.subtitle}</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* External Client Manager Portal Access Button */}
        <a
          href="#client-portal/login"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold transition-all shadow-2xs"
          title="Open Client Manager Attendance Verification Portal"
        >
          <ExternalLink className="h-3.5 w-3.5 text-purple-600" />
          <span className="hidden lg:inline">Client Portal</span>
          <span className="lg:hidden">Portal</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-200 text-purple-900">Preview</span>
        </a>

        {/* Global Attendance Check-in / Check-out Component */}
        <GlobalAttendanceAction />

        {/* Notifications Dropdown */}
        <NotificationDropdown />

        {/* Authenticated User Profile & Logout Dropdown (Replaces PersonaSwitcher) */}
        <UserProfileDropdown />
      </div>
    </header>
  );
};

