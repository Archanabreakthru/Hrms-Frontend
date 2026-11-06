import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LogIn,
  LogOut,
  CheckCircle2,
  Calendar,
  Coffee,
  AlertCircle,
  Loader2,
  Clock,
  MapPin
} from 'lucide-react';
import { useAuth } from '../../services/authContext';
import { db, subscribeToDB } from '../../db/storage';
import { hrmsService } from '../../services/hrmsService';
import { AttendanceRecord, ShiftDefinition, Holiday, LeaveApplication } from '../../types/hrms';
import { clientAttendanceIntegration } from '../clients/clientAttendanceIntegration';

export type GlobalAttendanceStatus =
  | 'NOT_CHECKED_IN'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'ON_LEAVE'
  | 'HOLIDAY'
  | 'WEEKLY_OFF';

interface GlobalAttendanceState {
  status: GlobalAttendanceStatus;
  label: string;
  sublabel?: string;
  record?: AttendanceRecord;
  holidayName?: string;
  leaveType?: string;
}

export const GlobalAttendanceAction: React.FC = () => {
  const { currentUser } = useAuth();
  const [dbTick, setDbTick] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Subscribe to storage changes so any attendance action across any module / persona switcher immediately syncs
  useEffect(() => {
    return subscribeToDB(() => {
      setDbTick((t) => t + 1);
    });
  }, []);

  // Compute today's date formatted as YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [dbTick]);

  // Compute attendance status based on existing records, leaves, holidays, and shift weekly offs
  const attendanceState = useMemo<GlobalAttendanceState>(() => {
    void dbTick;
    const employeeId = currentUser?.employeeId;

    if (!employeeId) {
      return {
        status: 'NOT_CHECKED_IN',
        label: 'Check In'
      };
    }

    // 1. Check if an AttendanceRecord exists for today
    const records = db.getAttendanceRecords();
    const todayRecord = records.find(
      (r) => r.employeeId === employeeId && r.date === todayStr
    );

    if (todayRecord) {
      if (todayRecord.checkOutTime) {
        return {
          status: 'CHECKED_OUT',
          label: 'Checked Out',
          sublabel: `${todayRecord.checkInTime} - ${todayRecord.checkOutTime} (${todayRecord.totalHoursWorked || 0}h)`,
          record: todayRecord
        };
      }
      if (todayRecord.checkInTime) {
        return {
          status: 'CHECKED_IN',
          label: 'Check Out',
          sublabel: `Since ${todayRecord.checkInTime}`,
          record: todayRecord
        };
      }
    }

    // 2. Check if user is on approved leave today
    const leaveApps = db.getLeaveApplications();
    const approvedLeave = leaveApps.find(
      (l) =>
        l.employeeId === employeeId &&
        l.status === 'Approved' &&
        l.startDate <= todayStr &&
        todayStr <= l.endDate
    );

    if (approvedLeave) {
      const leaveType = db.getLeaveTypes().find((lt) => lt.id === approvedLeave.leaveTypeId);
      return {
        status: 'ON_LEAVE',
        label: 'On Leave',
        sublabel: leaveType ? leaveType.name : 'Approved Leave',
        leaveType: leaveType?.name
      };
    }

    // 3. Check if today is a public / company holiday
    const holidays = db.getHolidays();
    const holiday = holidays.find((h) => h.date === todayStr);
    if (holiday) {
      return {
        status: 'HOLIDAY',
        label: 'Holiday',
        sublabel: holiday.name,
        holidayName: holiday.name
      };
    }

    // 4. Check if today is a weekly off day for the employee's shift
    const emp = db.getEmployeeById(employeeId);
    const shifts = db.getShifts();
    const empShift = shifts.find((s) => s.id === emp?.shiftId) || shifts[0];
    const dayOfWeek = new Date().getDay(); // 0 = Sun, 6 = Sat
    const isWeeklyOff = empShift?.weeklyOffDays?.includes(dayOfWeek) ?? (dayOfWeek === 0 || dayOfWeek === 6);

    if (isWeeklyOff) {
      return {
        status: 'WEEKLY_OFF',
        label: 'Weekly Off',
        sublabel: 'Scheduled Rest Day'
      };
    }

    // 5. Default state: Not checked in yet
    return {
      status: 'NOT_CHECKED_IN',
      label: 'Check In',
      sublabel: empShift ? `${empShift.name} (${empShift.startTime})` : undefined
    };
  }, [currentUser, todayStr, dbTick]);

  // Handle Check In
  const handleCheckIn = useCallback(async () => {
    if (isProcessing) return;
    if (!currentUser?.employeeId) {
      setFeedbackMessage({ type: 'error', text: 'No employee account mapped to active session.' });
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }

    setIsProcessing(true);
    try {
      const res = hrmsService.punchAttendance(
        currentUser.employeeId,
        'check-in',
        currentUser.id,
        currentUser.name,
        { workMode: 'Office' }
      );

      if (res.success) {
        setFeedbackMessage({ type: 'success', text: res.message || 'Check-In recorded successfully!' });
      } else {
        setFeedbackMessage({ type: 'error', text: res.error || res.message || 'Failed to record Check-In.' });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Unexpected error recording Check-In.' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  }, [currentUser, isProcessing]);

  // Handle Check Out
  const handleCheckOut = useCallback(async () => {
    if (isProcessing) return;
    if (!currentUser?.employeeId) {
      setFeedbackMessage({ type: 'error', text: 'No employee account mapped to active session.' });
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }

    setIsProcessing(true);
    try {
      const res = hrmsService.punchAttendance(
        currentUser.employeeId,
        'check-out',
        currentUser.id,
        currentUser.name,
        { workMode: 'Office' }
      );

      if (res.success) {
        setFeedbackMessage({ type: 'success', text: res.message || 'Check-Out recorded successfully!' });
        if (res.record) {
          clientAttendanceIntegration.syncAttendanceRecord({
            id: res.record.id,
            employeeId: res.record.employeeId,
            employeeName: currentUser.name,
            date: res.record.date,
            shiftId: res.record.shiftId || 'SHIFT-GEN',
            shiftName: 'General Day Shift (09:30 - 18:30)',
            checkInTime: res.record.checkInTime,
            checkOutTime: res.record.checkOutTime,
            totalHours: res.record.totalHoursWorked || 0,
            netWorkingHours: res.record.totalHoursWorked || 0,
            breakDurationMinutes: 60,
            overtimeHours: res.record.overtimeHours || 0,
            isLate: Boolean(res.record.isLate),
            lateMinutes: res.record.lateMinutes || 0,
            isEarlyDeparture: Boolean(res.record.isEarlyDeparture),
            isMissingPunch: false,
            status: (res.record.status as any) || 'Present',
            workLocationType: res.record.workMode === 'Client Site' ? 'Client Site' : 'Office',
            source: 'Web Punch'
          });
        }
      } else {
        setFeedbackMessage({ type: 'error', text: res.error || res.message || 'Failed to record Check-Out.' });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Unexpected error recording Check-Out.' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  }, [currentUser, isProcessing]);

  // Render button or indicator based on attendance state
  return (
    <div className="relative inline-flex items-center">
      {/* Toast Feedback popup */}
      {feedbackMessage && (
        <div
          role="status"
          className={`absolute top-full right-0 mt-2 z-50 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg border flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : 'bg-rose-900 text-rose-100 border-rose-700'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* State 1: NOT CHECKED IN -> Green Check In Button */}
      {attendanceState.status === 'NOT_CHECKED_IN' && (
        <button
          type="button"
          onClick={handleCheckIn}
          disabled={isProcessing}
          title={attendanceState.sublabel ? `Check In for today (${attendanceState.sublabel})` : 'Check In for today'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
        >
          {isProcessing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogIn className="h-3.5 w-3.5" />
          )}
          <span>Check In</span>
        </button>
      )}

      {/* State 2: CHECKED IN -> Red Check Out Button */}
      {attendanceState.status === 'CHECKED_IN' && (
        <button
          type="button"
          onClick={handleCheckOut}
          disabled={isProcessing}
          title={`Checked in at ${attendanceState.record?.checkInTime}. Click to Check Out.`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:ring-offset-1"
        >
          {isProcessing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          <span>Check Out</span>
          {attendanceState.record?.checkInTime && (
            <span className="hidden sm:inline-block font-mono text-[11px] opacity-90 pl-1 border-l border-rose-400/40">
              {attendanceState.record.checkInTime}
            </span>
          )}
        </button>
      )}

      {/* State 3: CHECKED OUT -> Neutral / Completed Badge */}
      {attendanceState.status === 'CHECKED_OUT' && (
        <div
          title={`Completed shift: ${attendanceState.sublabel}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium cursor-default"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span className="font-semibold text-slate-800">Checked Out</span>
          {attendanceState.record?.totalHoursWorked !== undefined && (
            <span className="hidden md:inline-block font-mono text-[11px] text-slate-500">
              ({attendanceState.record.totalHoursWorked}h)
            </span>
          )}
        </div>
      )}

      {/* State 4: ON APPROVED LEAVE -> Informational Badge */}
      {attendanceState.status === 'ON_LEAVE' && (
        <div
          title={`Approved Leave: ${attendanceState.sublabel}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium cursor-default"
        >
          <Calendar className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span className="font-semibold">On Leave</span>
          {attendanceState.sublabel && (
            <span className="hidden lg:inline-block text-[11px] text-amber-700 font-normal">
              ({attendanceState.sublabel})
            </span>
          )}
        </div>
      )}

      {/* State 5: HOLIDAY -> Informational Badge */}
      {attendanceState.status === 'HOLIDAY' && (
        <div
          title={`Company Holiday: ${attendanceState.sublabel}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-xs font-medium cursor-default"
        >
          <Coffee className="h-3.5 w-3.5 text-purple-600 shrink-0" />
          <span className="font-semibold">Holiday</span>
          {attendanceState.sublabel && (
            <span className="hidden lg:inline-block text-[11px] text-purple-700 font-normal">
              ({attendanceState.sublabel})
            </span>
          )}
        </div>
      )}

      {/* State 6: WEEKLY OFF -> Informational Badge */}
      {attendanceState.status === 'WEEKLY_OFF' && (
        <div
          title="Weekly Off / Scheduled Rest Day"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-xs font-medium cursor-default"
        >
          <Clock className="h-3.5 w-3.5 text-sky-600 shrink-0" />
          <span className="font-semibold">Weekly Off</span>
        </div>
      )}
    </div>
  );
};

