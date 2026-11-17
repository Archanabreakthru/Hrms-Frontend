import { Employee, CurrentUser, ServiceRecord } from '../types/hrms';

export const canonicalEmployees: Employee[] = [
  {
    id: 'EMP-HRM-0012',
    originalLegacyId: 'EMP-001',
    userId: 'user_hr_admin',
    firstName: 'Raseedh',
    lastName: '',
    email: 'raseedh@orbyx.internal',
    officialEmail: 'raseedh@orbyx.internal',
    phone: '+91 98765 43210',
    officialPhone: '+91 98765 43210',
    avatarUrl: '',
    dateOfBirth: '1990-06-14',
    gender: 'Male',
    bloodGroup: 'B+',
    maritalStatus: 'Married',
    address: '#402, Sunshine Heights, Koramangala 4th Block, Bengaluru',
    permanentAddress: '#402, Sunshine Heights, Koramangala 4th Block, Bengaluru',
    currentAddress: '#402, Sunshine Heights, Koramangala 4th Block, Bengaluru',
    emergencyContact: {
      name: 'Fathima Raseedh',
      relationship: 'Spouse',
      phone: '+91 98765 43219'
    },
    departmentId: 'DEP-HR',
    designationId: 'DES-HR-MGR',
    branchId: 'BR-BLR',
    employmentType: 'Permanent',
    status: 'Active',
    profileStatus: 'Active',
    dateOfJoining: '2022-01-15',
    confirmationDate: '2022-07-15',
    noticePeriodDays: 60,
    probationPeriodDays: 180,
    reportingManagerId: 'EMP-STF-0002', // Reports to S. Kannan (COO)
    shiftId: 'SHIFT-GEN',
    bankDetails: {
      bankName: 'HDFC Bank Ltd',
      accountNumber: '50100498761234',
      ifscOrRouting: 'HDFC0001234',
      accountType: 'Savings'
    },
    panOrTaxNumber: 'ABCPS1234F',
    pfUan: '101234567890',
    epfApplicable: true,
    epfWageCeilingApplied: true,
    esiApplicable: false,
    ptApplicable: true,
    baseSalaryAnnual: 1800000,
    salaryStructureId: 'SS-SENIOR',
    createdAt: '2022-01-15T09:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z'
  }
];

export const canonicalPersonaUsers: CurrentUser[] = [
  {
    id: 'user_hr_admin',
    employeeId: 'EMP-HRM-0012',
    name: 'Raseedh',
    email: 'raseedh@orbyx.internal',
    role: 'hr_admin',
    departmentId: 'DEP-HR',
    designationTitle: 'HR Manager',
    avatarUrl: ''
  }
];

