// Narrowly Scoped In-Memory Integration Layer between Client Management & Attendance
// Complies with:
// 1. Standard attendance is the universal default for all employees
// 2. Evaluates deployment eligibility on the exact attendance date (5 strict criteria)
// 3. No duplicate attendance records; references existing attendance IDs
// 4. Maintains independent attendance punch status vs client verification status
// 5. Preserves existing approval separation (Client Verif vs Correction vs Overtime)
// 6. Fully in-memory, reactive via listeners; no localStorage, no database, no network

import { ClientRecord, AssignmentRecord, ClientSupervisorRecord } from './clientModuleTypes';
import { DailyAttendanceRecord } from '../attendance/attendanceModuleTypes';
import { db } from '../../db/storage';
import { hrmsService } from '../../services/hrmsService';

export type ClientVerificationStatus =
  | 'Not Required'
  | 'Pending Client Verification'
  | 'Client Approved'
  | 'Client Rejected'
  | 'Pending HR Verification'
  | 'HR Approved'
  | 'HR Rejected';

export interface ClientAttendanceVerification {
  id: string; // e.g. 'VERIF-ATT-001'
  attendanceId: string;
  deploymentId: string;
  employeeId: string;
  employeeName: string;
  clientId: string;
  clientName: string;
  supervisorId: string;
  supervisorName: string;
  supervisorEmail: string;
  attendanceDate: string;
  shiftName: string;
  checkInTime: string;
  checkOutTime: string;
  workingHours: number;
  verificationStatus: ClientVerificationStatus;
  supervisorDecision?: 'Approved' | 'Rejected';
  supervisorRemarks?: string;
  supervisorActionDate?: string;
  hrVerificationStatus?: 'Pending' | 'Approved' | 'Rejected';
  hrRemarks?: string;
  hrActionDate?: string;
  approvalHistory: Array<{
    stage: string;
    actorName: string;
    actorRole: string;
    timestamp: string;
    action: string;
    comments?: string;
  }>;
}

export interface DeploymentEligibilityResult {
  eligible: boolean;
  deployment?: AssignmentRecord;
  supervisor?: ClientSupervisorRecord;
  reason?: 'NO_DEPLOYMENT' | 'OUTSIDE_DATE_RANGE' | 'INACTIVE_STATUS' | 'VERIFICATION_DISABLED' | 'MISSING_SUPERVISOR';
}

type Listener = () => void;

// In-Memory Global Store for Client Management & Client Verifications
class ClientAttendanceIntegrationStore {
  private clients: ClientRecord[] = [];
  private supervisors: ClientSupervisorRecord[] = [];
  private deployments: AssignmentRecord[] = [];
  private verifications: ClientAttendanceVerification[] = [];
  private listeners: Set<Listener> = new Set();
  private initialized = false;

  constructor() {
    this.initDefaultData();
  }

