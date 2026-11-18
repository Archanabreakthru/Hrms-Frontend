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
  { id: 'DEP-SALES', name: 'Sales & Client Solutions', code: 'SALES', headEmployeeId: 'EMP-009', description: 'Enterprise solution sales and client relationships' },
  { id: 'DEP-FAC', name: 'Facilities & Workplace', code: 'FAC', headEmployeeId: 'EMP-017', description: 'Office management, security, infrastructure and workplace administration' }
];

export const initialDesignations: Designation[] = [
  { id: 'DES-MD', title: 'Managing Director (MD)', code: 'MD-01', departmentId: 'DEP-EXEC', level: 'Executive' },
  { id: 'DES-COO', title: 'Chief Operating Officer (COO)', code: 'STF', departmentId: 'DEP-EXEC', level: 'Executive' },
  { id: 'DES-HR-MGR', title: 'HR Manager & People Ops Lead', code: 'HRM', departmentId: 'DEP-HR', level: 'Senior' },
  { id: 'DES-ENG-MGR', title: 'Senior Delivery Manager', code: 'SDM', departmentId: 'DEP-ENG', level: 'Lead' },
  { id: 'DES-SWE', title: 'Software Engineer', code: 'SWE', departmentId: 'DEP-ENG', level: 'Mid' },
  { id: 'DES-DES-LEAD', title: 'Software Engineer', code: 'SWE-II', departmentId: 'DEP-ENG', level: 'Mid' },
  { id: 'DES-JR-ENG', title: 'Software Engineer', code: 'SWE-I', departmentId: 'DEP-ENG', level: 'Junior' },
  { id: 'DES-SR-ENG', title: 'Senior Backend Engineer', code: 'SWE-III', departmentId: 'DEP-ENG', level: 'Senior' },
  { id: 'DES-FIN-SPEC', title: 'Senior Finance Specialist', code: 'FIN-02', departmentId: 'DEP-FIN', level: 'Senior' },
  { id: 'DES-DEVOPS', title: 'DevOps & Cloud Engineer', code: 'DEVOPS-II', departmentId: 'DEP-ENG', level: 'Mid' },
  { id: 'DES-FRONTEND', title: 'Frontend Engineer', code: 'SWE-II', departmentId: 'DEP-ENG', level: 'Mid' },
  { id: 'DES-FAC-MGR', title: 'Facility Manager', code: 'FAC', departmentId: 'DEP-FAC', level: 'Mid' }
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

export const initialLeaveApplications: LeaveApplication[] = [];

export const initialExpenseCategories: ExpenseCategory[] = [
  { id: 'EXP-CAT-TRV', name: 'Travel & Local Conveyance', code: 'TRV', maxLimitPerClaim: 15000, requiresReceipt: true, description: 'Flight tickets, airport taxis, Uber, outstation client transit' },
  { id: 'EXP-CAT-MEAL', name: 'Meals & Client Entertainment', code: 'MEAL', maxLimitPerClaim: 5000, requiresReceipt: true, description: 'Client dinners, team working lunches during delivery sprints' },
  { id: 'EXP-CAT-OFF', name: 'Home Office & Hardware', code: 'OFF', maxLimitPerClaim: 20000, requiresReceipt: true, description: 'Ergonomic accessories, keyboard, mouse, cables, surge protectors' },
  { id: 'EXP-CAT-SFT', name: 'Software & Subscriptions', code: 'SFT', maxLimitPerClaim: 30000, requiresReceipt: true, description: 'Developer tools, IDE licenses, cloud credits, SaaS utilities' },
  { id: 'EXP-CAT-LRN', name: 'Learning & Certifications', code: 'LRN', maxLimitPerClaim: 25000, requiresReceipt: true, description: 'AWS/GCP/Azure certifications, technical books, conference passes' }
];

export const initialExpenseClaims: ExpenseClaim[] = [];

export const initialAssets: Asset[] = [];

export const initialAttendanceRecords: AttendanceRecord[] = [];

export const initialCorrectionRequests: AttendanceCorrectionRequest[] = [];

export const initialPayrollRuns: PayrollRun[] = [];

export const initialPayrollLineItems: PayrollLineItem[] = [];

export const initialAuditLogs: AuditLog[] = [];

export const initialNotifications: AppNotification[] = [];



export { initialServiceRecords };
