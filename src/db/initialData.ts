import { canonicalEmployees, canonicalPersonaUsers, initialServiceRecords } from './employeeRoster';
import {
  CompanyProfile,
  Branch,
  Department,
  Designation,
  Employee,
  LeaveType,
  LeaveApplication,
  Holiday,
  SalaryComponent,
  SalaryStructure,
  PayrollRun,
  PayrollLineItem,
  ExpenseCategory,
  ExpenseClaim,
  Asset,
  ShiftDefinition,
  AttendanceRecord,
  AttendanceCorrectionRequest,
  AuditLog,
  AppNotification,
  CurrentUser,
  ServiceRecord
} from '../types/hrms';

export const initialCompanyProfile: CompanyProfile = {
  id: 'COMP-001',
  name: 'Breakthru enterprise solution Private limited',
  legalEntity: 'Breakthru enterprise solution Private limited',
  registrationNumber: 'U72900KA2021PTC149821',
  incorporatedDate: '2021-06-15',
  taxId: 'AAACB9876F',
  gstNumber: '29AAACB9876F1Z5',
  tanNumber: 'BLRA12345E',
  iecNumber: '0712345678',
  pfRegistrationNumber: 'BGBNG0098765000',
  esiRegistrationNumber: '53000987650001002',
  contactEmail: 'hr.operations@orbyx.internal',
  contactPhone: '+91 80 4092 6600',
  address: 'Indiranagar 100 Feet Road, HAL 2nd Stage',
  city: 'Bengaluru',
  state: 'Karnataka',
  country: 'India',
  zipCode: '560038',
  directors: [
    {
      id: 'DIR-001',
      fullName: 'Dr. A. Selvakumar',
      designation: 'Managing Director',
      appointmentDate: '2021-06-15',
      din: ''
    },
    {
      id: 'DIR-002',
      fullName: 'S. Kannan',
      designation: 'Director',
      appointmentDate: '2021-06-15',
      din: ''
    }
  ],
  currency: 'INR',
  currencySymbol: '₹',
  workingDaysPerWeek: 5,
  standardHoursPerDay: 8,
  fiscalYearStart: '04-01'
};

export const initialBranches: Branch[] = [
  { id: 'BR-BLR', name: 'Bengaluru Delivery Center (HQ)', code: 'HQ-BLR', city: 'Bengaluru', isHeadquarters: true },
  { id: 'BR-MUM', name: 'Mumbai BKC Office', code: 'MUM-01', city: 'Mumbai', isHeadquarters: false },
  { id: 'BR-HYD', name: 'Hyderabad Innovation Hub', code: 'HYD-01', city: 'Hyderabad', isHeadquarters: false }
];

export const initialDepartments: Department[] = [
  { id: 'DEP-EXEC', name: 'Executive Leadership', code: 'EXEC', headEmployeeId: 'EMP-000', description: 'Corporate governance, strategic operations and executive steering' },
  { id: 'DEP-ENG', name: 'Engineering & Delivery', code: 'ENG', headEmployeeId: 'EMP-002', description: 'Enterprise client projects, cloud engineering and software solutions' },
  { id: 'DEP-PRD', name: 'Product & Design', code: 'PRD', headEmployeeId: 'EMP-003', description: 'Product architecture and design systems' },
  { id: 'DEP-HR', name: 'People & Culture', code: 'HR', headEmployeeId: 'EMP-001', description: 'Talent operations, recruitment, payroll and HR policies' },
  { id: 'DEP-FIN', name: 'Finance & Accounts', code: 'FIN', headEmployeeId: 'EMP-006', description: 'Financial planning, statutory compliance and payouts' },
  { id: 'DEP-SALES', name: 'Sales & Client Solutions', code: 'SALES', headEmployeeId: 'EMP-009', description: 'Enterprise solution sales and client relationships' }
];

export const initialDesignations: Designation[] = [
  { id: 'DES-MD', title: 'Managing Director (MD)', code: 'MD-01', departmentId: 'DEP-EXEC', level: 'Executive' },
  { id: 'DES-HR-MGR', title: 'HR Manager & People Ops Lead', code: 'HR-01', departmentId: 'DEP-HR', level: 'Senior' },
  { id: 'DES-ENG-MGR', title: 'Senior Delivery Manager', code: 'SDM-01', departmentId: 'DEP-ENG', level: 'Lead' },
  { id: 'DES-SWE', title: 'Software Engineer', code: 'SWE', departmentId: 'DEP-ENG', level: 'Mid' },
  { id: 'DES-DES-LEAD', title: 'Software Engineer', code: 'SWE-II', departmentId: 'DEP-ENG', level: 'Mid' },
  { id: 'DES-JR-ENG', title: 'Software Engineer', code: 'SWE-I', departmentId: 'DEP-ENG', level: 'Junior' },
  { id: 'DES-SR-ENG', title: 'Senior Backend Engineer', code: 'SWE-III', departmentId: 'DEP-ENG', level: 'Senior' },
  { id: 'DES-FIN-SPEC', title: 'Senior Finance Specialist', code: 'FIN-02', departmentId: 'DEP-FIN', level: 'Senior' },
  { id: 'DES-DEVOPS', title: 'DevOps & Cloud Engineer', code: 'DEVOPS-II', departmentId: 'DEP-ENG', level: 'Mid' },
  { id: 'DES-FRONTEND', title: 'Frontend Engineer', code: 'SWE-II', departmentId: 'DEP-ENG', level: 'Mid' }
];