  private initDefaultData() {
    if (this.initialized) return;

    // Load initial clients (3 Client Organizations with linked designated supervisors)
    const initialClients: ClientRecord[] = [
      {
        id: 'CLI-101',
        name: 'Apex FinTech Global',
        contactName: 'Vikramaditya Rao',
        email: 'v.rao@apexfintech.example.com',
        phone: '+91 22 4890 1122',
        address: 'Bandra Kurla Complex, Mumbai, MH',
        designatedSupervisor: 'Vikramaditya Rao',
        designatedSupervisorId: 'CSUP-101',
        supervisorEmail: 'v.rao@apexfintech.example.com',
        status: 'Active',
        createdAt: '2026-01-10'
      },
      {
        id: 'CLI-102',
        name: 'Horizon Retail Systems',
        contactName: 'Meera Krishnan',
        email: 'meera.k@horizonretail.example.com',
        phone: '+91 80 4120 8899',
        address: 'Whitefield Tech Park, Bengaluru, KA',
        designatedSupervisor: 'Meera Krishnan',
        designatedSupervisorId: 'CSUP-102',
        supervisorEmail: 'meera.k@horizonretail.example.com',
        status: 'Active',
        createdAt: '2026-02-15'
      },
      {
        id: 'CLI-103',
        name: 'Acme Technologies Pvt. Ltd.',
        contactName: 'Rohit Kumar',
        email: 'rohit.kumar@acme-tech.example.com',
        phone: '+91 11 4988 2200',
        address: 'DLF Cyber City, Tower 8, Gurugram, HR',
        designatedSupervisor: 'Rohit Kumar',
        designatedSupervisorId: 'CSUP-105',
        supervisorEmail: 'rohit.kumar@acme-tech.example.com',
        status: 'Active',
        createdAt: '2026-03-01'
      }
    ];

    // Load initial supervisors (Strictly linked to client IDs, supporting multiple supervisors per client)
    const initialSupervisors: ClientSupervisorRecord[] = [
      {
        id: 'CSUP-101',
        clientId: 'CLI-101',
        clientName: 'Apex FinTech Global',
        name: 'Vikramaditya Rao',
        officialEmail: 'v.rao@apexfintech.example.com',
        phone: '+91 22 4091 8800',
        status: 'Active',
        invitationStatus: 'Accepted',
        invitedAt: '2026-03-15T09:00:00Z',
        acceptedAt: '2026-03-15T10:30:00Z',
        notes: 'Primary delivery lead for Apex FinTech deployments'
      },
      {
        id: 'CSUP-102',
        clientId: 'CLI-102',
        clientName: 'Horizon Retail Systems',
        name: 'Meera Krishnan',
        officialEmail: 'meera.k@horizonretail.example.com',
        phone: '+91 80 4112 7300',
        status: 'Active',
        invitationStatus: 'Accepted',
        invitedAt: '2026-04-01T11:00:00Z',
        acceptedAt: '2026-04-01T14:20:00Z',
        notes: 'Supervisor for Omnichannel checkout initiatives'
      },
      {
        id: 'CSUP-103',
        clientId: 'CLI-101',
        clientName: 'Apex FinTech Global',
        name: 'Rohan Mehta',
        officialEmail: 'rohan.m@apexfintech.example.com',
        phone: '+91 22 4091 8899',
        status: 'Inactive',
        invitationStatus: 'Revoked',
        invitedAt: '2026-02-01T10:00:00Z',
        notes: 'Deactivated account (Test case for inactive supervisor restriction)'
      },
      {
        id: 'CSUP-104',
        clientId: 'CLI-102',
        clientName: 'Horizon Retail Systems',
        name: 'Ananya Verma',
        officialEmail: 'ananya.v@horizonretail.example.com',
        phone: '+91 80 4112 7311',
        status: 'Active',
        invitationStatus: 'Expired',
        invitedAt: '2026-09-01T10:00:00Z',
        notes: 'Expired invitation token'
      },
      {
        id: 'CSUP-105',
        clientId: 'CLI-103',
        clientName: 'Acme Technologies Pvt. Ltd.',
        name: 'Rohit Kumar',
        officialEmail: 'rohit.kumar@acme-tech.example.com',
        phone: '+91 11 4988 2211',
        status: 'Active',
        invitationStatus: 'Accepted',
        invitedAt: '2026-03-01T09:00:00Z',
        acceptedAt: '2026-03-01T10:00:00Z',
        notes: 'Client Manager for Acme Technologies'
      }
    ];

    // Load initial employee deployments
    const initialDeployments: AssignmentRecord[] = [
      {
        id: 'CAS-201',
        clientId: 'CLI-101',
        clientName: 'Apex FinTech Global',
        employeeId: 'EMP-SWE-0004', // Archana (Software Developer)
        employeeName: 'Archana',
        project: 'Core Banking Ledger Modernization',
        location: 'Mumbai BKC Client Site',
        workMode: 'Onsite',
        startDate: '2026-06-01',
        plannedEndDate: '2026-12-31',
        allocation: 100,
        allowanceMonthly: 6500,
        reportingManagerId: 'EMP-SDM-0003',
        clientSupervisorId: 'CSUP-101',
        clientSupervisorName: 'Vikramaditya Rao',
        clientSupervisorEmail: 'v.rao@apexfintech.example.com',
        shiftId: 'SHIFT-GEN',
        assignedShift: 'General Day Shift (09:30 - 18:30)',
        requiresClientVerification: true,
        status: 'Active',
        remarks: 'Strategic core banking modernization'
      },
      {
        id: 'CAS-202',
        clientId: 'CLI-102',
        clientName: 'Horizon Retail Systems',
        employeeId: 'EMP-SWE-0007', // Maha Lakshmi
        employeeName: 'Maha Lakshmi',
        project: 'Omnichannel Checkout Microservices',
        location: 'Bengaluru Whitefield Campus',
        workMode: 'Hybrid',
        startDate: '2026-07-15',
        plannedEndDate: '2026-11-30',
        allocation: 100,
        allowanceMonthly: 4500,
        reportingManagerId: 'EMP-SDM-0003',
        clientSupervisorId: 'CSUP-102',
        clientSupervisorName: 'Meera Krishnan',
        clientSupervisorEmail: 'meera.k@horizonretail.example.com',
        shiftId: 'SHIFT-GEN',
        assignedShift: 'General Day Shift (09:30 - 18:30)',
        requiresClientVerification: true,
        status: 'Active',
        remarks: 'Checkout microservices team lead'
      },
      {
        id: 'CAS-203',
        clientId: 'CLI-101',
        clientName: 'Apex FinTech Global',
        employeeId: 'EMP-SWE-0005', // AnuPriya
        employeeName: 'AnuPriya',
        project: 'Treasury Risk Audit Module',
        location: 'Remote',
        workMode: 'Remote',
        startDate: '2026-08-01',
        plannedEndDate: '2026-10-31',
        actualEndDate: '2026-10-31',
        actualCompletionDate: '2026-10-31',
        allocation: 100,
        allowanceMonthly: 3000,
        reportingManagerId: 'EMP-SDM-0003',
        clientSupervisorId: 'CSUP-101',
        clientSupervisorName: 'Vikramaditya Rao',
        clientSupervisorEmail: 'v.rao@apexfintech.example.com',
        shiftId: 'SHIFT-GEN',
        assignedShift: 'General Day Shift (09:30 - 18:30)',
        requiresClientVerification: true,
        status: 'Completed',
        remarks: 'Deployment completed on Oct 31, 2026. Standard attendance resumes thereafter.'
      },
      {
        id: 'CAS-205',
        clientId: 'CLI-103',
        clientName: 'Acme Technologies Pvt. Ltd.',
        employeeId: 'EMP-SWE-0004', // Archana also deployed to Acme for enterprise client portal demonstration
        employeeName: 'Archana',
        project: 'Acme Cloud Gateway Infrastructure',
        location: 'Gurugram Client Site',
        workMode: 'Onsite',
        startDate: '2026-11-01',
        plannedEndDate: '2026-12-31',
        allocation: 100,
        allowanceMonthly: 5000,
        reportingManagerId: 'EMP-SDM-0003',
        clientSupervisorId: 'CSUP-105',
        clientSupervisorName: 'Rohit Kumar',
        clientSupervisorEmail: 'rohit.kumar@acme-tech.example.com',
        shiftId: 'SHIFT-GEN',
        assignedShift: 'General Day Shift (09:30 - 18:30)',
        requiresClientVerification: true,
        status: 'Active',
        remarks: 'Client gateway architecture delivery'
      }
    ];

    // Seed realistic attendance and verification records (12 seed records)
    const initialVerifications: ClientAttendanceVerification[] = [
      {
        id: 'VERIF-ATT-001',
        attendanceId: 'ATT-2026-11-04-ARCHANA',
        deploymentId: 'CAS-201',
        employeeId: 'EMP-SWE-0004',
        employeeName: 'Archana',
        clientId: 'CLI-101',
        clientName: 'Apex FinTech Global',
        supervisorId: 'CSUP-101',
        supervisorName: 'Vikramaditya Rao',
        supervisorEmail: 'v.rao@apexfintech.example.com',
        attendanceDate: '2026-11-04',
        shiftName: 'General Day Shift (09:30 - 18:30)',
        checkInTime: '09:30',
        checkOutTime: '18:30',
        workingHours: 8,
        verificationStatus: 'Pending Client Verification',
        approvalHistory: [
          {
            stage: 'Attendance Checked Out',
            actorName: 'Archana',
            actorRole: 'Employee',
            timestamp: '2026-11-04T18:30:00Z',
            action: 'PUNCH_COMPLETED',
            comments: 'Punched 09:30 to 18:30. Awaiting Client Supervisor verification.'
          }
        ]
      },
      {
        id: 'VERIF-ATT-002',
        attendanceId: 'ATT-2026-11-03-ARCHANA',
        deploymentId: 'CAS-201',
        employeeId: 'EMP-SWE-0004',
        employeeName: 'Archana',
        clientId: 'CLI-101',
        clientName: 'Apex FinTech Global',
        supervisorId: 'CSUP-101',
        supervisorName: 'Vikramaditya Rao',
        supervisorEmail: 'v.rao@apexfintech.example.com',
        attendanceDate: '2026-11-03',
        shiftName: 'General Day Shift (09:30 - 18:30)',
        checkInTime: '09:25',
        checkOutTime: '18:30',
        workingHours: 8.08,
        verificationStatus: 'HR Approved',
        supervisorDecision: 'Approved',
        supervisorRemarks: 'Full day worked on ledger migration.',
        supervisorActionDate: '2026-11-03T19:00:00Z',
        hrVerificationStatus: 'Approved',
        hrRemarks: 'Verified by HR Admin against client sign-off.',
        hrActionDate: '2026-11-04T10:00:00Z',
        approvalHistory: [
          {
            stage: 'Attendance Checked Out',
            actorName: 'Archana',
            actorRole: 'Employee',
            timestamp: '2026-11-03T18:30:00Z',
            action: 'PUNCH_COMPLETED'
          },
          {
            stage: 'Client Supervisor Action',
            actorName: 'Vikramaditya Rao',
            actorRole: 'Client Supervisor',
            timestamp: '2026-11-03T19:00:00Z',
            action: 'CLIENT_APPROVED',
            comments: 'Full day worked on ledger migration.'
          },
          {
            stage: 'HR Final Verification',
            actorName: 'Priya Sharma',
            actorRole: 'HR Admin',
            timestamp: '2026-11-04T10:00:00Z',
            action: 'HR_APPROVED',
            comments: 'Verified by HR Admin against client sign-off.'
          }
        ]
      },
      {
        id: 'VERIF-ATT-003',
        attendanceId: 'ATT-2026-11-02-ARCHANA',
        deploymentId: 'CAS-201',
        employeeId: 'EMP-SWE-0004',
        employeeName: 'Archana',
        clientId: 'CLI-101',
        clientName: 'Apex FinTech Global',
        supervisorId: 'CSUP-101',
        supervisorName: 'Vikramaditya Rao',
        supervisorEmail: 'v.rao@apexfintech.example.com',
        attendanceDate: '2026-11-02',
        shiftName: 'General Day Shift (09:30 - 18:30)',
        checkInTime: '09:30',
        checkOutTime: '17:00',
        workingHours: 6.5,
        verificationStatus: 'Client Rejected',
        supervisorDecision: 'Rejected',
        supervisorRemarks: 'Early departure without prior authorization.',
        supervisorActionDate: '2026-11-02T19:30:00Z',
        approvalHistory: [
          {
            stage: 'Attendance Checked Out',
            actorName: 'Archana',
            actorRole: 'Employee',
            timestamp: '2026-11-02T17:00:00Z',
            action: 'PUNCH_COMPLETED'
          },
          {
            stage: 'Client Supervisor Action',
            actorName: 'Vikramaditya Rao',
            actorRole: 'Client Supervisor',
            timestamp: '2026-11-02T19:30:00Z',
            action: 'CLIENT_REJECTED',
            comments: 'Early departure without prior authorization.'
          }
        ]
      },
      {
        id: 'VERIF-ATT-004',
        attendanceId: 'ATT-2026-11-04-MAHA',
        deploymentId: 'CAS-202',
        employeeId: 'EMP-SWE-0007',
        employeeName: 'Maha Lakshmi',
        clientId: 'CLI-102',
        clientName: 'Horizon Retail Systems',
        supervisorId: 'CSUP-102',
        supervisorName: 'Meera Krishnan',
        supervisorEmail: 'meera.k@horizonretail.example.com',
        attendanceDate: '2026-11-04',
        shiftName: 'General Day Shift (09:30 - 18:30)',
        checkInTime: '09:30',
        checkOutTime: '18:30',
        workingHours: 8,
        verificationStatus: 'Pending Client Verification',
        approvalHistory: [
          {
            stage: 'Attendance Checked Out',
            actorName: 'Maha Lakshmi',
            actorRole: 'Employee',
            timestamp: '2026-11-04T18:30:00Z',
            action: 'PUNCH_COMPLETED'
          }
        ]
      },
      {
        id: 'VERIF-ATT-005',
        attendanceId: 'ATT-2026-11-03-MAHA',
        deploymentId: 'CAS-202',
        employeeId: 'EMP-SWE-0007',
        employeeName: 'Maha Lakshmi',
        clientId: 'CLI-102',
        clientName: 'Horizon Retail Systems',
        supervisorId: 'CSUP-102',
        supervisorName: 'Meera Krishnan',
        supervisorEmail: 'meera.k@horizonretail.example.com',
        attendanceDate: '2026-11-03',
        shiftName: 'General Day Shift (09:30 - 18:30)',
        checkInTime: '09:30',
        checkOutTime: '18:45',
        workingHours: 8.25,
        verificationStatus: 'Pending HR Verification',
        supervisorDecision: 'Approved',
        supervisorRemarks: 'Microservices delivery reviewed and verified.',
        supervisorActionDate: '2026-11-03T19:15:00Z',
        approvalHistory: [
          {
            stage: 'Attendance Checked Out',
            actorName: 'Maha Lakshmi',
            actorRole: 'Employee',
            timestamp: '2026-11-03T18:45:00Z',
            action: 'PUNCH_COMPLETED'
          },
          {
            stage: 'Client Supervisor Action',
            actorName: 'Meera Krishnan',
            actorRole: 'Client Supervisor',
            timestamp: '2026-11-03T19:15:00Z',
            action: 'CLIENT_APPROVED',
            comments: 'Microservices delivery reviewed and verified.'
          }
        ]
      },
      {
        id: 'VERIF-ATT-006',
        attendanceId: 'ATT-2026-11-04-ACME-ARCHANA',
        deploymentId: 'CAS-205',
        employeeId: 'EMP-SWE-0004',
        employeeName: 'Archana',
        clientId: 'CLI-103',
        clientName: 'Acme Technologies Pvt. Ltd.',
        supervisorId: 'CSUP-105',
        supervisorName: 'Rohit Kumar',
        supervisorEmail: 'rohit.kumar@acme-tech.example.com',
        attendanceDate: '2026-11-04',
        shiftName: 'General Day Shift (09:30 - 18:30)',
        checkInTime: '09:15',
        checkOutTime: '18:15',
        workingHours: 8.0,
        verificationStatus: 'Pending Client Verification',
        approvalHistory: [
          {
            stage: 'Attendance Checked Out',
            actorName: 'Archana',
            actorRole: 'Employee',
            timestamp: '2026-11-04T18:15:00Z',
            action: 'PUNCH_COMPLETED'
          }
        ]
      }
    ];

    this.clients = initialClients;
    this.supervisors = initialSupervisors;
    this.deployments = initialDeployments;
    this.verifications = initialVerifications;
    this.initialized = true;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in integration listener:', err);
      }
    });
  }

  // --- CLIENT REGISTRY ---
  public getClients(): ClientRecord[] {
    return [...this.clients];
  }

  public getClientById(id: string): ClientRecord | undefined {
    return this.clients.find((c) => c.id === id);
  }

  public saveClient(client: ClientRecord) {
    const idx = this.clients.findIndex((c) => c.id === client.id);
    if (idx >= 0) {
      this.clients[idx] = { ...client };
    } else {
      this.clients.unshift({ ...client });
    }
    this.notify();
  }

  // --- SUPERVISORS ---
  public getSupervisors(): ClientSupervisorRecord[] {
    return [...this.supervisors];
  }

  public getSupervisorById(id: string): ClientSupervisorRecord | undefined {
    return this.supervisors.find((s) => s.id === id);
  }

  public getSupervisorByEmail(email: string): ClientSupervisorRecord | undefined {
    return this.supervisors.find((s) => s.officialEmail.toLowerCase() === email.toLowerCase());
  }

  public getSupervisorsByClient(clientId: string): ClientSupervisorRecord[] {
    return this.supervisors.filter((s) => s.clientId === clientId);
  }

  public saveSupervisor(supervisor: ClientSupervisorRecord) {
    const idx = this.supervisors.findIndex((s) => s.id === supervisor.id);
    if (idx >= 0) {
      this.supervisors[idx] = { ...supervisor };
    } else {
      this.supervisors.unshift({ ...supervisor });
    }

    // Automatically update the client's designated supervisor if client currently has none
    const client = this.clients.find((c) => c.id === supervisor.clientId);
    if (client && (!client.designatedSupervisorId || !client.designatedSupervisor)) {
      client.designatedSupervisorId = supervisor.id;
      client.designatedSupervisor = supervisor.name;
      client.supervisorEmail = supervisor.officialEmail;
    }

    this.notify();
  }

  // --- EMPLOYEE DEPLOYMENTS ---
  public getDeployments(): AssignmentRecord[] {
    return [...this.deployments];
  }

  public getDeploymentById(id: string): AssignmentRecord | undefined {
    return this.deployments.find((d) => d.id === id);
  }

  public getActiveDeploymentForEmployee(employeeId: string): AssignmentRecord | undefined {
    return this.deployments.find(
      (d) =>
        d.employeeId === employeeId &&
        (d.status === 'Active' || d.status === 'Extended')
    );
  }

  public saveDeployment(deployment: AssignmentRecord) {
    const idx = this.deployments.findIndex((d) => d.id === deployment.id);
    if (idx >= 0) {
      this.deployments[idx] = { ...deployment };
    } else {
      this.deployments.unshift({ ...deployment });
    }
    this.notify();
  }

  // --- DEPLOYMENT ELIGIBILITY EVALUATOR ---
  // Core business rule connecting Client Management to Attendance
  public evaluateDeploymentEligibility(employeeId: string, attendanceDate: string): DeploymentEligibilityResult {
    // Find all deployments for this employee
    const employeeDeployments = this.deployments.filter((d) => d.employeeId === employeeId);
    if (employeeDeployments.length === 0) {
      return { eligible: false, reason: 'NO_DEPLOYMENT' };
    }

    // Find the deployment that covers this attendance date
    const matchingDeployment = employeeDeployments.find((d) => {
      const effectiveEnd = d.revisedEndDate || d.actualEndDate || d.plannedEndDate;
      return d.startDate <= attendanceDate && attendanceDate <= effectiveEnd;
    });

    if (!matchingDeployment) {
      return { eligible: false, reason: 'OUTSIDE_DATE_RANGE' };
    }

    // Condition 3: Deployment status must be 'Active' or 'Extended'
    if (matchingDeployment.status !== 'Active' && matchingDeployment.status !== 'Extended') {
      return { eligible: false, deployment: matchingDeployment, reason: 'INACTIVE_STATUS' };
    }

    // Condition 4: Client verification requirement must be enabled
    if (matchingDeployment.requiresClientVerification === false) {
      return { eligible: false, deployment: matchingDeployment, reason: 'VERIFICATION_DISABLED' };
    }

    // Condition 5: Valid supervisor belonging to the client organization
    const supervisor = this.supervisors.find(
      (s) =>
        s.clientId === matchingDeployment.clientId &&
        (s.id === matchingDeployment.clientSupervisorId || s.name === matchingDeployment.clientSupervisorName)
    );

    if (!supervisor || supervisor.status !== 'Active') {
      return {
        eligible: false,
        deployment: matchingDeployment,
        reason: 'MISSING_SUPERVISOR'
      };
    }

    return {
      eligible: true,
      deployment: matchingDeployment,
      supervisor
    };
  }

  // --- CLIENT ATTENDANCE VERIFICATIONS ---
  public getVerifications(): ClientAttendanceVerification[] {
    return [...this.verifications];
  }

  public getVerificationsForSupervisor(supervisorId: string, clientId: string): ClientAttendanceVerification[] {
    return this.verifications.filter(
      (v) => v.clientId === clientId && (v.supervisorId === supervisorId || !v.supervisorId)
    );
  }

  public getVerificationForAttendanceRecord(attendanceId: string): ClientAttendanceVerification | undefined {
    return this.verifications.find((v) => v.attendanceId === attendanceId);
  }

  // Synchronize or create a verification record when an attendance punch occurs
  public syncAttendanceRecord(record: DailyAttendanceRecord): ClientAttendanceVerification | null {
    if (!record.checkOutTime) {
      // Client verification is triggered upon shift completion (check-out)
      return null;
    }

    const eligibility = this.evaluateDeploymentEligibility(record.employeeId, record.date);
    if (!eligibility.eligible || !eligibility.deployment || !eligibility.supervisor) {
      return null;
    }

    const { deployment, supervisor } = eligibility;
    const existing = this.verifications.find((v) => v.attendanceId === record.id);

    if (existing) {
      // Update punch hours if they changed
      existing.checkInTime = record.checkInTime || existing.checkInTime;
      existing.checkOutTime = record.checkOutTime || existing.checkOutTime;
      existing.workingHours = record.netWorkingHours || existing.workingHours;
      this.notify();
      return existing;
    }

    const newVerif: ClientAttendanceVerification = {
      id: `VERIF-${record.id}`,
      attendanceId: record.id,
      deploymentId: deployment.id,
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      clientId: deployment.clientId,
      clientName: deployment.clientName || 'Client Organization',
      supervisorId: supervisor.id,
      supervisorName: supervisor.name,
      supervisorEmail: supervisor.officialEmail,
      attendanceDate: record.date,
      shiftName: record.shiftName,
      checkInTime: record.checkInTime || '--:--',
      checkOutTime: record.checkOutTime || '--:--',
      workingHours: record.netWorkingHours || record.totalHours || 0,
      verificationStatus: 'Pending Client Verification',
      approvalHistory: [
        {
          stage: 'Attendance Checked Out',
          actorName: record.employeeName,
          actorRole: 'Employee',
          timestamp: new Date().toISOString(),
          action: 'PUNCH_COMPLETED',
          comments: `Recorded ${record.checkInTime} to ${record.checkOutTime} (${record.netWorkingHours}h). Submitted for Client Supervisor Verification.`
        }
      ]
    };

    this.verifications.unshift(newVerif);
    this.notify();
    return newVerif;
  }

  // Stage 1: Client Supervisor Action (Approve / Reject)
  public handleClientSupervisorDecision(
    verificationId: string,
    decision: 'Approved' | 'Rejected',
    remarks: string,
    supervisorName: string
  ): boolean {
    const verif = this.verifications.find((v) => v.id === verificationId);
    if (!verif) return false;

    verif.supervisorDecision = decision;
    verif.supervisorRemarks = remarks;
    verif.supervisorActionDate = new Date().toISOString();
    verif.verificationStatus = decision === 'Approved' ? 'Pending HR Verification' : 'Client Rejected';
    verif.approvalHistory.push({
      stage: 'Client Supervisor Action',
      actorName: supervisorName,
      actorRole: 'Client Supervisor',
      timestamp: new Date().toISOString(),
      action: decision === 'Approved' ? 'CLIENT_APPROVED' : 'CLIENT_REJECTED',
      comments: remarks
    });

    this.notify();
    return true;
  }

  // Stage 2: HR Final Verification
  public handleHRVerificationDecision(
    verificationId: string,
    decision: 'Approved' | 'Rejected',
    remarks: string,
    hrName: string
  ): boolean {
    const verif = this.verifications.find((v) => v.id === verificationId);
    if (!verif) return false;

    verif.hrVerificationStatus = decision;
    verif.hrRemarks = remarks;
    verif.hrActionDate = new Date().toISOString();
    verif.verificationStatus = decision === 'Approved' ? 'HR Approved' : 'HR Rejected';
    verif.approvalHistory.push({
      stage: 'HR Final Verification',
      actorName: hrName,
      actorRole: 'HR Admin',
      timestamp: new Date().toISOString(),
      action: decision === 'Approved' ? 'HR_APPROVED' : 'HR_REJECTED',
      comments: remarks
    });

    this.notify();
    return true;
  }

  // Inter-workflow rule: If an approved correction updates a verified attendance record,
  // reopen client verification while preserving previous history
  public reopenVerificationOnCorrection(
    attendanceId: string,
    newCheckIn: string,
    newCheckOut: string,
    newHours: number,
    reason: string
  ): boolean {
    const verif = this.verifications.find((v) => v.attendanceId === attendanceId);
    if (!verif) return false;

    verif.checkInTime = newCheckIn;
    verif.checkOutTime = newCheckOut;
    verif.workingHours = newHours;
    verif.verificationStatus = 'Pending Client Verification';
    verif.supervisorDecision = undefined;
    verif.hrVerificationStatus = undefined;

    verif.approvalHistory.push({
      stage: 'Attendance Regularized / Corrected',
      actorName: 'HR System',
      actorRole: 'System',
      timestamp: new Date().toISOString(),
      action: 'REOPENED_FOR_CLIENT_REVIEW',
      comments: `Attendance punch times adjusted (${newCheckIn} - ${newCheckOut}, ${newHours}h). Reason: ${reason}. Client verification reopened.`
    });

    this.notify();
    return true;
  }
}

export const clientAttendanceIntegration = new ClientAttendanceIntegrationStore();

