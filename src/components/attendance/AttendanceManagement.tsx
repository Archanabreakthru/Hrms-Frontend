// Celestial HRMS - Attendance & Shifts (Corrected Targeted Implementation)
// 1. Top Attendance Action Bar with Live Punch Actions (State 1: Not Checked In, State 2: Checked In -> Record Check-Out, State 3: Checked Out with working hours)
// 2. Clear Separation of 3 Distinct Actions:
//    A. Normal Check-in / Check-out (Top action bar)
//    B. Employee Forgot Check-in / Check-out Correction (EmployeeCorrectionModal)
//    C. HR Outage / Manual Attendance Entry (HRManualEntryModal - 4 structured sections)
// 3. HR Workforce Interface vs Employee Self-Service Interface
// 4. In-Memory Session State only (No Database, No Backend, Clean Empty States)

import React, { useState, useMemo, useEffect } from 'react';
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
import { clientAttendanceIntegration } from '../clients/clientAttendanceIntegration';
import { db, subscribeToDB } from '../../db/storage';
import { attendanceApi } from '../../services/attendanceApi';
import { employeeApi } from '../../services/employeeApi';

interface AttendanceManagementProps {
  navContext?: any;
  onOpenPolicies?: () => void;
}

export const AttendanceManagement: React.FC<AttendanceManagementProps> = ({ onOpenPolicies }) => {
  const { currentUser } = useAuth();

  // Role resolution
  const isHR =
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'hr_admin' ||
    currentUser?.role === 'senior_manager';

  const isReportingManager = currentUser?.role === 'reporting_manager';

  // Navigation tab state for HR (Workforce Dashboard, Timesheet Records, Shift Configuration, Shift Scheduling, Overtime Management, Attendance Corrections, HR Manual Entries)
  const [activeHRTab, setActiveHRTab] = useState<
    'dashboard' | 'timesheets' | 'shifts' | 'scheduling' | 'overtime' | 'corrections' | 'manual-entries'
  >('dashboard');

  // Navigation tab state for Employee
  const [activeEmpTab, setActiveEmpTab] = useState<'history' | 'corrections' | 'overtime'>('history');

  // Shift & Schedule Form State
  const [shifts, setShifts] = useState<ShiftDefinitionRecord[]>([]);
  const [schedules, setSchedules] = useState<ShiftScheduleEntry[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<DailyAttendanceRecord[]>([]);
  const [isLoadingLiveAttendance, setIsLoadingLiveAttendance] = useState(false);
  const [liveAttendanceError, setLiveAttendanceError] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<AttendanceCorrectionEntry[]>([]);
  const [overtimeEntries, setOvertimeEntries] = useState<OvertimeEntry[]>([]);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch live attendance records, shifts, schedules, regularizations, and employees from live APIs
  const fetchLiveRecords = async () => {
    setIsLoadingLiveAttendance(true);
    try {
      const [records, shiftsList, schedulesList, regularizationsList, empRes] = await Promise.all([
        attendanceApi.listRecords().catch(() => []),
        attendanceApi.listShifts().catch(() => []),
        attendanceApi.listShiftSchedules().catch(() => []),
        attendanceApi.listRegularizations().catch(() => []),
        employeeApi.list({ limit: 100 }).catch(() => ({ employees: [] })),
      ]);

      const empMap = new Map<string, string>();
      const employeeOptions: Array<{ id: string; name: string }> = [];
      (empRes.employees || []).forEach((e) => {
        const fullName = `${e.firstName} ${e.lastName}`.trim();
        empMap.set(e.id, fullName);
        employeeOptions.push({ id: e.id, name: fullName });
      });
      setAllEmployees(employeeOptions);

      const shiftMap = new Map<string, string>();
      shiftsList.forEach((s) => {
        shiftMap.set(s.id, s.name);
        shiftMap.set(s.code, s.name);
      });

      if (shiftsList.length > 0) {
        setShifts(
          shiftsList.map((s) => ({
            id: s.id,
            name: s.name,
            code: s.code,
            startTime: s.startTime,
            endTime: s.endTime,
            gracePeriodMinutes: s.gracePeriodMinutes,
            lateArrivalThresholdMinutes: 15,
            earlyDepartureThresholdMinutes: 15,
            breakDurationMinutes: s.breakDurationMinutes,
            totalWorkingHours: s.totalWorkingHours,
            workdaysCount: 5,
            isOvernight: s.isOvernight,
            weeklyOffDays: s.weeklyOffDays,
            isActive: s.isActive ?? true,
          }))
        );
      } else {
        setShifts([]);
      }

      // Map Shift Schedules
      const mappedSchedules: ShiftScheduleEntry[] = (schedulesList || []).map((sc: any) => ({
        id: sc.id,
        employeeId: sc.employeeId,
        employeeName: empMap.get(sc.employeeId) || sc.employeeId,
        shiftId: sc.shiftId,
        shiftName: shiftMap.get(sc.shiftId) || sc.shiftName || 'Standard Shift',
        startDate: sc.effectiveFrom ? String(sc.effectiveFrom).split('T')[0] : '',
        endDate: sc.effectiveTo ? String(sc.effectiveTo).split('T')[0] : '',
        assignedBy: sc.assignedBy || 'HR Admin',
        assignedAt: sc.createdAt || new Date().toISOString()
      }));
      setSchedules(mappedSchedules);

      // Map Attendance Records
      const mappedRecords: DailyAttendanceRecord[] = (records || []).map((r) => {
        const validSource = (r.source === 'Manual HR Entry'
          ? 'Manual HR Entry'
          : r.source === 'Attendance Correction'
            ? 'Correction Regularization'
            : 'Web Punch') as 'Web Punch' | 'Manual HR Entry' | 'Correction Regularization';

        return {
          id: r.id,
          employeeId: r.employeeId,
          employeeName: empMap.get(r.employeeId) || r.employeeId,
          date: r.date,
          shiftId: r.shiftId || 'SHIFT-GEN',
          shiftName: shiftMap.get(r.shiftId) || 'General Day Shift (09:30 - 18:30)',
          checkInTime: r.checkInTime,
          checkOutTime: r.checkOutTime,
          totalHours: r.totalHoursWorked || 0,
          netWorkingHours: r.totalHoursWorked || 0,
          breakDurationMinutes: 60,
          overtimeHours: r.overtimeHours || 0,
          isLate: Boolean(r.isLate),
          lateMinutes: r.lateMinutes || 0,
          isEarlyDeparture: Boolean(r.isEarlyDeparture),
          isMissingPunch: Boolean(r.checkInTime && !r.checkOutTime),
          status: (r.status as AttendancePunchStatus) || 'Present',
          workLocationType: (r.workMode === 'Client Site' ? 'Client Site' : r.workMode === 'Remote' ? 'Remote' : 'Office') as 'Client Site' | 'Remote' | 'Office',
          source: validSource,
        };
      });
      setAttendanceRecords(mappedRecords);

      // Map Regularizations
      const mappedCorrections: AttendanceCorrectionEntry[] = (regularizationsList || []).map((reg: any) => {
        let calcHours = 0;
        if (reg.requestedCheckIn && reg.requestedCheckOut) {
          const inT = reg.requestedCheckIn.includes('T') ? reg.requestedCheckIn.split('T')[1].substring(0, 5) : reg.requestedCheckIn;
          const outT = reg.requestedCheckOut.includes('T') ? reg.requestedCheckOut.split('T')[1].substring(0, 5) : reg.requestedCheckOut;
          const [inH, inM] = inT.split(':').map(Number);
          const [outH, outM] = outT.split(':').map(Number);
          let totalMins = outH * 60 + outM - (inH * 60 + inM);
          if (totalMins < 0) totalMins += 24 * 60;
          calcHours = Math.max(0, +(totalMins / 60 - 1).toFixed(2));
        }

        const reqIn = reg.requestedCheckIn ? (reg.requestedCheckIn.includes('T') ? reg.requestedCheckIn.split('T')[1].substring(0, 5) : reg.requestedCheckIn) : '09:30';
        const reqOut = reg.requestedCheckOut ? (reg.requestedCheckOut.includes('T') ? reg.requestedCheckOut.split('T')[1].substring(0, 5) : reg.requestedCheckOut) : '18:30';

        return {
          id: reg.id,
          employeeId: reg.employeeId,
          employeeName: empMap.get(reg.employeeId) || reg.employeeId,
          attendanceDate: reg.targetDate ? String(reg.targetDate).split('T')[0] : '',
          originalCheckIn: undefined,
          originalCheckOut: undefined,
          originalStatus: 'Absent',
          requestedCheckIn: reqIn,
          requestedCheckOut: reqOut,
          requestedOutcome: calcHours >= 8 ? 'Present' : 'Half Day',
          calculatedHours: calcHours,
          reasonCategory: reg.reason || 'Correction Request',
          reasonRemarks: reg.reason || '',
          status: (reg.status as CorrectionRequestStatus) || 'Pending Manager Approval',
          managerComments: reg.managerRemarks,
          managerDecision: reg.status === 'Pending HR Approval' || reg.status === 'HR Approved' ? 'Approved' : reg.status === 'Manager Rejected' ? 'Rejected' : undefined,
          hrComments: reg.hrRemarks,
          hrDecision: reg.status === 'HR Approved' ? 'Approved' : reg.status === 'HR Rejected' ? 'Rejected' : undefined,
          submittedAt: reg.createdAt || new Date().toISOString()
        };
      });
      setCorrections(mappedCorrections);

      // Derive Overtime Entries from Attendance Records that had overtimeHours > 0
      const derivedOT: OvertimeEntry[] = mappedRecords
        .filter((r) => r.overtimeHours > 0)
        .map((r) => ({
          id: `OT-${r.id}`,
          employeeId: r.employeeId,
          employeeName: r.employeeName,
          attendanceDate: r.date,
          shiftName: r.shiftName,
          standardHours: 8,
          actualHours: +(r.netWorkingHours + 8).toFixed(2),
          overtimeHours: r.overtimeHours,
          overtimeReason: 'Extended operational workload',
          status: 'Ready for Future Payroll Integration',
          submittedAt: new Date().toISOString()
        }));
      setOvertimeEntries(derivedOT);

      setLiveAttendanceError(null);
    } catch (err: any) {
      console.error('Failed to fetch live attendance from Attendance Service:', err);
      setLiveAttendanceError(err?.message || 'Unable to connect to live Attendance Service.');
    } finally {
      setIsLoadingLiveAttendance(false);
    }
  };

  useEffect(() => {
    fetchLiveRecords();

    const unsubInteg = clientAttendanceIntegration.subscribe(() => {
      fetchLiveRecords();
    });

    return () => {
      unsubInteg();
    };
  }, [currentUser]);

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
  const handleCheckIn = async () => {
    if (myTodayRecord?.checkInTime) return; // Prevent duplicate check-in

    const empId = currentUser?.employeeId || 'EMP-001';
    const now = new Date();
    const timeStr = now.toTimeString().substring(0, 5);

    try {
      await attendanceApi.punchClock({
        employeeId: empId,
        date: todayStr,
        punchType: 'IN',
        timestamp: now.toISOString(),
        workMode: punchWorkMode === 'Client Site' ? 'Client_Site' : punchWorkMode === 'Remote' ? 'Remote' : 'Office',
        shiftId: shifts[0]?.id || 'SHIFT-GEN',
      });
      await fetchLiveRecords();
      showToast(`Check-In recorded at ${timeStr}. State transitioned to Checked In.`);
    } catch (err: any) {
      console.error('Check-in error:', err);
      showToast(`Check-in failed: ${err?.message || 'Attendance Service error'}`, 'info');
    }
  };

  const handleCheckOut = async () => {
    if (!myTodayRecord?.checkInTime || myTodayRecord.checkOutTime) return; // Prevent invalid/duplicate checkout

    const empId = currentUser?.employeeId || 'EMP-001';
    const now = new Date();
    const timeStr = now.toTimeString().substring(0, 5);

    try {
      await attendanceApi.punchClock({
        employeeId: empId,
        date: todayStr,
        punchType: 'OUT',
        timestamp: now.toISOString(),
        workMode: punchWorkMode === 'Client Site' ? 'Client_Site' : punchWorkMode === 'Remote' ? 'Remote' : 'Office',
        shiftId: shifts[0]?.id || 'SHIFT-GEN',
      });
      await fetchLiveRecords();
      showToast(`Check-Out recorded at ${timeStr}.`);
    } catch (err: any) {
      console.error('Check-out error:', err);
      showToast(`Check-out failed: ${err?.message || 'Attendance Service error'}`, 'info');
    }
  };

  // -------------------------------------------------------------
  // ACTION B: EMPLOYEE FORGOT CHECK-IN/OUT (CORRECTION WORKFLOW)
  // -------------------------------------------------------------
  const handleSaveCorrection = async (newCorr: AttendanceCorrectionEntry) => {
    try {
      const empId = currentUser?.employeeId || newCorr.employeeId || 'EMP-001';
      const checkInISO = newCorr.requestedCheckIn ? `${newCorr.attendanceDate}T${newCorr.requestedCheckIn}:00.000Z` : `${newCorr.attendanceDate}T09:30:00.000Z`;
      const checkOutISO = newCorr.requestedCheckOut ? `${newCorr.attendanceDate}T${newCorr.requestedCheckOut}:00.000Z` : `${newCorr.attendanceDate}T18:30:00.000Z`;

      await attendanceApi.requestRegularization({
        employeeId: empId,
        targetDate: newCorr.attendanceDate,
        requestedCheckIn: checkInISO,
        requestedCheckOut: checkOutISO,
        reason: `${newCorr.reasonCategory}: ${newCorr.reasonRemarks}`,
      });
      await fetchLiveRecords();
      showToast('Correction submitted. Routed to Reporting Manager for review.');
    } catch (err: any) {
      console.error('Regularization request failed:', err);
      showToast(`Failed to submit correction: ${err?.message || 'Attendance Service error'}`, 'info');
    }
  };

  const handleManagerCorrectionDecision = async (
    corr: AttendanceCorrectionEntry,
    decision: 'Approved' | 'Rejected'
  ) => {
    try {
      await attendanceApi.reviewRegularization(
        corr.id,
        decision,
        `Reviewed by ${currentUser?.name || 'Reporting Manager'}`,
        'manager'
      );
      await fetchLiveRecords();
      showToast(
        `Correction request ${decision === 'Approved' ? 'approved and forwarded to HR Manager' : 'rejected'}.`
      );
    } catch (err: any) {
      console.error('Manager review error:', err);
      showToast(`Review failed: ${err?.message || 'Service error'}`, 'info');
    }
  };

  const handleHRCorrectionDecision = async (
    corr: AttendanceCorrectionEntry,
    decision: 'Approved' | 'Rejected'
  ) => {
    try {
      await attendanceApi.reviewRegularization(
        corr.id,
        decision,
        `Final approval by ${currentUser?.name || 'HR Manager'}`,
        'hr'
      );
      await fetchLiveRecords();
      showToast(
        `HR Final Action: Request ${decision === 'Approved' ? 'approved and attendance updated in PostgreSQL' : 'rejected'}.`
      );
    } catch (err: any) {
      console.error('HR review error:', err);
      showToast(`Review failed: ${err?.message || 'Service error'}`, 'info');
    }
  };

  // -------------------------------------------------------------
  // ACTION C: HR OUTAGE / MANUAL ATTENDANCE ENTRY
  // -------------------------------------------------------------
  const handleSaveHRManualEntry = async (
    record: DailyAttendanceRecord,
    details: {
      outageType: string;
      incidentRef: string;
      supportingEvidenceRef: string;
      remarks: string;
    }
  ) => {
    try {
      const checkInISO = `${record.date}T${record.checkInTime || '09:30'}:00.000Z`;
      const checkOutISO = `${record.date}T${record.checkOutTime || '18:30'}:00.000Z`;
      const backendStatus = record.status === 'Half Day' ? 'Half_Day' : (record.status as any);

      await attendanceApi.createManualEntry({
        employeeId: record.employeeId,
        date: record.date,
        checkInTime: checkInISO,
        checkOutTime: checkOutISO,
        shiftId: record.shiftId || 'SHIFT-GEN',
        workMode: record.workLocationType === 'Client Site' ? 'Client_Site' : record.workLocationType === 'Remote' ? 'Remote' : 'Office',
        status: backendStatus,
        notes: `[${details.outageType}] Ref: ${details.incidentRef || 'N/A'}. Remarks: ${details.remarks || ''}`,
      });
      showToast('Manual attendance entry saved successfully to Attendance Service.');
    } catch (err: any) {
      console.warn('Backend manual entry sync error:', err);
      showToast(`Saved locally: ${err?.message || 'Attendance Service unavailable'}`, 'info');
    }

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
  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.name.trim() || !shiftForm.code.trim()) return;

    try {
      const created = await attendanceApi.createShift({
        code: shiftForm.code.toUpperCase(),
        name: shiftForm.name,
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        gracePeriodMins: shiftForm.gracePeriodMinutes,
        halfDayThreshold: 4.5,
        fullDayThreshold: shiftForm.totalWorkingHours,
        isOvernight: shiftForm.isOvernight,
        weeklyOffDays: shiftForm.weeklyOffDays,
      });

      setShifts((prev) => [
        ...prev,
        {
          id: created.id,
          name: created.name,
          code: created.code,
          startTime: created.startTime,
          endTime: created.endTime,
          gracePeriodMinutes: created.gracePeriodMinutes,
          lateArrivalThresholdMinutes: 15,
          earlyDepartureThresholdMinutes: 15,
          breakDurationMinutes: created.breakDurationMinutes,
          totalWorkingHours: created.totalWorkingHours,
          workdaysCount: 6,
          isOvernight: created.isOvernight,
          weeklyOffDays: created.weeklyOffDays,
          isActive: created.isActive ?? true,
        },
      ]);
      showToast(`Shift "${shiftForm.name}" created and synced with backend.`);
    } catch (err: any) {
      console.warn('Backend shift creation error, saving locally:', err);
      const newShift: ShiftDefinitionRecord = {
        id: `SHIFT-${Date.now().toString().slice(-4)}`,
        ...shiftForm,
      };
      setShifts((prev) => [...prev, newShift]);
      showToast(`Shift "${shiftForm.name}" configured.`);
    }

    setIsShiftModalOpen(false);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.employeeName.trim() || !scheduleForm.employeeId.trim()) return;

    try {
      await attendanceApi.createShiftSchedule({
        employeeId: scheduleForm.employeeId,
        shiftId: scheduleForm.shiftId,
        effectiveFrom: scheduleForm.startDate,
        effectiveTo: scheduleForm.endDate,
      });
      await fetchLiveRecords();
      showToast(`Shift roster scheduled in database for "${scheduleForm.employeeName}".`);
    } catch (err: any) {
      console.error('Failed to create shift schedule:', err);
      showToast(`Failed to schedule shift: ${err?.message || 'Attendance Service error'}`, 'info');
    }

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
      {/* Live Service Offline / Error Banner */}
      {liveAttendanceError && (
        <div className="p-3.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span className="font-medium">
              <strong>Attendance Service Notice:</strong> {liveAttendanceError} (Displaying offline/cached view).
            </span>
          </div>
          <button
            onClick={() => setLiveAttendanceError(null)}
            className="text-amber-700 hover:text-amber-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

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
              className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-colors ${activeEmpTab === 'history'
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
              className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-colors ${activeEmpTab === 'corrections'
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
              className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-colors ${activeEmpTab === 'overtime'
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
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.status === 'HR Approved'
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
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${o.status === 'Ready for Future Payroll Integration'
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
              className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${activeHRTab === 'dashboard'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              Workforce Dashboard
            </button>
            <button
              onClick={() => setActiveHRTab('timesheets')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${activeHRTab === 'timesheets'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              Timesheet Records ({attendanceRecords.length})
            </button>
            <button
              onClick={() => setActiveHRTab('shifts')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${activeHRTab === 'shifts'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              Shift Configuration ({shifts.length})
            </button>
            <button
              onClick={() => setActiveHRTab('scheduling')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${activeHRTab === 'scheduling'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              Shift Scheduling ({schedules.length})
            </button>
            <button
              onClick={() => setActiveHRTab('overtime')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${activeHRTab === 'overtime'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              Overtime Management ({overtimeEntries.length})
            </button>
            <button
              onClick={() => setActiveHRTab('corrections')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${activeHRTab === 'corrections'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              Attendance Corrections ({corrections.length})
            </button>
            {isHR && (
              <button
                onClick={() => setActiveHRTab('manual-entries')}
                className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${activeHRTab === 'manual-entries'
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
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${r.source === 'Manual HR Entry'
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
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${ot.status === 'Ready for Future Payroll Integration'
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
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.status === 'HR Approved'
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
                <label className="block text-slate-700 font-semibold mb-1">Employee *</label>
                {allEmployees.length > 0 ? (
                  <select
                    required
                    value={scheduleForm.employeeId}
                    onChange={(e) => {
                      const empId = e.target.value;
                      const emp = allEmployees.find((x) => x.id === empId);
                      setScheduleForm({
                        ...scheduleForm,
                        employeeId: empId,
                        employeeName: emp?.name || '',
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                  >
                    <option value="">Select Employee</option>
                    {allEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={scheduleForm.employeeName}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, employeeName: e.target.value, employeeId: e.target.value })}
                    placeholder="e.g. EMP-001"
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                )}
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