export const initialServiceRecords: ServiceRecord[] = [
  // Bhava Dharani
  {
    id: 'SR-018-1',
    employeeId: 'EMP-DEVOPS-0014',
    employeeName: 'Bhava Dharani',
    recordType: 'Date of Joining',
    effectiveDate: '2023-05-15',
    newDesignation: 'Devops & Cloud Engineer',
    newDepartment: 'Engineering & Delivery',
    newReportingManager: 'S. Kannan',
    revisedSalary: 1400000,
    description: 'Joined DevOps & Cloud infrastructure engineering squad.',
    createdBy: 'Raseedh (HR)',
    approvedBy: 'S. Kannan (COO)',
    createdDate: '2023-05-15',
    approvalStatus: 'Approved'
  },
  // Dr. A. Selvakumar
  {
    id: 'SR-000-1',
    employeeId: 'EMP-MD-0001',
    employeeName: 'Dr. A. Selvakumar',
    recordType: 'Date of Joining',
    effectiveDate: '2020-01-01',
    newDesignation: 'Managing Director (MD)',
    newDepartment: 'Executive Leadership',
    revisedSalary: 4800000,
    description: 'Executive appointment as Managing Director & Founding Director.',
    createdBy: 'Corporate Board of Directors',
    approvedBy: 'Corporate Board of Directors',
    createdDate: '2020-01-01',
    approvalStatus: 'Approved'
  },
  // S. Kannan
  {
    id: 'SR-010-1',
    employeeId: 'EMP-STF-0002',
    employeeName: 'S. Kannan',
    recordType: 'Date of Joining',
    effectiveDate: '2021-06-15',
    newDesignation: 'Chief Operating Officer (COO)',
    newDepartment: 'Executive Leadership',
    revisedSalary: 4200000,
    description: 'Executive appointment as Chief Operating Officer & Whole-time Director.',
    createdBy: 'Dr. A. Selvakumar (MD)',
    approvedBy: 'Corporate Board of Directors',
    createdDate: '2021-06-15',
    approvalStatus: 'Approved'
  },
  // KrishaRaj
  {
    id: 'SR-002-1',
    employeeId: 'EMP-SDM-0003',
    employeeName: 'KrishaRaj',
    recordType: 'Date of Joining',
    effectiveDate: '2021-04-01',
    newDesignation: 'Delivery Manager',
    newDepartment: 'Engineering & Delivery',
    newReportingManager: 'Dr. A. Selvakumar',
    revisedSalary: 2400000,
    description: 'Joined Celestial to lead client engineering delivery and technical squads.',
    createdBy: 'Raseedh (HR)',
    approvedBy: 'Dr. A. Selvakumar (MD)',
    createdDate: '2021-04-01',
    approvalStatus: 'Approved'
  },
  {
    id: 'SR-002-2',
    employeeId: 'EMP-SDM-0003',
    employeeName: 'KrishaRaj',
    recordType: 'Salary Revision',
    effectiveDate: '2023-04-01',
    previousSalary: 2400000,
    revisedSalary: 2800000,
    description: 'Annual performance increment for exceptional enterprise project deliveries.',
    createdBy: 'Raseedh (HR)',
    approvedBy: 'Dr. A. Selvakumar (MD)',
    createdDate: '2023-04-01',
    approvalStatus: 'Approved'
  },
  // Raseedh
  {
    id: 'SR-001-1',
    employeeId: 'EMP-HRM-0012',
    employeeName: 'Raseedh',
    recordType: 'Date of Joining',
    effectiveDate: '2022-01-15',
    newDesignation: 'HR Manager',
    newDepartment: 'People & Culture (HR)',
    newReportingManager: 'S. Kannan',
    revisedSalary: 1600000,
    description: 'Joined as HR Manager leading talent operations and HR compliance.',
    createdBy: 'S. Kannan (COO)',
    approvedBy: 'S. Kannan (COO)',
    createdDate: '2022-01-15',
    approvalStatus: 'Approved'
  },
  {
    id: 'SR-001-2',
    employeeId: 'EMP-HRM-0012',
    employeeName: 'Raseedh',
    recordType: 'Salary Revision',
    effectiveDate: '2024-04-01',
    previousSalary: 1600000,
    revisedSalary: 1800000,
    description: 'Annual merit increment and compensation adjustment.',
    createdBy: 'S. Kannan (COO)',
    approvedBy: 'S. Kannan (COO)',
    createdDate: '2024-04-01',
    approvalStatus: 'Approved'
  },
  // Gowtham
  {
    id: 'SR-017-1',
    employeeId: 'EMP-FAC-0013',
    employeeName: 'Gowtham',
    recordType: 'Date of Joining',
    effectiveDate: '2023-04-01',
    newDesignation: 'Facility Manager',
    newDepartment: 'Facilities & Operations',
    newReportingManager: 'Raseedh',
    revisedSalary: 1100000,
    description: 'Joined as Facility Manager overseeing workspace operations and vendor management.',
    createdBy: 'Raseedh (HR)',
    approvedBy: 'S. Kannan (COO)',
    createdDate: '2023-04-01',
    approvalStatus: 'Approved'
  },
  // Archana
  {
    id: 'SR-003-1',
    employeeId: 'EMP-SWE-0004',
    employeeName: 'Archana',
    recordType: 'Date of Joining',
    effectiveDate: '2023-02-10',
    newDesignation: 'Software Developer',
    newDepartment: 'Engineering & Delivery',
    newReportingManager: 'KrishaRaj',
    revisedSalary: 1500000,
    description: 'Joined engineering team for full-stack enterprise cloud application development.',
    createdBy: 'Raseedh (HR)',
    approvedBy: 'KrishaRaj',
    createdDate: '2023-02-10',
    approvalStatus: 'Approved'
  },
  {
    id: 'SR-003-2',
    employeeId: 'EMP-SWE-0004',
    employeeName: 'Archana',
    recordType: 'Salary Revision',
    effectiveDate: '2024-04-01',
    previousSalary: 1500000,
    revisedSalary: 1800000,
    description: 'Annual merit revision and technical contribution increment.',
    createdBy: 'Raseedh (HR)',
    approvedBy: 'KrishaRaj',
    createdDate: '2024-04-01',
    approvalStatus: 'Approved'
  },
  // AnuPriya
  {
    id: 'SR-011-1',
    employeeId: 'EMP-SWE-0005',
    employeeName: 'AnuPriya',
    recordType: 'Date of Joining',
    effectiveDate: '2023-09-01',
    newDesignation: 'Software Developer',
    newDepartment: 'Engineering & Delivery',
    newReportingManager: 'KrishaRaj',
    revisedSalary: 1200000,
    description: 'Joined engineering development team.',
    createdBy: 'Raseedh (HR)',
    approvedBy: 'KrishaRaj',
    createdDate: '2023-09-01',
    approvalStatus: 'Approved'
  },
  // Suguna
  {
    id: 'SR-012-1',
    employeeId: 'EMP-SWE-0006',
    employeeName: 'Suguna',
    recordType: 'Date of Joining',
    effectiveDate: '2023-10-15',
    newDesignation: 'Software Developer',
    newDepartment: 'Engineering & Delivery',
    newReportingManager: 'KrishaRaj',
    revisedSalary: 1200000,
    description: 'Joined engineering development team.',
    createdBy: 'Raseedh (HR)',
    approvedBy: 'KrishaRaj',
    createdDate: '2023-10-15',
    approvalStatus: 'Approved'
  },
  // Maha Lakshmi
  {
    id: 'SR-004-1',
    employeeId: 'EMP-SWE-0007',
    employeeName: 'Maha Lakshmi',
    recordType: 'Date of Joining',
    effectiveDate: '2024-06-01',
    newDesignation: 'Software Developer',
    newDepartment: 'Engineering & Delivery',
    newReportingManager: 'KrishaRaj',
    revisedSalary: 960000,
    description: 'Joined development squad for client banking microservices.',
    createdBy: 'Raseedh (HR)',
    approvedBy: 'KrishaRaj',
    createdDate: '2024-06-01',
    approvalStatus: 'Approved'
  },
  // Priya Dharshini
  {
    id: 'SR-015-1',
    employeeId: 'EMP-SWE-0008',
    employeeName: 'Priya Dharshini',
    recordType: 'Date of Joining',
    effectiveDate: '2023-11-01',
    newDesignation: 'Software Developer',
    newDepartment: 'Engineering & Delivery',
    newReportingManager: 'KrishaRaj',
    revisedSalary: 1250000,
    description: 'Joined engineering development team.',
    createdBy: 'Raseedh (HR)',
    approvedBy: 'KrishaRaj',
    createdDate: '2023-11-01',
    approvalStatus: 'Approved'
  },
  // Karthika
  {
    id: 'SR-014-1',
    employeeId: 'EMP-SWE-0009',
    employeeName: 'Karthika',
    recordType: 'Date of Joining',
    effectiveDate: '2024-01-15',
    newDesignation: 'Software Developer',
    newDepartment: 'Engineering & Delivery',
    newReportingManager: 'KrishaRaj',
    revisedSalary: 1200000,
    description: 'Joined engineering development team.',
    createdBy: 'Raseedh (HR)',
    approvedBy: 'KrishaRaj',
    createdDate: '2024-01-15',
    approvalStatus: 'Approved'
  },
  // Praveen
  {
    id: 'SR-013-1',
    employeeId: 'EMP-SWE-0010',
    employeeName: 'Praveen',
    recordType: 'Date of Joining',
    effectiveDate: '2023-06-01',
    newDesignation: 'Software Developer',
    newDepartment: 'Engineering & Delivery',
    newReportingManager: 'KrishaRaj',
    revisedSalary: 1350000,
    description: 'Joined engineering development team.',
    createdBy: 'Raseedh (HR)',
    approvedBy: 'KrishaRaj',
    createdDate: '2023-06-01',
    approvalStatus: 'Approved'
  },
  // Niranjan
  {
    id: 'SR-016-1',
    employeeId: 'EMP-SWE-0011',
    employeeName: 'Niranjan',
    recordType: 'Date of Joining',
    effectiveDate: '2023-08-01',
    newDesignation: 'Software Developer',
    newDepartment: 'Engineering & Delivery',
    newReportingManager: 'KrishaRaj',
    revisedSalary: 1300000,
    description: 'Joined engineering development team.',
    createdBy: 'Raseedh (HR)',
    approvedBy: 'KrishaRaj',
    createdDate: '2023-08-01',
    approvalStatus: 'Approved'
  }
];
