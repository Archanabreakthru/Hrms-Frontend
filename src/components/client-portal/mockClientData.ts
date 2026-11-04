// Mock data specifically for Client Manager Attendance Verification
export interface ClientAttendanceDay {
  id: string;
  date: string; // e.g., "2025-03-01"
  displayDate: string; // e.g., "Mar 01, 2025 (Sat)"
  attendance: 'Present' | 'Leave' | 'Half Day' | 'Holiday' | 'Absent';
  workingHours: string; // e.g., "8.5 hrs" or "-"
  status: 'Verified' | 'Pending' | 'Rejected';
  rejectionReason?: string;
  isWeekend?: boolean;
}

export interface ClientDeployedEmployee {
  id: string; // e.g. "EMP001"
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
  roleTitle: string; // "Client Manager"
  companyName: string; // "Acme Technologies Pvt. Ltd."
  avatarInitials: string;
}

export const DEFAULT_CLIENT_MANAGER: ClientManagerProfile = {
  id: 'CM-001',
  name: 'Rohit Kumar',
  email: 'rohit.kumar@acme-tech.example.com',
  roleTitle: 'Client Manager',
  companyName: 'Acme Technologies Pvt. Ltd.',
  avatarInitials: 'RK'
};

export const REPORTING_PERIODS = [
  { id: '2025-03-p1', label: 'Mar 01, 2025 - Mar 15, 2025' },
  { id: '2025-02-p2', label: 'Feb 16, 2025 - Feb 28, 2025' },
  { id: '2025-02-p1', label: 'Feb 01, 2025 - Feb 15, 2025' }
];

