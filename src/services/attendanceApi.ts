// Celestial HRMS - Attendance Service API Client
// Interfaces with Attendance Service via API Gateway /api/v1/attendance
import { apiClient } from './apiClient';
import { AttendanceRecord, ShiftDefinition, LeaveApplication, LeaveType, LeaveBalance, Holiday } from '../types/hrms';

export interface BackendLeaveApplicationDTO {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  halfDaySession?: string;
  totalDays: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendLeaveBalanceDTO {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  carriedForward: number;
  availableDays: number;
}

export interface BackendLeaveTypeDTO {
  id: string;
  code: string;
  name: string;
  description?: string;
  isPaid: boolean;
  annualQuotaDays: number;
  isCarryForward: boolean;
  maxCarryForward: number;
  maxConsecutiveDays: number;
  allowsHalfDay: boolean;
  requiresDoc: boolean;
  isEncashable: boolean;
  eligibilityCriteria: string;
  effectiveDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BackendHolidayDTO {
  id: string;
  name: string;
  date: string;
  branchId?: string;
  isOptional: boolean;
  year: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplyLeavePayload {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  isHalfDay?: boolean;
  halfDaySession?: 'First' | 'Second';
  reason: string;
}

export interface BackendAttendanceRecordDTO {
  id: string;
  employeeId: string;
  date: string;
  shiftId: string;
  workMode: 'Office' | 'Client_Site' | 'Remote';
  checkInTime?: string;
  checkOutTime?: string;
  breakDurationMinutes: number;
  totalWorkingHours: number;
  overtimeHours: number;
  status: 'Present' | 'Late' | 'Half_Day' | 'Overtime' | 'Absent';
  isLate: boolean;
  isEarlyDeparture: boolean;
  checkInPhotoUrl?: string;
  checkOutPhotoUrl?: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendShiftDTO {
  id: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMins: number;
  halfDayThreshold: number;
  fullDayThreshold: number;
  isOvernight: boolean;
  weeklyOffDays: number[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendRegularizationDTO {
  id: string;
  attendanceRecordId?: string;
  employeeId: string;
  targetDate?: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  status: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendShiftScheduleDTO {
  id: string;
  employeeId: string;
  shiftId: string;
  effectiveFrom: string;
  effectiveTo?: string;
  assignedBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PunchClockPayload {
  employeeId: string;
  date: string; // YYYY-MM-DD
  punchType: 'IN' | 'OUT';
  timestamp: string; // ISO
  workMode?: 'Office' | 'Client_Site' | 'Remote';
  shiftId?: string;
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
  notes?: string;
}

export interface ManualEntryPayload {
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // ISO
  checkOutTime: string; // ISO
  shiftId?: string;
  workMode?: 'Office' | 'Client_Site' | 'Remote';
  status?: 'Present' | 'Late' | 'Half_Day' | 'Overtime' | 'Absent';
  notes?: string;
}

export interface RegularizationPayload {
  attendanceRecordId?: string;
  employeeId: string;
  targetDate?: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
}

/**
 * Adapter: Convert Backend AttendanceRecordDTO to Frontend AttendanceRecord model
 */
export function mapBackendRecordToFrontend(dto: BackendAttendanceRecordDTO): AttendanceRecord {
  const formatTimeStr = (isoOrTime?: string) => {
    if (!isoOrTime) return undefined;
    if (isoOrTime.includes('T')) {
      const d = new Date(isoOrTime);
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    }
    return isoOrTime;
  };

  const statusMap: Record<string, any> = {
    Present: 'Present',
    Late: 'Late',
    Half_Day: 'Half Day',
    Overtime: 'Present',
    Absent: 'Absent',
  };

  return {
    id: dto.id,
    employeeId: dto.employeeId,
    date: dto.date.split('T')[0],
    shiftId: dto.shiftId || 'SHIFT-GEN',
    checkInTime: formatTimeStr(dto.checkInTime),
    checkOutTime: formatTimeStr(dto.checkOutTime),
    totalHoursWorked: dto.totalWorkingHours || 0,
    regularHours: Math.min(dto.totalWorkingHours || 0, 8),
    overtimeHours: dto.overtimeHours || 0,
    status: statusMap[dto.status] || 'Present',
    isLate: dto.isLate || false,
    isEarlyDeparture: dto.isEarlyDeparture || false,
    lateMinutes: dto.isLate ? 15 : 0,
    source: dto.notes?.includes('Manually entered') ? 'Manual HR Entry' : 'Web Punch',
    workMode: dto.workMode === 'Client_Site' ? 'Client Site' : dto.workMode === 'Remote' ? 'Remote' : 'Office',
    notes: dto.notes,
    clientVerificationStatus: 'Not Required',
    companyApprovalStatus: 'Approved',
    payrollEligibilityStatus: 'Eligible for Draft Payroll',
  };
}

/**
 * Adapter: Convert Backend ShiftDTO to Frontend ShiftDefinition model
 */
export function mapBackendShiftToFrontend(dto: BackendShiftDTO): ShiftDefinition {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    startTime: dto.startTime,
    endTime: dto.endTime,
    gracePeriodMinutes: dto.gracePeriodMins || 15,
    breakDurationMinutes: 60,
    totalWorkingHours: dto.fullDayThreshold || 8.0,
    isOvernight: dto.isOvernight || false,
    weeklyOffDays: dto.weeklyOffDays || [0, 6],
    isActive: dto.status === 'Active',
  };
}

export function mapBackendLeaveAppToFrontend(dto: BackendLeaveApplicationDTO): LeaveApplication {
  const statusMap: Record<string, any> = {
    Pending: 'Pending Approval',
    Approved: 'Approved',
    Rejected: 'Rejected',
    Cancelled: 'Cancelled',
  };

  return {
    id: dto.id,
    employeeId: dto.employeeId,
    leaveTypeId: dto.leaveTypeId,
    startDate: dto.startDate.split('T')[0],
    endDate: dto.endDate.split('T')[0],
    isHalfDay: dto.isHalfDay,
    halfDayPeriod: dto.halfDaySession === 'Second' ? 'Second Half' : 'First Half',
    totalDays: dto.totalDays,
    reason: dto.reason,
    status: statusMap[dto.status] || 'Pending Approval',
    approverId: dto.approvedBy || '',
    approvalComments: dto.rejectionReason,
    appliedAt: dto.createdAt,
    decidedAt: dto.approvedAt,
  };
}

export function mapBackendLeaveTypeToFrontend(dto: BackendLeaveTypeDTO): LeaveType {
  const colorMap: Record<string, string> = {
    CL: '#3B82F6',
    SL: '#10B981',
    EL: '#F59E0B',
    ML: '#EC4899',
    PL: '#8B5CF6',
    LOP: '#EF4444',
  };

  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    description: dto.description || '',
    isPaid: dto.isPaid,
    annualEntitlement: dto.annualQuotaDays,
    carryForwardLimit: dto.maxCarryForward,
    maxConsecutiveDays: dto.maxConsecutiveDays,
    allowsHalfDay: dto.allowsHalfDay,
    allowNegativeBalance: dto.code === 'LOP',
    requiresDocumentProof: dto.requiresDoc,
    color: colorMap[dto.code] || '#6366F1',
    isActive: dto.isActive,
    effectiveFrom: dto.effectiveDate,
    eligibility: dto.eligibilityCriteria,
  };
}

export function mapBackendHolidayToFrontend(dto: BackendHolidayDTO): Holiday {
  return {
    id: dto.id,
    name: dto.name,
    date: dto.date.split('T')[0],
    isOptional: dto.isOptional,
    description: dto.description,
  };
}

export const attendanceApi = {
  /**
   * Fetch attendance records with optional filters
   */
  async listRecords(params?: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AttendanceRecord[]> {
    const query = new URLSearchParams();
    if (params?.employeeId) query.append('employeeId', params.employeeId);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    const qs = query.toString();

    const res = await apiClient.request<BackendAttendanceRecordDTO[]>(
      `/attendance/records${qs ? `?${qs}` : ''}`,
      { method: 'GET' }
    );
    return (res || []).map(mapBackendRecordToFrontend);
  },

  /**
   * Fetch today's attendance record for authenticated user or employee
   */
  async getTodayRecord(employeeId?: string): Promise<AttendanceRecord | null> {
    const query = new URLSearchParams();
    if (employeeId) query.append('employeeId', employeeId);
    const qs = query.toString();

    const res = await apiClient.request<BackendAttendanceRecordDTO | null>(
      `/attendance/today${qs ? `?${qs}` : ''}`,
      { method: 'GET' }
    );
    return res ? mapBackendRecordToFrontend(res) : null;
  },

  /**
   * Punch Clock-In or Clock-Out
   */
  async punchClock(payload: PunchClockPayload): Promise<AttendanceRecord> {
    const res = await apiClient.request<BackendAttendanceRecordDTO>('/attendance/punch', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapBackendRecordToFrontend(res);
  },

  /**
   * List configured shifts
   */
  async listShifts(): Promise<ShiftDefinition[]> {
    const res = await apiClient.request<BackendShiftDTO[]>('/attendance/shifts', {
      method: 'GET',
    });
    return (res || []).map(mapBackendShiftToFrontend);
  },

  /**
   * Create a new shift definition
   */
  async createShift(payload: {
    code: string;
    name: string;
    startTime: string;
    endTime: string;
    gracePeriodMins?: number;
    halfDayThreshold?: number;
    fullDayThreshold?: number;
    isOvernight?: boolean;
    weeklyOffDays?: number[];
  }): Promise<ShiftDefinition> {
    const res = await apiClient.request<BackendShiftDTO>('/attendance/shifts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapBackendShiftToFrontend(res);
  },

  /**
   * List attendance regularizations
   */
  async listRegularizations(params?: {
    employeeId?: string;
    status?: string;
  }): Promise<BackendRegularizationDTO[]> {
    const query = new URLSearchParams();
    if (params?.employeeId) query.append('employeeId', params.employeeId);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString();

    return apiClient.request<BackendRegularizationDTO[]>(
      `/attendance/regularizations${qs ? `?${qs}` : ''}`,
      { method: 'GET' }
    );
  },

  /**
   * Submit an attendance regularization request
   */
  async requestRegularization(payload: RegularizationPayload): Promise<BackendRegularizationDTO> {
    return apiClient.request<BackendRegularizationDTO>('/attendance/regularize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Review an attendance regularization request
   */
  async reviewRegularization(
    id: string,
    decision: 'Approved' | 'Rejected',
    remarks?: string,
    stage?: 'manager' | 'hr'
  ): Promise<BackendRegularizationDTO> {
    return apiClient.request<BackendRegularizationDTO>(`/attendance/regularize/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ decision, remarks, stage }),
    });
  },

  /**
   * List shift schedules / roster
   */
  async listShiftSchedules(params?: {
    employeeId?: string;
    shiftId?: string;
    isActive?: boolean;
  }): Promise<BackendShiftScheduleDTO[]> {
    const query = new URLSearchParams();
    if (params?.employeeId) query.append('employeeId', params.employeeId);
    if (params?.shiftId) query.append('shiftId', params.shiftId);
    if (params?.isActive !== undefined) query.append('isActive', String(params.isActive));
    const qs = query.toString();

    return apiClient.request<BackendShiftScheduleDTO[]>(
      `/attendance/schedules${qs ? `?${qs}` : ''}`,
      { method: 'GET' }
    );
  },

  /**
   * Create a shift schedule for an employee
   */
  async createShiftSchedule(payload: {
    employeeId: string;
    shiftId: string;
    effectiveFrom: string;
    effectiveTo?: string;
  }): Promise<BackendShiftScheduleDTO> {
    return apiClient.request<BackendShiftScheduleDTO>('/attendance/schedules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * HR Manual Attendance Entry
   */
  async createManualEntry(payload: ManualEntryPayload): Promise<AttendanceRecord> {
    const res = await apiClient.request<BackendAttendanceRecordDTO>('/attendance/manual', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapBackendRecordToFrontend(res);
  },

  /**
   * List Leave Applications
   */
  async listLeaveApplications(params?: {
    employeeId?: string;
    status?: string;
  }): Promise<LeaveApplication[]> {
    const query = new URLSearchParams();
    if (params?.employeeId) query.append('employeeId', params.employeeId);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString();

    const res = await apiClient.request<BackendLeaveApplicationDTO[]>(
      `/attendance/leaves${qs ? `?${qs}` : ''}`,
      { method: 'GET' }
    );
    return (res || []).map(mapBackendLeaveAppToFrontend);
  },

  /**
   * Apply for Leave
   */
  async applyLeave(payload: ApplyLeavePayload): Promise<LeaveApplication> {
    const res = await apiClient.request<BackendLeaveApplicationDTO>('/attendance/leaves/apply', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapBackendLeaveAppToFrontend(res);
  },

  /**
   * Review Leave Application (Manager or HR)
   */
  async reviewLeave(
    id: string,
    decision: 'Approved' | 'Rejected',
    rejectionReason?: string
  ): Promise<LeaveApplication> {
    const res = await apiClient.request<BackendLeaveApplicationDTO>(
      `/attendance/leaves/${id}/review`,
      {
        method: 'PUT',
        body: JSON.stringify({ decision, rejectionReason }),
      }
    );
    return mapBackendLeaveAppToFrontend(res);
  },

  /**
   * Cancel or Withdraw Leave Application
   */
  async cancelLeave(id: string, reason?: string): Promise<LeaveApplication> {
    const res = await apiClient.request<BackendLeaveApplicationDTO>(
      `/attendance/leaves/${id}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
    return mapBackendLeaveAppToFrontend(res);
  },

  /**
   * List Employee Leave Balances
   */
  async listLeaveBalances(employeeId?: string, year?: number): Promise<LeaveBalance[]> {
    const query = new URLSearchParams();
    if (employeeId) query.append('employeeId', employeeId);
    if (year) query.append('year', String(year));
    const qs = query.toString();

    const res = await apiClient.request<BackendLeaveBalanceDTO[]>(
      `/attendance/leaves/balances${qs ? `?${qs}` : ''}`,
      { method: 'GET' }
    );
    return (res || []).map((b) => ({
      employeeId: b.employeeId,
      leaveTypeId: b.leaveTypeId,
      totalEntitled: b.allocatedDays + b.carriedForward,
      taken: b.usedDays,
      pending: b.pendingDays,
      remaining: b.availableDays,
    }));
  },

  /**
   * List Leave Types
   */
  async listLeaveTypes(): Promise<LeaveType[]> {
    const res = await apiClient.request<BackendLeaveTypeDTO[]>('/attendance/leave-types', {
      method: 'GET',
    });
    return (res || []).map(mapBackendLeaveTypeToFrontend);
  },

  /**
   * Create Leave Type (HR Admin)
   */
  async createLeaveType(payload: Partial<BackendLeaveTypeDTO>): Promise<LeaveType> {
    const res = await apiClient.request<BackendLeaveTypeDTO>('/attendance/leave-types', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapBackendLeaveTypeToFrontend(res);
  },

  /**
   * Update Leave Type (HR Admin)
   */
  async updateLeaveType(id: string, payload: Partial<BackendLeaveTypeDTO>): Promise<LeaveType> {
    const res = await apiClient.request<BackendLeaveTypeDTO>(`/attendance/leave-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return mapBackendLeaveTypeToFrontend(res);
  },

  /**
   * List Holidays
   */
  async listHolidays(year?: number, branchId?: string): Promise<Holiday[]> {
    const query = new URLSearchParams();
    if (year) query.append('year', String(year));
    if (branchId) query.append('branchId', branchId);
    const qs = query.toString();

    const res = await apiClient.request<BackendHolidayDTO[]>(
      `/attendance/holidays${qs ? `?${qs}` : ''}`,
      { method: 'GET' }
    );
    return (res || []).map(mapBackendHolidayToFrontend);
  },

  /**
   * Create Holiday (HR Admin)
   */
  async createHoliday(payload: {
    name: string;
    date: string;
    branchId?: string;
    isOptional?: boolean;
    year: number;
    description?: string;
  }): Promise<Holiday> {
    const res = await apiClient.request<BackendHolidayDTO>('/attendance/holidays', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapBackendHolidayToFrontend(res);
  },

  /**
   * Delete Holiday (HR Admin)
   */
  async deleteHoliday(id: string): Promise<void> {
    await apiClient.request<void>(`/attendance/holidays/${id}`, {
      method: 'DELETE',
    });
  },
};

