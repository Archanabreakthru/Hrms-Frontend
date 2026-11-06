// Orbyx HRMS - Client Manager Attendance Verification UI
// Single-page interface matching the exact design specification
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  Search,
  Building2,
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  X,
  Info,
  LogOut,
  AlertCircle
} from 'lucide-react';
import {
  ClientManagerProfile,
  ClientDeployedEmployee,
  ClientAttendanceDay,
  REPORTING_PERIODS,
  INITIAL_CLIENT_EMPLOYEES
} from './mockClientData';
import { clientAttendanceIntegration } from '../clients/clientAttendanceIntegration';

interface ClientManagerAttendanceVerificationProps {
  manager: ClientManagerProfile;
  onLogout: () => void;
  onReturnToHRMS?: () => void;
}

export const ClientManagerAttendanceVerification: React.FC<ClientManagerAttendanceVerificationProps> = ({
  manager,
  onLogout,
  onReturnToHRMS
}) => {
  // Sync tick for reactive integration store subscriptions
  const [, setSyncTick] = useState(0);

  // Compute live scoped employees & attendance days from clientAttendanceIntegration
  const buildScopedEmployees = useCallback((): ClientDeployedEmployee[] => {
    // 1. Resolve supervisor and client organizations
    const targetSupervisorId = manager.supervisorId || manager.id;
    const targetClientId = manager.clientId;

    // 2. Retrieve deployments assigned to this client and supervisor
    const allDeployments = clientAttendanceIntegration.getDeployments();
    const clientDeployments = allDeployments.filter((d) => {
      if (targetClientId && d.clientId !== targetClientId) return false;
      if (targetSupervisorId && d.clientSupervisorId && d.clientSupervisorId !== targetSupervisorId) {
        // If assigned specifically to another supervisor under the same client, filter out
        return false;
      }
      return true;
    });

    // 3. Retrieve verifications for this supervisor / client
    const allVerifs = clientAttendanceIntegration.getVerifications();
    const scopedVerifs = allVerifs.filter((v) => {
      if (targetClientId && v.clientId !== targetClientId) return false;
      if (targetSupervisorId && v.supervisorId && v.supervisorId !== targetSupervisorId) {
        return false;
      }
      return true;
    });

    // If no deployments or verifications exist for this supervisor yet, fallback to default seed employees
    if (clientDeployments.length === 0 && scopedVerifs.length === 0) {
      return INITIAL_CLIENT_EMPLOYEES;
    }

    // Map each deployed employee
    const employeeMap = new Map<string, ClientDeployedEmployee>();

    // Seed from deployments
    clientDeployments.forEach((dep) => {
      if (!employeeMap.has(dep.employeeId)) {
        const initials = (dep.employeeName || dep.employeeId)
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();

        employeeMap.set(dep.employeeId, {
          id: dep.employeeId,
          name: dep.employeeName || dep.employeeId,
          initials,
          avatarBgColor: 'bg-indigo-100 text-indigo-700',
          role: dep.project || 'Deployed Specialist',
          status: 'Pending',
          period: 'Mar 01 - 15, 2025',
          records: []
        });
      }
    });

    // Add verification records
    scopedVerifs.forEach((v) => {
      let emp = employeeMap.get(v.employeeId);
      if (!emp) {
        const initials = v.employeeName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();

        emp = {
          id: v.employeeId,
          name: v.employeeName,
          initials,
          avatarBgColor: 'bg-purple-100 text-purple-700',
          role: v.shiftName || 'Client Deployed Specialist',
          status: 'Pending',
          period: 'Mar 01 - 15, 2025',
          records: []
        };
        employeeMap.set(v.employeeId, emp);
      }

      const dayStatus: 'Verified' | 'Pending' | 'Rejected' =
        v.verificationStatus === 'Client Approved' ||
        v.verificationStatus === 'Pending HR Verification' ||
        v.verificationStatus === 'HR Approved'
          ? 'Verified'
          : v.verificationStatus === 'Client Rejected' || v.verificationStatus === 'HR Rejected'
          ? 'Rejected'
          : 'Pending';

      emp.records.push({
        id: v.id, // Linked directly to verification record ID
        date: v.attendanceDate,
        displayDate: `${v.attendanceDate} (${v.shiftName.split(' ')[0] || 'Shift'})`,
        attendance: 'Present',
        workingHours: `${v.workingHours} hrs`,
        status: dayStatus,
        rejectionReason: v.supervisorRemarks
      });
    });

    // Recompute overall status for each employee
    const result: ClientDeployedEmployee[] = [];
    employeeMap.forEach((emp) => {
      if (emp.records.length > 0) {
        if (emp.records.some((r) => r.status === 'Rejected')) {
          emp.status = 'Rejected';
        } else if (emp.records.some((r) => r.status === 'Pending')) {
          emp.status = 'Pending';
        } else {
          emp.status = 'Verified';
        }
      } else {
        emp.status = 'Verified';
      }
      result.push(emp);
    });

    return result.length > 0 ? result : INITIAL_CLIENT_EMPLOYEES;
  }, [manager]);

  // State for employees list and their individual daily records
  const [employees, setEmployees] = useState<ClientDeployedEmployee[]>(() => buildScopedEmployees());

  // Subscribe to changes in clientAttendanceIntegration
  useEffect(() => {
    const unsubscribe = clientAttendanceIntegration.subscribe(() => {
      setEmployees(buildScopedEmployees());
      setSyncTick((t) => t + 1);
    });
    return unsubscribe;
  }, [buildScopedEmployees]);

  // Selected reporting period
  const [selectedPeriod, setSelectedPeriod] = useState<string>(REPORTING_PERIODS[0].id);

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected employee for the attendance detail view (null initially so list stays centered until "View" is clicked)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Pagination for Employee list (6 per page as per screenshot: "Showing 1 - 6 of 12 employees")
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 6;

  // Selected days checkbox state for bulk actions within detail panel (defaults to all days selected)
  const [selectedDayIds, setSelectedDayIds] = useState<Record<string, boolean>>({});

  // Rejection modal state (for single day or bulk rejection)
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    mode: 'single' | 'bulk';
    recordId?: string;
    recordDate?: string;
    employeeName?: string;
  }>({ isOpen: false, mode: 'single' });
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [rejectionError, setRejectionError] = useState<string>('');

  // Profile dropdown menu state
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);

  // Status toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Helper to persist employee state
  const saveEmployeesState = (updated: ClientDeployedEmployee[]) => {
    setEmployees(updated);
    try {
      localStorage.setItem('orbyx_client_manager_employees', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Calculate overall summary statistics dynamically
  const summaryMetrics = useMemo(() => {
    const totalEmployees = employees.length;
    let verifiedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;

    employees.forEach((emp) => {
      if (emp.status === 'Verified') verifiedCount++;
      else if (emp.status === 'Rejected') rejectedCount++;
      else pendingCount++;
    });

    return {
      totalEmployees,
      verifiedCount,
      pendingCount,
      rejectedCount
    };
  }, [employees]);

  // Filtered employees based on search query
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  // Paginated employees
  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  // Selected employee object (only defined when user explicitly clicks "View")
  const currentEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employees.find((e) => e.id === selectedEmployeeId) || null;
  }, [employees, selectedEmployeeId]);

  // Initialize selected days when switching employee
  React.useEffect(() => {
    if (currentEmployee) {
      const initialMap: Record<string, boolean> = {};
      currentEmployee.records.forEach((r) => {
        initialMap[r.id] = true; // default select all
      });
      setSelectedDayIds(initialMap);
    }
  }, [currentEmployee?.id]);

  // Recalculate parent employee status from daily records
  const computeEmployeeOverallStatus = (records: ClientAttendanceDay[]): 'Verified' | 'Pending' | 'Rejected' => {
    if (records.some((r) => r.status === 'Rejected')) return 'Rejected';
    if (records.some((r) => r.status === 'Pending')) return 'Pending';
    return 'Verified';
  };

  // Handler: Individual Accept Day Record
  const handleAcceptSingleDay = (dayId: string) => {
    if (!currentEmployee) return;

    // Synchronize to shared in-memory integration store
    clientAttendanceIntegration.handleClientSupervisorDecision(
      dayId,
      'Approved',
      'Verified in Client Supervisor Portal',
      manager.name
    );

    const updatedEmployees = employees.map((emp) => {
      if (emp.id !== currentEmployee.id) return emp;
      const updatedRecords = emp.records.map((r) => {
        if (r.id === dayId) {
          return { ...r, status: 'Verified' as const, rejectionReason: undefined };
        }
        return r;
      });
      return {
        ...emp,
        records: updatedRecords,
        status: computeEmployeeOverallStatus(updatedRecords)
      };
    });

    saveEmployeesState(updatedEmployees);
    showToast(`Attendance verified for ${currentEmployee.name}`);
  };

  // Open Rejection Modal for Single Day
  const handleOpenRejectSingleDay = (day: ClientAttendanceDay) => {
    if (!currentEmployee) return;
    setRejectModal({
      isOpen: true,
      mode: 'single',
      recordId: day.id,
      recordDate: day.displayDate,
      employeeName: currentEmployee.name
    });
    setRejectionReasonInput('');
    setRejectionError('');
  };

  // Open Rejection Modal for Bulk Decline
  const handleOpenRejectBulk = () => {
    if (!currentEmployee) return;
    const pendingCount = currentEmployee.records.filter((r) => r.status === 'Pending').length;
    if (pendingCount === 0) {
      showToast('No pending attendance records to decline for this employee.');
      return;
    }
    setRejectModal({
      isOpen: true,
      mode: 'bulk',
      employeeName: currentEmployee.name
    });
    setRejectionReasonInput('');
    setRejectionError('');
  };

  // Confirm Rejection Submission
  const handleConfirmRejection = () => {
    if (!rejectionReasonInput.trim()) {
      setRejectionError('Rejection reason is required.');
      return;
    }

    if (!currentEmployee) return;

    if (rejectModal.mode === 'single' && rejectModal.recordId) {
      // Synchronize single rejection to shared integration store
      clientAttendanceIntegration.handleClientSupervisorDecision(
        rejectModal.recordId,
        'Rejected',
        rejectionReasonInput.trim(),
        manager.name
      );

      const updatedEmployees = employees.map((emp) => {
        if (emp.id !== currentEmployee.id) return emp;
        const updatedRecords = emp.records.map((r) => {
          if (r.id === rejectModal.recordId) {
            return {
              ...r,
              status: 'Rejected' as const,
              rejectionReason: rejectionReasonInput.trim()
            };
          }
          return r;
        });
        return {
          ...emp,
          records: updatedRecords,
          status: computeEmployeeOverallStatus(updatedRecords)
        };
      });

      saveEmployeesState(updatedEmployees);
      showToast(`Record marked Rejected with reason.`);
    } else if (rejectModal.mode === 'bulk') {
      // Bulk reject only pending records
      currentEmployee.records
        .filter((r) => r.status === 'Pending')
        .forEach((r) => {
          clientAttendanceIntegration.handleClientSupervisorDecision(
            r.id,
            'Rejected',
            rejectionReasonInput.trim(),
            manager.name
          );
        });

      const updatedEmployees = employees.map((emp) => {
        if (emp.id !== currentEmployee.id) return emp;
        const updatedRecords = emp.records.map((r) => {
          if (r.status === 'Pending') {
            return {
              ...r,
              status: 'Rejected' as const,
              rejectionReason: rejectionReasonInput.trim()
            };
          }
          return r;
        });
        return {
          ...emp,
          records: updatedRecords,
          status: computeEmployeeOverallStatus(updatedRecords)
        };
      });

      saveEmployeesState(updatedEmployees);
      showToast(`All pending records marked Rejected for ${currentEmployee.name}.`);
    }

    setRejectModal({ isOpen: false, mode: 'single' });
  };

  // Handler: Bulk Accept All pending records for selected employee
  const handleBulkAcceptAll = () => {
    if (!currentEmployee) return;

    const pendingRecords = currentEmployee.records.filter((r) => r.status === 'Pending');
    if (pendingRecords.length === 0) {
      showToast('All records for this employee are already verified.');
      return;
    }

    // Synchronize bulk approvals to shared integration store
    pendingRecords.forEach((r) => {
      clientAttendanceIntegration.handleClientSupervisorDecision(
        r.id,
        'Approved',
        'Bulk verified in Client Supervisor Portal',
        manager.name
      );
    });

    const updatedEmployees = employees.map((emp) => {
      if (emp.id !== currentEmployee.id) return emp;
      const updatedRecords = emp.records.map((r) => {
        // Bulk action affects only pending records
        if (r.status === 'Pending') {
          return { ...r, status: 'Verified' as const, rejectionReason: undefined };
        }
        return r;
      });
      return {
        ...emp,
        records: updatedRecords,
        status: computeEmployeeOverallStatus(updatedRecords)
      };
    });

    saveEmployeesState(updatedEmployees);
    showToast(`Accepted ${pendingRecords.length} pending record(s) for ${currentEmployee.name}`);
  };

  // Toggle individual day checkbox
  const toggleDayCheckbox = (dayId: string) => {
    setSelectedDayIds((prev) => ({
      ...prev,
      [dayId]: !prev[dayId]
    }));
  };

  // Toggle all checkboxes
  const toggleAllDaysCheckbox = () => {
    if (!currentEmployee) return;
    const allSelected = currentEmployee.records.every((r) => selectedDayIds[r.id]);
    const newMap: Record<string, boolean> = {};
    currentEmployee.records.forEach((r) => {
      newMap[r.id] = !allSelected;
    });
    setSelectedDayIds(newMap);
  };

  const isAllDaysChecked = useMemo(() => {
    if (!currentEmployee || currentEmployee.records.length === 0) return false;
    return currentEmployee.records.every((r) => selectedDayIds[r.id]);
  }, [currentEmployee, selectedDayIds]);

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-900 pb-12 antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-medium shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP NAVBAR - EXACT REFERENCE HEADER */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 px-6 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          {/* Left: Logo & Portal Badge */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-purple-700 flex items-center justify-center text-white font-black text-base shadow-sm">
              A
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">HRMS</span>
            <div className="h-4 w-px bg-slate-300 mx-1" />
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
              Client Portal
            </span>
          </div>

          {/* Right: Company Name & Client Manager Profile */}
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Building2 className="h-4 w-4 text-slate-500" />
              <span>{manager.companyName}</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs border border-purple-200">
                  {manager.avatarInitials}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight">{manager.name}</div>
                  <div className="text-[11px] text-slate-500 leading-tight">{manager.roleTitle}</div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {/* Profile dropdown menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-slate-100 py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-bold text-slate-800">{manager.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{manager.email}</p>
                    <p className="text-[10px] text-purple-700 font-medium mt-1">{manager.companyName}</p>
                  </div>
                  {onReturnToHRMS && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onReturnToHRMS();
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>Return to Internal HRMS</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN VIEWPORT CONTAINER */}
      <div className="max-w-[1400px] mx-auto px-6 pt-6 space-y-6">
        {/* TITLE HEADER & REPORTING PERIOD DROPDOWN */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Employee Attendance Verification
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and verify the attendance and working hours updated by employees.
            </p>
          </div>

          {/* Reporting Period Selector */}
          <div className="relative inline-block text-left">
            <div className="inline-flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl px-3.5 py-2 shadow-2xs hover:border-slate-300 transition-colors">
              <Calendar className="h-4 w-4 text-slate-600" />
              <select
                value={selectedPeriod}
                onChange={(e) => {
                  setSelectedPeriod(e.target.value);
                  showToast(`Switched view to ${e.target.options[e.target.selectedIndex].text}`);
                }}
                className="bg-transparent text-xs font-semibold text-slate-800 pr-4 focus:outline-none cursor-pointer appearance-none"
              >
                {REPORTING_PERIODS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 pointer-events-none -ml-3" />
            </div>
          </div>
        </div>

        {/* 4 SUMMARY STAT CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Employees */}
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-2xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Total Employees</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{summaryMetrics.totalEmployees}</div>
            </div>
          </div>

          {/* Verified */}
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-2xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Verified</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{summaryMetrics.verifiedCount}</div>
            </div>
          </div>

          {/* Pending */}
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-2xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Pending</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{summaryMetrics.pendingCount}</div>
            </div>
          </div>

          {/* Rejected */}
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-2xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Rejected</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{summaryMetrics.rejectedCount}</div>
            </div>
          </div>
        </div>

        {/* WORKSPACE: FULL-WIDTH MATCHING CARDS WHEN NO EMPLOYEE SELECTED; TWO COLUMNS WHEN VIEWED */}
        <div className={currentEmployee ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" : "w-full"}>
          {/* EMPLOYEES TABLE PANEL */}
          <div className={`${currentEmployee ? "lg:col-span-5" : "w-full"} bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all duration-300`}>
            {/* Header with count and search */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">
                Employees ({filteredEmployees.length})
              </h2>

              <div className="relative w-48 sm:w-64">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search employee..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600 focus:bg-white transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-100 font-semibold">
                    <th className="py-2.5 pl-4 pr-1 w-8">#</th>
                    <th className="py-2.5 px-3">Employee Name</th>
                    <th className="py-2.5 px-3">Role / Designation</th>
                    <th className="py-2.5 px-3">Status (Mar 01 - 15)</th>
                    <th className="py-2.5 pr-4 pl-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No employees found matching &quot;{searchQuery}&quot;
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployees.map((emp, idx) => {
                      const absoluteIndex = (currentPage - 1) * pageSize + idx + 1;
                      const isSelected = emp.id === currentEmployee?.id;

                      return (
                        <tr
                          key={emp.id}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-purple-50/70 font-medium'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3 pl-4 pr-1 text-slate-500">{absoluteIndex}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                  emp.avatarBgColor || 'bg-purple-100 text-purple-700'
                                }`}
                              >
                                {emp.initials}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 leading-tight">
                                  {emp.name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {emp.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {emp.role}
                          </td>
                          <td className="py-3 px-3">
                            {emp.status === 'Verified' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Verified
                              </span>
                            )}
                            {emp.status === 'Pending' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Pending
                              </span>
                            )}
                            {emp.status === 'Rejected' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                Rejected
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-4 pl-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                // Toggle view detail: if already selected, close it back to center; otherwise open view
                                if (isSelected) {
                                  setSelectedEmployeeId(null);
                                } else {
                                  setSelectedEmployeeId(emp.id);
                                }
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-700 text-white border-purple-700 shadow-sm ring-2 ring-purple-300'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700'
                              }`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>{isSelected ? 'Viewing' : 'View'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {paginatedEmployees.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
                {Math.min(currentPage * pageSize, filteredEmployees.length)} of {filteredEmployees.length} employees
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5 text-slate-600" />
                </button>

                {Array.from({ length: totalPages }).map((_, i) => {
                  const pNum = i + 1;
                  const isActive = pNum === currentPage;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setCurrentPage(pNum)}
                      className={`h-7 w-7 rounded-lg text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-purple-700 text-white'
                          : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: SELECTED EMPLOYEE ATTENDANCE DETAIL PANEL - ONLY SHOWN WHEN AN EMPLOYEE IS VIEWED */}
          {currentEmployee && (
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              {/* Employee Header Profile in Card with Close Action */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      currentEmployee.avatarBgColor || 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {currentEmployee.initials}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      {currentEmployee.name}
                    </h3>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{currentEmployee.role}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-400">{currentEmployee.id}</span>
                    </div>
                  </div>
                </div>

                {/* Period tag & Close Detail Button */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>{currentEmployee.period}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEmployeeId(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Close detail view and return to full centered employee list"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Section Title & Bulk Actions Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                <h4 className="text-sm font-bold text-slate-900">
                  Attendance &amp; Working Hours ({currentEmployee.records.length} Days)
                </h4>

                {/* Bulk Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBulkAcceptAll}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Accept All</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenRejectBulk}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5 text-rose-700" />
                    <span>Decline All</span>
                  </button>
                </div>
              </div>

              {/* Daily Attendance Table */}
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                      <th className="py-2.5 pl-3 pr-2 w-8">
                        <input
                          type="checkbox"
                          checked={isAllDaysChecked}
                          onChange={toggleAllDaysCheckbox}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Attendance</th>
                      <th className="py-2.5 px-3">Working Hours</th>
                      <th className="py-2.5 pr-3 pl-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentEmployee.records.map((day) => {
                      const isChecked = !!selectedDayIds[day.id];
                      const isVerified = day.status === 'Verified';
                      const isRejected = day.status === 'Rejected';

                      return (
                        <tr
                          key={day.id}
                          className={`transition-colors ${
                            isRejected
                              ? 'bg-rose-50/40'
                              : isChecked
                              ? 'bg-white'
                              : 'bg-slate-50/50'
                          }`}
                        >
                          <td className="py-2.5 pl-3 pr-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleDayCheckbox(day.id)}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {day.displayDate}
                            {day.rejectionReason && (
                              <div className="text-[10px] text-rose-600 mt-0.5 italic flex items-center gap-1">
                                <span>Reason: &quot;{day.rejectionReason}&quot;</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {day.attendance === 'Present' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Present
                              </span>
                            )}
                            {day.attendance === 'Leave' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Leave
                              </span>
                            )}
                            {day.attendance !== 'Present' && day.attendance !== 'Leave' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                {day.attendance}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            {day.workingHours}
                          </td>
                          <td className="py-2.5 pr-3 pl-3 text-right">
                            {isVerified ? (
                              <div className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <Check className="h-3 w-3" />
                                <span>Accepted</span>
                              </div>
                            ) : isRejected ? (
                              <div className="inline-flex items-center gap-1 text-rose-700 font-semibold text-[11px] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                <X className="h-3 w-3" />
                                <span>Declined</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleAcceptSingleDay(day.id)}
                                  className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-semibold transition-all cursor-pointer"
                                >
                                  <Check className="h-3 w-3 text-emerald-700" />
                                  <span>Accept</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectSingleDay(day)}
                                  className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-semibold transition-all cursor-pointer"
                                >
                                  <X className="h-3 w-3 text-rose-700" />
                                  <span>Decline</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Informational Callout matching reference screenshot bottom notice */}
              <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-purple-900">
                <Info className="h-4 w-4 text-purple-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Your verification actions (Accept/Decline) are automatically reflected in the HRMS for the HR team.
                  <span className="block text-[11px] text-purple-700/80 mt-0.5 font-normal">
                    Prototype note: Verification actions are demonstrated using local mock data. Shared HRMS updates will be enabled during backend integration.
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* REJECTION REASON MODAL (MANDATORY REASON REQUIREMENT) */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-base">
                <AlertCircle className="h-5 w-5" />
                <span>
                  {rejectModal.mode === 'single'
                    ? 'Decline Attendance Record'
                    : 'Decline All Pending Records'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setRejectModal({ isOpen: false, mode: 'single' })}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {rejectModal.mode === 'single' ? (
                <>
                  You are declining attendance for{' '}
                  <span className="font-semibold text-slate-900">{rejectModal.employeeName}</span> on{' '}
                  <span className="font-semibold text-slate-900">{rejectModal.recordDate}</span>.
                </>
              ) : (
                <>
                  You are declining all pending attendance records for{' '}
                  <span className="font-semibold text-slate-900">{rejectModal.employeeName}</span>.
                </>
              )}{' '}
              Please provide a mandatory reason for the HR team and employee.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Rejection <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={rejectionReasonInput}
                onChange={(e) => {
                  setRejectionReasonInput(e.target.value);
                  if (rejectionError) setRejectionError('');
                }}
                rows={3}
                placeholder="e.g., Remote working hours discrepancy, client holiday not reflected..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
              />
              {rejectionError && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{rejectionError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModal({ isOpen: false, mode: 'single' })}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