export const initialShifts: ShiftDefinition[] = [
  {
    id: 'SHIFT-GEN',
    name: 'General Day Shift',
    code: 'GEN-01',
    startTime: '09:30',
    endTime: '18:30',
    gracePeriodMinutes: 15,
    breakDurationMinutes: 60,
    totalWorkingHours: 8,
    isOvernight: false,
    weeklyOffDays: [0, 6] // Sun, Sat
  },
  {
    id: 'SHIFT-EARLY',
    name: 'Early Morning Shift',
    code: 'EAR-01',
    startTime: '08:00',
    endTime: '17:00',
    gracePeriodMinutes: 15,
    breakDurationMinutes: 60,
    totalWorkingHours: 8,
    isOvernight: false,
    weeklyOffDays: [0, 6]
  },
  {
    id: 'SHIFT-LATE',
    name: 'Late Shift',
    code: 'LAT-01',
    startTime: '13:00',
    endTime: '22:00',
    gracePeriodMinutes: 15,
    breakDurationMinutes: 60,
    totalWorkingHours: 8,
    isOvernight: false,
    weeklyOffDays: [0, 6]
  }
];

export const initialLeaveTypes: LeaveType[] = [
  {
    id: 'LT-AL',
    name: 'Annual Paid Leave',
    code: 'AL',
    description: 'Earned paid leave for vacation, personal well-being and family time',
    isPaid: true,
    annualEntitlement: 18,
    carryForwardLimit: 8,
    maxConsecutiveDays: 10,
    allowsHalfDay: true,
    allowNegativeBalance: false,
    requiresDocumentProof: false,
    color: 'emerald'
  },
  {
    id: 'LT-SL',
    name: 'Sick & Medical Leave',
    code: 'SL',
    description: 'Paid medical leave for illness, surgeries, and recovery',
    isPaid: true,
    annualEntitlement: 12,
    carryForwardLimit: 0,
    maxConsecutiveDays: 14,
    allowsHalfDay: true,
    allowNegativeBalance: true,
    requiresDocumentProof: true,
    color: 'amber'
  },
  {
    id: 'LT-CL',
    name: 'Casual Leave',
    code: 'CL',
    description: 'Short unplanned leave for urgent personal errands',
    isPaid: true,
    annualEntitlement: 8,
    carryForwardLimit: 0,
    maxConsecutiveDays: 3,
    allowsHalfDay: true,
    allowNegativeBalance: false,
    requiresDocumentProof: false,
    color: 'blue'
  },
  {
    id: 'LT-LOP',
    name: 'Loss of Pay / Unpaid Leave',
    code: 'LOP',
    description: 'Unpaid absence resulting in salary proration during payroll processing',
    isPaid: false,
    annualEntitlement: 0,
    carryForwardLimit: 0,
    maxConsecutiveDays: 30,
    allowsHalfDay: true,
    allowNegativeBalance: true,
    requiresDocumentProof: false,
    color: 'rose'
  }
];

export const initialHolidays: Holiday[] = [
  { id: 'HOL-01', name: 'Republic Day', date: '2026-01-26', isOptional: false, description: 'National Holiday' },
  { id: 'HOL-02', name: 'Maha Shivratri', date: '2026-02-15', isOptional: true, description: 'Optional Festival Holiday' },
  { id: 'HOL-03', name: 'Holi', date: '2026-03-04', isOptional: false, description: 'Festival of Colors' },
  { id: 'HOL-04', name: 'Ugadi / Gudi Padwa', date: '2026-03-20', isOptional: false, description: 'Regional New Year' },
  { id: 'HOL-05', name: 'Labor Day / May Day', date: '2026-05-01', isOptional: false, description: 'International Workers Day' },
  { id: 'HOL-06', name: 'Independence Day', date: '2026-08-15', isOptional: false, description: 'National Holiday' },
  { id: 'HOL-07', name: 'Ganesh Chaturthi', date: '2026-09-14', isOptional: false, description: 'Festival' },
  { id: 'HOL-08', name: 'Gandhi Jayanti', date: '2026-10-02', isOptional: false, description: 'National Holiday' },
  { id: 'HOL-09', name: 'Dussehra / Vijaya Dashami', date: '2026-10-20', isOptional: false, description: 'Festival' },
  { id: 'HOL-10', name: 'Diwali (Deepavali)', date: '2026-11-08', isOptional: false, description: 'Festival of Lights' },
  { id: 'HOL-11', name: 'Kannada Rajyotsava', date: '2026-11-01', isOptional: false, description: 'State Holiday' },
  { id: 'HOL-12', name: 'Christmas Day', date: '2026-12-25', isOptional: false, description: 'Public Holiday' }
];

