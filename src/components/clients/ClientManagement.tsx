// Orbyx HRMS - Client Management (Frontend-Only Restructuring)
// 1. HR Experience: Client Registry, Client Supervisors, Employee Deployments, Client Attendance & Approvals
// 2. Employee Experience: Dedicated "My Client Deployment" (read-only, no administrative access)
// 3. Complete Deployment Lifecycle with Extension and Completion Tracking
// 4. In-Memory Session State only (No Database, No Backend, Clean Empty States)

import React, { useState, useMemo } from 'react';
import {
  Building2,
  Users,
  BriefcaseBusiness,
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  Check,
  X,
  Mail,
  Send,
  Eye,
  Edit3,
  CalendarClock,
  ShieldCheck,
  RotateCcw,
  UserCheck,
  Info
} from 'lucide-react';
import { useAuth } from '../../services/authContext';
import {
  ClientRecord,
  AssignmentRecord,
  ClientSupervisorRecord,
  DeploymentExtensionEntry,
  ClientAttendanceVerificationRecord,
  ClientStatus,
  WorkArrangement,
  AssignmentStatus,
  DeploymentStatus,
  ClientAttendanceApprovalStatus
} from './clientModuleTypes';

// Re-export compatibility interfaces and helper functions for read-only consumers
export type { ClientRecord, AssignmentRecord, DeploymentExtensionEntry };

export const CLIENTS_KEY = 'orbyx_hrms_clients_v1';
export const ASSIGNMENTS_KEY = 'orbyx_hrms_client_assignments_v1';

