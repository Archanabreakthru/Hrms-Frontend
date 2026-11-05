// Module-Local Frontend In-Memory State & Types for Client Management
// Isolated from backend, database, and protected modules.
// Clean interfaces ready for future API service replacement.

export type ClientStatus = 'Active' | 'Prospect' | 'Inactive';
export type WorkArrangement = 'Onsite' | 'Remote' | 'Hybrid';
export type AssignmentStatus = 'Planned' | 'Active' | 'Extended' | 'On Hold' | 'Completed' | 'Cancelled';
export type DeploymentStatus = 'Scheduled' | 'Active' | 'Extended' | 'On Hold' | 'Completed' | 'Cancelled';
export type SupervisorInvitationStatus = 'Invited' | 'Accepted' | 'Expired' | 'Revoked';
export type ClientAttendanceApprovalStatus =
  | 'Pending Client Verification'
  | 'Client Approved'
  | 'Client Rejected'
  | 'Pending HR Verification'
  | 'HR Approved'
  | 'HR Rejected';

// Compatibility interface exported for consuming components
export interface ClientRecord {
  id: string;
  name: string;
  contactName?: string;
  email: string;
  officialEmail?: string;
  phone: string;
  contactNumber?: string;
  address: string;
  designatedSupervisor?: string;
  supervisorEmail?: string;
  contractStart?: string;
  contractEnd?: string;
  status: ClientStatus;
  createdAt?: string;
}

// Compatibility interface exported for consuming components
export interface AssignmentRecord {
  id: string;
  clientId: string;
  clientName?: string;
  employeeId: string;
  employeeName?: string;
  project: string;
  location?: string;
  workLocation?: string;
  workMode?: 'Onsite' | 'Remote' | 'Hybrid';
  workArrangement?: WorkArrangement;
  startDate: string;
  plannedEndDate: string;
  revisedEndDate?: string;
  actualEndDate?: string;
  actualCompletionDate?: string;
  allocation?: number;
  allowanceMonthly?: number;
  reportingManagerId?: string;
  clientSupervisorId?: string;
  clientSupervisorName?: string;
  clientSupervisorEmail?: string;
  shiftId?: string;
  assignedShift?: string;
  attendanceRules?: string;
  requiresClientVerification?: boolean;
  status: AssignmentStatus;
  remarks?: string;
  extensions?: DeploymentExtensionEntry[];
  createdAt?: string;
}

export interface ClientSupervisorRecord {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  officialEmail: string;
  phone: string;
  status: 'Active' | 'Inactive';
  invitationStatus: SupervisorInvitationStatus;
  invitationToken?: string;
  invitedAt: string;
  acceptedAt?: string;
  notes?: string;
}

export interface DeploymentExtensionEntry {
  id: string;
  deploymentId: string;
  previousEndDate: string;
  revisedEndDate: string;
  extensionReason: string;
  requestedBy: string;
  approvedBy?: string;
  timestamp: string;
  remarks?: string;
}

export type EmployeeDeploymentRecord = AssignmentRecord;

export interface ClientAttendanceVerificationRecord {
  id: string;
  deploymentId: string;
  employeeId: string;
  employeeName: string;
  clientId: string;
  clientName: string;
  supervisorName: string;
  attendanceDate: string;
  shiftName: string;
  checkIn: string;
  checkOut: string;
  workingHours: number;
  status: ClientAttendanceApprovalStatus;
  clientSupervisorDecision?: 'Approved' | 'Rejected';
  clientSupervisorNotes?: string;
  clientVerifiedAt?: string;
  hrDecision?: 'Approved' | 'Rejected';
  hrNotes?: string;
  hrVerifiedAt?: string;
}

// In-Memory Storage Container (Session-only, no persistent storage, no DB)
export interface ClientModuleState {
  clients: ClientRecord[];
  supervisors: ClientSupervisorRecord[];
  deployments: EmployeeDeploymentRecord[];
  attendanceVerifications: ClientAttendanceVerificationRecord[];
}

export const initialClientModuleState: ClientModuleState = {
  clients: [],
  supervisors: [],
  deployments: [],
  attendanceVerifications: []
};
