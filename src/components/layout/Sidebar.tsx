import React, { useState, useEffect } from 'react';
import {
  Users,
  CalendarDays,
  CreditCard,
  Receipt,
  Laptop,
  Clock,
  BarChart3,
  Settings,
  LayoutDashboard,
  ShieldCheck,
  Building2,
  BriefcaseBusiness,
  Award,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../services/authContext';
import { attendanceApi } from '../../services/attendanceApi';
import { expenseApi } from '../../services/expenseApi';

export type NavTab = 
  | 'dashboard'
  | 'organization'
  | 'employees'
  | 'service_records'
  | 'clients'
  | 'leave'
  | 'payroll'
  | 'expenses'
  | 'assets'
  | 'attendance'
  | 'policies'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { currentUser, canAccessModule } = useAuth();

  const [pendingLeaves, setPendingLeaves] = useState<number>(0);
  const [pendingCorrections, setPendingCorrections] = useState<number>(0);
  const [pendingExpenses, setPendingExpenses] = useState<number>(0);

  // Fetch genuine pending counts from authoritative backend microservices
  useEffect(() => {
    let isMounted = true;

    async function loadPendingCounts() {
      // Fetch pending leaves
      try {
        const leaves = await attendanceApi.listLeaveApplications({ status: 'Pending' });
        if (isMounted && Array.isArray(leaves)) {
          const count = currentUser.role === 'hr_admin'
            ? leaves.filter((a) => a.status === 'Pending Approval').length
            : leaves.filter((a) => a.approverId === currentUser.employeeId && a.status === 'Pending Approval').length;
          setPendingLeaves(count);
        }
      } catch {
        if (isMounted) setPendingLeaves(0);
      }

      // Fetch pending attendance regularizations
      try {
        const regularizations = await attendanceApi.listRegularizations({ status: 'Pending' });
        if (isMounted && Array.isArray(regularizations)) {
          setPendingCorrections(regularizations.length);
        }
      } catch {
        if (isMounted) setPendingCorrections(0);
      }

      // Fetch pending expense claims
      try {
        const claims = await expenseApi.getClaims({ status: 'Pending Manager Approval' });
        if (isMounted && Array.isArray(claims)) {
          setPendingExpenses(claims.length);
        }
      } catch {
        if (isMounted) setPendingExpenses(0);
      }
    }

    if (currentUser?.id) {
      loadPendingCounts();
    }

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, currentUser?.employeeId, currentUser?.role]);

  const navItems: { id: NavTab; label: string; icon: React.ElementType; badge?: number; access: boolean }[] = [
    {
      id: 'dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      access: true
    },
    {
      id: 'organization',
      label: 'Organization Setup',
      icon: Building2,
      access: canAccessModule('organization')
    },
    {
      id: 'employees',
      label: 'Employee Setup',
      icon: Users,
      access: canAccessModule('hr')
    },
    {
      id: 'clients',
      label: 'Client Management',
      icon: BriefcaseBusiness,
      access: canAccessModule('clients')
    },
    {
      id: 'leave',
      label: 'Leave & Holidays',
      icon: CalendarDays,
      badge: currentUser.role !== 'employee' ? pendingLeaves : undefined,
      access: canAccessModule('leave')
    },
    {
      id: 'attendance',
      label: 'Attendance & Shifts',
      icon: Clock,
      badge: currentUser.role !== 'employee' ? pendingCorrections : undefined,
      access: canAccessModule('attendance')
    },
    {
      id: 'expenses',
      label: 'Expense Claims',
      icon: Receipt,
      badge: currentUser.role !== 'employee' ? pendingExpenses : undefined,
      access: canAccessModule('expenses')
    },
    {
      id: 'payroll',
      label: 'Payroll & Payslips',
      icon: CreditCard,
      access: canAccessModule('payroll')
    },
    {
      id: 'assets',
      label: 'Asset Inventory',
      icon: Laptop,
      access: canAccessModule('assets')
    },
    {
      id: 'policies',
      label: 'Policies',
      icon: ShieldCheck,
      access: true
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      access: canAccessModule('reports')
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Settings,
      access: canAccessModule('settings')
    }
  ];

  return (
    <aside className={`relative ${collapsed ? 'w-[76px]' : 'w-64'} transition-[width] duration-200 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none`}>
      {/* Side-mounted Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-5 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300 shadow-md hover:border-indigo-500 hover:bg-indigo-600 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Brand Header */}
      <div className={`h-16 flex items-center ${collapsed ? 'justify-center px-2' : 'px-6'} border-b border-slate-800 gap-3`}>
        <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
          C
        </div>
        {!collapsed && (
          <div>
            <div className="text-base font-semibold text-white tracking-tight flex items-center gap-1.5">
              <span>Celestial</span>
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-indigo-400 px-1.5 py-0.5 rounded">HRMS</span>
            </div>
            <p className="text-[11px] text-slate-400">Human Resources</p>
          </div>
        )}
      </div>

      {/* Role Pill Banner */}
      <div className={`px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 text-[11px] flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {collapsed ? (
          <ShieldCheck className="h-4 w-4 text-indigo-400" />
        ) : (
          <>
            <span className="text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>Active Role:</span>
            </span>
            <span className="font-medium capitalize text-slate-200">
              {String(currentUser?.role || '').toLowerCase() === 'super_admin'
                ? 'Super Administrator'
                : String(currentUser?.role || '').toLowerCase() === 'admin'
                ? 'Administrator'
                : String(currentUser?.role || '').toLowerCase() === 'hr_admin'
                ? 'HR'
                : String(currentUser?.role || '').toLowerCase() === 'senior_manager'
                ? 'Senior Management'
                : String(currentUser?.role || '').toLowerCase() === 'reporting_manager'
                ? 'Reporting Manager'
                : 'Employee'}
            </span>
          </>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => item.access)
          .map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!collapsed && <span>{item.label}</span>}
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-semibold rounded-full ${
                      isActive ? 'bg-white text-indigo-700' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
      </nav>

      {/* Footer Profile card */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-2'} py-2`}>
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{currentUser.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{currentUser.designationTitle}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