export const initialSalaryComponents: SalaryComponent[] = [
  { id: 'SC-BASIC', name: 'Basic Salary', code: 'BASIC', type: 'Earning', isStatutory: true, isTaxable: true, calculationType: 'Percentage_CTC', formulaOrRate: 0.50 },
  { id: 'SC-HRA', name: 'House Rent Allowance (HRA)', code: 'HRA', type: 'Earning', isStatutory: false, isTaxable: true, calculationType: 'Percentage_Basic', formulaOrRate: 0.50 },
  { id: 'SC-SPL', name: 'Special Allowance', code: 'SPL_ALLW', type: 'Earning', isStatutory: false, isTaxable: true, calculationType: 'Fixed' },
  { id: 'SC-PF-EMP', name: 'Provident Fund (Employee)', code: 'PF_EMP', type: 'Deduction', isStatutory: true, isTaxable: false, calculationType: 'Percentage_Basic', formulaOrRate: 0.12 },
  { id: 'SC-ESI-EMP', name: 'ESI (Employee)', code: 'ESI_EMP', type: 'Deduction', isStatutory: true, isTaxable: false, calculationType: 'Formula' },
  { id: 'SC-PT', name: 'Professional Tax (PT)', code: 'PT', type: 'Deduction', isStatutory: true, isTaxable: false, calculationType: 'Fixed', formulaOrRate: 200 },
  { id: 'SC-TDS', name: 'Income Tax (TDS)', code: 'TDS', type: 'Deduction', isStatutory: true, isTaxable: false, calculationType: 'Fixed' },
  { id: 'SC-PF-EMPR', name: 'Provident Fund (Employer)', code: 'PF_EMPR', type: 'Employer_Contribution', isStatutory: true, isTaxable: false, calculationType: 'Percentage_Basic', formulaOrRate: 0.12 }
];

export const initialSalaryStructures: SalaryStructure[] = [
  {
    id: 'SS-ENG-LEAD',
    name: 'Engineering & Delivery Leadership Structure (CTC ₹28L)',
    description: 'Senior delivery management & leads with taxable allowances and statutory retirement benefits',
    grossMonthly: 215000,
    ctcAnnual: 2800000,
    items: [
      { componentId: 'SC-BASIC', componentCode: 'BASIC', componentName: 'Basic Salary', type: 'Earning', amountMonthly: 107500, amountAnnual: 1290000 },
      { componentId: 'SC-HRA', componentCode: 'HRA', componentName: 'House Rent Allowance (HRA)', type: 'Earning', amountMonthly: 53750, amountAnnual: 645000 },
      { componentId: 'SC-SPL', componentCode: 'SPL_ALLW', componentName: 'Special Allowance', type: 'Earning', amountMonthly: 53750, amountAnnual: 645000 },
      { componentId: 'SC-PF-EMP', componentCode: 'PF_EMP', componentName: 'Provident Fund (Employee 12%)', type: 'Deduction', amountMonthly: 12900, amountAnnual: 154800 },
      { componentId: 'SC-PT', componentCode: 'PT', componentName: 'Professional Tax', type: 'Deduction', amountMonthly: 200, amountAnnual: 2400 },
      { componentId: 'SC-TDS', componentCode: 'TDS', componentName: 'Tax Deducted at Source (TDS)', type: 'Deduction', amountMonthly: 24500, amountAnnual: 294000 }
    ],
    isActive: true
  },
  {
    id: 'SS-SENIOR',
    name: 'Senior Professional Structure (CTC ₹18L)',
    description: 'Senior Engineers, Leads and Managers with balanced earnings and statutory PF/PT',
    grossMonthly: 140000,
    ctcAnnual: 1800000,
    items: [
      { componentId: 'SC-BASIC', componentCode: 'BASIC', componentName: 'Basic Salary', type: 'Earning', amountMonthly: 70000, amountAnnual: 840000 },
      { componentId: 'SC-HRA', componentCode: 'HRA', componentName: 'House Rent Allowance (HRA)', type: 'Earning', amountMonthly: 35000, amountAnnual: 420000 },
      { componentId: 'SC-SPL', componentCode: 'SPL_ALLW', componentName: 'Special Allowance', type: 'Earning', amountMonthly: 35000, amountAnnual: 420000 },
      { componentId: 'SC-PF-EMP', componentCode: 'PF_EMP', componentName: 'Provident Fund (Employee 12%)', type: 'Deduction', amountMonthly: 8400, amountAnnual: 100800 },
      { componentId: 'SC-PT', componentCode: 'PT', componentName: 'Professional Tax', type: 'Deduction', amountMonthly: 200, amountAnnual: 2400 },
      { componentId: 'SC-TDS', componentCode: 'TDS', componentName: 'Tax Deducted at Source (TDS)', type: 'Deduction', amountMonthly: 12500, amountAnnual: 150000 }
    ],
    isActive: true
  },
  {
    id: 'SS-JUNIOR',
    name: 'Software Engineer Structure (CTC ₹9.6L)',
    description: 'Software Engineers, Associates, and Solutions Analysts',
    grossMonthly: 75000,
    ctcAnnual: 960000,
    items: [
      { componentId: 'SC-BASIC', componentCode: 'BASIC', componentName: 'Basic Salary', type: 'Earning', amountMonthly: 37500, amountAnnual: 450000 },
      { componentId: 'SC-HRA', componentCode: 'HRA', componentName: 'House Rent Allowance (HRA)', type: 'Earning', amountMonthly: 18750, amountAnnual: 225000 },
      { componentId: 'SC-SPL', componentCode: 'SPL_ALLW', componentName: 'Special Allowance', type: 'Earning', amountMonthly: 18750, amountAnnual: 225000 },
      { componentId: 'SC-PF-EMP', componentCode: 'PF_EMP', componentName: 'Provident Fund (Employee 12%)', type: 'Deduction', amountMonthly: 4500, amountAnnual: 54000 },
      { componentId: 'SC-PT', componentCode: 'PT', componentName: 'Professional Tax', type: 'Deduction', amountMonthly: 200, amountAnnual: 2400 },
      { componentId: 'SC-TDS', componentCode: 'TDS', componentName: 'Tax Deducted at Source (TDS)', type: 'Deduction', amountMonthly: 3500, amountAnnual: 42000 }
    ],
    isActive: true
  }
];

