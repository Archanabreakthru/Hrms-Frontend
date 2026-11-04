// Orbyx HRMS - External Client Supervisor Dashboard
import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Building2,
  LogOut,
  Send,
  Plus,
  Search,
  Filter,
  Check,
  X,
  FileSpreadsheet,
  ShieldCheck,
  ArrowRight,
  Info,
  CalendarCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { db, subscribeToDB } from '../../db/storage';
import { hrmsService } from '../../services/hrmsService';
import { ClientSupervisor, AttendanceRecord, AttendanceStatus } from '../../types/hrms';
import { AssignmentRecord, ClientRecord } from '../clients/ClientManagement';

interface ClientSupervisorDashboardProps {
  supervisor: ClientSupervisor;
  onLogout: () => void;
  onReturnToHRMS?: () => void;
}

export const ClientSupervisorDashboard: React.FC<ClientSupervisorDashboardProps> = ({
  supervisor,
  onLogout,
  onReturnToHRMS
}) => {
  const [, setDbTick] = useState(0);
  useEffect(() => {
    return subscribeToDB(() => setDbTick((t) => t + 1));
  }, []);

  const [activeTab, setActiveTab] = useState<'team' | 'daily-entry' | 'approvals' | 'history'>('team');
  const [notice, setNotice] = useState<string>('');

  // Read client deployments from storage
  const allDeployments = hrmsService.getClientDeploymentsFromStorage() as AssignmentRecord[];
  const allEmployees = db.getEmployees();
  const allAttendance = db.getAttendanceRecords();
  const allClients = hrmsService.getClientsFromStorage() as ClientRecord[];

  const clientOrg = allClients.find((c) => c.id === supervisor.clientId);

  // STRICT FRONTEND ACCESS SCOPING:
  // Supervisor can only see deployments assigned to them or their client organization
  const assignedDeployments = useMemo(() => {
    return allDeployments.filter((d) => {
      if (d.clientId !== supervisor.clientId) return false;
      if (supervisor.assignedDeploymentIds && supervisor.assignedDeploymentIds.length > 0) {
        return supervisor.assignedDeploymentIds.includes(d.id);
      }
      return true;
    });
  }, [allDeployments, supervisor]);

  const assignedEmployeeIds = useMemo(() => {
    return Array.from(new Set(assignedDeployments.map((d) => d.employeeId)));
  }, [assignedDeployments]);

  // Scoped employees (no salary, bank details, or confidential docs exposed)
  const assignedEmployees = useMemo(() => {
    return allEmployees.filter((e) => assignedEmployeeIds.includes(e.id));
  }, [allEmployees, assignedEmployeeIds]);

  // Scoped attendance records
  const scopedAttendance = useMemo(() => {
    return allAttendance.filter((r) => {
      if (!assignedEmployeeIds.includes(r.employeeId)) return false;
      if (r.clientId && r.clientId !== supervisor.clientId) return false;
      return true;
    });
  }, [allAttendance, assignedEmployeeIds, supervisor.clientId]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalAssigned = assignedDeployments.length;
    const totalRecorded = scopedAttendance.length;
    const pendingSubmission = scopedAttendance.filter(
      (r) => !r.clientVerificationStatus || r.clientVerificationStatus === 'Pending' || r.clientVerificationStatus === 'Verification Requested'
    ).length;
    const submittedToHR = scopedAttendance.filter(
      (r) => r.clientVerificationStatus === 'Verified' && r.companyApprovalStatus !== 'Approved' && r.companyApprovalStatus !== 'Rejected'
    ).length;
    const hrApproved = scopedAttendance.filter((r) => r.companyApprovalStatus === 'Approved').length;
    const disputed = scopedAttendance.filter(
      (r) => r.clientVerificationStatus === 'Disputed' || r.clientVerificationStatus === 'Correction Requested' || r.companyApprovalStatus === 'Rejected'
    ).length;

    return {
      totalAssigned,
      totalRecorded,
      pendingSubmission,
      submittedToHR,
      hrApproved,
      disputed
    };
  }, [assignedDeployments, scopedAttendance]);

  // -------------------------------------------------------------
  // Tab 2: Attendance Entry State
  // -------------------------------------------------------------
  const [entryMode, setEntryMode] = useState<'single' | 'bulk'>('single');
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedEmpId, setSelectedEmpId] = useState<string>(assignedEmployees[0]?.id || '');
  const [checkInTime, setCheckInTime] = useState<string>('09:30');
  const [checkOutTime, setCheckOutTime] = useState<string>('18:30');
  const [breakDurationMinutes, setBreakDurationMinutes] = useState<number>(60);
  const [entryStatus, setEntryStatus] = useState<AttendanceStatus>('Present');
  const [entryNotes, setEntryNotes] = useState<string>('');
  const [entryError, setEntryError] = useState<string>('');

  // Bulk entry rows
  const [bulkRows, setBulkRows] = useState<
    Record<
      string,
      {
        selected: boolean;
        checkIn: string;
        checkOut: string;
        breakMins: number;
        status: AttendanceStatus;
        notes: string;
      }
    >
  >({});

  // Initialize bulk rows when switching to bulk or changing date
  useEffect(() => {
    const initial: typeof bulkRows = {};
    assignedEmployees.forEach((emp) => {
      const existing = scopedAttendance.find((r) => r.employeeId === emp.id && r.date === entryDate);
      initial[emp.id] = {
        selected: true,
        checkIn: existing?.checkInTime || '09:30',
        checkOut: existing?.checkOutTime || '18:30',
        breakMins: existing?.breakDurationMinutes ?? 60,
        status: existing?.status || 'Present',
        notes: existing?.notes || ''
      };
    });
    setBulkRows(initial);
  }, [entryDate, assignedEmployees, scopedAttendance]);

  // Calculate working hours helper
  const calculateHours = (cin: string, cout: string, breakMins: number): number => {
    if (!cin || !cout) return 0;
    const [h1, m1] = cin.split(':').map(Number);
    const [h2, m2] = cout.split(':').map(Number);
    const startMins = h1 * 60 + m1;
    const endMins = h2 * 60 + m2;
    if (endMins <= startMins) return 0;
    const grossMins = endMins - startMins - (breakMins || 0);
    return Math.max(0, Number((grossMins / 60).toFixed(2)));
  };

  const calculatedSingleHours = useMemo(() => {
    if (entryStatus === 'Absent' || entryStatus === 'On Leave' || entryStatus === 'Holiday') return 0;
    return calculateHours(checkInTime, checkOutTime, breakDurationMinutes);
  }, [checkInTime, checkOutTime, breakDurationMinutes, entryStatus]);

  // Validate single entry
  const validateSingleEntry = (): boolean => {
    setEntryError('');
    if (!selectedEmpId) {
      setEntryError('Please select an employee.');
      return false;
    }
    if (!entryDate) {
      setEntryError('Please select a valid attendance date.');
      return false;
    }

    // Deployment date check
    const dep = assignedDeployments.find((d) => d.employeeId === selectedEmpId);
    if (!dep) {
      setEntryError('Selected employee has no active client deployment under your supervision.');
      return false;
    }
    if (entryDate < dep.startDate) {
      setEntryError(`Attendance date (${entryDate}) cannot precede deployment start date (${dep.startDate}).`);
      return false;
    }
    const effectiveEnd = dep.actualEndDate || dep.plannedEndDate;
    if (effectiveEnd && entryDate > effectiveEnd) {
      setEntryError(`Attendance date (${entryDate}) cannot exceed deployment end date (${effectiveEnd}).`);
      return false;
    }

    if (entryStatus === 'Present' || entryStatus === 'Half Day') {
      if (!checkInTime || !checkOutTime) {
        setEntryError('Check-in and check-out times are required for Present/Half-Day attendance.');
        return false;
      }
      if (checkOutTime <= checkInTime) {
        setEntryError('Check-out time must be after check-in time.');
        return false;
      }
      if (calculatedSingleHours <= 0) {
        setEntryError('Working hours after break deduction must be greater than zero.');
        return false;
      }
    }

    return true;
  };

  // Submit Single Entry
  const handleSaveSingleEntry = (action: 'draft' | 'submit') => {
    if (!validateSingleEntry()) return;

    const dep = assignedDeployments.find((d) => d.employeeId === selectedEmpId);
    const recordPayload = {
      employeeId: selectedEmpId,
      date: entryDate,
      checkInTime,
      checkOutTime,
      totalHoursWorked: calculatedSingleHours,
      status: entryStatus,
      assignmentId: dep?.id,
      notes: entryNotes
    };

    if (action === 'submit') {
      const res = hrmsService.submitClientSupervisorAttendanceDirect({
        supervisorId: supervisor.id,
        supervisorName: supervisor.name,
        supervisorEmail: supervisor.officialEmail,
        clientId: supervisor.clientId,
        records: [recordPayload],
        decision: 'Verified',
        notes: entryNotes || 'Submitted and verified by supervisor in Client Portal.'
      });

      if (res.success) {
        setNotice(`Attendance for ${selectedEmpId} on ${entryDate} submitted & verified! It is now in Orbyx HR's approval queue.`);
        setActiveTab('approvals');
      } else {
        setEntryError(res.message);
      }
    } else {
      // Save Draft
      const shift = db.getShifts()[0];
      const rec: AttendanceRecord = {
        id: `ATT-${entryDate.replace(/-/g, '')}-${selectedEmpId}`,
        employeeId: selectedEmpId,
        date: entryDate,
        shiftId: shift?.id || 'SHIFT-GEN',
        checkInTime,
        checkOutTime,
        totalHoursWorked: calculatedSingleHours,
        regularHours: Math.min(8, calculatedSingleHours),
        overtimeHours: Math.max(0, Number((calculatedSingleHours - 8).toFixed(2))),
        status: entryStatus,
        isLate: false,
        isEarlyDeparture: false,
        lateMinutes: 0,
        source: 'Client Timesheet',
        workMode: 'Client Site',
        assignmentId: dep?.id,
        clientId: supervisor.clientId,
        projectName: dep?.project || clientOrg?.name || 'Client Project',
        clientSupervisorName: supervisor.name,
        clientSupervisorEmail: supervisor.officialEmail,
        clientVerificationStatus: 'Pending',
        companyApprovalStatus: 'Pending',
        payrollEligibilityStatus: 'Not Eligible',
        approvalStatus: 'Pending Client Verification',
        notes: entryNotes
      };
      db.saveAttendanceRecord(rec);
      setNotice(`Saved draft attendance record for ${selectedEmpId} on ${entryDate}. Ready for review.`);
      setActiveTab('approvals');
    }
  };

  // Submit Bulk Entry
  const handleSaveBulk = (action: 'draft' | 'submit') => {
    setEntryError('');
    const selectedEntries = Object.entries(bulkRows).filter(([_, val]) => val.selected);

    if (selectedEntries.length === 0) {
      setEntryError('Please select at least one employee row to save/submit.');
      return;
    }

    const recordsToProcess = selectedEntries.map(([empId, row]) => {
      const dep = assignedDeployments.find((d) => d.employeeId === empId);
      const hrs = row.status === 'Absent' || row.status === 'On Leave' || row.status === 'Holiday'
        ? 0
        : calculateHours(row.checkIn, row.checkOut, row.breakMins);

      return {
        employeeId: empId,
        date: entryDate,
        checkInTime: row.checkIn,
        checkOutTime: row.checkOut,
        totalHoursWorked: hrs,
        status: row.status,
        assignmentId: dep?.id,
        notes: row.notes
      };
    });

    if (action === 'submit') {
      const res = hrmsService.submitClientSupervisorAttendanceDirect({
        supervisorId: supervisor.id,
        supervisorName: supervisor.name,
        supervisorEmail: supervisor.officialEmail,
        clientId: supervisor.clientId,
        records: recordsToProcess,
        decision: 'Verified',
        notes: `Bulk attendance submission for ${recordsToProcess.length} employees on ${entryDate}.`
      });

      if (res.success) {
        setNotice(`Successfully submitted & verified attendance for ${recordsToProcess.length} employees on ${entryDate}!`);
        setActiveTab('approvals');
      } else {
        setEntryError(res.message);
      }
    } else {
      // Save Drafts
      const shift = db.getShifts()[0];
      recordsToProcess.forEach((r) => {
        const rec: AttendanceRecord = {
          id: `ATT-${r.date.replace(/-/g, '')}-${r.employeeId}`,
          employeeId: r.employeeId,
          date: r.date,
          shiftId: shift?.id || 'SHIFT-GEN',
          checkInTime: r.checkInTime,
          checkOutTime: r.checkOutTime,
          totalHoursWorked: r.totalHoursWorked,
          regularHours: Math.min(8, r.totalHoursWorked),
          overtimeHours: Math.max(0, Number((r.totalHoursWorked - 8).toFixed(2))),
          status: r.status,
          isLate: false,
          isEarlyDeparture: false,
          lateMinutes: 0,
          source: 'Client Timesheet',
          workMode: 'Client Site',
          assignmentId: r.assignmentId,
          clientId: supervisor.clientId,
          projectName: clientOrg?.name || 'Client Project',
          clientSupervisorName: supervisor.name,
          clientSupervisorEmail: supervisor.officialEmail,
          clientVerificationStatus: 'Pending',
          companyApprovalStatus: 'Pending',
          payrollEligibilityStatus: 'Not Eligible',
          approvalStatus: 'Pending Client Verification',
          notes: r.notes
        };
        db.saveAttendanceRecord(rec);
      });
      setNotice(`Saved ${recordsToProcess.length} draft attendance entries for ${entryDate}.`);
      setActiveTab('approvals');
    }
  };

  // -------------------------------------------------------------
  // Tab 3: Approvals Queue State
  // -------------------------------------------------------------
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<'ALL' | 'DRAFT' | 'VERIFIED' | 'APPROVED' | 'DISPUTED'>('ALL');
  const [disputeModalRecord, setDisputeModalRecord] = useState<AttendanceRecord | null>(null);
  const [disputeReasonInput, setDisputeReasonInput] = useState<string>('');

  const filteredQueueRecords = useMemo(() => {
    return scopedAttendance.filter((r) => {
      const isDraft = !r.clientVerificationStatus || r.clientVerificationStatus === 'Pending' || r.clientVerificationStatus === 'Verification Requested';
      const isVerified = r.clientVerificationStatus === 'Verified' && r.companyApprovalStatus !== 'Approved';
      const isApproved = r.companyApprovalStatus === 'Approved';
      const isDisputed = r.clientVerificationStatus === 'Disputed' || r.clientVerificationStatus === 'Correction Requested';

      if (approvalFilter === 'DRAFT') return isDraft;
      if (approvalFilter === 'VERIFIED') return isVerified;
      if (approvalFilter === 'APPROVED') return isApproved;
      if (approvalFilter === 'DISPUTED') return isDisputed;
      return true;
    });
  }, [scopedAttendance, approvalFilter]);

  const handleBatchApprove = () => {
    if (selectedRecordIds.length === 0) return;

    const recordsToApprove = scopedAttendance.filter((r) => selectedRecordIds.includes(r.id));
    const payload = recordsToApprove.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      date: r.date,
      checkInTime: r.checkInTime || '09:30',
      checkOutTime: r.checkOutTime || '18:30',
      totalHoursWorked: r.totalHoursWorked || 8,
      status: r.status,
      assignmentId: r.assignmentId,
      notes: r.notes
    }));

    const res = hrmsService.submitClientSupervisorAttendanceDirect({
      supervisorId: supervisor.id,
      supervisorName: supervisor.name,
      supervisorEmail: supervisor.officialEmail,
      clientId: supervisor.clientId,
      records: payload,
      decision: 'Verified',
      notes: `Batch approved ${recordsToApprove.length} record(s) via Client Supervisor Portal.`
    });

    if (res.success) {
      setNotice(`Stage 1 Verification Complete: ${res.updatedCount} record(s) approved and submitted to Orbyx HR approval queue!`);
      setSelectedRecordIds([]);
    }
  };

  const handleConfirmDispute = () => {
    if (!disputeModalRecord) return;
    if (!disputeReasonInput.trim()) {
      alert('Please provide a reason or clarification for the dispute.');
      return;
    }

    const res = hrmsService.submitClientSupervisorAttendanceDirect({
      supervisorId: supervisor.id,
      supervisorName: supervisor.name,
      supervisorEmail: supervisor.officialEmail,
      clientId: supervisor.clientId,
      records: [
        {
          id: disputeModalRecord.id,
          employeeId: disputeModalRecord.employeeId,
          date: disputeModalRecord.date,
          checkInTime: disputeModalRecord.checkInTime || '09:30',
          checkOutTime: disputeModalRecord.checkOutTime || '18:30',
          totalHoursWorked: disputeModalRecord.totalHoursWorked || 8,
          status: disputeModalRecord.status,
          assignmentId: disputeModalRecord.assignmentId
        }
      ],
      decision: 'Disputed',
      disputeDetails: disputeReasonInput.trim(),
      notes: disputeReasonInput.trim()
    });

    if (res.success) {
      setNotice(`Attendance record for ${disputeModalRecord.employeeId} on ${disputeModalRecord.date} flagged as Disputed.`);
      setDisputeModalRecord(null);
      setDisputeReasonInput('');
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Record ID',
      'Employee ID',
      'Employee Name',
      'Date',
      'Check-In',
      'Check-Out',
      'Total Hours',
      'Status',
      'Project',
      'Stage 1 Client Verification',
      'Supervisor Name',
      'Stage 2 Company Approval',
      'Payroll Eligibility'
    ];

    const rows = scopedAttendance.map((r) => {
      const emp = allEmployees.find((e) => e.id === r.employeeId);
      const empName = emp ? `${emp.firstName} ${emp.lastName}` : r.employeeId;
      return [
        r.id,
        r.employeeId,
        `"${empName}"`,
        r.date,
        r.checkInTime || '',
        r.checkOutTime || '',
        r.totalHoursWorked,
        r.status,
        `"${r.projectName || ''}"`,
        r.clientVerificationStatus || 'Pending',
        `"${r.clientSupervisorName || ''}"`,
        r.companyApprovalStatus || 'Pending',
        r.payrollEligibilityStatus || 'Not Eligible'
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Client_Attendance_${supervisor.clientId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 text-white px-6 py-3.5 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-500 flex items-center justify-center text-slate-950 font-black tracking-wider text-base shadow-md">
              OX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-white">ORBYX HRMS</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Client Supervisor Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Authorized Client: <strong className="text-teal-400">{clientOrg?.name || supervisor.clientId}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Supervisor Profile Chip */}
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
              <div className="h-7 w-7 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center font-bold text-teal-300">
                {supervisor.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-left">
                <span className="font-semibold text-slate-200 block leading-tight">{supervisor.name}</span>
                <span className="text-[10px] text-slate-400 block leading-tight font-mono">{supervisor.officialEmail}</span>
              </div>
            </div>

            {onReturnToHRMS && (
              <button
                type="button"
                onClick={onReturnToHRMS}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors border border-slate-700"
                title="Return to Internal HRMS Administration"
              >
                <span>← Internal HRMS</span>
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold transition-colors border border-rose-500/30"
              title="End supervisor session"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Notice Banner */}
        {notice && (
          <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
              <span className="font-medium">{notice}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice('')}
              className="text-teal-700 hover:text-teal-900 font-bold text-xs"
            >
              &times;
            </button>
          </div>
        )}

        {/* 6 Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Team</span>
            <span className="text-xl font-bold text-slate-900">{metrics.totalAssigned}</span>
            <span className="text-[10px] text-slate-500 block">Active deployments</span>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Punches</span>
            <span className="text-xl font-bold text-slate-900 font-mono">{metrics.totalRecorded}</span>
            <span className="text-[10px] text-slate-500 block">Recorded logs</span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">Pending Submission</span>
            <span className="text-xl font-bold text-amber-800 font-mono">{metrics.pendingSubmission}</span>
            <span className="text-[10px] text-amber-600 block">Draft / unsubmitted</span>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-indigo-700 block">Submitted to HR</span>
            <span className="text-xl font-bold text-indigo-800 font-mono">{metrics.submittedToHR}</span>
            <span className="text-[10px] text-indigo-600 block">Stage 1 Verified</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">HR Approved</span>
            <span className="text-xl font-bold text-emerald-800 font-mono">{metrics.hrApproved}</span>
            <span className="text-[10px] text-emerald-600 block">Eligible for payroll</span>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-rose-700 block">Disputed / Returned</span>
            <span className="text-xl font-bold text-rose-800 font-mono">{metrics.disputed}</span>
            <span className="text-[10px] text-rose-600 block">Correction required</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'team' ? 'bg-teal-500 text-slate-950 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Assigned Team ({assignedDeployments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('daily-entry')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'daily-entry' ? 'bg-teal-500 text-slate-950 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>2. Record Attendance</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('approvals')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'approvals' ? 'bg-teal-500 text-slate-950 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>3. Submission & Approval Queue</span>
              {metrics.pendingSubmission > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px]">
                  {metrics.pendingSubmission}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'history' ? 'bg-teal-500 text-slate-950 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              4. Attendance History & Timesheets
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Export Timesheet CSV</span>
          </button>
        </div>

        {/* -------------------------------------------------------------
            TAB 1: Assigned Team
        ------------------------------------------------------------- */}
        {activeTab === 'team' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Your Assigned Employee Deployments</h3>
                  <p className="text-xs text-slate-500">
                    You are authorized to manage timesheets and approve attendance only for the {assignedDeployments.length} deployment(s) listed below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('daily-entry')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Record Today's Attendance</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold">
                      <th className="p-3">Employee</th>
                      <th className="p-3">Project / Engagement</th>
                      <th className="p-3">Work Mode</th>
                      <th className="p-3">Deployment Period</th>
                      <th className="p-3">Allocation</th>
                      <th className="p-3">Latest Attendance</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignedDeployments.map((dep) => {
                      const emp = allEmployees.find((e) => e.id === dep.employeeId);
                      const empName = emp ? `${emp.firstName} ${emp.lastName}` : dep.employeeId;
                      const empLatestRec = scopedAttendance
                        .filter((r) => r.employeeId === dep.employeeId)
                        .sort((a, b) => b.date.localeCompare(a.date))[0];

                      return (
                        <tr key={dep.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {empName.charAt(0)}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-900 block">{empName}</span>
                                <span className="text-[11px] font-mono text-slate-500 block">{dep.employeeId}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="font-medium text-slate-800 block">{dep.project}</span>
                            <span className="text-[11px] text-slate-500 block">{dep.location}</span>
                          </td>
                          <td className="p-3">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {dep.workMode}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-600">
                            {dep.startDate} &rarr; {dep.actualEndDate || dep.plannedEndDate || 'Ongoing'}
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-700">{dep.allocation}%</span>
                          </td>
                          <td className="p-3">
                            {empLatestRec ? (
                              <div className="space-y-0.5">
                                <span className="font-semibold text-slate-800 block text-[11px]">
                                  {empLatestRec.date} ({empLatestRec.totalHoursWorked}h)
                                </span>
                                <span className="text-[10px] text-teal-700 font-medium block">
                                  {empLatestRec.clientVerificationStatus || 'Pending'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">No records yet</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEmpId(dep.employeeId);
                                setActiveTab('daily-entry');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold text-[11px] transition-colors border border-teal-200"
                            >
                              Log Hours
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 2: Daily Attendance Entry
        ------------------------------------------------------------- */}
        {activeTab === 'daily-entry' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Record Client-Site Attendance</h3>
                <p className="text-xs text-slate-500">
                  Record daily working hours, check-in, check-out, and break duration for assigned deployment staff.
                </p>
              </div>

              {/* Single vs Bulk Switch */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setEntryMode('single')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    entryMode === 'single' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Single Employee Entry
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('bulk')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    entryMode === 'bulk' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Bulk Timesheet (All Team)
                </button>
              </div>
            </div>

            {/* Error banner */}
            {entryError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span className="font-medium">{entryError}</span>
              </div>
            )}

            {/* Date Selector Row */}
            <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Attendance Date *
                </label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="text-xs text-slate-500 flex-1">
                <span className="font-semibold text-slate-700 block">Two-Stage Verification Pipeline:</span>
                <p className="text-[11px] text-slate-500">
                  1. You record & approve as Supervisor &rarr; 2. Orbyx Internal HR does Final Approval &rarr; Eligible for Payroll.
                </p>
              </div>
            </div>

            {/* SINGLE MODE */}
            {entryMode === 'single' && (
              <div className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Employee *
                  </label>
                  <select
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {assignedEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                    <select
                      value={entryStatus}
                      onChange={(e) => setEntryStatus(e.target.value as AttendanceStatus)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium"
                    >
                      <option value="Present">Present</option>
                      <option value="Half Day">Half Day</option>
                      <option value="Absent">Absent</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Holiday">Holiday</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Check-In</label>
                    <input
                      type="time"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      disabled={entryStatus === 'Absent' || entryStatus === 'On Leave' || entryStatus === 'Holiday'}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-mono disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Check-Out</label>
                    <input
                      type="time"
                      value={checkOutTime}
                      onChange={(e) => setCheckOutTime(e.target.value)}
                      disabled={entryStatus === 'Absent' || entryStatus === 'On Leave' || entryStatus === 'Holiday'}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-mono disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Break (Mins)</label>
                    <input
                      type="number"
                      min="0"
                      step="15"
                      value={breakDurationMinutes}
                      onChange={(e) => setBreakDurationMinutes(Number(e.target.value) || 0)}
                      disabled={entryStatus === 'Absent' || entryStatus === 'On Leave' || entryStatus === 'Holiday'}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-mono disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>

                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between text-teal-900 text-xs">
                  <div>
                    <span className="font-bold text-teal-950 block">Calculated Working Hours:</span>
                    <span className="text-[11px] text-teal-800">
                      Check-out ({checkOutTime}) &minus; Check-in ({checkInTime}) &minus; {breakDurationMinutes}m break
                    </span>
                  </div>
                  <span className="text-xl font-bold font-mono text-teal-900">
                    {calculatedSingleHours} hrs
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supervisor Remarks / Project Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={entryNotes}
                    onChange={(e) => setEntryNotes(e.target.value)}
                    placeholder="e.g. Onsite client sprint delivery, validated by Vikramaditya Rao"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                  />
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleSaveSingleEntry('draft')}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveSingleEntry('submit')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-2xs"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Approve & Submit to Orbyx HR</span>
                  </button>
                </div>
              </div>
            )}

            {/* BULK MODE */}
            {entryMode === 'bulk' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold">
                        <th className="p-3 w-10">
                          <input
                            type="checkbox"
                            checked={Object.values(bulkRows).every((r) => r.selected)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const updated: typeof bulkRows = {};
                              Object.entries(bulkRows).forEach(([k, v]) => {
                                updated[k] = { ...v, selected: checked };
                              });
                              setBulkRows(updated);
                            }}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                        </th>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Check-In</th>
                        <th className="p-3">Check-Out</th>
                        <th className="p-3">Break (m)</th>
                        <th className="p-3">Net Hours</th>
                        <th className="p-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assignedEmployees.map((emp) => {
                        const row = bulkRows[emp.id] || {
                          selected: true,
                          checkIn: '09:30',
                          checkOut: '18:30',
                          breakMins: 60,
                          status: 'Present',
                          notes: ''
                        };

                        const hrs =
                          row.status === 'Absent' || row.status === 'On Leave' || row.status === 'Holiday'
                            ? 0
                            : calculateHours(row.checkIn, row.checkOut, row.breakMins);

                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/60">
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={(e) =>
                                  setBulkRows({
                                    ...bulkRows,
                                    [emp.id]: { ...row, selected: e.target.checked }
                                  })
                                }
                                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                              />
                            </td>
                            <td className="p-3">
                              <span className="font-semibold text-slate-900 block">{emp.firstName} {emp.lastName}</span>
                              <span className="text-[11px] font-mono text-slate-500 block">{emp.id}</span>
                            </td>
                            <td className="p-3">
                              <select
                                value={row.status}
                                onChange={(e) =>
                                  setBulkRows({
                                    ...bulkRows,
                                    [emp.id]: { ...row, status: e.target.value as AttendanceStatus }
                                  })
                                }
                                className="px-2 py-1 rounded border border-slate-200 bg-white text-xs"
                              >
                                <option value="Present">Present</option>
                                <option value="Half Day">Half Day</option>
                                <option value="Absent">Absent</option>
                                <option value="On Leave">On Leave</option>
                                <option value="Holiday">Holiday</option>
                              </select>
                            </td>
                            <td className="p-3">
                              <input
                                type="time"
                                value={row.checkIn}
                                onChange={(e) =>
                                  setBulkRows({
                                    ...bulkRows,
                                    [emp.id]: { ...row, checkIn: e.target.value }
                                  })
                                }
                                className="px-2 py-1 rounded border border-slate-200 bg-white text-xs font-mono"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="time"
                                value={row.checkOut}
                                onChange={(e) =>
                                  setBulkRows({
                                    ...bulkRows,
                                    [emp.id]: { ...row, checkOut: e.target.value }
                                  })
                                }
                                className="px-2 py-1 rounded border border-slate-200 bg-white text-xs font-mono"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                step="15"
                                value={row.breakMins}
                                onChange={(e) =>
                                  setBulkRows({
                                    ...bulkRows,
                                    [emp.id]: { ...row, breakMins: Number(e.target.value) || 0 }
                                  })
                                }
                                className="w-16 px-2 py-1 rounded border border-slate-200 bg-white text-xs font-mono"
                              />
                            </td>
                            <td className="p-3 font-mono font-bold text-teal-700">
                              {hrs} hrs
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                placeholder="Optional note"
                                value={row.notes}
                                onChange={(e) =>
                                  setBulkRows({
                                    ...bulkRows,
                                    [emp.id]: { ...row, notes: e.target.value }
                                  })
                                }
                                className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-xs"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleSaveBulk('draft')}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                  >
                    Save Selected as Drafts
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveBulk('submit')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-2xs"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Approve & Submit Selected to Orbyx HR</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 3: Submission & Approval Queue
        ------------------------------------------------------------- */}
        {activeTab === 'approvals' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Attendance Approval Queue</h3>
                <p className="text-xs text-slate-500">
                  Review recorded employee timesheets. Approve & Submit to forward records to Orbyx Internal HR for final authorization.
                </p>
              </div>

              {/* Status Filter buttons */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setApprovalFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    approvalFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({scopedAttendance.length})
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalFilter('DRAFT')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    approvalFilter === 'DRAFT' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  Drafts ({metrics.pendingSubmission})
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalFilter('VERIFIED')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    approvalFilter === 'VERIFIED' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                  }`}
                >
                  Submitted to HR ({metrics.submittedToHR})
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalFilter('APPROVED')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    approvalFilter === 'APPROVED' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  HR Approved ({metrics.hrApproved})
                </button>
              </div>
            </div>

            {/* Batch Action Bar */}
            {selectedRecordIds.length > 0 && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-teal-950">
                  {selectedRecordIds.length} attendance record(s) selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRecordIds([])}
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-semibold"
                  >
                    Clear Selection
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchApprove}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-2xs"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Approve & Submit to Orbyx HR ({selectedRecordIds.length})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Records Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold">
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredQueueRecords.length > 0 &&
                          filteredQueueRecords.every((r) => selectedRecordIds.includes(r.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRecordIds(filteredQueueRecords.map((r) => r.id));
                          } else {
                            setSelectedRecordIds([]);
                          }
                        }}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Hours</th>
                    <th className="p-3">Punch Times</th>
                    <th className="p-3">Stage 1: Supervisor Status</th>
                    <th className="p-3">Stage 2: Orbyx HR Status</th>
                    <th className="p-3">Payroll Eligibility</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQueueRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                        No attendance records match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredQueueRecords.map((rec) => {
                      const emp = allEmployees.find((e) => e.id === rec.employeeId);
                      const empName = emp ? `${emp.firstName} ${emp.lastName}` : rec.employeeId;
                      const isSelected = selectedRecordIds.includes(rec.id);
                      const isVerified = rec.clientVerificationStatus === 'Verified';
                      const isCompanyApproved = rec.companyApprovalStatus === 'Approved';

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/60">
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRecordIds([...selectedRecordIds, rec.id]);
                                } else {
                                  setSelectedRecordIds(selectedRecordIds.filter((id) => id !== rec.id));
                                }
                              }}
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                          </td>
                          <td className="p-3 font-mono font-semibold text-slate-800">{rec.date}</td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-900 block">{empName}</span>
                            <span className="text-[11px] font-mono text-slate-500 block">{rec.employeeId}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold font-mono text-teal-800 text-sm">{rec.totalHoursWorked}h</span>
                            <span className="text-[10px] text-slate-500 block">{rec.status}</span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-600">
                            {rec.checkInTime || '--:--'} &rarr; {rec.checkOutTime || '--:--'}
                          </td>
                          <td className="p-3">
                            {isVerified ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Verified by {rec.clientSupervisorName || supervisor.name}</span>
                              </span>
                            ) : rec.clientVerificationStatus === 'Disputed' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Disputed</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <Clock className="h-3 w-3" />
                                <span>Draft / Awaiting Supervisor</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {isCompanyApproved ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Company Approved</span>
                              </span>
                            ) : rec.companyApprovalStatus === 'Rejected' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <X className="h-3 w-3" />
                                <span>Rejected by HR</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                                <span>Pending HR Review</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rec.payrollEligibilityStatus === 'Eligible for Draft Payroll' || isCompanyApproved
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {isCompanyApproved ? 'Eligible for Payroll' : 'Not Eligible (Requires HR Approval)'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isVerified && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const res = hrmsService.submitClientSupervisorAttendanceDirect({
                                      supervisorId: supervisor.id,
                                      supervisorName: supervisor.name,
                                      supervisorEmail: supervisor.officialEmail,
                                      clientId: supervisor.clientId,
                                      records: [
                                        {
                                          id: rec.id,
                                          employeeId: rec.employeeId,
                                          date: rec.date,
                                          checkInTime: rec.checkInTime || '09:30',
                                          checkOutTime: rec.checkOutTime || '18:30',
                                          totalHoursWorked: rec.totalHoursWorked || 8,
                                          status: rec.status,
                                          assignmentId: rec.assignmentId
                                        }
                                      ],
                                      decision: 'Verified',
                                      notes: 'Single record verified in Client Portal.'
                                    });
                                    if (res.success) {
                                      setNotice(`Attendance on ${rec.date} for ${rec.employeeId} approved & submitted to Orbyx HR.`);
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-2xs"
                                >
                                  Approve & Submit
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setDisputeModalRecord(rec);
                                  setDisputeReasonInput('');
                                }}
                                className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] border border-rose-200"
                              >
                                Dispute
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 4: Attendance History & Timesheets
        ------------------------------------------------------------- */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Historical Attendance Timesheet</h3>
                <p className="text-xs text-slate-500">
                  Comprehensive audit trail of all attendance recorded and verified for {clientOrg?.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Download Timesheet CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold">
                    <th className="p-3">Date</th>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Working Hours</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Stage 1 (Client Verified)</th>
                    <th className="p-3">Stage 2 (Company Approved)</th>
                    <th className="p-3">Payroll Eligibility</th>
                    <th className="p-3">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scopedAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                        No historical attendance records found for this client.
                      </td>
                    </tr>
                  ) : (
                    scopedAttendance.map((rec) => {
                      const emp = allEmployees.find((e) => e.id === rec.employeeId);
                      const empName = emp ? `${emp.firstName} ${emp.lastName}` : rec.employeeId;
                      const isCompanyApproved = rec.companyApprovalStatus === 'Approved';

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/60">
                          <td className="p-3 font-mono font-semibold text-slate-800">{rec.date}</td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-900 block">{empName}</span>
                            <span className="text-[11px] font-mono text-slate-500 block">{rec.employeeId}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-mono font-bold text-slate-800">{rec.totalHoursWorked} hrs</span>
                            <span className="text-[10px] text-slate-500 block">
                              {rec.checkInTime || '--:--'} &minus; {rec.checkOutTime || '--:--'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-medium text-slate-700">{rec.status}</span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rec.clientVerificationStatus === 'Verified'
                                  ? 'bg-teal-100 text-teal-800'
                                  : rec.clientVerificationStatus === 'Disputed'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {rec.clientVerificationStatus || 'Pending'}
                            </span>
                            {rec.clientVerifiedAt && (
                              <span className="text-[10px] text-slate-400 block font-mono">
                                on {rec.clientVerifiedAt}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isCompanyApproved
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec.companyApprovalStatus === 'Rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {rec.companyApprovalStatus || 'Pending'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                isCompanyApproved
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-50 text-slate-400 border border-slate-200'
                              }`}
                            >
                              {isCompanyApproved ? 'Eligible for Payroll' : 'Excluded from Payroll'}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-slate-500">
                            {rec.verificationMethod && (
                              <span className="block font-medium text-slate-700">{rec.verificationMethod}</span>
                            )}
                            <span className="block italic text-[10px] truncate max-w-xs">{rec.notes || '-'}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Dispute Modal */}
      {disputeModalRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <AlertTriangle className="h-5 w-5" />
                <span>Dispute / Request Attendance Correction</span>
              </div>
              <button
                type="button"
                onClick={() => setDisputeModalRecord(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p>
                <strong>Employee:</strong> {disputeModalRecord.employeeId} ({disputeModalRecord.projectName})
              </p>
              <p>
                <strong>Date:</strong> {disputeModalRecord.date} &bull; <strong>Recorded Hours:</strong> {disputeModalRecord.totalHoursWorked} hrs
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dispute Reason & Supervisor Claim *
              </label>
              <textarea
                rows={3}
                required
                value={disputeReasonInput}
                onChange={(e) => setDisputeReasonInput(e.target.value)}
                placeholder="e.g. Employee departed client site early at 15:00 without supervisor approval; actual worked hours were 5.5."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-rose-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDisputeModalRecord(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDispute}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs"
              >
                Confirm Dispute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 text-xs py-3 text-center">
        Orbyx HRMS &copy; 2026. External Client Supervisor Portal - Isolated Partner Session.
      </footer>
    </div>
  );
};
