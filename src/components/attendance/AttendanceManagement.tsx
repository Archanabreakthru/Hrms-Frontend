// Orbyx HRMS - Attendance & Shifts (Corrected Targeted Implementation)
// 1. Top Attendance Action Bar with Live Punch Actions (State 1: Not Checked In, State 2: Checked In -> Record Check-Out, State 3: Checked Out with working hours)
// 2. Clear Separation of 3 Distinct Actions:
//    A. Normal Check-in / Check-out (Top action bar)
//    B. Employee Forgot Check-in / Check-out Correction (EmployeeCorrectionModal)
//    C. HR Outage / Manual Attendance Entry (HRManualEntryModal - 4 structured sections)
// 3. HR Workforce Interface vs Employee Self-Service Interface
// 4. In-Memory Session State only (No Database, No Backend, Clean Empty States)

import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  BriefcaseBusiness,
  ShieldCheck,
  Plus,
  Search,
  Filter,
  Check,
  X,
  FileCheck2,
  CalendarDays,
  UserCheck,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Edit3,
  LogIn,
  LogOut,
  Building2,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../services/authContext';
import {
  ShiftDefinitionRecord,
  ShiftScheduleEntry,
  DailyAttendanceRecord,
  AttendanceCorrectionEntry,
  OvertimeEntry,
  AttendancePunchStatus,
  CorrectionRequestStatus,
  OvertimeApprovalStatus
} from './attendanceModuleTypes';
import { EmployeeCorrectionModal } from './EmployeeCorrectionModal';
import { HRManualEntryModal } from './HRManualEntryModal';

interface AttendanceManagementProps {
  navContext?: any;
  onOpenPolicies?: () => void;
}

