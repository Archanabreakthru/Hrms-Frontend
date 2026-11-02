// Orbyx HRMS - Client Management & Attendance Tracking
import React, { useMemo, useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Users,
  CalendarClock,
  BriefcaseBusiness,
  IndianRupee,
  Filter,
  RotateCcw,
  Edit3,
  Power,
  Upload,
  ShieldCheck,
  Eye,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  Mail,
  Send,
  AlertTriangle,
  FileCheck2,
  FileText,
  Copy,
  Clock,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../../services/authContext';
import { db, subscribeToDB } from '../../db/storage';
import { NavigationContext, AttendanceRecord, DisputeResolutionDecision } from '../../types/hrms';
import { hrmsService } from '../../services/hrmsService';
import { ExportButton } from '../common/ExportButton';
import { CsvImportModal } from '../common/CsvImportModal';
import { PolicyRulesPanel } from '../common/PolicyRulesPanel';
import { RequestCorrectionModal } from '../attendance/RequestCorrectionModal';

type ClientStatus = 'Active' | 'Prospect' | 'Inactive';
type AssignmentStatus = 'Planned' | 'Active' | 'Completed' | 'Cancelled';

export interface ClientRecord {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  contractStart: string;
  contractEnd: string;
  status: ClientStatus;
}

export interface AssignmentRecord {
  id: string;
  clientId: string;
  employeeId: string;
  project: string;
  location: string;
  workMode: 'Onsite' | 'Remote' | 'Hybrid';
  startDate: string;
  plannedEndDate: string;
  actualEndDate?: string;
  allocation: number;
  allowanceMonthly?: number;
  reportingManagerId?: string;
  clientSupervisorName?: string;
  clientSupervisorEmail?: string;
  shiftId?: string;
  attendanceRules?: string;
  requiresClientVerification?: boolean;
  status: AssignmentStatus;
}

export const CLIENTS_KEY = 'orbyx_hrms_clients_v1';
export const ASSIGNMENTS_KEY = 'orbyx_hrms_client_assignments_v1';

const DEFAULT_CLIENT_SUPERVISOR_EMAIL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DUMMY_CLIENT_SUPERVISOR_EMAIL) ||
  'archupadhmanabhan2003@gmail.com';

const seedClients: ClientRecord[] = [
  {
    id: 'CLI-101',
    name: 'Apex FinTech Global',
    contactName: 'Vikramaditya Rao',
    email: DEFAULT_CLIENT_SUPERVISOR_EMAIL,
    phone: '+91 22 4091 8800',
    address: 'BKC Financial District, Mumbai',
    contractStart: '2026-01-01',
    contractEnd: '2026-12-31',
    status: 'Active'
  },
  {
    id: 'CLI-102',
    name: 'Horizon Retail Systems',
    contactName: 'Meera Krishnan',
    email: 'meera.k@horizonretail.example.com',
    phone: '+91 80 4112 7300',
    address: 'Outer Ring Road, Bengaluru',
    contractStart: '2026-03-01',
    contractEnd: '2027-02-28',
    status: 'Active'
  }
];

const seedAssignments: AssignmentRecord[] = [
  {
    id: 'CAS-201',
    clientId: 'CLI-101',
    employeeId: 'EMP-003',
    project: 'Core Banking Ledger Modernization',
    location: 'Mumbai BKC (Client Site)',
    workMode: 'Onsite',
    startDate: '2026-04-01',
    plannedEndDate: '2026-12-31',
    allocation: 100,
    allowanceMonthly: 8000,
    reportingManagerId: 'EMP-002',
    clientSupervisorName: 'Vikramaditya Rao',
    clientSupervisorEmail: DEFAULT_CLIENT_SUPERVISOR_EMAIL,
    shiftId: 'SHIFT-GEN',
    attendanceRules: 'External Client Email Verification + Internal Manager/HR Approval Required',
    requiresClientVerification: true,
    status: 'Active'
  },
  {
    id: 'CAS-202',
    clientId: 'CLI-102',
    employeeId: 'EMP-004',
    project: 'Omnichannel Checkout Microservices',
    location: 'Bengaluru Hybrid',
    workMode: 'Hybrid',
    startDate: '2026-05-15',
    plannedEndDate: '2026-11-30',
    allocation: 80,
    allowanceMonthly: 4500,
    reportingManagerId: 'EMP-002',
    clientSupervisorName: 'Meera Krishnan',
    clientSupervisorEmail: 'meera.k@horizonretail.example.com',
    shiftId: 'SHIFT-GEN',
    attendanceRules: 'External Client Email Verification + Internal Manager/HR Approval Required',
    requiresClientVerification: true,
    status: 'Active'
  },
  {
    id: 'CAS-203',
    clientId: 'CLI-101',
    employeeId: 'EMP-006',
    project: 'Payment Gateway Security Audit',
    location: 'Remote',
    workMode: 'Remote',
    startDate: '2026-01-10',
    plannedEndDate: '2026-06-30',
    actualEndDate: '2026-06-30',
    allocation: 100,
    allowanceMonthly: 0,
    reportingManagerId: 'EMP-001',
    clientSupervisorName: 'Vikramaditya Rao',
    clientSupervisorEmail: 'v.rao@apexfintech.example.com',
    shiftId: 'SHIFT-GEN',
    attendanceRules: 'External Client Email Verification + Internal Manager/HR Approval Required',
    requiresClientVerification: true,
    status: 'Completed'
  }
];

export const readClients = (): ClientRecord[] => {
  try {
    const raw = localStorage.getItem(CLIENTS_KEY);
    if (!raw) {
      localStorage.setItem(CLIENTS_KEY, JSON.stringify(seedClients));
      return seedClients;
    }
    const parsed = JSON.parse(raw) as ClientRecord[];
    if (parsed.length === 0) {
      localStorage.setItem(CLIENTS_KEY, JSON.stringify(seedClients));
      return seedClients;
    }
    return parsed;
  } catch {
    return seedClients;
  }
};

export const readAssignments = (): AssignmentRecord[] => {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_KEY);
    if (!raw) {
      localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(seedAssignments));
      return seedAssignments;
    }
    const parsed = JSON.parse(raw) as AssignmentRecord[];
    if (parsed.length === 0) {
      localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(seedAssignments));
      return seedAssignments;
    }
    const enriched = parsed.map((a) => {
      const seedMatch = seedAssignments.find((s) => s.id === a.id);
      const cliMatch = seedClients.find((c) => c.id === a.clientId);
      return {
        ...a,
        clientSupervisorName: a.clientSupervisorName || seedMatch?.clientSupervisorName || cliMatch?.contactName || 'Client Supervisor',
        clientSupervisorEmail: a.clientSupervisorEmail || seedMatch?.clientSupervisorEmail || cliMatch?.email || 'supervisor@client.example.com',
        reportingManagerId: a.reportingManagerId || seedMatch?.reportingManagerId || 'EMP-002',
        shiftId: a.shiftId || seedMatch?.shiftId || 'SHIFT-GEN',
        attendanceRules:
          a.attendanceRules ||
          seedMatch?.attendanceRules ||
          'External Client Email Verification + Internal Manager/HR Approval Required',
        requiresClientVerification: a.requiresClientVerification ?? true
      };
    });
    return enriched;
  } catch {
    return seedAssignments;
  }
};

const field =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

interface ClientManagementProps {
  navContext?: NavigationContext;
  onOpenPolicies?: () => void;
}