export const initialEmployees: Employee[] = canonicalEmployees;

export const personaUsers: CurrentUser[] = canonicalPersonaUsers;

export const initialLeaveApplications: LeaveApplication[] = [
  {
    id: 'LV-APP-2026-001',
    employeeId: 'EMP-004',
    leaveTypeId: 'LT-AL',
    startDate: '2026-10-27',
    endDate: '2026-10-29',
    isHalfDay: false,
    totalDays: 3,
    reason: 'Attending family function in Chennai',
    status: 'Pending Approval',
    approverId: 'EMP-002',
    appliedAt: '2026-10-21T14:30:00Z'
  },
  {
    id: 'LV-APP-2026-002',
    employeeId: 'EMP-005',
    leaveTypeId: 'LT-SL',
    startDate: '2026-10-22',
    endDate: '2026-10-23',
    isHalfDay: false,
    totalDays: 2,
    reason: 'Viral fever and severe flu symptoms',
    attachmentName: 'medical_prescription_oct22.pdf',
    status: 'Approved',
    approverId: 'EMP-002',
    approvalComments: 'Get well soon Sneha. Rest up.',
    appliedAt: '2026-10-21T18:00:00Z',
    decidedAt: '2026-10-22T08:15:00Z'
  },
  {
    id: 'LV-APP-2026-003',
    employeeId: 'EMP-003',
    leaveTypeId: 'LT-CL',
    startDate: '2026-11-02',
    endDate: '2026-11-02',
    isHalfDay: true,
    halfDayPeriod: 'Second Half',
    totalDays: 0.5,
    reason: 'Personal bank appointment for passport renewal',
    status: 'Approved',
    approverId: 'EMP-002',
    approvalComments: 'Approved by Delivery Manager.',
    appliedAt: '2026-10-18T10:00:00Z',
    decidedAt: '2026-10-18T11:20:00Z'
  },
  {
    id: 'LV-APP-2026-004',
    employeeId: 'EMP-008',
    leaveTypeId: 'LT-AL',
    startDate: '2026-10-24',
    endDate: '2026-10-25',
    isHalfDay: false,
    totalDays: 2,
    reason: 'Long weekend trip to Coorg',
    status: 'Pending Approval',
    approverId: 'EMP-002',
    appliedAt: '2026-10-22T16:45:00Z'
  },
  {
    id: 'LV-APP-2026-005',
    employeeId: 'EMP-007',
    leaveTypeId: 'LT-AL',
    startDate: '2026-09-15',
    endDate: '2026-09-18',
    isHalfDay: false,
    totalDays: 4,
    reason: 'Annual family holiday in Kerala',
    status: 'Approved',
    approverId: 'EMP-002',
    approvalComments: 'Have a great holiday!',
    appliedAt: '2026-09-01T09:00:00Z',
    decidedAt: '2026-09-02T10:00:00Z'
  }
];

