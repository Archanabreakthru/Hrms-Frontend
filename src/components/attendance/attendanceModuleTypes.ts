// Module-Local Frontend In-Memory State & Types for Attendance & Shifts
// Isolated from backend, database, and protected modules.
// Clean abstractions ready for future API service replacement.

export type AttendancePunchStatus =
  | 'Present'
  | 'Late'
  | 'Half Day'
  | 'Absent'
  | 'On Leave'
  | 'Holiday'
  | 'Weekly Off';

export type CorrectionRequestStatus =
  | 'Draft'
  | 'Pending Manager Approval'
  | 'Manager Approved'
  | 'Manager Rejected'
  | 'Pending HR Approval'
  | 'HR Approved'
  | 'HR Rejected';

export type OvertimeApprovalStatus =
  | 'Pending Manager Approval'
  | 'Manager Approved'
  | 'Manager Rejected'
  | 'HR Verified'
  | 'Ready for Future Payroll Integration'
  | 'Rejected';

export interface ShiftDefinitionRecord {
  id: string;
  name: string;
  code: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  breakDurationMinutes: number;
  totalWorkingHours: number;
  gracePeriodMinutes: number;
  lateArrivalThresholdMinutes: number;
  earlyDepartureThresholdMinutes: number;
  weeklyOffDays: number[]; // 0 = Sun, 6 = Sat
  workdaysCount: number;
  isOvernight: boolean;
  isActive: boolean;
}

export interface ShiftScheduleEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  shiftId: string;
  shiftName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  assignedBy: string;
  assignedAt: string;
}

export interface DailyAttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  shiftId: string;
  shiftName: string;
  checkInTime?: string; // HH:MM
  checkOutTime?: string; // HH:MM
  totalHours: number;
  netWorkingHours: number;
  breakDurationMinutes: number;
  overtimeHours: number;
  isLate: boolean;
  lateMinutes: number;
  isEarlyDeparture: boolean;
  isMissingPunch: boolean;
  status: AttendancePunchStatus;
  workLocationType: 'Office' | 'Client Site' | 'Remote';
  clientId?: string;
  clientName?: string;
  hasClientDeployment?: boolean;
  source: 'Web Punch' | 'Manual HR Entry' | 'Correction Regularization';
  notes?: string;
}

export interface AttendanceCorrectionEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  reportingManagerId?: string;
  reportingManagerName?: string;
  attendanceDate: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  originalStatus: AttendancePunchStatus;
  requestedCheckIn: string;
  requestedCheckOut: string;
  requestedOutcome: AttendancePunchStatus;
  calculatedHours: number;
  reasonCategory:
    | 'Forgot Check-in'
    | 'Forgot Check-out'
    | 'Incorrect Punch'
    | 'Missing Punch'
    | 'Incorrect Attendance Status'
    | 'Client Site Punch Issue';
  reasonRemarks: string;
  status: CorrectionRequestStatus;
  managerDecision?: 'Approved' | 'Rejected';
  managerComments?: string;
  managerDecidedAt?: string;
  hrDecision?: 'Approved' | 'Rejected';
  hrComments?: string;
  hrDecidedAt?: string;
  submittedAt: string;
}

export interface OvertimeEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  reportingManagerId?: string;
  reportingManagerName?: string;
  attendanceDate: string;
  shiftName: string;
  standardHours: number;
  actualHours: number;
  overtimeHours: number;
  overtimeReason: string;
  remarks?: string;
  status: OvertimeApprovalStatus;
  managerComments?: string;
  managerDecidedAt?: string;
  hrComments?: string;
  hrVerifiedAt?: string;
  submittedAt: string;
}

export interface AttendanceModuleState {
  shifts: ShiftDefinitionRecord[];
  schedules: ShiftScheduleEntry[];
  attendanceRecords: DailyAttendanceRecord[];
  corrections: AttendanceCorrectionEntry[];
  overtimeEntries: OvertimeEntry[];
}

export const initialAttendanceModuleState: AttendanceModuleState = {
  shifts: [],
  schedules: [],
  attendanceRecords: [],
  corrections: [],
  overtimeEntries: []
};