export const AttendanceManagement: React.FC<AttendanceManagementProps> = ({ onOpenPolicies }) => {
  const { currentUser } = useAuth();

  // Role resolution
  const isHR =
    currentUser?.role === 'hr_admin' ||
    currentUser?.role === 'senior_manager';

  const isReportingManager = currentUser?.role === 'reporting_manager';

  // Navigation tab state for HR (Workforce Dashboard, Timesheet Records, Shift Configuration, Shift Scheduling, Overtime Management, Attendance Corrections, HR Manual Entries)
  const [activeHRTab, setActiveHRTab] = useState<
    'dashboard' | 'timesheets' | 'shifts' | 'scheduling' | 'overtime' | 'corrections' | 'manual-entries'
  >('dashboard');

  // Navigation tab state for Employee
  const [activeEmpTab, setActiveEmpTab] = useState<'history' | 'corrections' | 'overtime'>('history');

  // In-Memory Frontend Session State (No Database, No Persistence)
  const [shifts, setShifts] = useState<ShiftDefinitionRecord[]>([
    {
      id: 'SHIFT-GEN',
      name: 'General Day Shift',
      code: 'GEN-01',
      startTime: '09:30',
      endTime: '18:30',
      breakDurationMinutes: 60,
      totalWorkingHours: 8,
      gracePeriodMinutes: 15,
      lateArrivalThresholdMinutes: 30,
      earlyDepartureThresholdMinutes: 30,
      weeklyOffDays: [0, 6],
      workdaysCount: 5,
      isOvernight: false,
      isActive: true
    },
    {
      id: 'SHIFT-MORNING',
      name: 'Early Morning Shift',
      code: 'MOR-01',
      startTime: '08:00',
      endTime: '17:00',
      breakDurationMinutes: 60,
      totalWorkingHours: 8,
      gracePeriodMinutes: 15,
      lateArrivalThresholdMinutes: 30,
      earlyDepartureThresholdMinutes: 30,
      weeklyOffDays: [0, 6],
      workdaysCount: 5,
      isOvernight: false,
      isActive: true
    },
    {
      id: 'SHIFT-EVENING',
      name: 'Evening Shift',
      code: 'EVE-01',
      startTime: '13:00',
      endTime: '22:00',
      breakDurationMinutes: 60,
      totalWorkingHours: 8,
      gracePeriodMinutes: 15,
      lateArrivalThresholdMinutes: 30,
      earlyDepartureThresholdMinutes: 30,
      weeklyOffDays: [0, 6],
      workdaysCount: 5,
      isOvernight: false,
      isActive: true
    },
    {
      id: 'SHIFT-NIGHT',
      name: 'Night Shift',
      code: 'NGT-01',
      startTime: '21:00',
      endTime: '06:00',
      breakDurationMinutes: 60,
      totalWorkingHours: 8,
      gracePeriodMinutes: 15,
      lateArrivalThresholdMinutes: 30,
      earlyDepartureThresholdMinutes: 30,
      weeklyOffDays: [0, 6],
      workdaysCount: 5,
      isOvernight: true,
      isActive: true
    }
  ]);

  const [schedules, setSchedules] = useState<ShiftScheduleEntry[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<DailyAttendanceRecord[]>([]);
  const [corrections, setCorrections] = useState<AttendanceCorrectionEntry[]>([]);
  const [overtimeEntries, setOvertimeEntries] = useState<OvertimeEntry[]>([]);

  // HR Manual Entries Log
  const [hrManualAuditLogs, setHrManualAuditLogs] = useState<
    Array<{
      id: string;
      recordId: string;
      employeeName: string;
      attendanceDate: string;
      outageType: string;
      incidentRef: string;
      remarks: string;
      enteredBy: string;
      timestamp: string;
    }>
  >([]);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Date and Punch State
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [punchWorkMode, setPunchWorkMode] = useState<'Office' | 'Client Site' | 'Remote'>('Office');

  // Find Current User's Record for Today
  const myTodayRecord = useMemo(() => {
    return attendanceRecords.find(
      (r) =>
        r.date === todayStr &&
        (r.employeeId === currentUser?.employeeId || r.employeeName === currentUser?.name)
    );
  }, [attendanceRecords, todayStr, currentUser]);

  // Modals Visibility
  const [isEmployeeCorrectionModalOpen, setIsEmployeeCorrectionModalOpen] = useState(false);
  const [isHRManualModalOpen, setIsHRManualModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);

  // Shift & Schedule Form State
  const [shiftForm, setShiftForm] = useState({
    name: '',
    code: '',
    startTime: '09:30',
    endTime: '18:30',
    breakDurationMinutes: 60,
    totalWorkingHours: 8,
    gracePeriodMinutes: 15,
    lateArrivalThresholdMinutes: 30,
    earlyDepartureThresholdMinutes: 30,
    weeklyOffDays: [0, 6],
    workdaysCount: 5,
    isOvernight: false,
    isActive: true
  });

  const [scheduleForm, setScheduleForm] = useState({
    employeeName: '',
    employeeId: '',
    shiftId: shifts[0]?.id || 'SHIFT-GEN',
    startDate: todayStr,
    endDate: todayStr
  });

  const [overtimeForm, setOvertimeForm] = useState({
    attendanceDate: todayStr,
    standardHours: 8,
    actualHours: 10,
    overtimeHours: 2,
    overtimeReason: ''
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // -------------------------------------------------------------
  // ACTION A: LIVE CHECK-IN / CHECK-OUT (TOP ACTION BAR)
  // -------------------------------------------------------------
  const handleCheckIn = () => {
    if (myTodayRecord?.checkInTime) return; // Prevent duplicate check-in

    const now = new Date();
    const timeStr = now.toTimeString().substring(0, 5);
    const isLate = timeStr > '09:45';

    const newRecord: DailyAttendanceRecord = {
      id: `ATT-${Date.now().toString().slice(-4)}`,
      employeeId: currentUser?.employeeId || 'EMP-ME',
      employeeName: currentUser?.name || 'Current User',
      date: todayStr,
      shiftId: 'SHIFT-GEN',
      shiftName: 'General Day Shift (09:30 - 18:30)',
      checkInTime: timeStr,
      totalHours: 0,
      netWorkingHours: 0,
      breakDurationMinutes: 60,
      overtimeHours: 0,
      isLate,
      lateMinutes: isLate ? 15 : 0,
      isEarlyDeparture: false,
      isMissingPunch: true,
      status: isLate ? 'Late' : 'Present',
      workLocationType: punchWorkMode,
      source: 'Web Punch'
    };

    setAttendanceRecords((prev) => [
      newRecord,
      ...prev.filter(
        (r) =>
          !(
            r.date === todayStr &&
            (r.employeeId === (currentUser?.employeeId || 'EMP-ME') ||
              r.employeeName === currentUser?.name)
          )
      )
    ]);

    showToast(`Check-In recorded at ${timeStr}. State transitioned to Checked In.`);
  };

  const handleCheckOut = () => {
    if (!myTodayRecord?.checkInTime || myTodayRecord.checkOutTime) return; // Prevent invalid/duplicate checkout

    const now = new Date();
    const timeStr = now.toTimeString().substring(0, 5);
    const inTime = myTodayRecord.checkInTime;

    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = timeStr.split(':').map(Number);
    let totalMinutes = outH * 60 + outM - (inH * 60 + inM);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const netMins = Math.max(0, totalMinutes - 60);
    const netHours = +(netMins / 60).toFixed(2);
    const totalHours = +(totalMinutes / 60).toFixed(2);

    const isEarly = timeStr < '18:00';
    const overtime = netHours > 8 ? +(netHours - 8).toFixed(2) : 0;
    const finalStatus: AttendancePunchStatus =
      netHours >= 8 ? (myTodayRecord.isLate ? 'Late' : 'Present') : 'Half Day';

    setAttendanceRecords((prev) =>
      prev.map((r) => {
        if (
          r.date === todayStr &&
          (r.employeeId === (currentUser?.employeeId || 'EMP-ME') ||
            r.employeeName === currentUser?.name)
        ) {
          return {
            ...r,
            checkOutTime: timeStr,
            totalHours,
            netWorkingHours: netHours,
            isMissingPunch: false,
            isEarlyDeparture: isEarly,
            overtimeHours: overtime,
            status: finalStatus
          };
        }
        return r;
      })
    );

    showToast(`Check-Out recorded at ${timeStr}. Total Net Working Hours: ${netHours} hrs.`);
  };

  // -------------------------------------------------------------
  // ACTION B: EMPLOYEE FORGOT CHECK-IN/OUT (CORRECTION WORKFLOW)
  // -------------------------------------------------------------
  const handleSaveCorrection = (newCorr: AttendanceCorrectionEntry) => {
    setCorrections((prev) => [newCorr, ...prev]);
    showToast('Correction submitted. Routed to Reporting Manager for review.');
  };

  const handleManagerCorrectionDecision = (
    corr: AttendanceCorrectionEntry,
    decision: 'Approved' | 'Rejected'
  ) => {
    setCorrections((prev) =>
      prev.map((c) => {
        if (c.id !== corr.id) return c;
        return {
          ...c,
          status: decision === 'Approved' ? 'Pending HR Approval' : 'Manager Rejected',
          managerDecision: decision,
          managerDecidedAt: new Date().toISOString(),
          managerComments: `Reviewed by ${currentUser?.name || 'Reporting Manager'}`
        };
      })
    );
    showToast(
      `Correction request ${
        decision === 'Approved' ? 'approved and forwarded to HR Manager' : 'rejected'
      }.`
    );
  };

  const handleHRCorrectionDecision = (
    corr: AttendanceCorrectionEntry,
    decision: 'Approved' | 'Rejected'
  ) => {
    setCorrections((prev) =>
      prev.map((c) => {
        if (c.id !== corr.id) return c;
        return {
          ...c,
          status: decision === 'Approved' ? 'HR Approved' : 'HR Rejected',
          hrDecision: decision,
          hrDecidedAt: new Date().toISOString(),
          hrComments: `Final approval by ${currentUser?.name || 'HR Manager'}`
        };
      })
    );

    // Update attendance record ONLY after final HR approval
    if (decision === 'Approved') {
      const updatedRecord: DailyAttendanceRecord = {
        id: `ATT-CORR-${Date.now().toString().slice(-4)}`,
        employeeId: corr.employeeId,
        employeeName: corr.employeeName,
        date: corr.attendanceDate,
        shiftId: 'SHIFT-GEN',
        shiftName: 'General Day Shift (09:30 - 18:30)',
        checkInTime: corr.requestedCheckIn,
        checkOutTime: corr.requestedCheckOut,
        totalHours: corr.calculatedHours,
        netWorkingHours: corr.calculatedHours,
        breakDurationMinutes: 60,
        overtimeHours: corr.calculatedHours > 8 ? +(corr.calculatedHours - 8).toFixed(2) : 0,
        isLate: false,
        lateMinutes: 0,
        isEarlyDeparture: false,
        isMissingPunch: false,
        status: corr.requestedOutcome,
        workLocationType: 'Office',
        source: 'Correction Regularization'
      };

      setAttendanceRecords((prev) => [
        updatedRecord,
        ...prev.filter(
          (r) => !(r.date === corr.attendanceDate && r.employeeId === corr.employeeId)
        )
      ]);
    }

    showToast(
      `HR Final Action: Request ${
        decision === 'Approved' ? 'approved and attendance updated' : 'rejected'
      }.`
    );
  };

  // -------------------------------------------------------------
  // ACTION C: HR OUTAGE / MANUAL ATTENDANCE ENTRY
  // -------------------------------------------------------------
  const handleSaveHRManualEntry = (
    record: DailyAttendanceRecord,
    details: {
      outageType: string;
      incidentRef: string;
      supportingEvidenceRef: string;
      remarks: string;
    }
  ) => {
    setAttendanceRecords((prev) => [
      record,
      ...prev.filter(
        (r) => !(r.date === record.date && r.employeeId === record.employeeId)
      )
    ]);

    setHrManualAuditLogs((prev) => [
      {
        id: `LOG-MAN-${Date.now().toString().slice(-4)}`,
        recordId: record.id,
        employeeName: record.employeeName,
        attendanceDate: record.date,
        outageType: details.outageType,
        incidentRef: details.incidentRef,
        remarks: details.remarks,
        enteredBy: currentUser?.name || 'HR Admin',
        timestamp: new Date().toISOString()
      },
      ...prev
    ]);

    showToast(
      `HR Manual Entry recorded for ${record.employeeName} (${record.date}). Net Hours: ${record.netWorkingHours}h.`
    );
  };

  // -------------------------------------------------------------
  // OVERTIME SUBMISSION & WORKFLOW
  // -------------------------------------------------------------
  const handleSubmitOvertime = (e: React.FormEvent) => {
    e.preventDefault();
    const newOT: OvertimeEntry = {
      id: `OT-${Date.now().toString().slice(-4)}`,
      employeeId: currentUser?.employeeId || 'EMP-ME',
      employeeName: currentUser?.name || 'Current User',
      attendanceDate: overtimeForm.attendanceDate,
      shiftName: 'General Day Shift (09:30 - 18:30)',
      standardHours: overtimeForm.standardHours,
      actualHours: overtimeForm.actualHours,
      overtimeHours: overtimeForm.overtimeHours,
      overtimeReason: overtimeForm.overtimeReason,
      status: 'Pending Manager Approval',
      submittedAt: new Date().toISOString()
    };

    setOvertimeEntries((prev) => [newOT, ...prev]);
    showToast('Overtime submitted for Reporting Manager review.');
    setIsOvertimeModalOpen(false);
  };

  const handleManagerOTDecision = (ot: OvertimeEntry, decision: 'Approved' | 'Rejected') => {
    setOvertimeEntries((prev) =>
      prev.map((o) => {
        if (o.id !== ot.id) return o;
        return {
          ...o,
          status: decision === 'Approved' ? 'Manager Approved' : 'Manager Rejected',
          managerDecidedAt: new Date().toISOString(),
          managerComments: `Reviewed by ${currentUser?.name || 'Manager'}`
        };
      })
    );
    showToast(`Overtime ${decision === 'Approved' ? 'approved by Manager, pending HR' : 'rejected'}.`);
  };

  const handleHROTDecision = (ot: OvertimeEntry, decision: 'Approved' | 'Rejected') => {
    setOvertimeEntries((prev) =>
      prev.map((o) => {
        if (o.id !== ot.id) return o;
        return {
          ...o,
          status: decision === 'Approved' ? 'Ready for Future Payroll Integration' : 'Rejected',
          hrVerifiedAt: new Date().toISOString(),
          hrComments: `Verified by ${currentUser?.name || 'HR'}`
        };
      })
    );
    showToast(`HR Overtime Verification: Record ${decision === 'Approved' ? 'Verified' : 'Rejected'}.`);
  };

  // -------------------------------------------------------------
  // SHIFT MANAGEMENT
  // -------------------------------------------------------------
  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.name.trim() || !shiftForm.code.trim()) return;

    const newShift: ShiftDefinitionRecord = {
      id: `SHIFT-${Date.now().toString().slice(-4)}`,
      ...shiftForm
    };
    setShifts((prev) => [...prev, newShift]);
    showToast(`Shift "${shiftForm.name}" configured.`);
    setIsShiftModalOpen(false);
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.employeeName.trim()) return;

    const matchedShift = shifts.find((s) => s.id === scheduleForm.shiftId);
    const newEntry: ShiftScheduleEntry = {
      id: `SCH-${Date.now().toString().slice(-4)}`,
      employeeId: scheduleForm.employeeId || `EMP-${Date.now().toString().slice(-3)}`,
      employeeName: scheduleForm.employeeName,
      shiftId: scheduleForm.shiftId,
      shiftName: matchedShift?.name || 'Standard Shift',
      startDate: scheduleForm.startDate,
      endDate: scheduleForm.endDate,
      assignedBy: currentUser?.name || 'HR Admin',
      assignedAt: new Date().toISOString()
    };

    setSchedules((prev) => [newEntry, ...prev]);
    showToast(`Shift roster scheduled for "${scheduleForm.employeeName}".`);
    setIsScheduleModalOpen(false);
  };

  // -------------------------------------------------------------
  // METRICS FOR HR DASHBOARD
  // -------------------------------------------------------------
  const hrMetrics = useMemo(() => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter((r) => r.status === 'Present').length;
    const late = attendanceRecords.filter((r) => r.isLate).length;
    const missing = attendanceRecords.filter((r) => r.isMissingPunch).length;
    const pendingManagerCorr = corrections.filter(
      (c) => c.status === 'Pending Manager Approval'
    ).length;
    const pendingHRCorr = corrections.filter((c) => c.status === 'Pending HR Approval').length;
    const pendingOT = overtimeEntries.filter(
      (o) => o.status === 'Pending Manager Approval' || o.status === 'Manager Approved'
    ).length;

    return {
      total,
      present,
      late,
      missing,
      pendingManagerCorr,
      pendingHRCorr,
      pendingOT
    };
  }, [attendanceRecords, corrections, overtimeEntries]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between text-xs shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span className="font-medium">{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TOP ATTENDANCE ACTION BAR (HORIZONTAL COMPACT HEADER)      */}
      {/* ========================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left info: Icon, Date, Shift Name, Timings, Grace Period */}
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Today's Attendance ({todayStr})
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                  {punchWorkMode}
                </span>
                {/* State Tag */}
                {!myTodayRecord?.checkInTime ? (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    Not Checked In
                  </span>
                ) : !myTodayRecord?.checkOutTime ? (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Checked In at {myTodayRecord.checkInTime}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    Checked Out ({myTodayRecord.checkInTime} &rarr; {myTodayRecord.checkOutTime} · {myTodayRecord.netWorkingHours} hrs)
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                <span>Shift: <strong className="text-slate-700">General Day Shift</strong> (09:30 - 18:30)</span>
                <span>·</span>
                <span>15 min grace period (until 09:45)</span>
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Work Location Mode Select (when not checked in) */}
            {!myTodayRecord?.checkInTime && (
              <select
                value={punchWorkMode}
                onChange={(e) => setPunchWorkMode(e.target.value as any)}
                className="px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
              >
                <option value="Office">Office Location</option>
                <option value="Client Site">Client Site</option>
                <option value="Remote">Remote</option>
              </select>
            )}

            {/* STATE 1: NOT CHECKED IN -> Record Check-In Button */}
            {!myTodayRecord?.checkInTime ? (
              <button
                onClick={handleCheckIn}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <LogIn className="h-4 w-4" />
                <span>Record Check-In</span>
              </button>
            ) : !myTodayRecord?.checkOutTime ? (
              /* STATE 2: CHECKED IN -> Record Check-Out Button */
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-700 font-medium">
                  In at <span className="font-mono font-bold text-slate-900">{myTodayRecord.checkInTime}</span>
                </span>
                <button
                  onClick={handleCheckOut}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Record Check-Out</span>
                </button>
              </div>
            ) : (
              /* STATE 3: CHECKED OUT -> Complete status summary, buttons hidden */
              <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Today's Shift Complete ({myTodayRecord.netWorkingHours} hrs)</span>
              </span>
            )}

            {/* ACTION C: HR ONLY OUTAGE / MANUAL ENTRY BUTTON */}
            {isHR && (
              <button
                onClick={() => setIsHRManualModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldAlert size={14} />
                <span>+ Outage / Manual Entry</span>
              </button>
            )}

            {/* ACTION B: EMPLOYEE FORGOT CHECK-IN/OUT (CORRECTION) BUTTON */}
            <button
              onClick={() => setIsEmployeeCorrectionModalOpen(true)}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              Forgot Check-In/Out (Correction)
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. EMPLOYEE SELF-SERVICE VIEW                             */}
      {/* ========================================================= */}
      {!isHR && !isReportingManager ? (
        <div className="space-y-4">
          {/* Sub Navigation */}
          <div className="flex border-b border-slate-200 bg-white px-3 rounded-xl shadow-xs">
            <button
              onClick={() => setActiveEmpTab('history')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-colors ${
                activeEmpTab === 'history'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              My Attendance History (
              {
                attendanceRecords.filter(
                  (r) =>
                    r.employeeId === currentUser?.employeeId ||
                    r.employeeName === currentUser?.name
                ).length
              }
              )
            </button>
            <button
              onClick={() => setActiveEmpTab('corrections')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-colors ${
                activeEmpTab === 'corrections'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              My Correction Requests (
              {
                corrections.filter(
                  (c) =>
                    c.employeeId === currentUser?.employeeId ||
                    c.employeeName === currentUser?.name
                ).length
              }
              )
            </button>
            <button
              onClick={() => setActiveEmpTab('overtime')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-colors ${
                activeEmpTab === 'overtime'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              My Overtime (
              {
                overtimeEntries.filter(
                  (o) =>
                    o.employeeId === currentUser?.employeeId ||
                    o.employeeName === currentUser?.name
                ).length
              }
              )
            </button>
          </div>

          {/* TAB: My Attendance History */}
          {activeEmpTab === 'history' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
              <h4 className="font-bold text-slate-800 text-sm mb-4">My Attendance Log</h4>
              {attendanceRecords.filter(
                (r) =>
                  r.employeeId === currentUser?.employeeId ||
                  r.employeeName === currentUser?.name
              ).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Shift</th>
                        <th className="p-3">Check-In</th>
                        <th className="p-3">Check-Out</th>
                        <th className="p-3">Working Hours</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceRecords
                        .filter(
                          (r) =>
                            r.employeeId === currentUser?.employeeId ||
                            r.employeeName === currentUser?.name
                        )
                        .map((r) => (
                          <tr key={r.id}>
                            <td className="p-3 font-medium text-slate-800">{r.date}</td>
                            <td className="p-3">{r.shiftName}</td>
                            <td className="p-3 font-mono">{r.checkInTime || '--:--'}</td>
                            <td className="p-3 font-mono">{r.checkOutTime || '--:--'}</td>
                            <td className="p-3 font-bold text-slate-800">{r.netWorkingHours} hrs</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                {r.status}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500">{r.source}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-8 text-xs text-slate-400">
                  No attendance logged yet. Use the action bar at the top to check in.
                </p>
              )}
            </div>
          )}

          {/* TAB: My Correction Requests */}
          {activeEmpTab === 'corrections' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">My Correction Requests</h4>
                  <p className="text-[11px] text-slate-500">
                    Forgot check-in/out corrections follow Reporting Manager $\rightarrow$ HR Manager approval.
                  </p>
                </div>
                <button
                  onClick={() => setIsEmployeeCorrectionModalOpen(true)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                >
                  Request Correction
                </button>
              </div>

              {corrections.filter(
                (c) =>
                  c.employeeId === currentUser?.employeeId ||
                  c.employeeName === currentUser?.name
              ).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b">
                      <tr>
                        <th className="p-3">Request ID</th>
                        <th className="p-3">Attendance Date</th>
                        <th className="p-3">Correction Reason</th>
                        <th className="p-3">Requested In/Out</th>
                        <th className="p-3">Approval Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {corrections
                        .filter(
                          (c) =>
                            c.employeeId === currentUser?.employeeId ||
                            c.employeeName === currentUser?.name
                        )
                        .map((c) => (
                          <tr key={c.id}>
                            <td className="p-3 font-mono font-medium text-indigo-600">{c.id}</td>
                            <td className="p-3 font-semibold text-slate-800">{c.attendanceDate}</td>
                            <td className="p-3">{c.reasonCategory}</td>
                            <td className="p-3 font-mono">
                              {c.requestedCheckIn} &rarr; {c.requestedCheckOut} ({c.calculatedHours}h)
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  c.status === 'HR Approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : c.status.includes('Rejected')
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-8 text-xs text-slate-400">
                  No correction requests submitted. Click "Request Correction" to report a missed or incorrect punch.
                </p>
              )}
            </div>
          )}

          {/* TAB: My Overtime */}
          {activeEmpTab === 'overtime' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">My Overtime Submissions</h4>
                  <p className="text-[11px] text-slate-500">
                    Overtime follows Manager Approval $\rightarrow$ HR Verification.
                  </p>
                </div>
                <button
                  onClick={() => setIsOvertimeModalOpen(true)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                >
                  Request Overtime
                </button>
              </div>

              {overtimeEntries.filter(
                (o) =>
                  o.employeeId === currentUser?.employeeId ||
                  o.employeeName === currentUser?.name
              ).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b">
                      <tr>
                        <th className="p-3">ID</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Overtime Hours</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overtimeEntries
                        .filter(
                          (o) =>
                            o.employeeId === currentUser?.employeeId ||
                            o.employeeName === currentUser?.name
                        )
                        .map((o) => (
                          <tr key={o.id}>
                            <td className="p-3 font-mono font-medium text-indigo-600">{o.id}</td>
                            <td className="p-3 font-semibold text-slate-800">{o.attendanceDate}</td>
                            <td className="p-3 font-bold text-slate-900">+{o.overtimeHours} hrs</td>
                            <td className="p-3">{o.overtimeReason}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  o.status === 'Ready for Future Payroll Integration'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-8 text-xs text-slate-400">
                  No overtime logged for this session.
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================= */
        /* 2. HR & REPORTING MANAGER WORKFORCE INTERFACE             */
        /* ========================================================= */
        <div className="space-y-4">
          {/* Sub Navigation */}
          <div className="flex border-b border-slate-200 bg-white px-2 rounded-xl shadow-xs overflow-x-auto">
            <button
              onClick={() => setActiveHRTab('dashboard')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeHRTab === 'dashboard'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Workforce Dashboard
            </button>
            <button
              onClick={() => setActiveHRTab('timesheets')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeHRTab === 'timesheets'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Timesheet Records ({attendanceRecords.length})
            </button>
            <button
              onClick={() => setActiveHRTab('shifts')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeHRTab === 'shifts'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Shift Configuration ({shifts.length})
            </button>
            <button
              onClick={() => setActiveHRTab('scheduling')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeHRTab === 'scheduling'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Shift Scheduling ({schedules.length})
            </button>
            <button
              onClick={() => setActiveHRTab('overtime')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeHRTab === 'overtime'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Overtime Management ({overtimeEntries.length})
            </button>
            <button
              onClick={() => setActiveHRTab('corrections')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeHRTab === 'corrections'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Attendance Corrections ({corrections.length})
            </button>
            {isHR && (
              <button
                onClick={() => setActiveHRTab('manual-entries')}
                className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                  activeHRTab === 'manual-entries'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                HR Manual Entries ({hrManualAuditLogs.length})
              </button>
            )}
          </div>

          {/* TAB 1: WORKFORCE DASHBOARD */}
          {activeHRTab === 'dashboard' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Logged</span>
                  <div className="text-xl font-bold text-slate-800 mt-1">{hrMetrics.total}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] text-emerald-600 uppercase font-semibold">Present</span>
                  <div className="text-xl font-bold text-emerald-700 mt-1">{hrMetrics.present}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] text-amber-600 uppercase font-semibold">Late</span>
                  <div className="text-xl font-bold text-amber-700 mt-1">{hrMetrics.late}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] text-rose-600 uppercase font-semibold">Missing Punches</span>
                  <div className="text-xl font-bold text-rose-700 mt-1">{hrMetrics.missing}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] text-indigo-600 uppercase font-semibold">
                    Pending Manager Corrections
                  </span>
                  <div className="text-lg font-bold text-slate-800 mt-1">{hrMetrics.pendingManagerCorr}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] text-purple-600 uppercase font-semibold">
                    Pending HR Final Verification
                  </span>
                  <div className="text-lg font-bold text-slate-800 mt-1">{hrMetrics.pendingHRCorr}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] text-blue-600 uppercase font-semibold">
                    Overtime Awaiting Verification
                  </span>
                  <div className="text-lg font-bold text-slate-800 mt-1">{hrMetrics.pendingOT}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIMESHEETS */}
          {activeHRTab === 'timesheets' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              {attendanceRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b">
                      <tr>
                        <th className="p-3.5">Record ID</th>
                        <th className="p-3.5">Employee</th>
                        <th className="p-3.5">Date</th>
                        <th className="p-3.5">Shift</th>
                        <th className="p-3.5">Punches</th>
                        <th className="p-3.5">Net Hours</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceRecords.map((r) => (
                        <tr key={r.id}>
                          <td className="p-3.5 font-mono font-medium text-indigo-600">{r.id}</td>
                          <td className="p-3.5 font-semibold text-slate-800">{r.employeeName}</td>
                          <td className="p-3.5">{r.date}</td>
                          <td className="p-3.5">{r.shiftName}</td>
                          <td className="p-3.5 font-mono">
                            {r.checkInTime || '--:--'} &rarr; {r.checkOutTime || '--:--'}
                          </td>
                          <td className="p-3.5 font-bold text-slate-800">{r.netWorkingHours} hrs</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                              {r.status}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                r.source === 'Manual HR Entry'
                                  ? 'bg-purple-100 text-purple-800'
                                  : r.source === 'Correction Regularization'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {r.source}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-10 text-center text-xs text-slate-400">
                  No attendance records in current session. Use Top Action Bar or "+ Outage / Manual Entry" to record attendance.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SHIFT CONFIGURATION */}
          {activeHRTab === 'shifts' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={() => setIsShiftModalOpen(true)}
                  className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 flex items-center gap-1.5"
                >
                  <Plus size={15} />
                  Configure Shift
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {shifts.map((s) => (
                  <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{s.name}</h4>
                        <span className="text-xs font-mono text-indigo-600 font-medium">{s.code}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                        Active
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
                      <div>Timing: {s.startTime} - {s.endTime}</div>
                      <div>Working: {s.totalWorkingHours} hrs</div>
                      <div>Grace Period: {s.gracePeriodMinutes} mins</div>
                      <div>Break: {s.breakDurationMinutes} mins</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SHIFT SCHEDULING */}
          {activeHRTab === 'scheduling' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h4 className="font-bold text-slate-800 text-sm">Shift Rosters</h4>
                <button
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 flex items-center gap-1.5"
                >
                  <Plus size={15} />
                  Schedule Shift
                </button>
              </div>
              {schedules.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b">
                      <tr>
                        <th className="p-3">Schedule ID</th>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Shift</th>
                        <th className="p-3">Date Range</th>
                        <th className="p-3">Assigned By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {schedules.map((sch) => (
                        <tr key={sch.id}>
                          <td className="p-3 font-mono text-indigo-600 font-medium">{sch.id}</td>
                          <td className="p-3 font-semibold text-slate-800">{sch.employeeName}</td>
                          <td className="p-3">{sch.shiftName}</td>
                          <td className="p-3 font-mono">{sch.startDate} &rarr; {sch.endDate}</td>
                          <td className="p-3 text-slate-500">{sch.assignedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-8 text-xs text-slate-400">
                  No shift schedules created for this session.
                </p>
              )}
            </div>
          )}

          {/* TAB 5: OVERTIME MANAGEMENT */}
          {activeHRTab === 'overtime' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              {overtimeEntries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b">
                      <tr>
                        <th className="p-3.5">ID</th>
                        <th className="p-3.5">Employee</th>
                        <th className="p-3.5">Date</th>
                        <th className="p-3.5">Overtime Hours</th>
                        <th className="p-3.5">Reason</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Approval Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overtimeEntries.map((ot) => (
                        <tr key={ot.id}>
                          <td className="p-3.5 font-mono text-indigo-600 font-medium">{ot.id}</td>
                          <td className="p-3.5 font-semibold text-slate-800">{ot.employeeName}</td>
                          <td className="p-3.5">{ot.attendanceDate}</td>
                          <td className="p-3.5 font-bold text-slate-900">+{ot.overtimeHours} hrs</td>
                          <td className="p-3.5">{ot.overtimeReason}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                ot.status === 'Ready for Future Payroll Integration'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ot.status === 'Manager Approved'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ot.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-1.5">
                            {ot.status === 'Pending Manager Approval' && (
                              <>
                                <button
                                  onClick={() => handleManagerOTDecision(ot, 'Approved')}
                                  className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md font-semibold hover:bg-indigo-100"
                                >
                                  Manager Approve
                                </button>
                                <button
                                  onClick={() => handleManagerOTDecision(ot, 'Rejected')}
                                  className="px-2 py-1 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-semibold hover:bg-rose-100"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {ot.status === 'Manager Approved' && isHR && (
                              <>
                                <button
                                  onClick={() => handleHROTDecision(ot, 'Approved')}
                                  className="px-2 py-1 text-xs bg-emerald-600 text-white rounded-md font-semibold hover:bg-emerald-700"
                                >
                                  HR Final Verify
                                </button>
                                <button
                                  onClick={() => handleHROTDecision(ot, 'Rejected')}
                                  className="px-2 py-1 text-xs bg-rose-600 text-white rounded-md font-semibold hover:bg-rose-700"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-10 text-center text-xs text-slate-400">
                  No overtime entries submitted. Overtime claims follow: Reporting Manager $\rightarrow$ HR Verification $\rightarrow$ Payroll Readiness.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: ATTENDANCE CORRECTIONS (MANDATORY 2-TIER WORKFLOW) */}
          {activeHRTab === 'corrections' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              {corrections.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b">
                      <tr>
                        <th className="p-3.5">ID</th>
                        <th className="p-3.5">Employee</th>
                        <th className="p-3.5">Attendance Date</th>
                        <th className="p-3.5">Reason</th>
                        <th className="p-3.5">Requested In/Out</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Approval Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {corrections.map((c) => (
                        <tr key={c.id}>
                          <td className="p-3.5 font-mono text-indigo-600 font-medium">{c.id}</td>
                          <td className="p-3.5 font-semibold text-slate-800">{c.employeeName}</td>
                          <td className="p-3.5 font-medium text-slate-700">{c.attendanceDate}</td>
                          <td className="p-3.5">{c.reasonCategory}</td>
                          <td className="p-3.5 font-mono">
                            {c.requestedCheckIn} &rarr; {c.requestedCheckOut} ({c.calculatedHours}h)
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                c.status === 'HR Approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : c.status === 'Pending HR Approval'
                                  ? 'bg-purple-100 text-purple-800'
                                  : c.status.includes('Rejected')
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-1.5">
                            {/* Manager Stage */}
                            {c.status === 'Pending Manager Approval' && (
                              <>
                                <button
                                  onClick={() => handleManagerCorrectionDecision(c, 'Approved')}
                                  className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md font-semibold hover:bg-indigo-100"
                                >
                                  Manager Approve
                                </button>
                                <button
                                  onClick={() => handleManagerCorrectionDecision(c, 'Rejected')}
                                  className="px-2 py-1 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-semibold hover:bg-rose-100"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {/* HR Stage */}
                            {c.status === 'Pending HR Approval' && isHR && (
                              <>
                                <button
                                  onClick={() => handleHRCorrectionDecision(c, 'Approved')}
                                  className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded-md font-semibold hover:bg-emerald-700"
                                >
                                  HR Final Approve
                                </button>
                                <button
                                  onClick={() => handleHRCorrectionDecision(c, 'Rejected')}
                                  className="px-2.5 py-1 text-xs bg-rose-600 text-white rounded-md font-semibold hover:bg-rose-700"
                                >
                                  HR Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-10 text-center text-xs text-slate-400">
                  No employee correction requests in queue.
                </div>
              )}
            </div>
          )}

          {/* TAB 7: HR MANUAL ENTRIES AUDIT LOG */}
          {activeHRTab === 'manual-entries' && isHR && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              {hrManualAuditLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b">
                      <tr>
                        <th className="p-3.5">Log ID</th>
                        <th className="p-3.5">Employee</th>
                        <th className="p-3.5">Attendance Date</th>
                        <th className="p-3.5">Exception / Outage Type</th>
                        <th className="p-3.5">Incident Ref</th>
                        <th className="p-3.5">Remarks</th>
                        <th className="p-3.5">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {hrManualAuditLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="p-3.5 font-mono text-purple-600 font-medium">{log.id}</td>
                          <td className="p-3.5 font-semibold text-slate-800">{log.employeeName}</td>
                          <td className="p-3.5">{log.attendanceDate}</td>
                          <td className="p-3.5 font-medium text-slate-800">{log.outageType}</td>
                          <td className="p-3.5 font-mono">{log.incidentRef || '—'}</td>
                          <td className="p-3.5 text-slate-600">{log.remarks}</td>
                          <td className="p-3.5 text-slate-500 font-medium">{log.enteredBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-10 text-center text-xs text-slate-400">
                  No manual attendance entries recorded by HR yet. Click "+ Outage / Manual Entry" at the top to record attendance during biometric or system outages.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL B: EMPLOYEE FORGOT CHECK-IN/OUT CORRECTION          */}
      {/* ========================================================= */}
      <EmployeeCorrectionModal
        isOpen={isEmployeeCorrectionModalOpen}
        onClose={() => setIsEmployeeCorrectionModalOpen(false)}
        existingRecords={attendanceRecords}
        onSubmitCorrection={handleSaveCorrection}
      />

      {/* ========================================================= */}
      {/* MODAL C: HR OUTAGE / MANUAL ATTENDANCE ENTRY              */}
      {/* ========================================================= */}
      <HRManualEntryModal
        isOpen={isHRManualModalOpen}
        onClose={() => setIsHRManualModalOpen(false)}
        shifts={shifts}
        onSaveManualEntry={handleSaveHRManualEntry}
      />

      {/* Modal: Schedule Shift */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Assign Shift to Employee</h3>
              <button onClick={() => setIsScheduleModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Employee Name *</label>
                <input
                  type="text"
                  required
                  value={scheduleForm.employeeName}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, employeeName: e.target.value })}
                  placeholder="e.g. Archana"
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Shift Type</label>
                <select
                  value={scheduleForm.shiftId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, shiftId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} - {s.endTime})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.startDate}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.endDate}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-3 py-1.5 border rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold"
                >
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Shift */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Configure Shift</h3>
              <button onClick={() => setIsShiftModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Shift Name *</label>
                  <input
                    type="text"
                    required
                    value={shiftForm.name}
                    onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                    placeholder="e.g. Afternoon Shift"
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Shift Code *</label>
                  <input
                    type="text"
                    required
                    value={shiftForm.code}
                    onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value })}
                    placeholder="e.g. AFT-01"
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-3 py-1.5 border rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold"
                >
                  Save Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Request Overtime */}
      {isOvertimeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Submit Overtime Request</h3>
              <button onClick={() => setIsOvertimeModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitOvertime} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={overtimeForm.attendanceDate}
                  onChange={(e) => setOvertimeForm({ ...overtimeForm, attendanceDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Actual Hours *</label>
                  <input
                    type="number"
                    step="0.5"
                    value={overtimeForm.actualHours}
                    onChange={(e) => {
                      const actual = Number(e.target.value);
                      setOvertimeForm({
                        ...overtimeForm,
                        actualHours: actual,
                        overtimeHours: Math.max(0, +(actual - overtimeForm.standardHours).toFixed(2))
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Overtime Hours</label>
                  <input
                    type="number"
                    readOnly
                    value={overtimeForm.overtimeHours}
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason for Overtime *</label>
                <textarea
                  rows={2}
                  required
                  value={overtimeForm.overtimeReason}
                  onChange={(e) => setOvertimeForm({ ...overtimeForm, overtimeReason: e.target.value })}
                  placeholder="Explain why overtime was performed..."
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsOvertimeModalOpen(false)}
                  className="px-3 py-1.5 border rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold"
                >
                  Submit Overtime
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
