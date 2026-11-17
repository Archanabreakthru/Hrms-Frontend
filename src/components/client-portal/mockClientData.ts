// Celestial HRMS - Client Manager Attendance Verification Types and Period definitions
export interface ClientAttendanceDay {
  id: string;
  date: string;
  displayDate: string;
  attendance: 'Present' | 'Leave' | 'Half Day' | 'Holiday' | 'Absent';
  workingHours: string;
  status: 'Verified' | 'Pending' | 'Rejected';
  rejectionReason?: string;
  isWeekend?: boolean;
}

export interface ClientDeployedEmployee {
  id: string;
  name: string;
  initials: string;
  avatarBgColor?: string;
  role: string;
  status: 'Verified' | 'Pending' | 'Rejected';
  period: string;
  records: ClientAttendanceDay[];
}

export interface ClientManagerProfile {
  id: string;
  name: string;
  email: string;
  roleTitle: string;
  companyName: string;
  avatarInitials: string;
  clientId?: string;
  supervisorId?: string;
}

export function getCurrentReportingPeriods(): { id: string; label: string }[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.toLocaleString('en-US', { month: 'short' });
  const prevMonthDate = new Date(year, now.getMonth() - 1, 1);
  const prevMonth = prevMonthDate.toLocaleString('en-US', { month: 'short' });
  const prevMonthYear = prevMonthDate.getFullYear();

  return [
    { id: 'curr-p1', label: `${month} 01, ${year} - ${month} 15, ${year}` },
    { id: 'curr-p2', label: `${month} 16, ${year} - End of ${month}, ${year}` },
    { id: 'prev-p2', label: `${prevMonth} 16, ${prevMonthYear} - End of ${prevMonth}, ${prevMonthYear}` },
  ];
}

export const REPORTING_PERIODS = getCurrentReportingPeriods();

export const INITIAL_CLIENT_EMPLOYEES: ClientDeployedEmployee[] = [];