export const INITIAL_CLIENT_EMPLOYEES: ClientDeployedEmployee[] = [
  {
    id: 'EMP001',
    name: 'Arjun Krishnan',
    initials: 'AK',
    avatarBgColor: 'bg-indigo-100 text-indigo-700',
    role: 'Frontend Developer',
    status: 'Verified',
    period: 'Mar 01 - 15, 2025',
    records: [
      { id: 'EMP001-1', date: '2025-03-01', displayDate: 'Mar 01, 2025 (Sat)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP001-2', date: '2025-03-02', displayDate: 'Mar 02, 2025 (Sun)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP001-3', date: '2025-03-03', displayDate: 'Mar 03, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP001-4', date: '2025-03-04', displayDate: 'Mar 04, 2025 (Tue)', attendance: 'Leave', workingHours: '-', status: 'Verified' },
      { id: 'EMP001-5', date: '2025-03-05', displayDate: 'Mar 05, 2025 (Wed)', attendance: 'Present', workingHours: '9.0 hrs', status: 'Verified' },
      { id: 'EMP001-6', date: '2025-03-06', displayDate: 'Mar 06, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP001-7', date: '2025-03-07', displayDate: 'Mar 07, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP001-8', date: '2025-03-08', displayDate: 'Mar 08, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP001-9', date: '2025-03-09', displayDate: 'Mar 09, 2025 (Sun)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP001-10', date: '2025-03-10', displayDate: 'Mar 10, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP001-11', date: '2025-03-11', displayDate: 'Mar 11, 2025 (Tue)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP001-12', date: '2025-03-12', displayDate: 'Mar 12, 2025 (Wed)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP001-13', date: '2025-03-13', displayDate: 'Mar 13, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP001-14', date: '2025-03-14', displayDate: 'Mar 14, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP001-15', date: '2025-03-15', displayDate: 'Mar 15, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' }
    ]
  },
  {
    id: 'EMP002',
    name: 'Sneha Pillai',
    initials: 'SP',
    avatarBgColor: 'bg-emerald-100 text-emerald-700',
    role: 'Backend Developer',
    status: 'Verified',
    period: 'Mar 01 - 15, 2025',
    records: [
      { id: 'EMP002-1', date: '2025-03-01', displayDate: 'Mar 01, 2025 (Sat)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP002-2', date: '2025-03-02', displayDate: 'Mar 02, 2025 (Sun)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP002-3', date: '2025-03-03', displayDate: 'Mar 03, 2025 (Mon)', attendance: 'Present', workingHours: '9.0 hrs', status: 'Verified' },
      { id: 'EMP002-4', date: '2025-03-04', displayDate: 'Mar 04, 2025 (Tue)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP002-5', date: '2025-03-05', displayDate: 'Mar 05, 2025 (Wed)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP002-6', date: '2025-03-06', displayDate: 'Mar 06, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP002-7', date: '2025-03-07', displayDate: 'Mar 07, 2025 (Fri)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP002-8', date: '2025-03-08', displayDate: 'Mar 08, 2025 (Sat)', attendance: 'Leave', workingHours: '-', status: 'Verified' },
      { id: 'EMP002-9', date: '2025-03-09', displayDate: 'Mar 09, 2025 (Sun)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP002-10', date: '2025-03-10', displayDate: 'Mar 10, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP002-11', date: '2025-03-11', displayDate: 'Mar 11, 2025 (Tue)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP002-12', date: '2025-03-12', displayDate: 'Mar 12, 2025 (Wed)', attendance: 'Present', workingHours: '9.0 hrs', status: 'Verified' },
      { id: 'EMP002-13', date: '2025-03-13', displayDate: 'Mar 13, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP002-14', date: '2025-03-14', displayDate: 'Mar 14, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP002-15', date: '2025-03-15', displayDate: 'Mar 15, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' }
    ]
  },
  {
    id: 'EMP003',
    name: 'Vivek Menon',
    initials: 'VM',
    avatarBgColor: 'bg-amber-100 text-amber-700',
    role: 'QA Engineer',
    status: 'Pending',
    period: 'Mar 01 - 15, 2025',
    records: [
      { id: 'EMP003-1', date: '2025-03-01', displayDate: 'Mar 01, 2025 (Sat)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP003-2', date: '2025-03-02', displayDate: 'Mar 02, 2025 (Sun)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Pending' },
      { id: 'EMP003-3', date: '2025-03-03', displayDate: 'Mar 03, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP003-4', date: '2025-03-04', displayDate: 'Mar 04, 2025 (Tue)', attendance: 'Leave', workingHours: '-', status: 'Pending' },
      { id: 'EMP003-5', date: '2025-03-05', displayDate: 'Mar 05, 2025 (Wed)', attendance: 'Present', workingHours: '9.0 hrs', status: 'Pending' },
      { id: 'EMP003-6', date: '2025-03-06', displayDate: 'Mar 06, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP003-7', date: '2025-03-07', displayDate: 'Mar 07, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Pending' },
      { id: 'EMP003-8', date: '2025-03-08', displayDate: 'Mar 08, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Pending' },
      { id: 'EMP003-9', date: '2025-03-09', displayDate: 'Mar 09, 2025 (Sun)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP003-10', date: '2025-03-10', displayDate: 'Mar 10, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP003-11', date: '2025-03-11', displayDate: 'Mar 11, 2025 (Tue)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Pending' },
      { id: 'EMP003-12', date: '2025-03-12', displayDate: 'Mar 12, 2025 (Wed)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP003-13', date: '2025-03-13', displayDate: 'Mar 13, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP003-14', date: '2025-03-14', displayDate: 'Mar 14, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Pending' },
      { id: 'EMP003-15', date: '2025-03-15', displayDate: 'Mar 15, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Pending' }
    ]
  },
  {
    id: 'EMP004',
    name: 'Divya Raman',
    initials: 'DR',
    avatarBgColor: 'bg-rose-100 text-rose-700',
    role: 'UI/UX Designer',
    status: 'Verified',
    period: 'Mar 01 - 15, 2025',
    records: [
      { id: 'EMP004-1', date: '2025-03-01', displayDate: 'Mar 01, 2025 (Sat)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP004-2', date: '2025-03-02', displayDate: 'Mar 02, 2025 (Sun)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP004-3', date: '2025-03-03', displayDate: 'Mar 03, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP004-4', date: '2025-03-04', displayDate: 'Mar 04, 2025 (Tue)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP004-5', date: '2025-03-05', displayDate: 'Mar 05, 2025 (Wed)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP004-6', date: '2025-03-06', displayDate: 'Mar 06, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP004-7', date: '2025-03-07', displayDate: 'Mar 07, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP004-8', date: '2025-03-08', displayDate: 'Mar 08, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP004-9', date: '2025-03-09', displayDate: 'Mar 09, 2025 (Sun)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP004-10', date: '2025-03-10', displayDate: 'Mar 10, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP004-11', date: '2025-03-11', displayDate: 'Mar 11, 2025 (Tue)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP004-12', date: '2025-03-12', displayDate: 'Mar 12, 2025 (Wed)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP004-13', date: '2025-03-13', displayDate: 'Mar 13, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP004-14', date: '2025-03-14', displayDate: 'Mar 14, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP004-15', date: '2025-03-15', displayDate: 'Mar 15, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' }
    ]
  },
  {
    id: 'EMP005',
    name: 'Nikhil Suresh',
    initials: 'NS',
    avatarBgColor: 'bg-blue-100 text-blue-700',
    role: 'DevOps Engineer',
    status: 'Rejected',
    period: 'Mar 01 - 15, 2025',
    records: [
      { id: 'EMP005-1', date: '2025-03-01', displayDate: 'Mar 01, 2025 (Sat)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Rejected', rejectionReason: 'Discrepancy in recorded remote hours' },
      { id: 'EMP005-2', date: '2025-03-02', displayDate: 'Mar 02, 2025 (Sun)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Rejected', rejectionReason: 'Discrepancy in recorded remote hours' },
      { id: 'EMP005-3', date: '2025-03-03', displayDate: 'Mar 03, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Rejected', rejectionReason: 'Discrepancy in recorded remote hours' },
      { id: 'EMP005-4', date: '2025-03-04', displayDate: 'Mar 04, 2025 (Tue)', attendance: 'Leave', workingHours: '-', status: 'Verified' },
      { id: 'EMP005-5', date: '2025-03-05', displayDate: 'Mar 05, 2025 (Wed)', attendance: 'Present', workingHours: '9.0 hrs', status: 'Verified' },
      { id: 'EMP005-6', date: '2025-03-06', displayDate: 'Mar 06, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP005-7', date: '2025-03-07', displayDate: 'Mar 07, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP005-8', date: '2025-03-08', displayDate: 'Mar 08, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP005-9', date: '2025-03-09', displayDate: 'Mar 09, 2025 (Sun)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP005-10', date: '2025-03-10', displayDate: 'Mar 10, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP005-11', date: '2025-03-11', displayDate: 'Mar 11, 2025 (Tue)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP005-12', date: '2025-03-12', displayDate: 'Mar 12, 2025 (Wed)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP005-13', date: '2025-03-13', displayDate: 'Mar 13, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP005-14', date: '2025-03-14', displayDate: 'Mar 14, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP005-15', date: '2025-03-15', displayDate: 'Mar 15, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' }
    ]
  },
  {
    id: 'EMP006',
    name: 'Meera Varma',
    initials: 'MV',
    avatarBgColor: 'bg-purple-100 text-purple-700',
    role: 'Business Analyst',
    status: 'Pending',
    period: 'Mar 01 - 15, 2025',
    records: [
      { id: 'EMP006-1', date: '2025-03-01', displayDate: 'Mar 01, 2025 (Sat)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP006-2', date: '2025-03-02', displayDate: 'Mar 02, 2025 (Sun)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Pending' },
      { id: 'EMP006-3', date: '2025-03-03', displayDate: 'Mar 03, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP006-4', date: '2025-03-04', displayDate: 'Mar 04, 2025 (Tue)', attendance: 'Leave', workingHours: '-', status: 'Pending' },
      { id: 'EMP006-5', date: '2025-03-05', displayDate: 'Mar 05, 2025 (Wed)', attendance: 'Present', workingHours: '9.0 hrs', status: 'Pending' },
      { id: 'EMP006-6', date: '2025-03-06', displayDate: 'Mar 06, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP006-7', date: '2025-03-07', displayDate: 'Mar 07, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Pending' },
      { id: 'EMP006-8', date: '2025-03-08', displayDate: 'Mar 08, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Pending' },
      { id: 'EMP006-9', date: '2025-03-09', displayDate: 'Mar 09, 2025 (Sun)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP006-10', date: '2025-03-10', displayDate: 'Mar 10, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP006-11', date: '2025-03-11', displayDate: 'Mar 11, 2025 (Tue)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Pending' },
      { id: 'EMP006-12', date: '2025-03-12', displayDate: 'Mar 12, 2025 (Wed)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP006-13', date: '2025-03-13', displayDate: 'Mar 13, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP006-14', date: '2025-03-14', displayDate: 'Mar 14, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Pending' },
      { id: 'EMP006-15', date: '2025-03-15', displayDate: 'Mar 15, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Pending' }
    ]
  },
  {
    id: 'EMP007',
    name: 'Karthik Raja',
    initials: 'KR',
    avatarBgColor: 'bg-cyan-100 text-cyan-700',
    role: 'Systems Engineer',
    status: 'Verified',
    period: 'Mar 01 - 15, 2025',
    records: [
      { id: 'EMP007-1', date: '2025-03-01', displayDate: 'Mar 01, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP007-2', date: '2025-03-02', displayDate: 'Mar 02, 2025 (Sun)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP007-3', date: '2025-03-03', displayDate: 'Mar 03, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP007-4', date: '2025-03-04', displayDate: 'Mar 04, 2025 (Tue)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP007-5', date: '2025-03-05', displayDate: 'Mar 05, 2025 (Wed)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP007-6', date: '2025-03-06', displayDate: 'Mar 06, 2025 (Thu)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP007-7', date: '2025-03-07', displayDate: 'Mar 07, 2025 (Fri)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP007-8', date: '2025-03-08', displayDate: 'Mar 08, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP007-9', date: '2025-03-09', displayDate: 'Mar 09, 2025 (Sun)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP007-10', date: '2025-03-10', displayDate: 'Mar 10, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP007-11', date: '2025-03-11', displayDate: 'Mar 11, 2025 (Tue)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP007-12', date: '2025-03-12', displayDate: 'Mar 12, 2025 (Wed)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP007-13', date: '2025-03-13', displayDate: 'Mar 13, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP007-14', date: '2025-03-14', displayDate: 'Mar 14, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP007-15', date: '2025-03-15', displayDate: 'Mar 15, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' }
    ]
  },
  {
    id: 'EMP008',
    name: 'Ananya Sharma',
    initials: 'AS',
    avatarBgColor: 'bg-emerald-100 text-emerald-700',
    role: 'QA Automation Lead',
    status: 'Verified',
    period: 'Mar 01 - 15, 2025',
    records: [
      { id: 'EMP008-1', date: '2025-03-01', displayDate: 'Mar 01, 2025 (Sat)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP008-2', date: '2025-03-02', displayDate: 'Mar 02, 2025 (Sun)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP008-3', date: '2025-03-03', displayDate: 'Mar 03, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP008-4', date: '2025-03-04', displayDate: 'Mar 04, 2025 (Tue)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP008-5', date: '2025-03-05', displayDate: 'Mar 05, 2025 (Wed)', attendance: 'Leave', workingHours: '-', status: 'Verified' },
      { id: 'EMP008-6', date: '2025-03-06', displayDate: 'Mar 06, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP008-7', date: '2025-03-07', displayDate: 'Mar 07, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP008-8', date: '2025-03-08', displayDate: 'Mar 08, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP008-9', date: '2025-03-09', displayDate: 'Mar 09, 2025 (Sun)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP008-10', date: '2025-03-10', displayDate: 'Mar 10, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP008-11', date: '2025-03-11', displayDate: 'Mar 11, 2025 (Tue)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP008-12', date: '2025-03-12', displayDate: 'Mar 12, 2025 (Wed)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP008-13', date: '2025-03-13', displayDate: 'Mar 13, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP008-14', date: '2025-03-14', displayDate: 'Mar 14, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP008-15', date: '2025-03-15', displayDate: 'Mar 15, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' }
    ]
  },
  {
    id: 'EMP009',
    name: 'Pooja Iyer',
    initials: 'PI',
    avatarBgColor: 'bg-teal-100 text-teal-700',
    role: 'Database Administrator',
    status: 'Verified',
    period: 'Mar 01 - 15, 2025',
    records: [
      { id: 'EMP009-1', date: '2025-03-01', displayDate: 'Mar 01, 2025 (Sat)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP009-2', date: '2025-03-02', displayDate: 'Mar 02, 2025 (Sun)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP009-3', date: '2025-03-03', displayDate: 'Mar 03, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP009-4', date: '2025-03-04', displayDate: 'Mar 04, 2025 (Tue)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP009-5', date: '2025-03-05', displayDate: 'Mar 05, 2025 (Wed)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP009-6', date: '2025-03-06', displayDate: 'Mar 06, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP009-7', date: '2025-03-07', displayDate: 'Mar 07, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP009-8', date: '2025-03-08', displayDate: 'Mar 08, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP009-9', date: '2025-03-09', displayDate: 'Mar 09, 2025 (Sun)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP009-10', date: '2025-03-10', displayDate: 'Mar 10, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP009-11', date: '2025-03-11', displayDate: 'Mar 11, 2025 (Tue)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP009-12', date: '2025-03-12', displayDate: 'Mar 12, 2025 (Wed)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP009-13', date: '2025-03-13', displayDate: 'Mar 13, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP009-14', date: '2025-03-14', displayDate: 'Mar 14, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP009-15', date: '2025-03-15', displayDate: 'Mar 15, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' }
    ]
  },
  {
    id: 'EMP010',
    name: 'Sanjay Dutt',
    initials: 'SD',
    avatarBgColor: 'bg-indigo-100 text-indigo-700',
    role: 'Security Analyst',
    status: 'Verified',
    period: 'Mar 01 - 15, 2025',
    records: [
      { id: 'EMP010-1', date: '2025-03-01', displayDate: 'Mar 01, 2025 (Sat)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP010-2', date: '2025-03-02', displayDate: 'Mar 02, 2025 (Sun)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP010-3', date: '2025-03-03', displayDate: 'Mar 03, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP010-4', date: '2025-03-04', displayDate: 'Mar 04, 2025 (Tue)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP010-5', date: '2025-03-05', displayDate: 'Mar 05, 2025 (Wed)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP010-6', date: '2025-03-06', displayDate: 'Mar 06, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP010-7', date: '2025-03-07', displayDate: 'Mar 07, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP010-8', date: '2025-03-08', displayDate: 'Mar 08, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP010-9', date: '2025-03-09', displayDate: 'Mar 09, 2025 (Sun)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP010-10', date: '2025-03-10', displayDate: 'Mar 10, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP010-11', date: '2025-03-11', displayDate: 'Mar 11, 2025 (Tue)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP010-12', date: '2025-03-12', displayDate: 'Mar 12, 2025 (Wed)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP010-13', date: '2025-03-13', displayDate: 'Mar 13, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP010-14', date: '2025-03-14', displayDate: 'Mar 14, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP010-15', date: '2025-03-15', displayDate: 'Mar 15, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' }
    ]
  },
  {
    id: 'EMP011',
    name: 'Tanvi Joshi',
    initials: 'TJ',
    avatarBgColor: 'bg-emerald-100 text-emerald-700',
    role: 'Scrum Master',
    status: 'Verified',
    period: 'Mar 01 - 15, 2025',
    records: [
      { id: 'EMP011-1', date: '2025-03-01', displayDate: 'Mar 01, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP011-2', date: '2025-03-02', displayDate: 'Mar 02, 2025 (Sun)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP011-3', date: '2025-03-03', displayDate: 'Mar 03, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP011-4', date: '2025-03-04', displayDate: 'Mar 04, 2025 (Tue)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP011-5', date: '2025-03-05', displayDate: 'Mar 05, 2025 (Wed)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP011-6', date: '2025-03-06', displayDate: 'Mar 06, 2025 (Thu)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP011-7', date: '2025-03-07', displayDate: 'Mar 07, 2025 (Fri)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP011-8', date: '2025-03-08', displayDate: 'Mar 08, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP011-9', date: '2025-03-09', displayDate: 'Mar 09, 2025 (Sun)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP011-10', date: '2025-03-10', displayDate: 'Mar 10, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP011-11', date: '2025-03-11', displayDate: 'Mar 11, 2025 (Tue)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP011-12', date: '2025-03-12', displayDate: 'Mar 12, 2025 (Wed)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP011-13', date: '2025-03-13', displayDate: 'Mar 13, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Verified' },
      { id: 'EMP011-14', date: '2025-03-14', displayDate: 'Mar 14, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' },
      { id: 'EMP011-15', date: '2025-03-15', displayDate: 'Mar 15, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Verified' }
    ]
  },
  {
    id: 'EMP012',
    name: 'Rahul Nair',
    initials: 'RN',
    avatarBgColor: 'bg-amber-100 text-amber-700',
    role: 'Full Stack Engineer',
    status: 'Pending',
    period: 'Mar 01 - 15, 2025',
    records: [
      { id: 'EMP012-1', date: '2025-03-01', displayDate: 'Mar 01, 2025 (Sat)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP012-2', date: '2025-03-02', displayDate: 'Mar 02, 2025 (Sun)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Pending' },
      { id: 'EMP012-3', date: '2025-03-03', displayDate: 'Mar 03, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP012-4', date: '2025-03-04', displayDate: 'Mar 04, 2025 (Tue)', attendance: 'Leave', workingHours: '-', status: 'Pending' },
      { id: 'EMP012-5', date: '2025-03-05', displayDate: 'Mar 05, 2025 (Wed)', attendance: 'Present', workingHours: '9.0 hrs', status: 'Pending' },
      { id: 'EMP012-6', date: '2025-03-06', displayDate: 'Mar 06, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP012-7', date: '2025-03-07', displayDate: 'Mar 07, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Pending' },
      { id: 'EMP012-8', date: '2025-03-08', displayDate: 'Mar 08, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Pending' },
      { id: 'EMP012-9', date: '2025-03-09', displayDate: 'Mar 09, 2025 (Sun)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP012-10', date: '2025-03-10', displayDate: 'Mar 10, 2025 (Mon)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP012-11', date: '2025-03-11', displayDate: 'Mar 11, 2025 (Tue)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Pending' },
      { id: 'EMP012-12', date: '2025-03-12', displayDate: 'Mar 12, 2025 (Wed)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP012-13', date: '2025-03-13', displayDate: 'Mar 13, 2025 (Thu)', attendance: 'Present', workingHours: '8.5 hrs', status: 'Pending' },
      { id: 'EMP012-14', date: '2025-03-14', displayDate: 'Mar 14, 2025 (Fri)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Pending' },
      { id: 'EMP012-15', date: '2025-03-15', displayDate: 'Mar 15, 2025 (Sat)', attendance: 'Present', workingHours: '8.0 hrs', status: 'Pending' }
    ]
  }
];