export const ClientManagement: React.FC<ClientManagementProps> = ({ navContext, onOpenPolicies }) => {
  const { currentUser, canApproveRequestFor } = useAuth();
  const [activeTab, setActiveTab] = useState<'directory' | 'assignments' | 'attendance'>('directory');
  const [clients, setClients] = useState<ClientRecord[]>(readClients);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>(readAssignments);
  const [, setDbTick] = useState(0);

  useEffect(() => {
    const unsub = subscribeToDB(() => setDbTick((t) => t + 1));
    return unsub;
  }, []);

  useEffect(() => {
    if (!navContext) return;
    if (navContext.subTab === 'assignments') {
      setActiveTab('assignments');
    } else if (navContext.subTab === 'attendance') {
      setActiveTab('attendance');
    } else if (navContext.subTab === 'directory') {
      setActiveTab('directory');
    }
  }, [navContext]);

  // Client filters
  const [clientQuery, setClientQuery] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState<string>('ALL');

  // Assignment filters
  const [assignQuery, setAssignQuery] = useState('');
  const [assignClientFilter, setAssignClientFilter] = useState<string>('ALL');
  const [assignEmpFilter, setAssignEmpFilter] = useState<string>('ALL');
  const [assignStatusFilter, setAssignStatusFilter] = useState<string>('ALL');
  const [assignModeFilter, setAssignModeFilter] = useState<string>('ALL');

  // Client Attendance 4 Internal Sections & Extended Filters (Section 5)
  const [attSubSection, setAttSubSection] = useState<'records' | 'pending' | 'disputed' | 'approved'>('records');
  const [attQuery, setAttQuery] = useState('');
  const [attClientFilter, setAttClientFilter] = useState<string>('ALL');
  const [attEmpFilter, setAttEmpFilter] = useState<string>('ALL');
  const [attProjectFilter, setAttProjectFilter] = useState<string>('ALL');
  const [attWorkModeFilter, setAttWorkModeFilter] = useState<string>('ALL');
  const [attSourceFilter, setAttSourceFilter] = useState<string>('ALL');
  const [attStageFilter, setAttStageFilter] = useState<string>('ALL');
  const [attDateFrom, setAttDateFrom] = useState('');
  const [attDateTo, setAttDateTo] = useState('');
  const [attPayrollFilter, setAttPayrollFilter] = useState<string>('ALL');

  // Modals for Tab 3
  const [viewingDetailRec, setViewingDetailRec] = useState<AttendanceRecord | null>(null);
  const [sendEmailModalRec, setSendEmailModalRec] = useState<{
    rec: AttendanceRecord;
    draftSubject: string;
    draftBody: string;
    supervisorName: string;
    supervisorEmail: string;
    referenceId: string;
    deliveryNote: string;
    copied?: boolean;
  } | null>(null);
  const [recordClientEmailModal, setRecordClientEmailModal] = useState<{
    rec: AttendanceRecord;
    decision: 'Verified' | 'Disputed' | 'Correction Requested' | 'Absent';
    senderName: string;
    senderEmail: string;
    emailSubject: string;
    emailReceivedAt: string;
    messageReference: string;
    attachmentFileName: string;
    summary: string;
    disputeDetails: string;
    claimedCheckIn: string;
    claimedCheckOut: string;
    claimedHours: string;
    error?: string;
  } | null>(null);
  const [disputeModalRec, setDisputeModalRec] = useState<AttendanceRecord | null>(null);
  const [clarificationText, setClarificationText] = useState('');
  const [clarificationEvidence, setClarificationEvidence] = useState('');
  const [resolutionDecision, setResolutionDecision] = useState<DisputeResolutionDecision>('Approve Original Attendance');
  const [resolutionReason, setResolutionReason] = useState('');
  const [resolvedCheckIn, setResolvedCheckIn] = useState('');
  const [resolvedCheckOut, setResolvedCheckOut] = useState('');
  const [disputeModalError, setDisputeModalError] = useState('');
  const [isManualEntryModalOpen, setIsManualEntryModalOpen] = useState(false);
  const [manualEntryType, setManualEntryType] = useState<'Manual Entry' | 'Correction'>('Manual Entry');
  const [companyApprovalModal, setCompanyApprovalModal] = useState<{
    rec: AttendanceRecord;
    decision: 'Approved' | 'Rejected' | 'Returned for Correction';
    comments: string;
    error?: string;
  } | null>(null);

  // Modals
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [viewingClient, setViewingClient] = useState<ClientRecord | null>(null);

  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentRecord | null>(null);

  const [isClientImportOpen, setIsClientImportOpen] = useState(false);
  const [notice, setNotice] = useState('');

  // Client Attendance Logging Modal
  const [loggingAssignment, setLoggingAssignment] = useState<AssignmentRecord | null>(null);
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attCheckIn, setAttCheckIn] = useState('09:30');
  const [attCheckOut, setAttCheckOut] = useState('18:30');
  const [attHours, setAttHours] = useState(8);
  const [attSupervisorName, setAttSupervisorName] = useState('');
  const [attVerificationMethod, setAttVerificationMethod] = useState<'Supervisor Sign-off' | 'Client Email Confirmation'>('Client Email Confirmation');
  const [attEvidenceRef, setAttEvidenceRef] = useState('');
  const [attInitialStage, setAttInitialStage] = useState<'Pending Client Verification' | 'Pending Manager Approval'>('Pending Client Verification');

  const [clientForm, setClientForm] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    contractStart: '',
    contractEnd: '',
    status: 'Active' as ClientStatus
  });

  const [assignmentForm, setAssignmentForm] = useState({
    clientId: '',
    employeeId: '',
    project: '',
    location: '',
    workMode: 'Onsite' as AssignmentRecord['workMode'],
    startDate: '',
    plannedEndDate: '',
    allocation: 100,
    allowanceMonthly: 5000,
    reportingManagerId: 'EMP-002',
    clientSupervisorName: '',
    clientSupervisorEmail: '',
    shiftId: 'SHIFT-GEN',
    attendanceRules: 'External Client Email Verification + Internal Manager/HR Approval Required',
    requiresClientVerification: true,
    status: 'Active' as AssignmentStatus
  });

  const canAdmin = currentUser.role === 'hr_admin';
  const canManageAssignments =
    currentUser.role === 'hr_admin' ||
    currentUser.role === 'senior_manager' ||
    currentUser.role === 'reporting_manager';
  const canViewDirectory = canManageAssignments;
  const employees = db.getEmployees();
  const attendance = db.getAttendanceRecords();
  const shifts = db.getShifts();
  const clientEmailConfirmations = db.getClientEmailConfirmations();

  const saveClients = (next: ClientRecord[]) => {
    setClients(next);
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(next));
  };

  const saveAssignments = (next: AssignmentRecord[]) => {
    setAssignments(next);
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(next));
  };

  // Filtered clients
  const visibleClients = useMemo(() => {
    const base = canViewDirectory
      ? clients
      : clients.filter((c) =>
        assignments.some((a) => a.employeeId === currentUser.employeeId && a.clientId === c.id)
      );
    return base.filter((c) => {
      if (clientStatusFilter !== 'ALL' && c.status !== clientStatusFilter) return false;
      if (clientQuery.trim()) {
        const q = clientQuery.toLowerCase();
        if (
          !`${c.id} ${c.name} ${c.contactName} ${c.email} ${c.address}`
            .toLowerCase()
            .includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [clients, assignments, canViewDirectory, currentUser.employeeId, clientStatusFilter, clientQuery]);

  // Filtered assignments
  const visibleAssignments = useMemo(() => {
    const base = assignments.filter(
      (a) => canViewDirectory || a.employeeId === currentUser.employeeId
    );
    return base.filter((a) => {
      if (assignClientFilter !== 'ALL' && a.clientId !== assignClientFilter) return false;
      if (assignEmpFilter !== 'ALL' && a.employeeId !== assignEmpFilter) return false;
      if (assignStatusFilter !== 'ALL' && a.status !== assignStatusFilter) return false;
      if (assignModeFilter !== 'ALL' && a.workMode !== assignModeFilter) return false;
      if (assignQuery.trim()) {
        const q = assignQuery.toLowerCase();
        const emp = employees.find((e) => e.id === a.employeeId);
        const client = clients.find((c) => c.id === a.clientId);
        const hay = `${a.id} ${a.project} ${a.location} ${emp?.firstName || ''} ${emp?.lastName || ''} ${client?.name || ''} ${a.clientSupervisorName || ''} ${a.clientSupervisorEmail || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    assignments,
    canViewDirectory,
    currentUser.employeeId,
    assignClientFilter,
    assignEmpFilter,
    assignStatusFilter,
    assignModeFilter,
    assignQuery,
    employees,
    clients
  ]);

  const openAddClient = () => {
    setEditingClient(null);
    setClientForm({
      name: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      contractStart: '2026-01-01',
      contractEnd: '2026-12-31',
      status: 'Active'
    });
    setShowClientModal(true);
  };

  const openEditClient = (c: ClientRecord) => {
    setEditingClient(c);
    setClientForm({
      name: c.name,
      contactName: c.contactName,
      email: c.email,
      phone: c.phone,
      address: c.address,
      contractStart: c.contractStart,
      contractEnd: c.contractEnd,
      status: c.status
    });
    setShowClientModal(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name.trim()) return;
    if (editingClient) {
      const next = clients.map((c) =>
        c.id === editingClient.id ? { ...editingClient, ...clientForm } : c
      );
      saveClients(next);
      setNotice(`Updated client organization "${clientForm.name}".`);
    } else {
      const next = [{ ...clientForm, id: `CLI-${Date.now().toString().slice(-4)}` }, ...clients];
      saveClients(next);
      setNotice(`Added client organization "${clientForm.name}".`);
    }
    setShowClientModal(false);
  };

  const toggleClientStatus = (c: ClientRecord) => {
    const nextStatus: ClientStatus = c.status === 'Active' ? 'Inactive' : 'Active';
    const next = clients.map((item) => (item.id === c.id ? { ...item, status: nextStatus } : item));
    saveClients(next);
    setNotice(`${c.name} marked as ${nextStatus}.`);
  };

  const openAddAssignment = () => {
    setEditingAssignment(null);
    setAssignmentForm({
      clientId: '',
      employeeId: '',
      project: '',
      location: '',
      workMode: 'Onsite',
      startDate: '2026-10-01',
      plannedEndDate: '2027-03-31',
      allocation: 100,
      allowanceMonthly: 5000,
      reportingManagerId: 'EMP-002',
      clientSupervisorName: '',
      clientSupervisorEmail: '',
      shiftId: 'SHIFT-GEN',
      attendanceRules: 'External Client Email Verification + Internal Manager/HR Approval Required',
      requiresClientVerification: true,
      status: 'Active'
    });
    setShowAssignmentModal(true);
  };

  const openEditAssignment = (a: AssignmentRecord) => {
    const cli = clients.find((c) => c.id === a.clientId);
    setEditingAssignment(a);
    setAssignmentForm({
      clientId: a.clientId,
      employeeId: a.employeeId,
      project: a.project,
      location: a.location,
      workMode: a.workMode,
      startDate: a.startDate,
      plannedEndDate: a.plannedEndDate,
      allocation: a.allocation,
      allowanceMonthly: a.allowanceMonthly || 0,
      reportingManagerId: a.reportingManagerId || 'EMP-002',
      clientSupervisorName: a.clientSupervisorName || cli?.contactName || '',
      clientSupervisorEmail: a.clientSupervisorEmail || cli?.email || '',
      shiftId: a.shiftId || 'SHIFT-GEN',
      attendanceRules:
        a.attendanceRules || 'External Client Email Verification + Internal Manager/HR Approval Required',
      requiresClientVerification: a.requiresClientVerification ?? true,
      status: a.status
    });
    setShowAssignmentModal(true);
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.clientId || !assignmentForm.employeeId || !assignmentForm.startDate) return;

    if (assignmentForm.plannedEndDate && assignmentForm.plannedEndDate < assignmentForm.startDate) {
      setNotice('Planned end date cannot be earlier than deployment start date.');
      return;
    }

    if (!assignmentForm.clientSupervisorEmail.trim() || !assignmentForm.clientSupervisorEmail.includes('@')) {
      setNotice('A valid Client Supervisor Official Email Address is required for external email verification.');
      return;
    }

    const duplicate = assignments.some(
      (a) =>
        a.id !== editingAssignment?.id &&
        a.employeeId === assignmentForm.employeeId &&
        a.status === 'Active' &&
        assignmentForm.status === 'Active' &&
        assignmentForm.startDate <= (a.plannedEndDate || '9999-12-31') &&
        (assignmentForm.plannedEndDate || '9999-12-31') >= a.startDate
    );
    if (duplicate) {
      setNotice('This employee already has an overlapping active client deployment.');
      return;
    }

    if (editingAssignment) {
      const next = assignments.map((a) =>
        a.id === editingAssignment.id ? { ...editingAssignment, ...assignmentForm } : a
      );
      saveAssignments(next);
      setNotice('Client deployment updated.');
    } else {
      const next = [
        { ...assignmentForm, id: `CAS-${Date.now().toString().slice(-4)}` },
        ...assignments
      ];
      saveAssignments(next);
      setNotice('Client deployment created.');
    }
    setShowAssignmentModal(false);
  };

  const closeAssignment = (a: AssignmentRecord) => {
    const closeDate = new Date().toISOString().slice(0, 10);
    const depRecords = attendance.filter(
      (r) => r.assignmentId === a.id || (r.employeeId === a.employeeId && r.clientId === a.clientId)
    );
    const pendingVerCount = depRecords.filter(
      (r) => r.clientVerificationStatus === 'Pending' || r.clientVerificationStatus === 'Verification Requested'
    ).length;
    const pendingAppCount = depRecords.filter((r) => r.companyApprovalStatus === 'Pending').length;

    const next = assignments.map((x) =>
      x.id === a.id
        ? {
          ...x,
          status: 'Completed' as AssignmentStatus,
          actualEndDate: closeDate
        }
        : x
    );
    saveAssignments(next);
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      module: 'ATTENDANCE',
      action: 'UPDATE',
      entityId: a.id,
      entityName: a.project,
      description: `Closed client deployment ${a.id} for ${a.employeeId} on ${closeDate}. Pending client verifications: ${pendingVerCount}, pending company approvals: ${pendingAppCount}. Company employment status remains Active.`
    });
    setNotice(
      `Deployment ${a.id} closed on ${closeDate}. New client-site attendance after ${closeDate} is blocked while historical corrections remain allowed. Pending Client Email Verifications: ${pendingVerCount} · Pending Company Approvals: ${pendingAppCount}. Employee company status remains Active.`
    );
  };

  const handleLogClientAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggingAssignment) return;

    if (loggingAssignment.status !== 'Active') {
      setNotice('Cannot log new client attendance for an inactive or closed deployment.');
      return;
    }
    if (loggingAssignment.actualEndDate && attDate > loggingAssignment.actualEndDate) {
      setNotice(`Blocked: Attendance date (${attDate}) is after deployment closure date (${loggingAssignment.actualEndDate}).`);
      return;
    }
    if (attDate < loggingAssignment.startDate) {
      setNotice(`Blocked: Attendance date (${attDate}) is prior to deployment start date (${loggingAssignment.startDate}).`);
      return;
    }

    const existingSameDate = db
      .getAttendanceRecords()
      .find((r) => r.employeeId === loggingAssignment.employeeId && r.date === attDate);

    const hrs = Number(attHours) || 8;
    const recordId = existingSameDate ? existingSameDate.id : `ATT-CLI-${Date.now().toString().slice(-5)}`;
    const clientObj = clients.find((c) => c.id === loggingAssignment.clientId);
    const supName =
      attSupervisorName.trim() ||
      loggingAssignment.clientSupervisorName ||
      clientObj?.contactName ||
      'Client Site Supervisor';
    const supEmail =
      loggingAssignment.clientSupervisorEmail ||
      clientObj?.email ||
      'supervisor@client.example.com';
    const todayIso = new Date().toISOString().slice(0, 10);
    const isAlreadyVerified = attInitialStage === 'Pending Manager Approval';

    db.saveAttendanceRecord({
      id: recordId,
      employeeId: loggingAssignment.employeeId,
      date: attDate,
      entryDate: todayIso,
      shiftId: loggingAssignment.shiftId || existingSameDate?.shiftId || 'SHIFT-GEN',
      checkInTime: attCheckIn,
      checkOutTime: attCheckOut,
      totalHoursWorked: hrs,
      regularHours: Math.min(8, hrs),
      overtimeHours: hrs > 8 ? Number((hrs - 8).toFixed(1)) : 0,
      status: hrs < 4 ? 'Half Day' : 'Present',
      isLate: false,
      lateMinutes: 0,
      isEarlyDeparture: false,
      source: 'Client Timesheet',
      assignmentId: loggingAssignment.id,
      clientId: loggingAssignment.clientId,
      projectName: loggingAssignment.project,
      workMode: 'Client Site',
      clientSupervisorName: supName,
      clientSupervisorEmail: supEmail,
      verificationMethod: attVerificationMethod,
      evidenceRef: attEvidenceRef.trim() || undefined,
      clientVerifiedAt: isAlreadyVerified ? todayIso : undefined,
      clientVerificationStatus: isAlreadyVerified ? 'Verified' : 'Pending',
      companyApprovalStatus: 'Pending',
      payrollEligibilityStatus: 'Not Eligible',
      approvalStatus: attInitialStage,
      notes: `${loggingAssignment.project} (${clientObj?.name || loggingAssignment.clientId})`
    });

    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      module: 'ATTENDANCE',
      action: existingSameDate ? 'UPDATE' : 'CREATE',
      entityId: recordId,
      entityName: loggingAssignment.employeeId,
      description: `${existingSameDate ? 'Merged/Updated' : 'Logged'} client-site attendance for ${loggingAssignment.employeeId} on ${attDate} (${loggingAssignment.project}) — Stage: ${attInitialStage}`
    });

    setNotice(
      existingSameDate
        ? `Updated existing attendance on ${attDate} to Client Site (${loggingAssignment.project}) without duplicate day counting.`
        : `Recorded Client Site attendance for ${loggingAssignment.employeeId} on ${attDate} (${attInitialStage}).`
    );
    setLoggingAssignment(null);
  };

  const handleClientSupervisorVerify = (rec: AttendanceRecord) => {
    const clientObj = clients.find((c) => c.id === rec.clientId);
    const asg = assignments.find((a) => a.id === rec.assignmentId);
    const supName = rec.clientSupervisorName || asg?.clientSupervisorName || clientObj?.contactName || 'Client Supervisor';
    const supEmail = rec.clientSupervisorEmail || asg?.clientSupervisorEmail || clientObj?.email || 'supervisor@client.example.com';

    const res = hrmsService.recordClientSupervisorEmailResponse({
      attendanceRecordIds: [rec.id],
      coverageType: 'Single Date',
      coveredDates: [rec.date],
      decision: 'Verified',
      senderName: supName,
      senderEmail: supEmail,
      emailSubject: `RE: [Orbyx HRMS] Attendance Verification (${rec.employeeId} - ${rec.date})`,
      emailReceivedAt: new Date().toISOString().slice(0, 16),
      messageReference: `MSG-EXT-${Date.now().toString().slice(-5)}`,
      summary: `Client supervisor ${supName} confirmed ${rec.totalHoursWorked} working hours on ${rec.date} via external email reply.`,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role
    });

    if (!res.success) {
      setNotice(res.message);
      return;
    }
    setNotice(
      `Stage 1 Complete: Recorded external email confirmation (${res.confirmationId}) from Client Supervisor (${supName} <${supEmail}>) for ${rec.employeeId} on ${rec.date}. Client verification never auto-approves company attendance — now awaiting Stage 2 Company HR / Manager Final Approval.`
    );
  };

  const handleCompanyFinalDecision = (rec: AttendanceRecord, decision: 'Approved' | 'Disputed') => {
    if (decision === 'Approved') {
      const res = hrmsService.decideCompanyAttendanceApproval({
        attendanceRecordId: rec.id,
        decision: 'Approved',
        comments: 'Stage 2 Final Approved by Company HR/Manager after external client email verification.',
        actorUserId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role
      });
      if (!res.success) {
        setNotice(res.message);
        return;
      }
      setNotice(
        `Stage 2 Final Approved: Client-site attendance for ${rec.employeeId} on ${rec.date} is now Company Approved and Eligible for Draft Payroll.`
      );
    } else {
      const clientObj = clients.find((c) => c.id === rec.clientId);
      const asg = assignments.find((a) => a.id === rec.assignmentId);
      const supName = rec.clientSupervisorName || asg?.clientSupervisorName || clientObj?.contactName || 'Client Supervisor';
      const supEmail = rec.clientSupervisorEmail || asg?.clientSupervisorEmail || clientObj?.email || 'supervisor@client.example.com';

      const res = hrmsService.recordClientSupervisorEmailResponse({
        attendanceRecordIds: [rec.id],
        coverageType: 'Single Date',
        coveredDates: [rec.date],
        decision: 'Disputed',
        senderName: supName,
        senderEmail: supEmail,
        emailSubject: `DISPUTE: [Orbyx HRMS] Attendance Hours Query (${rec.employeeId} - ${rec.date})`,
        emailReceivedAt: new Date().toISOString().slice(0, 16),
        messageReference: `MSG-DISP-${Date.now().toString().slice(-5)}`,
        summary: `Flagged as Disputed for internal review and clarification.`,
        disputeDetails: `Disputed working hours on ${rec.date}; requires employee clarification and manager resolution.`,
        actorUserId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role
      });
      setNotice(res.message);
    }
  };

  const openSendVerificationEmail = (rec: AttendanceRecord) => {
    const draftRes = hrmsService.prepareClientVerificationRequest({
      attendanceRecordIds: [rec.id],
      coverageType: 'Single Date',
      actorUserId: currentUser.id,
      actorName: currentUser.name
    });

    const cli = clients.find((c) => c.id === rec.clientId);
    const asg = assignments.find((a) => a.id === rec.assignmentId);
    const supName = rec.clientSupervisorName || asg?.clientSupervisorName || cli?.contactName || 'Client Supervisor';
    const supEmail = rec.clientSupervisorEmail || asg?.clientSupervisorEmail || cli?.email || 'supervisor@client.example.com';
    const refId = draftRes.referenceId || `VREQ-${Date.now().toString().slice(-5)}`;

    const subject = `Attendance Verification Request – ${employees.find((e) => e.id === rec.employeeId)?.firstName || rec.employeeId
      } – ${rec.date}`;

    const body = [
      `Dear ${supName},`,
      ``,
      `We request your confirmation of the attendance details below for the deployed employee.`,
      ``,
      `Employee: ${employees.find((e) => e.id === rec.employeeId)?.firstName || ''} ${employees.find((e) => e.id === rec.employeeId)?.lastName || ''} (${rec.employeeId})`,
      `Client Organization: ${cli?.name || rec.clientId || 'Client Site'}`,
      `Project: ${asg?.project || rec.projectName || 'Client Engagement'}`,
      `Attendance Date: ${rec.date}`,
      `Reported Check-in: ${rec.checkInTime || '--:--'}`,
      `Reported Check-out: ${rec.checkOutTime || '--:--'}`,
      `Total Working Hours: ${rec.totalHoursWorked || 8} hrs`,
      ``,
      `Kindly reply to this email confirming whether the attendance details are correct.`,
      `If there are any discrepancies, please mention the actual working hours and the reason for the difference.`,
      ``,
      `This confirmation is required for Orbyx's internal attendance verification and approval process.`,
      ``,
      `Regards,`,
      `Orbyx HR Team`
    ].join('\n');

    setSendEmailModalRec({
      rec,
      draftSubject: subject,
      draftBody: body,
      supervisorName: supName,
      supervisorEmail: supEmail,
      referenceId: refId,
      deliveryNote: draftRes.deliveryNote || 'Demo Mode: Structured verification email prepared for client supervisor.'
    });
  };

  const openRecordClientEmailResponse = (
    rec: AttendanceRecord,
    defaultDecision: 'Verified' | 'Disputed' | 'Correction Requested' | 'Absent' = 'Verified'
  ) => {
    const cli = clients.find((c) => c.id === rec.clientId);
    const asg = assignments.find((a) => a.id === rec.assignmentId);
    const supName = rec.clientSupervisorName || asg?.clientSupervisorName || cli?.contactName || 'Client Supervisor';
    const supEmail = rec.clientSupervisorEmail || asg?.clientSupervisorEmail || cli?.email || 'supervisor@client.example.com';

    setRecordClientEmailModal({
      rec,
      decision: defaultDecision,
      senderName: supName,
      senderEmail: supEmail,
      emailSubject: `RE: Attendance Verification Request – ${rec.employeeId} – ${rec.date}`,
      emailReceivedAt: new Date().toISOString().slice(0, 16),
      messageReference: `MSG-EXT-${Date.now().toString().slice(-5)}`,
      attachmentFileName: '',
      summary:
        defaultDecision === 'Verified'
          ? `Client supervisor ${supName} confirmed attendance (${rec.totalHoursWorked} hrs) on ${rec.date} via external email reply.`
          : `Client supervisor ${supName} noted discrepancy on ${rec.date} via external email reply.`,
      disputeDetails: '',
      claimedCheckIn: rec.checkInTime || '09:30',
      claimedCheckOut: rec.checkOutTime || '17:30',
      claimedHours: String(rec.totalHoursWorked || 8)
    });
  };

  const handleSaveClientEmailResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordClientEmailModal) return;

    const { rec } = recordClientEmailModal;

    const res = hrmsService.recordClientSupervisorEmailResponse({
      attendanceRecordIds: [rec.id],
      coverageType: 'Single Date',
      coveredDates: [rec.date],
      decision: recordClientEmailModal.decision,
      senderName: recordClientEmailModal.senderName,
      senderEmail: recordClientEmailModal.senderEmail,
      emailSubject: recordClientEmailModal.emailSubject,
      emailReceivedAt: recordClientEmailModal.emailReceivedAt,
      messageReference: recordClientEmailModal.messageReference,
      attachmentFileName: recordClientEmailModal.attachmentFileName || undefined,
      summary: recordClientEmailModal.summary,
      disputeDetails: recordClientEmailModal.disputeDetails || undefined,
      claimedCheckIn: recordClientEmailModal.claimedCheckIn || undefined,
      claimedCheckOut: recordClientEmailModal.claimedCheckOut || undefined,
      claimedHours: recordClientEmailModal.claimedHours ? Number(recordClientEmailModal.claimedHours) : undefined,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role
    });

    if (!res.success) {
      setRecordClientEmailModal({ ...recordClientEmailModal, error: res.message });
      return;
    }

    setNotice(
      `Recorded Client Email Confirmation (${res.confirmationId}) with outcome "${recordClientEmailModal.decision}". Internal Company Approval remains separate and pending.`
    );
    setRecordClientEmailModal(null);
  };

  const openDisputeResolutionModal = (rec: AttendanceRecord) => {
    setDisputeModalRec(rec);
    setClarificationText(rec.employeeClarification || '');
    setClarificationEvidence(rec.employeeClarificationEvidence || '');
    setResolutionDecision(rec.disputeResolutionDecision || 'Approve Original Attendance');
    setResolutionReason(rec.disputeResolutionReason || '');
    setResolvedCheckIn(rec.clientClaimedCheckIn || rec.checkInTime || '09:30');
    setResolvedCheckOut(rec.clientClaimedCheckOut || rec.checkOutTime || '17:30');
    setDisputeModalError('');
  };

  const handleSubmitClarification = () => {
    if (!disputeModalRec) return;
    setDisputeModalError('');
    const res = hrmsService.submitDisputeClarification({
      attendanceRecordId: disputeModalRec.id,
      clarification: clarificationText,
      evidence: clarificationEvidence || undefined,
      actorUserId: currentUser.id,
      actorName: currentUser.name
    });
    if (!res.success) {
      setDisputeModalError(res.message);
      return;
    }
    const updated = db.getAttendanceRecords().find((r) => r.id === disputeModalRec.id) || null;
    setDisputeModalRec(updated);
    setNotice(`Clarification submitted for ${disputeModalRec.employeeId} on ${disputeModalRec.date}.`);
  };

  const handleResolveDispute = () => {
    if (!disputeModalRec) return;
    setDisputeModalError('');
    const res = hrmsService.resolveAttendanceDispute({
      attendanceRecordId: disputeModalRec.id,
      decision: resolutionDecision,
      reason: resolutionReason,
      correctedCheckIn: resolutionDecision === 'Approve Corrected Attendance' ? resolvedCheckIn : undefined,
      correctedCheckOut: resolutionDecision === 'Approve Corrected Attendance' ? resolvedCheckOut : undefined,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role
    });
    if (!res.success) {
      setDisputeModalError(res.message);
      return;
    }
    setNotice(`Dispute resolved for ${disputeModalRec.employeeId} on ${disputeModalRec.date}: ${resolutionDecision}.`);
    setDisputeModalRec(null);
  };

  const handleCompanyApprovalSubmit = () => {
    if (!companyApprovalModal) return;
    const res = hrmsService.decideCompanyAttendanceApproval({
      attendanceRecordId: companyApprovalModal.rec.id,
      decision: companyApprovalModal.decision,
      comments: companyApprovalModal.comments,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role
    });
    if (!res.success) {
      setCompanyApprovalModal({ ...companyApprovalModal, error: res.message });
      return;
    }
    setNotice(
      `Company decision "${companyApprovalModal.decision}" recorded for ${companyApprovalModal.rec.employeeId} on ${companyApprovalModal.rec.date}.`
    );
    setCompanyApprovalModal(null);
  };

  // Base client-site records
  const allClientSiteRecords = useMemo(() => {
    return attendance.filter(
      (r) =>
        (r.workMode === 'Client Site' || r.source === 'Client Timesheet') &&
        (canManageAssignments || r.employeeId === currentUser.employeeId)
    );
  }, [attendance, canManageAssignments, currentUser.employeeId]);

  // Filtered by search and dropdown filters
  const filteredClientRecords = useMemo(() => {
    return allClientSiteRecords.filter((r) => {
      if (attClientFilter !== 'ALL' && r.clientId !== attClientFilter) return false;
      if (attEmpFilter !== 'ALL' && r.employeeId !== attEmpFilter) return false;
      if (attProjectFilter !== 'ALL' && r.assignmentId !== attProjectFilter) return false;
      if (attWorkModeFilter !== 'ALL' && (r.workMode || 'Client Site') !== attWorkModeFilter) return false;
      if (attSourceFilter !== 'ALL' && r.source !== attSourceFilter) return false;
      if (attStageFilter !== 'ALL' && (r.approvalStatus || 'Approved') !== attStageFilter) return false;
      if (attDateFrom && r.date < attDateFrom) return false;
      if (attDateTo && r.date > attDateTo) return false;
      const cApp = r.companyApprovalStatus || (r.approvalStatus === 'Approved' ? 'Approved' : 'Pending');
      const pElig = r.payrollEligibilityStatus || (cApp === 'Approved' ? 'Eligible for Draft Payroll' : 'Not Eligible');
      if (attPayrollFilter !== 'ALL' && pElig !== attPayrollFilter) return false;
      if (attQuery.trim()) {
        const q = attQuery.toLowerCase();
        const emp = employees.find((e) => e.id === r.employeeId);
        const cli = clients.find((c) => c.id === r.clientId);
        const hay = `${r.id} ${r.employeeId} ${emp?.firstName || ''} ${emp?.lastName || ''} ${cli?.name || ''} ${r.projectName || ''} ${r.clientSupervisorName || ''} ${r.clientSupervisorEmail || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    allClientSiteRecords,
    attClientFilter,
    attEmpFilter,
    attProjectFilter,
    attWorkModeFilter,
    attSourceFilter,
    attStageFilter,
    attDateFrom,
    attDateTo,
    attPayrollFilter,
    attQuery,
    employees,
    clients
  ]);

  // 4 Internal Subsections (Section 5)
  const dailyAttendanceRecords = filteredClientRecords;
  const pendingVerificationRecords = useMemo(
    () =>
      filteredClientRecords.filter((r) => {
        const cVer = r.clientVerificationStatus || (r.approvalStatus === 'Pending Client Verification' ? 'Pending' : 'Verified');
        const cApp = r.companyApprovalStatus || (r.approvalStatus === 'Approved' ? 'Approved' : 'Pending');
        return cVer === 'Pending' || cVer === 'Verification Requested' || (cVer === 'Verified' && cApp === 'Pending');
      }),
    [filteredClientRecords]
  );
  const disputedAttendanceRecords = useMemo(
    () =>
      filteredClientRecords.filter(
        (r) =>
          r.clientVerificationStatus === 'Disputed' ||
          r.approvalStatus === 'Disputed' ||
          Boolean(r.disputeDetails)
      ),
    [filteredClientRecords]
  );
  const approvedAttendanceRecords = useMemo(
    () =>
      filteredClientRecords.filter((r) => {
        const cApp = r.companyApprovalStatus || (r.approvalStatus === 'Approved' ? 'Approved' : 'Pending');
        return cApp === 'Approved';
      }),
    [filteredClientRecords]
  );

  const clientSiteRecords = useMemo(() => {
    switch (attSubSection) {
      case 'pending':
        return pendingVerificationRecords;
      case 'disputed':
        return disputedAttendanceRecords;
      case 'approved':
        return approvedAttendanceRecords;
      case 'records':
      default:
        return dailyAttendanceRecords;
    }
  }, [attSubSection, dailyAttendanceRecords, pendingVerificationRecords, disputedAttendanceRecords, approvedAttendanceRecords]);

  const pendingClientAttCount = useMemo(
    () =>
      allClientSiteRecords.filter(
        (r) => r.companyApprovalStatus !== 'Approved' || r.approvalStatus !== 'Approved'
      ).length,
    [allClientSiteRecords]
  );

  const totalMonthlyAllowances = visibleAssignments
    .filter((a) => a.status === 'Active')
    .reduce((sum, a) => sum + (a.allowanceMonthly || 0), 0);

  const exportAssignmentsData = visibleAssignments.map((a) => {
    const emp = employees.find((e) => e.id === a.employeeId);
    const cli = clients.find((c) => c.id === a.clientId);
    return {
      AssignmentID: a.id,
      ClientID: a.clientId,
      ClientName: cli?.name || '',
      EmployeeID: a.employeeId,
      EmployeeName: emp ? `${emp.firstName} ${emp.lastName}` : '',
      Project: a.project,
      WorkMode: a.workMode,
      Location: a.location,
      ClientSupervisorName: a.clientSupervisorName || '',
      ClientSupervisorEmail: a.clientSupervisorEmail || '',
      AssignedShift: a.shiftId || 'SHIFT-GEN',
      AttendanceRules: a.attendanceRules || '',
      AllocationPercent: a.allocation,
      MonthlyAllowanceINR: a.allowanceMonthly || 0,
      StartDate: a.startDate,
      PlannedEndDate: a.plannedEndDate,
      ActualEndDate: a.actualEndDate || '',
      Status: a.status
    };
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Workforce Operations · Strict Internal Access Only (No External Client Logins)
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Client & Deployment Management</h1>

        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButton data={exportAssignmentsData} fileName="Orbyx_Client_Deployments" label="Export Deployments" />
          {canAdmin && (
            <>
              <button
                onClick={() => setIsClientImportOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Upload size={14} />
                Import Clients
              </button>
              <button
                onClick={openAddClient}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Plus size={14} />
                Add Client
              </button>
            </>
          )}
          {canManageAssignments && (
            <button
              onClick={openAddAssignment}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <Plus size={14} />
              Assign Employee
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs text-indigo-900">
          <span className="font-medium">{notice}</span>
          <button className="font-bold text-indigo-700 hover:underline" onClick={() => setNotice('')}>
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric
          icon={Building2}
          label="Client Organizations"
          value={String(canViewDirectory ? clients.length : new Set(visibleAssignments.map((a) => a.clientId)).size)}
        />
        <Metric
          icon={Users}
          label="Active Deployments"
          value={String(visibleAssignments.filter((a) => a.status === 'Active').length)}
        />
        <Metric
          icon={ClipboardCheck}
          label="Pending Attendance Approvals"
          value={String(pendingClientAttCount)}
        />
        <Metric
          icon={IndianRupee}
          label="Active Client Allowances / mo"
          value={`₹${totalMonthlyAllowances.toLocaleString('en-IN')}`}
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1">
          {canViewDirectory && (
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'directory' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              1. Client Registry ({visibleClients.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'assignments' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            2. Employee Deployments ({visibleAssignments.length})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'attendance' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <span>3. Client-Site Attendance & Approvals ({clientSiteRecords.length})</span>
            {pendingClientAttCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                {pendingClientAttCount} Pending
              </span>
            )}
          </button>
        </div>
        {onOpenPolicies && (
          <button
            type="button"
            onClick={onOpenPolicies}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
          >
            <ShieldCheck size={14} />
            <span>Client Deployment Policies →</span>
          </button>
        )}
      </div>

      {/* Tab 1: Client Directory */}
      {activeTab === 'directory' && canViewDirectory && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
                className={`${field} pl-9`}
                placeholder="Search clients by name, ID, contact, or city..."
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={clientStatusFilter}
                onChange={(e) => setClientStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Prospect">Prospect</option>
                <option value="Inactive">Inactive</option>
              </select>
              {(clientQuery || clientStatusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setClientQuery('');
                    setClientStatusFilter('ALL');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
                >
                  <RotateCcw size={12} /> Clear
                </button>
              )}
            </div>
          </div>

          {visibleClients.length === 0 ? (
            <Empty
              title="No matching client organizations"
              body="Adjust your search or status filter, or register a new client organization."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {visibleClients.map((c) => (
                <div key={c.id} className="rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex gap-3">
                        <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {c.id} · {c.address}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : c.status === 'Prospect'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                          }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      <p>External Client Supervisor Contact: <span className="font-semibold text-slate-800">{c.contactName || 'Not specified'}</span></p>
                      <p className="font-mono text-[11px]">
                        {c.email || 'No email'} {c.phone ? ` · ${c.phone}` : ''}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Contract Period: {c.contractStart || '—'} to {c.contractEnd || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-700">
                      {assignments.filter((a) => a.clientId === c.id && a.status === 'Active').length}{' '}
                      active deployment(s)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setViewingClient(c)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                      >
                        <Eye size={12} /> View
                      </button>
                      {canAdmin && (
                        <>
                          <button
                            onClick={() => openEditClient(c)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded"
                          >
                            <Edit3 size={12} /> Edit
                          </button>
                          <button
                            onClick={() => toggleClientStatus(c)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 rounded"
                          >
                            <Power size={12} /> {c.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Employee Assignments */}
      {(activeTab === 'assignments' || (!canViewDirectory && activeTab === 'directory')) && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness size={16} className="text-indigo-600" />
              <h2 className="font-bold text-slate-900 text-sm">Employee Deployment Lifecycle & External Supervisor Configuration</h2>
            </div>
            {(assignQuery ||
              assignClientFilter !== 'ALL' ||
              assignEmpFilter !== 'ALL' ||
              assignStatusFilter !== 'ALL' ||
              assignModeFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setAssignQuery('');
                    setAssignClientFilter('ALL');
                    setAssignEmpFilter('ALL');
                    setAssignStatusFilter('ALL');
                    setAssignModeFilter('ALL');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
                >
                  <RotateCcw size={12} /> Clear Filters
                </button>
              )}
          </div>

          {/* Contextual Assignment Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                value={assignQuery}
                onChange={(e) => setAssignQuery(e.target.value)}
                placeholder="Search project, supervisor email..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <select
              value={assignClientFilter}
              onChange={(e) => setAssignClientFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="ALL">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {canViewDirectory && (
              <select
                value={assignEmpFilter}
                onChange={(e) => setAssignEmpFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="ALL">All Assigned Employees</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.id})</option>
                ))}
              </select>
            )}
            <select
              value={assignModeFilter}
              onChange={(e) => setAssignModeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="ALL">All Work Modes</option>
              <option value="Onsite">Onsite</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Remote">Remote</option>
            </select>
            <select
              value={assignStatusFilter}
              onChange={(e) => setAssignStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Planned">Planned</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {visibleAssignments.length === 0 ? (
            <Empty
              title="No matching client assignments"
              body="No employee deployments match the selected filters."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-xs">
                <thead>
                  <tr className="border-b bg-slate-50 text-[11px] uppercase text-slate-500">
                    <th className="p-3">Deployment & Employee</th>
                    <th className="p-3">Client, Project & Supervisor Email</th>
                    <th className="p-3">Shift, Mode & Rules</th>
                    <th className="p-3">Assignment Period</th>
                    <th className="p-3">Client Attendance</th>
                    <th className="p-3">Status & Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAssignments.map((a) => {
                    const emp = employees.find((e) => e.id === a.employeeId);
                    const client = clients.find((c) => c.id === a.clientId);
                    const mgr = employees.find((e) => e.id === a.reportingManagerId);
                    const empAtt = attendance.filter((r) => r.employeeId === a.employeeId);
                    const clientSiteLogs = empAtt.filter((r) => r.workMode === 'Client Site' || r.assignmentId === a.id);
                    const pendingLogs = clientSiteLogs.filter(
                      (r) => r.companyApprovalStatus !== 'Approved' && r.approvalStatus !== 'Approved'
                    );

                    return (
                      <tr key={a.id} className="border-b last:border-0 hover:bg-slate-50/70">
                        <td className="p-3">
                          <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {a.id}
                          </span>
                          <p className="font-semibold text-slate-900 mt-1">
                            {emp ? `${emp.firstName} ${emp.lastName}` : a.employeeId}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {a.employeeId} · Co. Status: <span className="text-emerald-700 font-semibold">{emp?.status || 'Active'}</span>
                          </p>
                          {mgr && (
                            <p className="text-[10px] text-slate-500">
                              Internal Mgr: {mgr.firstName} {mgr.lastName}
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-900">{client?.name || 'Unknown client'}</p>
                          <p className="text-[11px] text-slate-600 font-medium">{a.project || 'General engagement'}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Client Sup: <span className="font-semibold text-slate-700">{a.clientSupervisorName || client?.contactName || 'Assigned Lead'}</span>
                          </p>
                          <p className="text-[10px] font-mono text-indigo-700">
                            {a.clientSupervisorEmail || client?.email || 'supervisor@client.example.com'}
                          </p>
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-slate-800">{a.workMode}</span> ({a.allocation}%) ·{' '}
                          <span className="font-mono text-[11px] text-slate-600">{a.shiftId || 'SHIFT-GEN'}</span>
                          <p className="text-[11px] text-slate-400">
                            {a.location || 'Location not specified'}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Rule: {a.attendanceRules || 'Client Email + Internal Approval'}
                          </p>
                          {a.allowanceMonthly ? (
                            <p className="text-[11px] font-mono text-indigo-700">
                              +₹{a.allowanceMonthly.toLocaleString('en-IN')}/mo onsite allowance
                            </p>
                          ) : null}
                        </td>
                        <td className="p-3 font-mono">
                          {a.startDate}
                          <p className="text-[11px] text-slate-400 font-sans">
                            Planned end: {a.plannedEndDate || 'Open-ended'}
                          </p>
                          {a.actualEndDate && (
                            <p className="text-[11px] text-rose-600 font-sans font-semibold">Closed: {a.actualEndDate}</p>
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => {
                              setAttClientFilter(a.clientId);
                              setActiveTab('attendance');
                            }}
                            className="text-left group"
                          >
                            <span className="font-mono text-xs font-semibold text-indigo-700 group-hover:underline block">
                              {clientSiteLogs.length} client-site log(s) &rarr;
                            </span>
                            {pendingLogs.length > 0 ? (
                              <span className="text-[10px] font-semibold text-amber-700">
                                {pendingLogs.length} awaiting verification/approval
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-700">All verified & approved</span>
                            )}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${a.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                                }`}
                            >
                              {a.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setAttClientFilter(a.clientId);
                                setAttEmpFilter(a.employeeId);
                                setAttSubSection('records');
                                setActiveTab('attendance');
                              }}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1"
                              title="View attendance records filtered by this employee and deployment"
                            >
                              <FileText size={12} />
                              <span>View Attendance</span>
                            </button>
                            {a.status === 'Active' && (canManageAssignments || a.employeeId === currentUser.employeeId) && (
                              <button
                                onClick={() => {
                                  setLoggingAssignment(a);
                                  setAttDate(new Date().toISOString().slice(0, 10));
                                  setAttSupervisorName(a.clientSupervisorName || client?.contactName || 'Client Supervisor');
                                  setAttInitialStage('Pending Client Verification');
                                }}
                                className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-semibold"
                              >
                                + Log Attendance
                              </button>
                            )}
                            {canManageAssignments && (
                              <button
                                onClick={() => openEditAssignment(a)}
                                className="text-xs font-semibold text-slate-600 hover:text-indigo-700"
                              >
                                Edit
                              </button>
                            )}
                            {canManageAssignments && a.status === 'Active' && (
                              <button
                                onClick={() => closeAssignment(a)}
                                className="text-xs font-semibold text-rose-600 hover:underline"
                              >
                                Close
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Tab 3: Client-Site Attendance & Multi-Stage Verification/Approval (Redesigned with 4 Internal Sections) */}
      {activeTab === 'attendance' && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-5">
          {/* Header & Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardCheck size={18} className="text-indigo-600" />
                <h2 className="font-bold text-slate-900 text-sm">
                  Client-Site Attendance Tracking & Two-Stage Verification
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                External Client Supervisor Email Verification (Stage 1 · No HRMS Login) &rarr; Internal Company Approval (Stage 2) &rarr; Payroll Processing Eligibility.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setManualEntryType('Manual Entry');
                  setIsManualEntryModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold transition-colors"
              >
                <AlertTriangle size={14} className="text-amber-600" />
                <span>+ Outage / Manual Entry</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualEntryType('Correction');
                  setIsManualEntryModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors"
              >
                <Clock size={14} className="text-indigo-600" />
                <span>+ Forgot Punch / Correction</span>
              </button>
            </div>
          </div>

          {/* 4 Internal Sections Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAttSubSection('records')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${attSubSection === 'records'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
              >
                <FileText size={13} />
                <span>Daily Attendance Records ({dailyAttendanceRecords.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setAttSubSection('pending')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${attSubSection === 'pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
              >
                <Clock size={13} />
                <span>Pending Verification ({pendingVerificationRecords.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setAttSubSection('disputed')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${attSubSection === 'disputed'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
              >
                <AlertTriangle size={13} />
                <span>Disputed Attendance ({disputedAttendanceRecords.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setAttSubSection('approved')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${attSubSection === 'approved'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
              >
                <CheckCircle2 size={13} />
                <span>Approved Attendance ({approvedAttendanceRecords.length})</span>
              </button>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Showing {clientSiteRecords.length} record(s)
            </span>
          </div>

          {/* Extended Filters Bar */}
          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-1">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Filter size={13} className="text-slate-500" /> Filters & Search
              </span>
              {(attQuery ||
                attClientFilter !== 'ALL' ||
                attEmpFilter !== 'ALL' ||
                attProjectFilter !== 'ALL' ||
                attWorkModeFilter !== 'ALL' ||
                attSourceFilter !== 'ALL' ||
                attStageFilter !== 'ALL' ||
                attDateFrom ||
                attDateTo ||
                attPayrollFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setAttQuery('');
                      setAttClientFilter('ALL');
                      setAttEmpFilter('ALL');
                      setAttProjectFilter('ALL');
                      setAttWorkModeFilter('ALL');
                      setAttSourceFilter('ALL');
                      setAttStageFilter('ALL');
                      setAttDateFrom('');
                      setAttDateTo('');
                      setAttPayrollFilter('ALL');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline"
                  >
                    <RotateCcw size={12} /> Reset Filters
                  </button>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  value={attQuery}
                  onChange={(e) => setAttQuery(e.target.value)}
                  placeholder="Search emp, ID, supervisor..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <select
                value={attClientFilter}
                onChange={(e) => setAttClientFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">All Client Orgs</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={attEmpFilter}
                onChange={(e) => setAttEmpFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">All Employees</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.id})</option>
                ))}
              </select>
              <select
                value={attProjectFilter}
                onChange={(e) => setAttProjectFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">All Projects / Deployments</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>{a.project} ({a.id})</option>
                ))}
              </select>
              <select
                value={attWorkModeFilter}
                onChange={(e) => setAttWorkModeFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">All Work Modes</option>
                <option value="Onsite">Onsite</option>
                <option value="Client Site">Client Site</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
              </select>
              <select
                value={attSourceFilter}
                onChange={(e) => setAttSourceFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">All Attendance Sources</option>
                <option value="Attendance Device">Attendance Device</option>
                <option value="HRMS">HRMS</option>
                <option value="Manual Entry">Manual Entry</option>
                <option value="Approved Correction">Approved Correction</option>
                <option value="Client Timesheet">Client Timesheet</option>
                <option value="Web Punch">Web Punch</option>
              </select>
              <select
                value={attStageFilter}
                onChange={(e) => setAttStageFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">All Verification Statuses</option>
                <option value="Pending Client Verification">Stage 1: Pending Client Email Verification</option>
                <option value="Pending Manager Approval">Stage 2: Client Verified — Pending Company Approval</option>
                <option value="Approved">Stage 3: Company Approved</option>
                <option value="Disputed">Disputed</option>
              </select>
              <select
                value={attPayrollFilter}
                onChange={(e) => setAttPayrollFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">All Payroll Eligibilities</option>
                <option value="Not Eligible">Not Eligible (Unapproved/Disputed)</option>
                <option value="Eligible for Draft Payroll">Eligible for Draft Payroll</option>
                <option value="Included in Draft Payroll">Included in Draft Payroll</option>
                <option value="Finalized">Finalized</option>
              </select>
              <div className="flex items-center gap-1.5 sm:col-span-2">
                <input
                  type="date"
                  value={attDateFrom}
                  onChange={(e) => setAttDateFrom(e.target.value)}
                  placeholder="From"
                  className="w-1/2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-[11px]"
                  title="Date From"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={attDateTo}
                  onChange={(e) => setAttDateTo(e.target.value)}
                  placeholder="To"
                  className="w-1/2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-[11px]"
                  title="Date To"
                />
              </div>
            </div>
          </div>

          {/* Records Table */}
          {clientSiteRecords.length === 0 ? (
            <Empty
              title={
                attSubSection === 'pending'
                  ? 'No Pending Verifications'
                  : attSubSection === 'disputed'
                    ? 'No Disputed Records'
                    : attSubSection === 'approved'
                      ? 'No Approved Records'
                      : 'No Attendance Records Found'
              }
              body="No records match the current filters or selected internal section."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1020px] text-left text-xs">
                <thead>
                  <tr className="border-b bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="p-3">Employee</th>
                    <th className="p-3">Client & Project</th>
                    <th className="p-3">Date & Times</th>
                    <th className="p-3">Hours & Overtime</th>
                    <th className="p-3">Source & Outcome</th>
                    <th className="p-3">Stage 1: Client Email</th>
                    <th className="p-3">Stage 2: Company Approval</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientSiteRecords.map((rec) => {
                    const emp = employees.find((e) => e.id === rec.employeeId);
                    const cli = clients.find((c) => c.id === rec.clientId);
                    const asg = assignments.find((a) => a.id === rec.assignmentId);
                    const cVer = rec.clientVerificationStatus || (rec.approvalStatus === 'Pending Client Verification' ? 'Pending' : 'Verified');
                    const cApp = rec.companyApprovalStatus || (rec.approvalStatus === 'Approved' ? 'Approved' : 'Pending');
                    const pElig = rec.payrollEligibilityStatus || (cApp === 'Approved' ? 'Eligible for Draft Payroll' : 'Not Eligible');
                    const isDisputed = cVer === 'Disputed' || rec.approvalStatus === 'Disputed' || Boolean(rec.disputeDetails);
                    const canCompanyApprove =
                      (canAdmin ||
                        currentUser.role === 'senior_manager' ||
                        canApproveRequestFor(rec.employeeId)) &&
                      rec.employeeId !== currentUser.employeeId;

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3">
                          <p className="font-semibold text-slate-900">
                            {emp ? `${emp.firstName} ${emp.lastName}` : rec.employeeId}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">{rec.employeeId}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-900">{cli?.name || rec.clientId || 'Client Site'}</p>
                          <p className="text-[11px] text-slate-500">{asg?.project || rec.projectName || 'Client Engagement'}</p>
                        </td>
                        <td className="p-3 font-mono">
                          <span className="font-bold text-slate-900 block">{rec.date}</span>
                          <span className="text-[11px] text-slate-600 block">
                            {rec.checkInTime || '--:--'} &rarr; {rec.checkOutTime || '--:--'}
                          </span>
                        </td>
                        <td className="p-3 font-mono">
                          <span className="font-bold text-slate-900 block">{rec.totalHoursWorked || 8}h worked</span>
                          {rec.overtimeHours ? (
                            <span className="text-[10px] text-indigo-700 block font-semibold">
                              +{rec.overtimeHours}h OT
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 block">No OT</span>
                          )}
                        </td>
                        <td className="p-3 space-y-1">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {rec.source || 'HRMS'}
                          </span>
                          <div>
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${rec.status === 'Present'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : rec.status === 'Absent'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                            >
                              Outcome: {rec.status || 'Present'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 space-y-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${cVer === 'Verified'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isDisputed
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                          >
                            {isDisputed ? 'Disputed' : cVer}
                          </span>
                          <p className="text-[10px] text-slate-500 font-mono truncate max-w-[130px]" title={rec.clientSupervisorEmail}>
                            {rec.clientSupervisorEmail || asg?.clientSupervisorEmail || 'Email unconfigured'}
                          </p>
                        </td>
                        <td className="p-3 space-y-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${cApp === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : cApp === 'Rejected'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}
                          >
                            Company: {cApp}
                          </span>
                          <p className="text-[10px] text-slate-500">
                            Payroll: <strong className={pElig === 'Not Eligible' ? 'text-slate-500' : 'text-emerald-700'}>{pElig}</strong>
                          </p>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {/* View Details */}
                            <button
                              type="button"
                              onClick={() => setViewingDetailRec(rec)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1"
                              title="View full record detail drawer"
                            >
                              <Eye size={12} /> View
                            </button>

                            {/* Send Verification Email */}
                            {canManageAssignments && (
                              <button
                                type="button"
                                onClick={() => openSendVerificationEmail(rec)}
                                className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold inline-flex items-center gap-1"
                                title="Send/Preview email to client supervisor"
                              >
                                <Mail size={12} /> Email
                              </button>
                            )}

                            {/* Record Client Email Confirmation */}
                            {canManageAssignments && cVer !== 'Verified' && (
                              <button
                                type="button"
                                onClick={() => openRecordClientEmailResponse(rec, 'Verified')}
                                className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold"
                                title="Record incoming supervisor email reply"
                              >
                                Record Reply
                              </button>
                            )}

                            {/* Resolve Dispute */}
                            {isDisputed && (
                              <button
                                type="button"
                                onClick={() => openDisputeResolutionModal(rec)}
                                className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold"
                              >
                                Resolve Dispute
                              </button>
                            )}

                            {/* Internal Company Approval */}
                            {cVer === 'Verified' && cApp !== 'Approved' && canCompanyApprove && (
                              <button
                                type="button"
                                onClick={() =>
                                  setCompanyApprovalModal({
                                    rec,
                                    decision: 'Approved',
                                    comments: 'Stage 2 Final Approved by Company HR/Manager after external client verification.'
                                  })
                                }
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold"
                              >
                                Approve (Co.)
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Audit Log for Client Supervisor Email Confirmations */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileCheck2 size={14} className="text-indigo-600" />
                <span>Auditable Client Supervisor Email Confirmations ({clientEmailConfirmations.length})</span>
              </h3>
              <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                DEMO_EMAIL_MODE: Honest manual recording; external client contacts have zero HRMS credentials
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              {clientEmailConfirmations.slice(0, 6).map((cec) => (
                <div key={cec.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-indigo-700">{cec.id}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${(cec.decision || 'Verified') === 'Verified'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                    >
                      {cec.decision || 'Verified'} · {cec.coverageType || 'Single Date'}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900">
                    {cec.employeeName || cec.employeeId} — {cec.clientName} ({cec.projectName})
                  </p>
                  <p className="text-[11px] text-slate-600">{cec.summary}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    From: {cec.confirmedByEmail} · Msg: {cec.messageReference} · Logged by: {cec.recordedBy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* View Client Modal */}
      {viewingClient && (
        <Modal title={`Client Details — ${viewingClient.name}`} onClose={() => setViewingClient(null)}>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block">Client Code</span>
                <span className="font-mono font-bold text-slate-900">{viewingClient.id}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Status</span>
                <span className="font-semibold text-emerald-700">{viewingClient.status}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Primary Contact</span>
                <span className="font-semibold text-slate-800">{viewingClient.contactName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Email & Phone</span>
                <span className="text-slate-700">{viewingClient.email} · {viewingClient.phone}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">Registered Location</span>
                <span className="text-slate-800">{viewingClient.address}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Contract Start</span>
                <span className="font-mono text-slate-800">{viewingClient.contractStart}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Contract End</span>
                <span className="font-mono text-slate-800">{viewingClient.contractEnd}</span>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setViewingClient(null)}
                className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add/Edit Client Modal */}
      {showClientModal && (
        <Modal
          title={editingClient ? 'Edit Client Organization' : 'Add Client Organization'}
          onClose={() => setShowClientModal(false)}
        >
          <form onSubmit={handleSaveClient} className="space-y-3 text-xs">
            <label className="block font-semibold text-slate-700">
              Client organization name *
              <input
                required
                className={`${field} mt-1`}
                value={clientForm.name}
                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="font-semibold text-slate-700">
                Primary contact
                <input
                  className={`${field} mt-1`}
                  value={clientForm.contactName}
                  onChange={(e) => setClientForm({ ...clientForm, contactName: e.target.value })}
                />
              </label>
              <label className="font-semibold text-slate-700">
                Contact email
                <input
                  type="email"
                  className={`${field} mt-1`}
                  value={clientForm.email}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                />
              </label>
              <label className="font-semibold text-slate-700">
                Phone
                <input
                  className={`${field} mt-1`}
                  value={clientForm.phone}
                  onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                />
              </label>
              <label className="font-semibold text-slate-700">
                Status
                <select
                  className={`${field} mt-1`}
                  value={clientForm.status}
                  onChange={(e) =>
                    setClientForm({ ...clientForm, status: e.target.value as ClientStatus })
                  }
                >
                  <option>Active</option>
                  <option>Prospect</option>
                  <option>Inactive</option>
                </select>
              </label>
              <label className="font-semibold text-slate-700">
                Contract start
                <input
                  type="date"
                  className={`${field} mt-1`}
                  value={clientForm.contractStart}
                  onChange={(e) => setClientForm({ ...clientForm, contractStart: e.target.value })}
                />
              </label>
              <label className="font-semibold text-slate-700">
                Contract end
                <input
                  type="date"
                  className={`${field} mt-1`}
                  value={clientForm.contractEnd}
                  onChange={(e) => setClientForm({ ...clientForm, contractEnd: e.target.value })}
                />
              </label>
            </div>
            <label className="block font-semibold text-slate-700">
              Address
              <input
                className={`${field} mt-1`}
                value={clientForm.address}
                onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClientModal(false)}
                className="rounded-lg border px-4 py-1.5 text-xs font-medium"
              >
                Cancel
              </button>
              <button className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white">
                {editingClient ? 'Save Changes' : 'Save Client'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add/Edit Assignment Modal */}
      {showAssignmentModal && (
        <Modal
          title={editingAssignment ? 'Edit Client Deployment' : 'Assign Employee to Client Deployment'}
          onClose={() => setShowAssignmentModal(false)}
        >
          <form onSubmit={handleSaveAssignment} className="space-y-3 text-xs">
            <label className="block font-semibold text-slate-700">
              Client organization *
              <select
                required
                className={`${field} mt-1`}
                value={assignmentForm.clientId}
                onChange={(e) => {
                  const selectedClient = clients.find((c) => c.id === e.target.value);
                  setAssignmentForm({
                    ...assignmentForm,
                    clientId: e.target.value,
                    clientSupervisorName: assignmentForm.clientSupervisorName || selectedClient?.contactName || '',
                    clientSupervisorEmail: assignmentForm.clientSupervisorEmail || selectedClient?.email || ''
                  });
                }}
              >
                <option value="">Select client</option>
                {clients
                  .filter((c) => c.status === 'Active' || c.id === assignmentForm.clientId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id})
                    </option>
                  ))}
              </select>
            </label>
            <label className="block font-semibold text-slate-700">
              Existing internal employee *
              <select
                required
                className={`${field} mt-1`}
                value={assignmentForm.employeeId}
                onChange={(e) =>
                  setAssignmentForm({ ...assignmentForm, employeeId: e.target.value })
                }
              >
                <option value="">Select employee</option>
                {employees
                  .filter((e) => e.status !== 'Separated' && e.status !== 'Inactive')
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.id} — {e.firstName} {e.lastName}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block font-semibold text-slate-700">
              Project / engagement *
              <input
                required
                className={`${field} mt-1`}
                value={assignmentForm.project}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, project: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="font-semibold text-slate-700">
                Start date *
                <input
                  required
                  type="date"
                  className={`${field} mt-1`}
                  value={assignmentForm.startDate}
                  onChange={(e) =>
                    setAssignmentForm({ ...assignmentForm, startDate: e.target.value })
                  }
                />
              </label>
              <label className="font-semibold text-slate-700">
                Planned end date
                <input
                  type="date"
                  className={`${field} mt-1`}
                  value={assignmentForm.plannedEndDate}
                  onChange={(e) =>
                    setAssignmentForm({ ...assignmentForm, plannedEndDate: e.target.value })
                  }
                />
              </label>
              <label className="font-semibold text-slate-700">
                Work mode
                <select
                  className={`${field} mt-1`}
                  value={assignmentForm.workMode}
                  onChange={(e) =>
                    setAssignmentForm({
                      ...assignmentForm,
                      workMode: e.target.value as AssignmentRecord['workMode']
                    })
                  }
                >
                  <option>Onsite</option>
                  <option>Remote</option>
                  <option>Hybrid</option>
                </select>
              </label>
              <label className="font-semibold text-slate-700">
                Assigned Shift *
                <select
                  className={`${field} mt-1`}
                  value={assignmentForm.shiftId}
                  onChange={(e) =>
                    setAssignmentForm({
                      ...assignmentForm,
                      shiftId: e.target.value
                    })
                  }
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="font-semibold text-slate-700">
                Client Office / Location *
                <input
                  required
                  className={`${field} mt-1`}
                  value={assignmentForm.location}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, location: e.target.value })}
                />
              </label>
              <label className="font-semibold text-slate-700">
                Monthly Allowance (₹)
                <input
                  type="number"
                  min="0"
                  className={`${field} mt-1`}
                  value={assignmentForm.allowanceMonthly}
                  onChange={(e) =>
                    setAssignmentForm({
                      ...assignmentForm,
                      allowanceMonthly: Number(e.target.value)
                    })
                  }
                />
              </label>
              <label className="font-semibold text-slate-700">
                Internal Reporting Manager *
                <select
                  className={`${field} mt-1`}
                  value={assignmentForm.reportingManagerId}
                  onChange={(e) =>
                    setAssignmentForm({ ...assignmentForm, reportingManagerId: e.target.value })
                  }
                >
                  {employees
                    .filter((e) => e.status === 'Active')
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} ({e.id})
                      </option>
                    ))}
                </select>
              </label>
              <label className="font-semibold text-slate-700">
                Deployment Status
                <select
                  className={`${field} mt-1`}
                  value={assignmentForm.status}
                  onChange={(e) =>
                    setAssignmentForm({
                      ...assignmentForm,
                      status: e.target.value as AssignmentStatus
                    })
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Planned">Planned</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </label>
              <label className="font-semibold text-slate-700">
                Client Supervisor Name *
                <input
                  required
                  placeholder="e.g. Vikramaditya Rao"
                  className={`${field} mt-1`}
                  value={assignmentForm.clientSupervisorName}
                  onChange={(e) =>
                    setAssignmentForm({ ...assignmentForm, clientSupervisorName: e.target.value })
                  }
                />
              </label>
              <label className="font-semibold text-slate-700">
                Client Supervisor Official Email *
                <input
                  required
                  type="email"
                  placeholder="e.g. v.rao@apexfintech.example.com"
                  className={`${field} mt-1 font-mono`}
                  value={assignmentForm.clientSupervisorEmail}
                  onChange={(e) =>
                    setAssignmentForm({ ...assignmentForm, clientSupervisorEmail: e.target.value })
                  }
                />
              </label>
            </div>
            <label className="block font-semibold text-slate-700">
              Applicable Attendance Verification Rules
              <input
                className={`${field} mt-1`}
                value={assignmentForm.attendanceRules}
                onChange={(e) =>
                  setAssignmentForm({ ...assignmentForm, attendanceRules: e.target.value })
                }
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAssignmentModal(false)}
                className="rounded-lg border px-4 py-1.5 text-xs font-medium"
              >
                Cancel
              </button>
              <button className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white">
                {editingAssignment ? 'Save Changes' : 'Create Assignment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CSV Import for Clients */}
      <CsvImportModal<ClientRecord>
        isOpen={isClientImportOpen}
        onClose={() => setIsClientImportOpen(false)}
        title="Bulk Import Client Organizations"
        description="Upload or paste client records with contact details and contract dates."
        templateFileName="Orbyx_Clients_Template"
        headers={['Name', 'ContactPerson', 'Email', 'Phone', 'Address', 'ContractStart', 'ContractEnd']}
        sampleRows={[
          ['Vanguard Cloud Solutions', 'Rohan Kulkarni', 'rohan@vanguard.example.com', '+91 20 6600 1200', 'Hinjewadi Phase 2 Pune', '2026-06-01', '2027-05-31']
        ]}
        validateRow={(cols, idx) => {
          const [name, contactName, email, phone, address, contractStart, contractEnd] = cols;
          if (!name || !contactName || !email) {
            return { valid: false, error: 'Name, ContactPerson, and Email are required' };
          }
          if (clients.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
            return { valid: false, error: `Client "${name}" already exists` };
          }
          return {
            valid: true,
            data: {
              id: `CLI-${Date.now().toString().slice(-3)}${idx}`,
              name,
              contactName,
              email,
              phone: phone || '',
              address: address || '',
              contractStart: contractStart || '2026-01-01',
              contractEnd: contractEnd || '2026-12-31',
              status: 'Active'
            }
          };
        }}
        onCommit={(validItems) => {
          saveClients([...validItems, ...clients]);
          setNotice(`Imported ${validItems.length} client organization(s).`);
        }}
      />


      {/* Log Client-Site Attendance Modal */}
      {loggingAssignment && (
        <Modal
          title={`Log Client-Site Attendance (${loggingAssignment.employeeId})`}
          onClose={() => setLoggingAssignment(null)}
        >
          <form onSubmit={handleLogClientAttendance} className="space-y-3 text-xs">
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-indigo-950 space-y-1">
              <p className="font-bold">{loggingAssignment.project}</p>
              <p className="text-[11px] text-indigo-800">
                Active Window: {loggingAssignment.startDate} to {loggingAssignment.actualEndDate || loggingAssignment.plannedEndDate || 'Open'} · Same-day office punches are automatically deduplicated for Payroll.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="font-semibold text-slate-700">
                Attendance Date *
                <input
                  type="date"
                  required
                  min={loggingAssignment.startDate}
                  max={loggingAssignment.actualEndDate || loggingAssignment.plannedEndDate || undefined}
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  className={`${field} mt-1 font-mono`}
                />
              </label>
              <label className="font-semibold text-slate-700">
                Total Hours Worked *
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="16"
                  required
                  value={attHours}
                  onChange={(e) => setAttHours(Number(e.target.value))}
                  className={`${field} mt-1 font-mono`}
                />
              </label>
              <label className="font-semibold text-slate-700">
                Check-In Time
                <input
                  type="time"
                  value={attCheckIn}
                  onChange={(e) => setAttCheckIn(e.target.value)}
                  className={`${field} mt-1 font-mono`}
                />
              </label>
              <label className="font-semibold text-slate-700">
                Check-Out Time
                <input
                  type="time"
                  value={attCheckOut}
                  onChange={(e) => setAttCheckOut(e.target.value)}
                  className={`${field} mt-1 font-mono`}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="font-semibold text-slate-700">
                Client Supervisor Name *
                <input
                  required
                  value={attSupervisorName}
                  onChange={(e) => setAttSupervisorName(e.target.value)}
                  placeholder="e.g. Vikramaditya Rao"
                  className={`${field} mt-1`}
                />
              </label>
              <label className="font-semibold text-slate-700">
                Client Verification Method
                <select
                  value={attVerificationMethod}
                  onChange={(e) => setAttVerificationMethod(e.target.value as any)}
                  className={`${field} mt-1`}
                >
                  <option value="Supervisor Sign-off">Client Supervisor Sign-off</option>
                  <option value="Client Email Confirmation">Client Email Confirmation</option>
                </select>
              </label>
              <label className="font-semibold text-slate-700">
                Verification Evidence / Email Ref
                <input
                  value={attEvidenceRef}
                  onChange={(e) => setAttEvidenceRef(e.target.value)}
                  placeholder="e.g. Email thread #TS-2026-10 or Signed Timesheet"
                  className={`${field} mt-1`}
                />
              </label>
              <label className="font-semibold text-slate-700">
                Initial Workflow Stage
                <select
                  value={attInitialStage}
                  onChange={(e) => setAttInitialStage(e.target.value as any)}
                  className={`${field} mt-1`}
                >
                  <option value="Pending Client Verification">Stage 1: Pending Client Supervisor Verification</option>
                  <option value="Pending Manager Approval">Stage 2: Client Verified — Pending Company HR/Mgr Approval</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLoggingAssignment(null)}
                className="rounded-lg border px-4 py-1.5 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white"
              >
                Save Client Attendance
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: View Attendance Record Details Drawer/Modal */}
      {viewingDetailRec && (
        <Modal
          title={`Attendance Record Details — ${viewingDetailRec.employeeId} (${viewingDetailRec.date})`}
          onClose={() => setViewingDetailRec(null)}
        >
          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Record ID</span>
                <span className="font-mono font-bold text-slate-900">{viewingDetailRec.id}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Attendance Date</span>
                <span className="font-mono text-slate-800">{viewingDetailRec.date}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Employee</span>
                <span className="font-semibold text-slate-800">
                  {employees.find((e) => e.id === viewingDetailRec.employeeId)?.firstName}{' '}
                  {employees.find((e) => e.id === viewingDetailRec.employeeId)?.lastName} ({viewingDetailRec.employeeId})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Client & Project</span>
                <span className="font-semibold text-indigo-700">
                  {clients.find((c) => c.id === viewingDetailRec.clientId)?.name || viewingDetailRec.clientId} · {viewingDetailRec.projectName || 'Client Engagement'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Reported Punches</span>
                <span className="font-mono text-slate-800">
                  {viewingDetailRec.checkInTime || '--:--'} &rarr; {viewingDetailRec.checkOutTime || '--:--'} ({viewingDetailRec.totalHoursWorked || 8} hrs)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Source & Outcome</span>
                <span className="font-medium text-slate-800">
                  {viewingDetailRec.source || 'HRMS'} · Outcome: <strong>{viewingDetailRec.status || 'Present'}</strong>
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Client Supervisor</span>
                <span className="text-slate-800">
                  {viewingDetailRec.clientSupervisorName || 'External Lead'} ({viewingDetailRec.clientSupervisorEmail || 'Email unconfigured'})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Client Verification Status</span>
                <span className="font-semibold text-amber-700">
                  {viewingDetailRec.clientVerificationStatus || 'Pending'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Company Approval</span>
                <span className="font-semibold text-indigo-700">
                  {viewingDetailRec.companyApprovalStatus || 'Pending'} {viewingDetailRec.approvedBy ? `(by ${viewingDetailRec.approvedBy})` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Payroll Eligibility</span>
                <span className="font-semibold text-emerald-700">
                  {viewingDetailRec.payrollEligibilityStatus || 'Not Eligible'}
                </span>
              </div>
            </div>

            {/* Preserved Original Values if Adjusted/Disputed */}
            {(viewingDetailRec.originalCheckIn || viewingDetailRec.originalHours !== undefined) && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-amber-800">Preserved Original Attendance Punches</span>
                <p className="font-mono text-amber-900 text-[11px]">
                  Original Check-In: {viewingDetailRec.originalCheckIn || '--:--'} | Original Check-Out: {viewingDetailRec.originalCheckOut || '--:--'} ({viewingDetailRec.originalHours ?? viewingDetailRec.totalHoursWorked} hrs)
                </p>
                <p className="text-[10px] text-amber-700">Original punches are never overwritten; adjustments are tracked separately.</p>
              </div>
            )}

            {/* Dispute Statement & Clarification */}
            {viewingDetailRec.disputeDetails && (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-rose-800">Dispute Details</span>
                <p className="text-rose-900">{viewingDetailRec.disputeDetails}</p>
                {viewingDetailRec.clientClaimedHours !== undefined && (
                  <p className="font-mono text-[11px] text-rose-800">
                    Client Claimed Hours: {viewingDetailRec.clientClaimedHours}h ({viewingDetailRec.clientClaimedCheckIn || '--:--'} to {viewingDetailRec.clientClaimedCheckOut || '--:--'})
                  </p>
                )}
                {viewingDetailRec.employeeClarification && (
                  <div className="pt-1 mt-1 border-t border-rose-200">
                    <span className="text-[10px] font-bold text-indigo-900">Employee Clarification:</span>
                    <p className="text-indigo-950">{viewingDetailRec.employeeClarification}</p>
                  </div>
                )}
              </div>
            )}

            {/* Audit & Verification History */}
            {viewingDetailRec.approvalHistory && viewingDetailRec.approvalHistory.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-800">Audit & Approval History</span>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {viewingDetailRec.approvalHistory.map((h, i) => (
                    <div key={i} className="p-2 bg-slate-50 rounded border border-slate-200 text-[11px]">
                      <div className="flex justify-between font-medium text-slate-800">
                        <span>{h.stage}</span>
                        <span className="font-mono text-[10px] text-slate-400">{h.timestamp.slice(0, 16)}</span>
                      </div>
                      <p className="text-slate-600">By {h.actorName} ({h.actorRole}) {h.decision ? `· Decision: ${h.decision}` : ''}</p>
                      {h.comments && <p className="text-slate-500 italic mt-0.5">{h.comments}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingDetailRec(null)}
                className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg text-xs"
              >
                Close Details
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Send / Preview Client Verification Email */}
      {sendEmailModalRec && (
        <Modal
          title={`Send Client Verification Email — ${sendEmailModalRec.rec.employeeId} (${sendEmailModalRec.rec.date})`}
          onClose={() => setSendEmailModalRec(null)}
        >
          <div className="space-y-3.5 text-xs">
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
              <strong>Email Integration Status:</strong> {sendEmailModalRec.deliveryNote}
            </div>

            <div className="grid grid-cols-2 gap-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Verification Ref ID</span>
                <span className="font-mono font-bold text-indigo-700">{sendEmailModalRec.referenceId}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Recipient (External Supervisor)</span>
                <span className="font-semibold text-slate-800">{sendEmailModalRec.supervisorName}</span>
                <span className="font-mono text-[10px] text-slate-500 block">{sendEmailModalRec.supervisorEmail}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Subject Line</label>
              <input
                readOnly
                value={sendEmailModalRec.draftSubject}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Email Body (Strictly excludes confidential employee salary, bank details, or internal keys)
              </label>
              <textarea
                readOnly
                rows={10}
                value={sendEmailModalRec.draftBody}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      `To: ${sendEmailModalRec.supervisorEmail}\nSubject: ${sendEmailModalRec.draftSubject}\n\n${sendEmailModalRec.draftBody}`
                    );
                    setSendEmailModalRec({ ...sendEmailModalRec, copied: true });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold"
                >
                  <Copy size={13} />
                  <span>{sendEmailModalRec.copied ? 'Copied Draft!' : 'Copy Draft'}</span>
                </button>
                <a
                  href={`mailto:${encodeURIComponent(sendEmailModalRec.supervisorEmail)}?subject=${encodeURIComponent(
                    sendEmailModalRec.draftSubject
                  )}&body=${encodeURIComponent(sendEmailModalRec.draftBody)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-semibold"
                >
                  <Send size={13} />
                  <span>Open Mail App</span>
                </a>
              </div>
              <button
                type="button"
                onClick={() => setSendEmailModalRec(null)}
                className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Record Client Email Confirmation Response */}
      {recordClientEmailModal && (
        <Modal
          title={`Record Client Email Confirmation — ${recordClientEmailModal.rec.employeeId} (${recordClientEmailModal.rec.date})`}
          onClose={() => setRecordClientEmailModal(null)}
        >
          <form onSubmit={handleSaveClientEmailResponse} className="space-y-3.5 text-xs">
            {recordClientEmailModal.error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                {recordClientEmailModal.error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client Supervisor Decision *</label>
                <select
                  value={recordClientEmailModal.decision}
                  onChange={(e) =>
                    setRecordClientEmailModal({
                      ...recordClientEmailModal,
                      decision: e.target.value as any
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold"
                >
                  <option value="Verified">Verified (Confirmed Hours)</option>
                  <option value="Disputed">Disputed (Working Hours Disputed)</option>
                  <option value="Correction Requested">Correction Requested</option>
                  <option value="Absent">Employee Absent</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client Supervisor Name *</label>
                <input
                  required
                  value={recordClientEmailModal.senderName}
                  onChange={(e) =>
                    setRecordClientEmailModal({ ...recordClientEmailModal, senderName: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supervisor Sender Email *</label>
                <input
                  required
                  type="email"
                  value={recordClientEmailModal.senderEmail}
                  onChange={(e) =>
                    setRecordClientEmailModal({ ...recordClientEmailModal, senderEmail: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Received Date/Time *</label>
                <input
                  required
                  type="datetime-local"
                  value={recordClientEmailModal.emailReceivedAt}
                  onChange={(e) =>
                    setRecordClientEmailModal({ ...recordClientEmailModal, emailReceivedAt: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Subject *</label>
              <input
                required
                value={recordClientEmailModal.emailSubject}
                onChange={(e) =>
                  setRecordClientEmailModal({ ...recordClientEmailModal, emailSubject: e.target.value })
                }
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
              />
            </div>

            {/* If Disputed or Modified Hours */}
            {(recordClientEmailModal.decision === 'Disputed' || recordClientEmailModal.decision === 'Correction Requested') && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-2.5">
                <p className="font-bold text-rose-800">Client-Confirmed Modified Hours or Dispute</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-rose-700 mb-1">Client Check-In</label>
                    <input
                      type="time"
                      value={recordClientEmailModal.claimedCheckIn}
                      onChange={(e) =>
                        setRecordClientEmailModal({ ...recordClientEmailModal, claimedCheckIn: e.target.value })
                      }
                      className="w-full px-2 py-1 bg-white border border-rose-200 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-rose-700 mb-1">Client Check-Out</label>
                    <input
                      type="time"
                      value={recordClientEmailModal.claimedCheckOut}
                      onChange={(e) =>
                        setRecordClientEmailModal({ ...recordClientEmailModal, claimedCheckOut: e.target.value })
                      }
                      className="w-full px-2 py-1 bg-white border border-rose-200 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-rose-700 mb-1">Confirmed Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      value={recordClientEmailModal.claimedHours}
                      onChange={(e) =>
                        setRecordClientEmailModal({ ...recordClientEmailModal, claimedHours: e.target.value })
                      }
                      className="w-full px-2 py-1 bg-white border border-rose-200 rounded font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-rose-700 mb-1">Dispute / Reason Details *</label>
                  <textarea
                    required
                    value={recordClientEmailModal.disputeDetails}
                    onChange={(e) =>
                      setRecordClientEmailModal({ ...recordClientEmailModal, disputeDetails: e.target.value })
                    }
                    placeholder="e.g., Client supervisor reports employee left early at 17:30 or took extended break..."
                    className="w-full p-2 bg-white border border-rose-200 rounded"
                    rows={2}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Summary / Client Comments *</label>
              <textarea
                required
                value={recordClientEmailModal.summary}
                onChange={(e) =>
                  setRecordClientEmailModal({ ...recordClientEmailModal, summary: e.target.value })
                }
                rows={2}
                className="w-full p-2.5 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Message ID / Ref *</label>
                <input
                  required
                  value={recordClientEmailModal.messageReference}
                  onChange={(e) =>
                    setRecordClientEmailModal({ ...recordClientEmailModal, messageReference: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Attachment File Name (Optional)</label>
                <input
                  value={recordClientEmailModal.attachmentFileName}
                  onChange={(e) =>
                    setRecordClientEmailModal({ ...recordClientEmailModal, attachmentFileName: e.target.value })
                  }
                  placeholder="e.g. timesheet_approval.pdf"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRecordClientEmailModal(null)}
                className="px-3 py-1.5 text-slate-700 border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Save Confirmation Evidence
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Client Dispute Resolution Interface */}
      {disputeModalRec && (
        <Modal
          title={`Dispute Resolution — ${disputeModalRec.employeeId} (${disputeModalRec.date})`}
          onClose={() => setDisputeModalRec(null)}
        >
          <div className="space-y-4 text-xs">
            {disputeModalError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {disputeModalError}
              </div>
            )}

            {/* Side-by-side comparison of Reported vs Client Claimed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500">Employee-Reported Hours</span>
                <p className="font-mono font-bold text-slate-900 text-sm">
                  {disputeModalRec.originalCheckIn || disputeModalRec.checkInTime || '--:--'} &rarr;{' '}
                  {disputeModalRec.originalCheckOut || disputeModalRec.checkOutTime || '--:--'} (
                  {disputeModalRec.originalHours ?? disputeModalRec.totalHoursWorked} hrs)
                </p>
                <p className="text-[11px] text-slate-600">
                  Current Active: {disputeModalRec.checkInTime} - {disputeModalRec.checkOutTime} ({disputeModalRec.totalHoursWorked} hrs)
                </p>
              </div>

              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-rose-700">
                  Client Supervisor Claim ({disputeModalRec.clientSupervisorName || 'Client'})
                </span>
                <p className="font-mono font-bold text-rose-900 text-sm">
                  Claimed: {disputeModalRec.clientClaimedCheckIn || '--:--'} &rarr;{' '}
                  {disputeModalRec.clientClaimedCheckOut || '--:--'} ({disputeModalRec.clientClaimedHours ?? '--'} hrs)
                </p>
                <p className="text-[11px] text-rose-800">{disputeModalRec.disputeDetails || 'Disputed via email response.'}</p>
              </div>
            </div>

            {/* Step 1: Employee Clarification & Evidence */}
            <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950">Step 1: Employee Clarification & Evidence</span>
                {disputeModalRec.employeeClarificationAt && (
                  <span className="text-[10px] text-indigo-700">
                    By {disputeModalRec.employeeClarificationBy} on {disputeModalRec.employeeClarificationAt.slice(0, 10)}
                  </span>
                )}
              </div>
              <textarea
                value={clarificationText}
                onChange={(e) => setClarificationText(e.target.value)}
                placeholder="Employee provides clarification (e.g. worked from client conference room / VPN after 17:30)..."
                rows={2}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
              <div className="flex items-center gap-2">
                <input
                  value={clarificationEvidence}
                  onChange={(e) => setClarificationEvidence(e.target.value)}
                  placeholder="Supporting evidence ref (e.g., VPN log, Jira commits, badge swipe)..."
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={handleSubmitClarification}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs"
                >
                  Save Clarification
                </button>
              </div>
            </div>

            {/* Step 2: Internal Authorized Approver Resolution */}
            {(canAdmin || currentUser.role === 'senior_manager' || canApproveRequestFor(disputeModalRec.employeeId)) && (
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-3">
                <span className="font-bold text-slate-900 block">
                  Step 2: Authorized Company Approver Final Decision
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      'Approve Original Attendance',
                      'Approve Corrected Attendance',
                      'Return for Additional Information',
                      'Reject Attendance Correction'
                    ] as DisputeResolutionDecision[]
                  ).map((dec) => (
                    <button
                      key={dec}
                      type="button"
                      onClick={() => setResolutionDecision(dec)}
                      className={`p-2 rounded-lg border text-left font-semibold text-[11px] ${resolutionDecision === dec
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      {dec}
                    </button>
                  ))}
                </div>

                {resolutionDecision === 'Approve Corrected Attendance' && (
                  <div className="grid grid-cols-2 gap-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div>
                      <label className="block text-[10px] font-semibold text-emerald-800 mb-1">Approved Check-In</label>
                      <input
                        type="time"
                        value={resolvedCheckIn}
                        onChange={(e) => setResolvedCheckIn(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-emerald-300 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-emerald-800 mb-1">Approved Check-Out</label>
                      <input
                        type="time"
                        value={resolvedCheckOut}
                        onChange={(e) => setResolvedCheckOut(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-emerald-300 rounded font-mono"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mandatory Resolution Decision Reason *</label>
                  <textarea
                    value={resolutionReason}
                    onChange={(e) => setResolutionReason(e.target.value)}
                    placeholder="Document resolution findings, basis for final hours, and approver rationale..."
                    rows={2}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDisputeModalRec(null)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResolveDispute}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                  >
                    Confirm Dispute Decision
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal: Company Attendance Approval */}
      {companyApprovalModal && (
        <Modal
          title={`Stage 2: Internal Company Attendance Approval (${companyApprovalModal.rec.employeeId} · ${companyApprovalModal.rec.date})`}
          onClose={() => setCompanyApprovalModal(null)}
        >
          <div className="space-y-3.5 text-xs">
            <p className="text-slate-600">
              Client confirmation serves as external supporting evidence only. Only an authorized Orbyx approver can grant final company approval to make attendance eligible for payroll.
            </p>

            {companyApprovalModal.error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                {companyApprovalModal.error}
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Approval Decision</label>
              <select
                value={companyApprovalModal.decision}
                onChange={(e) =>
                  setCompanyApprovalModal({
                    ...companyApprovalModal,
                    decision: e.target.value as any
                  })
                }
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold"
              >
                <option value="Approved">Approved (Eligible for Draft Payroll)</option>
                <option value="Returned for Correction">Returned for Correction</option>
                <option value="Rejected">Rejected (Not Payable)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Approver Remarks / Evidence Reviewed</label>
              <textarea
                value={companyApprovalModal.comments}
                onChange={(e) => setCompanyApprovalModal({ ...companyApprovalModal, comments: e.target.value })}
                rows={2}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCompanyApprovalModal(null)}
                className="px-3 py-1.5 text-slate-700 border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompanyApprovalSubmit}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
              >
                Confirm Company Decision
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Outage / Manual Entry / Correction Modal */}
      <RequestCorrectionModal
        isOpen={isManualEntryModalOpen}
        onClose={() => setIsManualEntryModalOpen(false)}
        defaultEntryType={manualEntryType}
      />
    </div>
  );
};

const Metric: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({
  icon: Icon,
  label,
  value
}) => (
  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
    <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700">
      <Icon size={18} />
    </div>
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-900">{value}</p>
    </div>
  </div>
);

const Empty: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
    <p className="font-semibold text-slate-800 text-sm">{title}</p>
    <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">{body}</p>
  </div>
);

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <button onClick={onClose} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">
          ✕
        </button>
      </div>
      {children}
    </div>
  </div>
);