export const readClients = (): ClientRecord[] => {
  try {
    const raw = localStorage.getItem(CLIENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const readAssignments = (): AssignmentRecord[] => {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

interface ClientManagementProps {
  navContext?: any;
  onOpenPolicies?: () => void;
}

export const ClientManagement: React.FC<ClientManagementProps> = () => {
  const { currentUser } = useAuth();

  // Role detection from frontend auth context (read-only)
  const isHR =
    currentUser?.role === 'hr_admin' ||
    currentUser?.role === 'senior_manager';

  // Navigation tab state for HR
  const [activeHRTab, setActiveHRTab] = useState<
    'registry' | 'supervisors' | 'deployments' | 'approvals'
  >('registry');

  // In-Memory Session State (Isolated, no DB or persistent storage)
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [supervisors, setSupervisors] = useState<ClientSupervisorRecord[]>([]);
  const [deployments, setDeployments] = useState<AssignmentRecord[]>([]);
  const [approvals, setApprovals] = useState<ClientAttendanceVerificationRecord[]>([]);

  // Feedback notifications (Session only)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // -------------------------------------------------------------
  // Modals State
  // -------------------------------------------------------------
  // 1. Client Modal
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    designatedSupervisor: '',
    supervisorEmail: '',
    status: 'Active' as ClientStatus
  });

  // 2. Supervisor Modal
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<ClientSupervisorRecord | null>(null);
  const [supervisorForm, setSupervisorForm] = useState({
    clientId: '',
    name: '',
    officialEmail: '',
    phone: '',
    status: 'Active' as 'Active' | 'Inactive',
    notes: ''
  });

  // 3. Deployment Modal
  const [isDeploymentModalOpen, setIsDeploymentModalOpen] = useState(false);
  const [editingDeployment, setEditingDeployment] = useState<AssignmentRecord | null>(null);
  const [deploymentForm, setDeploymentForm] = useState({
    employeeId: '',
    employeeName: '',
    clientId: '',
    project: '',
    clientSupervisorName: '',
    clientSupervisorEmail: '',
    startDate: '',
    plannedEndDate: '',
    workMode: 'Onsite' as 'Onsite' | 'Remote' | 'Hybrid',
    location: '',
    assignedShift: 'General Day Shift (09:30 - 18:30)',
    allowanceMonthly: 0,
    status: 'Active' as AssignmentStatus,
    requiresClientVerification: true,
    remarks: ''
  });

  // 4. Extension Modal
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [extendingDeployment, setExtendingDeployment] = useState<AssignmentRecord | null>(null);
  const [extensionForm, setExtensionForm] = useState({
    revisedEndDate: '',
    extensionReason: '',
    requestedBy: currentUser?.name || 'HR Operations',
    remarks: ''
  });

  // 5. Completion Modal
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completingDeployment, setCompletingDeployment] = useState<AssignmentRecord | null>(null);
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // -------------------------------------------------------------
  // Client Registry Handlers
  // -------------------------------------------------------------
  const handleOpenCreateClient = () => {
    setEditingClient(null);
    setClientForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      designatedSupervisor: '',
      supervisorEmail: '',
      status: 'Active'
    });
    setIsClientModalOpen(true);
  };

  const handleOpenEditClient = (c: ClientRecord) => {
    setEditingClient(c);
    setClientForm({
      name: c.name,
      email: c.email || c.officialEmail || '',
      phone: c.phone || c.contactNumber || '',
      address: c.address,
      designatedSupervisor: c.designatedSupervisor || c.contactName || '',
      supervisorEmail: c.supervisorEmail || '',
      status: c.status
    });
    setIsClientModalOpen(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name.trim()) return;

    if (editingClient) {
      setClients((prev) =>
        prev.map((c) =>
          c.id === editingClient.id
            ? { ...c, ...clientForm, officialEmail: clientForm.email, contactNumber: clientForm.phone }
            : c
        )
      );
      showToast(`Client "${clientForm.name}" updated successfully.`);
    } else {
      const newClient: ClientRecord = {
        id: `CLI-${Date.now().toString().slice(-4)}`,
        ...clientForm,
        officialEmail: clientForm.email,
        contactNumber: clientForm.phone,
        createdAt: new Date().toISOString()
      };
      setClients((prev) => [newClient, ...prev]);
      showToast(`Client organization "${clientForm.name}" registered successfully.`);
    }
    setIsClientModalOpen(false);
  };

  const handleToggleClientStatus = (c: ClientRecord) => {
    const updatedStatus: ClientStatus = c.status === 'Active' ? 'Inactive' : 'Active';
    setClients((prev) =>
      prev.map((item) =>
        item.id === c.id ? { ...item, status: updatedStatus } : item
      )
    );
    showToast(`Client "${c.name}" marked as ${updatedStatus}.`);
  };

  // -------------------------------------------------------------
  // Client Supervisor Handlers
  // -------------------------------------------------------------
  const handleOpenCreateSupervisor = () => {
    setEditingSupervisor(null);
    setSupervisorForm({
      clientId: clients[0]?.id || '',
      name: '',
      officialEmail: '',
      phone: '',
      status: 'Active',
      notes: ''
    });
    setIsSupervisorModalOpen(true);
  };

  const handleOpenEditSupervisor = (s: ClientSupervisorRecord) => {
    setEditingSupervisor(s);
    setSupervisorForm({
      clientId: s.clientId,
      name: s.name,
      officialEmail: s.officialEmail,
      phone: s.phone,
      status: s.status,
      notes: s.notes || ''
    });
    setIsSupervisorModalOpen(true);
  };

  const handleSaveSupervisor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorForm.name.trim()) return;

    const matchedClient = clients.find((c) => c.id === supervisorForm.clientId);
    const clientName = matchedClient ? matchedClient.name : 'Unassigned Client';

    if (editingSupervisor) {
      setSupervisors((prev) =>
        prev.map((s) =>
          s.id === editingSupervisor.id
            ? { ...s, ...supervisorForm, clientName }
            : s
        )
      );
      showToast(`Supervisor "${supervisorForm.name}" updated.`);
    } else {
      const newSup: ClientSupervisorRecord = {
        id: `CSUP-${Date.now().toString().slice(-4)}`,
        ...supervisorForm,
        clientName,
        invitationStatus: 'Invited',
        invitationToken: `INV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        invitedAt: new Date().toISOString()
      };
      setSupervisors((prev) => [newSup, ...prev]);
      showToast(`Supervisor "${supervisorForm.name}" registered. Frontend invitation generated.`);
    }
    setIsSupervisorModalOpen(false);
  };

  const handleResendInvitation = (s: ClientSupervisorRecord) => {
    setSupervisors((prev) =>
      prev.map((item) =>
        item.id === s.id
          ? {
              ...item,
              invitationStatus: 'Invited',
              invitationToken: `INV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
              invitedAt: new Date().toISOString()
            }
          : item
      )
    );
    showToast(`Simulation: Invitation re-sent to ${s.officialEmail} (Frontend demo only).`, 'info');
  };

  const handleToggleSupervisorStatus = (s: ClientSupervisorRecord) => {
    const updatedStatus = s.status === 'Active' ? 'Inactive' : 'Active';
    setSupervisors((prev) =>
      prev.map((item) =>
        item.id === s.id ? { ...item, status: updatedStatus } : item
      )
    );
    showToast(`Supervisor "${s.name}" set to ${updatedStatus}.`);
  };

  // -------------------------------------------------------------
  // Employee Deployment Handlers
  // -------------------------------------------------------------
  const handleOpenCreateDeployment = () => {
    setEditingDeployment(null);
    const firstClient = clients[0];
    setDeploymentForm({
      employeeId: '',
      employeeName: '',
      clientId: firstClient?.id || '',
      project: '',
      clientSupervisorName: firstClient?.designatedSupervisor || '',
      clientSupervisorEmail: firstClient?.supervisorEmail || '',
      startDate: new Date().toISOString().split('T')[0],
      plannedEndDate: '',
      workMode: 'Onsite',
      location: '',
      assignedShift: 'General Day Shift (09:30 - 18:30)',
      allowanceMonthly: 0,
      status: 'Active',
      requiresClientVerification: true,
      remarks: ''
    });
    setIsDeploymentModalOpen(true);
  };

  const handleSaveDeployment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deploymentForm.employeeName.trim() || !deploymentForm.plannedEndDate) return;

    const matchedClient = clients.find((c) => c.id === deploymentForm.clientId);
    const clientName = matchedClient ? matchedClient.name : 'Client Organization';

    if (editingDeployment) {
      setDeployments((prev) =>
        prev.map((d) =>
          d.id === editingDeployment.id
            ? { ...d, ...deploymentForm, clientName }
            : d
        )
      );
      showToast(`Deployment for "${deploymentForm.employeeName}" updated.`);
    } else {
      const newDep: AssignmentRecord = {
        id: `CAS-${Date.now().toString().slice(-4)}`,
        ...deploymentForm,
        clientName,
        extensions: [],
        createdAt: new Date().toISOString()
      };
      setDeployments((prev) => [newDep, ...prev]);
      showToast(`Employee "${deploymentForm.employeeName}" deployed to ${clientName}.`);
    }
    setIsDeploymentModalOpen(false);
  };

  // Lifecycle: Extend Deployment
  const handleOpenExtendDeployment = (d: AssignmentRecord) => {
    setExtendingDeployment(d);
    setExtensionForm({
      revisedEndDate: '',
      extensionReason: '',
      requestedBy: currentUser?.name || 'HR Operations',
      remarks: ''
    });
    setIsExtensionModalOpen(true);
  };

  const handleSaveExtension = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendingDeployment || !extensionForm.revisedEndDate || !extensionForm.extensionReason.trim()) return;

    const newExtension: DeploymentExtensionEntry = {
      id: `EXT-${Date.now().toString().slice(-4)}`,
      deploymentId: extendingDeployment.id,
      previousEndDate: extendingDeployment.revisedEndDate || extendingDeployment.plannedEndDate,
      revisedEndDate: extensionForm.revisedEndDate,
      extensionReason: extensionForm.extensionReason,
      requestedBy: extensionForm.requestedBy,
      approvedBy: currentUser?.name || 'HR Manager',
      timestamp: new Date().toISOString(),
      remarks: extensionForm.remarks
    };

    setDeployments((prev) =>
      prev.map((d) => {
        if (d.id !== extendingDeployment.id) return d;
        return {
          ...d,
          status: 'Extended',
          revisedEndDate: extensionForm.revisedEndDate,
          extensions: [newExtension, ...(d.extensions || [])]
        };
      })
    );

    showToast(`Project deployment extended until ${extensionForm.revisedEndDate}. Extension history preserved.`);
    setIsExtensionModalOpen(false);
  };

  // Lifecycle: Complete Deployment
  const handleOpenCompleteDeployment = (d: AssignmentRecord) => {
    setCompletingDeployment(d);
    setCompletionDate(new Date().toISOString().split('T')[0]);
    setIsCompleteModalOpen(true);
  };

  const handleConfirmCompletion = () => {
    if (!completingDeployment) return;

    setDeployments((prev) =>
      prev.map((d) => {
        if (d.id !== completingDeployment.id) return d;
        return {
          ...d,
          status: 'Completed',
          actualEndDate: completionDate,
          actualCompletionDate: completionDate
        };
      })
    );

    showToast(`Deployment ${completingDeployment.id} completed on ${completionDate}. Employee returns to standard attendance routing.`);
    setIsCompleteModalOpen(false);
  };

  // -------------------------------------------------------------
  // Client Attendance & Approvals Handlers
  // -------------------------------------------------------------
  const handleSimulateClientApproval = (item: ClientAttendanceVerificationRecord, decision: 'Approved' | 'Rejected') => {
    setApprovals((prev) =>
      prev.map((a) => {
        if (a.id !== item.id) return a;
        return {
          ...a,
          status: decision === 'Approved' ? 'Client Approved' : 'Client Rejected',
          clientSupervisorDecision: decision,
          clientVerifiedAt: new Date().toISOString(),
          clientSupervisorNotes: decision === 'Approved' ? 'Attendance verified onsite' : 'Discrepancy noted'
        };
      })
    );
    showToast(`Attendance marked as ${decision === 'Approved' ? 'Client Approved' : 'Client Rejected'}.`);
  };

  const handleFinalHRApproval = (item: ClientAttendanceVerificationRecord, decision: 'Approved' | 'Rejected') => {
    setApprovals((prev) =>
      prev.map((a) => {
        if (a.id !== item.id) return a;
        return {
          ...a,
          status: decision === 'Approved' ? 'HR Approved' : 'HR Rejected',
          hrDecision: decision,
          hrVerifiedAt: new Date().toISOString(),
          hrNotes: `Processed by ${currentUser?.name || 'HR Admin'}`
        };
      })
    );
    showToast(`HR Final Verification: Record ${decision === 'Approved' ? 'HR Approved' : 'HR Rejected'}.`);
  };

  // -------------------------------------------------------------
  // Filtered Lists
  // -------------------------------------------------------------
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.designatedSupervisor && c.designatedSupervisor.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  const filteredSupervisors = useMemo(() => {
    return supervisors.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.officialEmail.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [supervisors, searchQuery, statusFilter]);

  const filteredDeployments = useMemo(() => {
    return deployments.filter((d) => {
      const empName = d.employeeName || d.employeeId;
      const matchSearch =
        empName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.clientName && d.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        d.project.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [deployments, searchQuery, statusFilter]);

  // Employee-specific active deployment (if any)
  const employeeActiveDeployment = useMemo(() => {
    if (isHR) return null;
    return deployments.find(
      (d) =>
        (d.employeeId === currentUser?.employeeId ||
          (d.employeeName && d.employeeName.toLowerCase() === currentUser?.name?.toLowerCase())) &&
        (d.status === 'Active' || d.status === 'Extended')
    );
  }, [deployments, isHR, currentUser]);

  // =============================================================
  // 1. EMPLOYEE VIEW: STRICTLY "MY CLIENT DEPLOYMENT"
  // =============================================================
  if (!isHR) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BriefcaseBusiness className="text-indigo-600" size={26} />
              My Client Deployment
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Personal engagement details for your assigned external client project.
            </p>
          </div>
          <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full border border-slate-200">
            Employee View
          </span>
        </div>

        {employeeActiveDeployment ? (
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/60">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                  {employeeActiveDeployment.workMode || 'Onsite'} Deployment
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  {employeeActiveDeployment.clientName}
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Project: <span className="font-medium text-slate-800">{employeeActiveDeployment.project}</span>
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  employeeActiveDeployment.status === 'Extended'
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}
              >
                {employeeActiveDeployment.status}
              </span>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase font-medium">Designated Client Supervisor</label>
                  <p className="text-base font-semibold text-slate-800 mt-0.5">
                    {employeeActiveDeployment.clientSupervisorName || 'Not Assigned'}
                  </p>
                  <p className="text-xs text-slate-500">{employeeActiveDeployment.clientSupervisorEmail}</p>
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase font-medium">Work Location</label>
                  <p className="text-slate-800 font-medium mt-0.5">
                    {employeeActiveDeployment.location || 'Client Designated Location'}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase font-medium">Assigned Shift</label>
                  <p className="text-slate-800 font-medium mt-0.5">
                    {employeeActiveDeployment.assignedShift || 'General Day Shift'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase font-medium">Deployment Duration</label>
                  <p className="text-slate-800 font-medium mt-0.5">
                    {employeeActiveDeployment.startDate} to {employeeActiveDeployment.revisedEndDate || employeeActiveDeployment.plannedEndDate}
                  </p>
                  {employeeActiveDeployment.revisedEndDate && (
                    <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                      <Clock size={12} /> Extended from original planned end date ({employeeActiveDeployment.plannedEndDate})
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase font-medium">Attendance Verification</label>
                  <div className="flex items-center gap-2 mt-1">
                    <ShieldCheck className="text-indigo-600" size={18} />
                    <span className="text-slate-700 font-medium">
                      {employeeActiveDeployment.requiresClientVerification
                        ? 'Conditional Client Verification Active'
                        : 'Standard Attendance Verification'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Your punches on deployment dates are conditionally routed to the client supervisor for timesheet verification.
                  </p>
                </div>
              </div>
            </div>

            {employeeActiveDeployment.extensions && employeeActiveDeployment.extensions.length > 0 && (
              <div className="border-t border-slate-100 p-6 bg-slate-50/40">
                <h4 className="text-xs font-semibold uppercase text-slate-600 tracking-wider mb-3">
                  Engagement Extension History
                </h4>
                <div className="space-y-2">
                  {employeeActiveDeployment.extensions.map((ext) => (
                    <div key={ext.id} className="text-xs bg-white p-3 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center text-slate-700 font-medium">
                        <span>Extended until {ext.revisedEndDate}</span>
                        <span className="text-slate-400">{new Date(ext.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-600 mt-1">Reason: {ext.extensionReason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
              <BriefcaseBusiness size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Active Client Deployment</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
              You are currently not deployed to any external client engagement. Your attendance and shift schedules follow the standard Orbyx organization process.
            </p>
          </div>
        )}
      </div>
    );
  }

  // =============================================================
  // 2. HR EXPERIENCE: 4 SEPARATE SECTIONS
  // =============================================================
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {toastMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-md transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-indigo-600" size={28} />
            Client Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise Client Registry, Supervisor Delegations, Employee Deployment Lifecycle & Approvals
          </p>
        </div>

        <div>
          {activeHRTab === 'registry' && (
            <button
              onClick={handleOpenCreateClient}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Plus size={18} />
              Register New Client
            </button>
          )}
          {activeHRTab === 'supervisors' && (
            <button
              onClick={handleOpenCreateSupervisor}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Plus size={18} />
              Register Supervisor
            </button>
          )}
          {activeHRTab === 'deployments' && (
            <button
              onClick={handleOpenCreateDeployment}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Plus size={18} />
              Assign Employee to Client
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-xs">
        <button
          onClick={() => setActiveHRTab('registry')}
          className={`py-4 px-5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeHRTab === 'registry'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 size={18} />
          Client Registry
          <span className="ml-1 px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full font-medium">
            {clients.length}
          </span>
        </button>

        <button
          onClick={() => setActiveHRTab('supervisors')}
          className={`py-4 px-5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeHRTab === 'supervisors'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck size={18} />
          Client Supervisors
          <span className="ml-1 px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full font-medium">
            {supervisors.length}
          </span>
        </button>

        <button
          onClick={() => setActiveHRTab('deployments')}
          className={`py-4 px-5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeHRTab === 'deployments'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BriefcaseBusiness size={18} />
          Employee Deployments
          <span className="ml-1 px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full font-medium">
            {deployments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveHRTab('approvals')}
          className={`py-4 px-5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeHRTab === 'approvals'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardCheck size={18} />
          Client Attendance & Approvals
          <span className="ml-1 px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full font-medium">
            {approvals.length}
          </span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter size={18} className="text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg text-sm px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            {activeHRTab === 'deployments' && (
              <>
                <option value="Extended">Extended</option>
                <option value="Completed">Completed</option>
                <option value="Scheduled">Scheduled</option>
              </>
            )}
          </select>
        </div>
      </div>

      {activeHRTab === 'registry' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          {filteredClients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Client ID</th>
                    <th className="p-4">Organization Name</th>
                    <th className="p-4">Official Email</th>
                    <th className="p-4">Contact Number</th>
                    <th className="p-4">Designated Supervisor</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-medium text-indigo-600 text-xs">{client.id}</td>
                      <td className="p-4 font-semibold text-slate-800">{client.name}</td>
                      <td className="p-4">{client.email}</td>
                      <td className="p-4">{client.phone || '—'}</td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800">{client.designatedSupervisor || '—'}</div>
                        <div className="text-xs text-slate-400">{client.supervisorEmail}</div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            client.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {client.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditClient(client)}
                          title="Edit Client"
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded-md"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleClientStatus(client)}
                          className={`px-2 py-1 text-xs rounded-md border font-medium ${
                            client.status === 'Active'
                              ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                              : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {client.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
                <Building2 size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Client Organizations Found</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                The client registry is currently empty. Click "Register New Client" above to create client records for this session.
              </p>
              <button
                onClick={handleOpenCreateClient}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Register First Client
              </button>
            </div>
          )}
        </div>
      )}

      {activeHRTab === 'supervisors' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          {filteredSupervisors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Supervisor ID</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Associated Client</th>
                    <th className="p-4">Official Email</th>
                    <th className="p-4">Account Status</th>
                    <th className="p-4">Invitation Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSupervisors.map((sup) => (
                    <tr key={sup.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-medium text-indigo-600 text-xs">{sup.id}</td>
                      <td className="p-4 font-semibold text-slate-800">{sup.name}</td>
                      <td className="p-4 font-medium text-slate-700">{sup.clientName}</td>
                      <td className="p-4">{sup.officialEmail}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            sup.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {sup.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            sup.invitationStatus === 'Accepted'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {sup.invitationStatus}
                        </span>
                        {sup.invitationToken && (
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            Token: {sup.invitationToken}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleResendInvitation(sup)}
                          title="Resend Invitation (Simulation)"
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded-md"
                        >
                          <Send size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenEditSupervisor(sup)}
                          title="Edit Details"
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded-md"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleSupervisorStatus(sup)}
                          className={`px-2 py-1 text-xs rounded-md border font-medium ${
                            sup.status === 'Active'
                              ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                              : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {sup.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
                <UserCheck size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Client Supervisors Registered</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                Register external client supervisors to enable conditional client-side attendance review.
              </p>
              <button
                onClick={handleOpenCreateSupervisor}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Register Supervisor
              </button>
            </div>
          )}
        </div>
      )}

      {activeHRTab === 'deployments' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          {filteredDeployments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Deployment ID</th>
                    <th className="p-4">Employee</th>
                    <th className="p-4">Client & Project</th>
                    <th className="p-4">Supervisor</th>
                    <th className="p-4">Dates & Duration</th>
                    <th className="p-4">Work Mode</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Lifecycle Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeployments.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-medium text-indigo-600 text-xs">{d.id}</td>
                      <td className="p-4 font-semibold text-slate-800">{d.employeeName || d.employeeId}</td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{d.clientName}</div>
                        <div className="text-xs text-slate-400">{d.project}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-800">{d.clientSupervisorName || '—'}</div>
                        <div className="text-xs text-slate-400">{d.clientSupervisorEmail}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs text-slate-700">
                          {d.startDate} <span className="text-slate-400">to</span>{' '}
                          <span className="font-semibold text-slate-900">{d.revisedEndDate || d.plannedEndDate}</span>
                        </div>
                        {d.revisedEndDate && (
                          <span className="text-[10px] text-purple-600 font-medium">Extended</span>
                        )}
                        {d.actualEndDate && (
                          <div className="text-[11px] text-emerald-600 mt-0.5">
                            Completed: {d.actualEndDate}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded-md font-medium">
                          {d.workMode || 'Onsite'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            d.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : d.status === 'Extended'
                              ? 'bg-purple-100 text-purple-700'
                              : d.status === 'Completed'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        {d.status !== 'Completed' && (
                          <>
                            <button
                              onClick={() => handleOpenExtendDeployment(d)}
                              className="px-2.5 py-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-md hover:bg-purple-100 font-medium"
                            >
                              Extend
                            </button>
                            <button
                              onClick={() => handleOpenCompleteDeployment(d)}
                              className="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 font-medium"
                            >
                              Complete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
                <BriefcaseBusiness size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Employee Deployments</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                Assign internal employees to client organizations to initiate project engagements.
              </p>
              <button
                onClick={handleOpenCreateDeployment}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Create Deployment
              </button>
            </div>
          )}
        </div>
      )}

      {activeHRTab === 'approvals' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          {approvals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Record ID</th>
                    <th className="p-4">Employee</th>
                    <th className="p-4">Client & Supervisor</th>
                    <th className="p-4">Date & Shift</th>
                    <th className="p-4">Hours</th>
                    <th className="p-4">Approval Status</th>
                    <th className="p-4 text-right">Workflow Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {approvals.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-medium text-indigo-600 text-xs">{item.id}</td>
                      <td className="p-4 font-semibold text-slate-800">{item.employeeName}</td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{item.clientName}</div>
                        <div className="text-xs text-slate-400">Sup: {item.supervisorName}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800">{item.attendanceDate}</div>
                        <div className="text-xs text-slate-400">{item.shiftName}</div>
                      </td>
                      <td className="p-4 font-semibold text-slate-800">{item.workingHours} hrs</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.status === 'HR Approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : item.status === 'Client Approved'
                              ? 'bg-blue-100 text-blue-700'
                              : item.status.includes('Rejected')
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {item.status === 'Pending Client Verification' && (
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => handleSimulateClientApproval(item, 'Approved')}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100"
                            >
                              Client Approve
                            </button>
                            <button
                              onClick={() => handleSimulateClientApproval(item, 'Rejected')}
                              className="px-2 py-1 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-md hover:bg-rose-100"
                            >
                              Client Reject
                            </button>
                          </div>
                        )}
                        {item.status === 'Client Approved' && (
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => handleFinalHRApproval(item, 'Approved')}
                              className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-medium"
                            >
                              Final HR Approve
                            </button>
                            <button
                              onClick={() => handleFinalHRApproval(item, 'Rejected')}
                              className="px-2.5 py-1 text-xs bg-rose-600 text-white rounded-md hover:bg-rose-700 font-medium"
                            >
                              HR Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
                <ClipboardCheck size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Client Attendance In Verification Queue</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                Attendance records marked by employees during active client engagements will appear here for conditional supervisor verification and final HR sign-off.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Register/Edit Client */}
      {isClientModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                {editingClient ? 'Edit Client Organization' : 'Register Client Organization'}
              </h3>
              <button onClick={() => setIsClientModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Organization Name *</label>
                <input
                  type="text"
                  required
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  placeholder="e.g. Acme Global Tech"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    placeholder="contact@client.com"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Office Address</label>
                <textarea
                  rows={2}
                  value={clientForm.address}
                  onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                  placeholder="Client office location..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Designated Supervisor</label>
                  <input
                    type="text"
                    value={clientForm.designatedSupervisor}
                    onChange={(e) => setClientForm({ ...clientForm, designatedSupervisor: e.target.value })}
                    placeholder="Supervisor Name"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Supervisor Email</label>
                  <input
                    type="email"
                    value={clientForm.supervisorEmail}
                    onChange={(e) => setClientForm({ ...clientForm, supervisorEmail: e.target.value })}
                    placeholder="supervisor@client.com"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  {editingClient ? 'Save Changes' : 'Register Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Register/Edit Supervisor */}
      {isSupervisorModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                {editingSupervisor ? 'Edit Client Supervisor' : 'Register Client Supervisor'}
              </h3>
              <button onClick={() => setIsSupervisorModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSupervisor} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Associated Client Organization *</label>
                <select
                  required
                  value={supervisorForm.clientId}
                  onChange={(e) => setSupervisorForm({ ...supervisorForm, clientId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Select a client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Supervisor Full Name *</label>
                <input
                  type="text"
                  required
                  value={supervisorForm.name}
                  onChange={(e) => setSupervisorForm({ ...supervisorForm, name: e.target.value })}
                  placeholder="e.g. Vikramaditya Rao"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={supervisorForm.officialEmail}
                    onChange={(e) => setSupervisorForm({ ...supervisorForm, officialEmail: e.target.value })}
                    placeholder="supervisor@client.com"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={supervisorForm.phone}
                    onChange={(e) => setSupervisorForm({ ...supervisorForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={supervisorForm.notes}
                  onChange={(e) => setSupervisorForm({ ...supervisorForm, notes: e.target.value })}
                  placeholder="Authorized scope for attendance verification..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsSupervisorModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  {editingSupervisor ? 'Save Changes' : 'Register & Generate Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Assign Employee */}
      {isDeploymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                {editingDeployment ? 'Edit Deployment' : 'Assign Employee to Client'}
              </h3>
              <button onClick={() => setIsDeploymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDeployment} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Employee Name *</label>
                  <input
                    type="text"
                    required
                    value={deploymentForm.employeeName}
                    onChange={(e) => setDeploymentForm({ ...deploymentForm, employeeName: e.target.value })}
                    placeholder="e.g. Archana"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={deploymentForm.employeeId}
                    onChange={(e) => setDeploymentForm({ ...deploymentForm, employeeId: e.target.value })}
                    placeholder="e.g. EMP-003"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Client Organization *</label>
                  <select
                    required
                    value={deploymentForm.clientId}
                    onChange={(e) => {
                      const selectedC = clients.find((c) => c.id === e.target.value);
                      setDeploymentForm({
                        ...deploymentForm,
                        clientId: e.target.value,
                        clientSupervisorName: selectedC?.designatedSupervisor || '',
                        clientSupervisorEmail: selectedC?.supervisorEmail || ''
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Select client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Project / Engagement *</label>
                  <input
                    type="text"
                    required
                    value={deploymentForm.project}
                    onChange={(e) => setDeploymentForm({ ...deploymentForm, project: e.target.value })}
                    placeholder="e.g. Core Banking Modernization"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Client Supervisor</label>
                  <input
                    type="text"
                    value={deploymentForm.clientSupervisorName}
                    onChange={(e) => setDeploymentForm({ ...deploymentForm, clientSupervisorName: e.target.value })}
                    placeholder="Designated supervisor"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Supervisor Email</label>
                  <input
                    type="email"
                    value={deploymentForm.clientSupervisorEmail}
                    onChange={(e) => setDeploymentForm({ ...deploymentForm, clientSupervisorEmail: e.target.value })}
                    placeholder="supervisor@client.com"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={deploymentForm.startDate}
                    onChange={(e) => setDeploymentForm({ ...deploymentForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Planned End Date *</label>
                  <input
                    type="date"
                    required
                    value={deploymentForm.plannedEndDate}
                    onChange={(e) => setDeploymentForm({ ...deploymentForm, plannedEndDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Work Arrangement</label>
                  <select
                    value={deploymentForm.workMode}
                    onChange={(e) => setDeploymentForm({ ...deploymentForm, workMode: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Onsite">Onsite</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Work Location</label>
                  <input
                    type="text"
                    value={deploymentForm.location}
                    onChange={(e) => setDeploymentForm({ ...deploymentForm, location: e.target.value })}
                    placeholder="e.g. Mumbai BKC Client Site"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="reqVerif"
                  checked={deploymentForm.requiresClientVerification}
                  onChange={(e) => setDeploymentForm({ ...deploymentForm, requiresClientVerification: e.target.checked })}
                  className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="reqVerif" className="text-slate-700 font-medium text-xs">
                  Require Client Supervisor Attendance Verification during active assignment period
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsDeploymentModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  {editingDeployment ? 'Save Assignment' : 'Assign Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Extend Deployment */}
      {isExtensionModalOpen && extendingDeployment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">Extend Engagement Duration</h3>
              <button onClick={() => setIsExtensionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 text-slate-600">
              <p>Employee: <span className="font-semibold text-slate-800">{extendingDeployment.employeeName || extendingDeployment.employeeId}</span></p>
              <p>Client: <span className="font-semibold text-slate-800">{extendingDeployment.clientName}</span></p>
              <p>Current End Date: <span className="font-semibold text-slate-800">{extendingDeployment.revisedEndDate || extendingDeployment.plannedEndDate}</span></p>
            </div>

            <form onSubmit={handleSaveExtension} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-700 font-medium mb-1">New Revised End Date *</label>
                <input
                  type="date"
                  required
                  value={extensionForm.revisedEndDate}
                  onChange={(e) => setExtensionForm({ ...extensionForm, revisedEndDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Extension Reason *</label>
                <textarea
                  rows={2}
                  required
                  value={extensionForm.extensionReason}
                  onChange={(e) => setExtensionForm({ ...extensionForm, extensionReason: e.target.value })}
                  placeholder="e.g. Scope expansion for Phase 2 deliverables requested by client."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsExtensionModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  Confirm Extension
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Complete Deployment */}
      {isCompleteModalOpen && completingDeployment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">Complete Project Engagement</h3>
              <button onClick={() => setIsCompleteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              Mark deployment <span className="font-semibold text-slate-800">{completingDeployment.id}</span> for{' '}
              <span className="font-semibold text-slate-800">{completingDeployment.employeeName || completingDeployment.employeeId}</span> at{' '}
              <span className="font-semibold text-slate-800">{completingDeployment.clientName}</span> as Completed.
            </p>

            <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200">
              New client attendance routing will stop after the effective completion date. Historical records and approval audit logs remain fully preserved.
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Actual Completion Date</label>
                <input
                  type="date"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(false)}
                className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCompletion}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
              >
                Confirm Completion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
