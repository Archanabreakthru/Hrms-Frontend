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
    this.clients = [];
    this.supervisors = [];
    this.deployments = [];
    this.verifications = [];
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

  
  public syncFromBackend(
    clients: ClientRecord[],
    supervisors: ClientSupervisorRecord[],
    deployments: AssignmentRecord[],
    verifications?: ClientAttendanceVerification[]
  ) {
    this.clients = [...clients];
    this.supervisors = [...supervisors];
    this.deployments = [...deployments];
    if (verifications) {
      this.verifications = [...verifications];
    }
    this.notify();
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