export const initialExpenseCategories: ExpenseCategory[] = [
  { id: 'EXP-CAT-TRV', name: 'Travel & Local Conveyance', code: 'TRV', maxLimitPerClaim: 15000, requiresReceipt: true, description: 'Flight tickets, airport taxis, Uber, outstation client transit' },
  { id: 'EXP-CAT-MEAL', name: 'Meals & Client Entertainment', code: 'MEAL', maxLimitPerClaim: 5000, requiresReceipt: true, description: 'Client dinners, team working lunches during delivery sprints' },
  { id: 'EXP-CAT-OFF', name: 'Home Office & Hardware', code: 'OFF', maxLimitPerClaim: 20000, requiresReceipt: true, description: 'Ergonomic accessories, keyboard, mouse, cables, surge protectors' },
  { id: 'EXP-CAT-SFT', name: 'Software & Subscriptions', code: 'SFT', maxLimitPerClaim: 30000, requiresReceipt: true, description: 'Developer tools, IDE licenses, cloud credits, SaaS utilities' },
  { id: 'EXP-CAT-LRN', name: 'Learning & Certifications', code: 'LRN', maxLimitPerClaim: 25000, requiresReceipt: true, description: 'AWS/GCP/Azure certifications, technical books, conference passes' }
];

export const initialExpenseClaims: ExpenseClaim[] = [
  {
    id: 'EXP-2026-001',
    claimNumber: 'EXP-2026-001',
    employeeId: 'EMP-004',
    categoryId: 'EXP-CAT-OFF',
    title: 'Keychron Mechanical Keyboard for Software Engineering',
    amount: 6499,
    currency: 'INR',
    expenseDate: '2026-10-14',
    businessPurpose: 'Ergonomic workspace accessory for software development',
    receiptFileName: 'keychron_invoice_amazon.pdf',
    status: 'Pending Manager Approval',
    approverId: 'EMP-002',
    submittedAt: '2026-10-15T11:00:00Z'
  },
  {
    id: 'EXP-2026-002',
    claimNumber: 'EXP-2026-002',
    employeeId: 'EMP-003',
    categoryId: 'EXP-CAT-SFT',
    title: 'JetBrains All Products Pack Subscription',
    amount: 8200,
    currency: 'INR',
    expenseDate: '2026-10-05',
    businessPurpose: 'IDE toolchain for enterprise client software development',
    receiptFileName: 'jetbrains_receipt_2026.pdf',
    status: 'Pending Reimbursement',
    approverId: 'EMP-002',
    approvalComments: 'Approved for software engineering tools.',
    submittedAt: '2026-10-06T14:20:00Z',
    decidedAt: '2026-10-07T16:00:00Z'
  },
  {
    id: 'EXP-2026-003',
    claimNumber: 'EXP-2026-003',
    employeeId: 'EMP-005',
    categoryId: 'EXP-CAT-TRV',
    title: 'Client Visit to Mumbai BKC Office Cab transit',
    amount: 1850,
    currency: 'INR',
    expenseDate: '2026-09-22',
    businessPurpose: 'Airport transfers during enterprise client delivery review',
    receiptFileName: 'uber_receipt_mumbai.pdf',
    status: 'Reimbursed',
    approverId: 'EMP-002',
    approvalComments: 'Verified and approved.',
    reimbursementReference: 'UTR-HDFC-99228811',
    reimbursedAt: '2026-09-30T15:30:00Z',
    submittedAt: '2026-09-23T09:15:00Z',
    decidedAt: '2026-09-24T12:00:00Z'
  },
  {
    id: 'EXP-2026-004',
    claimNumber: 'EXP-2026-004',
    employeeId: 'EMP-007',
    categoryId: 'EXP-CAT-LRN',
    title: 'Certified Kubernetes Administrator (CKA) Exam Voucher',
    amount: 24500,
    currency: 'INR',
    expenseDate: '2026-10-10',
    businessPurpose: 'Cloud architecture credential for client delivery cluster maintenance',
    receiptFileName: 'linux_foundation_receipt.pdf',
    status: 'Pending Manager Approval',
    approverId: 'EMP-002',
    submittedAt: '2026-10-12T17:00:00Z'
  }
];

export const initialAssets: Asset[] = [
  {
    id: 'AST-2026-001',
    assetTag: 'ORBYX-LAP-001',
    name: 'Apple MacBook Pro 16" M3 Pro',
    category: 'Laptop',
    brand: 'Apple',
    model: 'MacBook Pro 16-inch (36GB RAM, 512GB SSD)',
    serialNumber: 'C02G99887766',
    purchaseDate: '2024-03-15',
    purchaseCost: 249900,
    warrantyExpiryDate: '2027-03-14',
    supplier: 'Imagine Retail Bengaluru',
    location: 'Bengaluru Delivery Center',
    condition: 'Good',
    status: 'Allocated',
    currentEmployeeId: 'EMP-002',
    allocatedDate: '2024-03-20',
    acknowledgedByEmployee: true,
    acknowledgedAt: '2024-03-21T10:00:00Z',
    notes: 'Primary delivery management workstation'
  },
  {
    id: 'AST-2026-002',
    assetTag: 'ORBYX-LAP-002',
    name: 'Apple MacBook Pro 14" M3 Pro',
    category: 'Laptop',
    brand: 'Apple',
    model: 'MacBook Pro 14-inch (18GB RAM, 512GB SSD)',
    serialNumber: 'C02H11223344',
    purchaseDate: '2024-02-10',
    purchaseCost: 199900,
    warrantyExpiryDate: '2027-02-09',
    supplier: 'Imagine Retail Bengaluru',
    location: 'Bengaluru Delivery Center',
    condition: 'Good',
    status: 'Allocated',
    currentEmployeeId: 'EMP-003',
    allocatedDate: '2024-02-15',
    acknowledgedByEmployee: true,
    acknowledgedAt: '2024-02-16T11:00:00Z',
    notes: 'Software engineering workstation'
  },
  {
    id: 'AST-2026-003',
    assetTag: 'ORBYX-LAP-003',
    name: 'Dell Latitude 7440 Intel Core i7',
    category: 'Laptop',
    brand: 'Dell',
    model: 'Latitude 7440 (16GB RAM, 512GB NVMe)',
    serialNumber: '8877665544',
    purchaseDate: '2024-06-05',
    purchaseCost: 115000,
    warrantyExpiryDate: '2027-06-04',
    supplier: 'Dell India Direct',
    location: 'Bengaluru Delivery Center',
    condition: 'Good',
    status: 'Allocated',
    currentEmployeeId: 'EMP-004',
    allocatedDate: '2024-06-10',
    acknowledgedByEmployee: false,
    notes: 'Standard engineering deployment'
  },
  {
    id: 'AST-2026-004',
    assetTag: 'ORBYX-MON-001',
    name: 'Dell UltraSharp 27" 4K USB-C Monitor',
    category: 'Monitor',
    brand: 'Dell',
    model: 'U2723QE 4K IPS Black',
    serialNumber: 'CN-098877-6655',
    purchaseDate: '2024-01-20',
    purchaseCost: 52000,
    warrantyExpiryDate: '2027-01-19',
    supplier: 'Dell India Direct',
    location: 'Desk B-204 Bengaluru',
    condition: 'Good',
    status: 'Allocated',
    currentEmployeeId: 'EMP-003',
    allocatedDate: '2024-02-15',
    acknowledgedByEmployee: true,
    acknowledgedAt: '2024-02-16T11:00:00Z'
  },
  {
    id: 'AST-2026-005',
    assetTag: 'ORBYX-LAP-004',
    name: 'Lenovo ThinkPad T14s Gen 4 AMD',
    category: 'Laptop',
    brand: 'Lenovo',
    model: 'ThinkPad T14s (32GB RAM, 1TB SSD)',
    serialNumber: 'PF499881',
    purchaseDate: '2024-08-01',
    purchaseCost: 128000,
    warrantyExpiryDate: '2027-07-31',
    supplier: 'Lenovo Commercial Store',
    location: 'IT Storage Room A-02',
    condition: 'Brand New',
    status: 'Available',
    acknowledgedByEmployee: false,
    notes: 'Configured and ready for new joiner'
  },
  {
    id: 'AST-2026-006',
    assetTag: 'ORBYX-CHR-001',
    name: 'Featherlite Helix Ergonomic High Back Chair',
    category: 'Office Furniture',
    brand: 'Featherlite',
    model: 'Helix Mesh High-Back',
    serialNumber: 'FL-2024-9988',
    purchaseDate: '2024-01-10',
    purchaseCost: 18500,
    warrantyExpiryDate: '2026-01-09',
    supplier: 'Featherlite Products Bengaluru',
    location: 'Desk C-102 Bengaluru',
    condition: 'Good',
    status: 'Allocated',
    currentEmployeeId: 'EMP-001',
    allocatedDate: '2024-01-15',
    acknowledgedByEmployee: true,
    acknowledgedAt: '2024-01-16T09:00:00Z'
  }
];

export const initialAttendanceRecords: AttendanceRecord[] = [
  {
    id: 'ATT-20261023-001',
    employeeId: 'EMP-001',
    date: '2026-10-23',
    shiftId: 'SHIFT-GEN',
    checkInTime: '09:20',
    checkOutTime: '18:15',
    totalHoursWorked: 8.9,
    regularHours: 8.0,
    overtimeHours: 0.9,
    status: 'Present',
    isLate: false,
    isEarlyDeparture: false,
    lateMinutes: 0,
    source: 'Web Punch'
  },
  {
    id: 'ATT-20261023-002',
    employeeId: 'EMP-002',
    date: '2026-10-23',
    shiftId: 'SHIFT-GEN',
    checkInTime: '09:28',
    checkOutTime: '18:35',
    totalHoursWorked: 9.1,
    regularHours: 8.0,
    overtimeHours: 1.1,
    status: 'Present',
    isLate: false,
    isEarlyDeparture: false,
    lateMinutes: 0,
    source: 'Web Punch'
  },
  {
    id: 'ATT-20261023-003',
    employeeId: 'EMP-003',
    date: '2026-10-23',
    shiftId: 'SHIFT-GEN',
    checkInTime: '09:35',
    checkOutTime: undefined,
    totalHoursWorked: 0,
    regularHours: 0,
    overtimeHours: 0,
    status: 'Present',
    isLate: false,
    isEarlyDeparture: false,
    lateMinutes: 0,
    source: 'Web Punch'
  },
  {
    id: 'ATT-20261023-004',
    employeeId: 'EMP-004',
    date: '2026-10-23',
    shiftId: 'SHIFT-GEN',
    checkInTime: '10:05',
    checkOutTime: undefined,
    totalHoursWorked: 0,
    regularHours: 0,
    overtimeHours: 0,
    status: 'Late',
    isLate: true,
    isEarlyDeparture: false,
    lateMinutes: 20,
    source: 'Web Punch',
    notes: 'Delayed due to traffic congestion'
  },
  {
    id: 'ATT-20261023-005',
    employeeId: 'EMP-005',
    date: '2026-10-23',
    shiftId: 'SHIFT-GEN',
    status: 'On Leave',
    totalHoursWorked: 0,
    regularHours: 0,
    overtimeHours: 0,
    isLate: false,
    isEarlyDeparture: false,
    lateMinutes: 0,
    source: 'System Default',
    notes: 'Approved Medical Leave (LV-APP-2026-002)'
  },
  {
    id: 'ATT-20261022-004',
    employeeId: 'EMP-004',
    date: '2026-10-22',
    shiftId: 'SHIFT-GEN',
    checkInTime: '09:25',
    checkOutTime: '18:30',
    totalHoursWorked: 9.08,
    regularHours: 8.0,
    overtimeHours: 1.08,
    status: 'Present',
    isLate: false,
    isEarlyDeparture: false,
    lateMinutes: 0,
    source: 'Web Punch'
  }
];

export const initialCorrectionRequests: AttendanceCorrectionRequest[] = [
  {
    id: 'CORR-2026-001',
    attendanceId: 'ATT-20261022-004',
    employeeId: 'EMP-004',
    date: '2026-10-21',
    requestedCheckIn: '09:30',
    requestedCheckOut: '18:30',
    reason: 'Forgot to punch out due to client production deployment emergency at 6:30 PM',
    status: 'Pending',
    approverId: 'EMP-002',
    submittedAt: '2026-10-22T09:15:00Z'
  }
];

export const initialPayrollRuns: PayrollRun[] = [
  {
    id: 'PR-2026-09',
    month: 9,
    year: 2026,
    periodLabel: 'September 2026',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    totalEmployees: 8,
    totalGrossPay: 1045000,
    totalDeductions: 172600,
    totalNetPay: 872400,
    status: 'Finalized',
    processedBy: 'Anamika (HR Admin)',
    approvedBy: 'Rohan Mehta (Finance)',
    finalizedAt: '2026-09-30T17:00:00Z',
    paymentReference: 'NEFT-SAL-SEP2026-BATCH01',
    paymentDate: '2026-10-01',
    notes: 'Regular monthly salary disbursements for September 2026'
  }
];

export const initialPayrollLineItems: PayrollLineItem[] = [
  {
    id: 'PR-ITEM-001',
    payrollRunId: 'PR-2026-09',
    employeeId: 'EMP-001',
    employeeName: 'Anamika',
    departmentName: 'People & Culture',
    designationTitle: 'HR Manager & People Ops Lead',
    bankAccountNumber: '50100498761234',
    panNumber: 'ABCPS1234F',
    workingDaysInMonth: 30,
    daysPresent: 22,
    paidLeaves: 0,
    unpaidLeaves: 0,
    payableDays: 30,
    basicEarnings: 70000,
    hraEarnings: 35000,
    specialAllowanceEarnings: 35000,
    grossEarnings: 140000,
    pfEmployee: 8400,
    esiEmployee: 0,
    professionalTax: 200,
    tdsWithholding: 12500,
    unpaidLeaveDeduction: 0,
    otherDeductions: 0,
    totalDeductions: 21100,
    netPayable: 118900,
    pfEmployer: 8400,
    esiEmployer: 0,
    totalEmployerCost: 148400,
    status: 'Paid'
  },
  {
    id: 'PR-ITEM-002',
    payrollRunId: 'PR-2026-09',
    employeeId: 'EMP-002',
    employeeName: 'Krishnaraj',
    departmentName: 'Engineering & Delivery',
    designationTitle: 'Senior Delivery Manager',
    bankAccountNumber: '000201589412',
    panNumber: 'BCDPK8899A',
    workingDaysInMonth: 30,
    daysPresent: 22,
    paidLeaves: 0,
    unpaidLeaves: 0,
    payableDays: 30,
    basicEarnings: 107500,
    hraEarnings: 53750,
    specialAllowanceEarnings: 53750,
    grossEarnings: 215000,
    pfEmployee: 12900,
    esiEmployee: 0,
    professionalTax: 200,
    tdsWithholding: 24500,
    unpaidLeaveDeduction: 0,
    otherDeductions: 0,
    totalDeductions: 37600,
    netPayable: 177400,
    pfEmployer: 12900,
    esiEmployer: 0,
    totalEmployerCost: 227900,
    status: 'Paid'
  },
  {
    id: 'PR-ITEM-003',
    payrollRunId: 'PR-2026-09',
    employeeId: 'EMP-003',
    employeeName: 'Archana',
    departmentName: 'Engineering & Delivery',
    designationTitle: 'Software Engineer',
    bankAccountNumber: '915010045612345',
    panNumber: 'ASDPS7766G',
    workingDaysInMonth: 30,
    daysPresent: 22,
    paidLeaves: 0,
    unpaidLeaves: 0,
    payableDays: 30,
    basicEarnings: 70000,
    hraEarnings: 35000,
    specialAllowanceEarnings: 35000,
    grossEarnings: 140000,
    pfEmployee: 8400,
    esiEmployee: 0,
    professionalTax: 200,
    tdsWithholding: 12500,
    unpaidLeaveDeduction: 0,
    otherDeductions: 0,
    totalDeductions: 21100,
    netPayable: 118900,
    pfEmployer: 8400,
    esiEmployer: 0,
    totalEmployerCost: 148400,
    status: 'Paid'
  },
  {
    id: 'PR-ITEM-004',
    payrollRunId: 'PR-2026-09',
    employeeId: 'EMP-004',
    employeeName: 'Mahalakshmi',
    departmentName: 'Engineering & Delivery',
    designationTitle: 'Software Engineer',
    bankAccountNumber: '50100887766554',
    panNumber: 'BSVKS5544H',
    workingDaysInMonth: 30,
    daysPresent: 22,
    paidLeaves: 0,
    unpaidLeaves: 0,
    payableDays: 30,
    basicEarnings: 37500,
    hraEarnings: 18750,
    specialAllowanceEarnings: 18750,
    grossEarnings: 75000,
    pfEmployee: 4500,
    esiEmployee: 0,
    professionalTax: 200,
    tdsWithholding: 3500,
    unpaidLeaveDeduction: 0,
    otherDeductions: 0,
    totalDeductions: 8200,
    netPayable: 66800,
    pfEmployer: 4500,
    esiEmployer: 0,
    totalEmployerCost: 79500,
    status: 'Paid'
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'AUD-001',
    timestamp: '2026-10-23T09:20:00Z',
    actorUserId: 'user_hr_admin',
    actorName: 'Anamika',
    actorRole: 'hr_admin',
    action: 'LOGIN',
    module: 'SYSTEM',
    entityId: 'user_hr_admin',
    entityName: 'Anamika',
    description: 'HR Admin signed in successfully to Orbyx'
  },
  {
    id: 'AUD-002',
    timestamp: '2026-10-22T08:15:00Z',
    actorUserId: 'user_manager',
    actorName: 'Krishnaraj',
    actorRole: 'senior_manager',
    action: 'APPROVE',
    module: 'LEAVE',
    entityId: 'LV-APP-2026-002',
    entityName: 'Sneha Reddy (Medical Leave)',
    description: 'Approved 2 days of Sick Leave with doctor note attached'
  },
  {
    id: 'AUD-003',
    timestamp: '2026-10-01T17:30:00Z',
    actorUserId: 'user_hr_admin',
    actorName: 'Anamika',
    actorRole: 'hr_admin',
    action: 'FINALIZE',
    module: 'PAYROLL',
    entityId: 'PR-2026-09',
    entityName: 'September 2026 Payroll',
    description: 'Locked and finalized September 2026 payroll run (Net: ₹8,72,400)'
  }
];

export const initialNotifications: AppNotification[] = [
  {
    id: 'NOTIF-001',
    targetUserId: 'user_manager',
    title: 'New Leave Application',
    message: 'Mahalakshmi applied for 3 days of Annual Paid Leave starting Oct 27.',
    module: 'leave',
    isRead: false,
    createdAt: '2026-10-21T14:30:00Z'
  },
  {
    id: 'NOTIF-002',
    targetUserId: 'user_manager',
    title: 'Expense Claim Submitted',
    message: 'Mahalakshmi submitted an expense claim of ₹6,499 for Hardware & Office.',
    module: 'expense',
    isRead: false,
    createdAt: '2026-10-15T11:00:00Z'
  },
  {
    id: 'NOTIF-003',
    targetUserId: 'user_emp_junior',
    title: 'Asset Allocated',
    message: 'Dell Latitude 7440 was assigned to you. Please acknowledge receipt.',
    module: 'asset',
    isRead: false,
    createdAt: '2026-10-10T10:00:00Z'
  },
  {
    id: 'NOTIF-004',
    targetUserId: 'user_emp_junior',
    title: 'September Payslip Ready',
    message: 'Your payslip for September 2026 has been generated. Net Pay: ₹66,800.',
    module: 'payroll',
    isRead: true,
    createdAt: '2026-10-01T18:00:00Z'
  }
];



export { initialServiceRecords };
