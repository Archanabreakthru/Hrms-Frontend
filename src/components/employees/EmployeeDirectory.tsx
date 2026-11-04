import React, { useState, useEffect } from 'react';
import { db, subscribeToDB } from '../../db/storage';
import {
  Employee,
  BasicDirectoryEmployee,
  EmploymentStatus,
  NavigationContext,
  InsurancePolicyRecord,
  InsuranceNominee,
  InsuranceDependent,
  InsurancePolicyCategory,
  InsurancePolicyStatus
} from '../../types/hrms';
import { useAuth } from '../../services/authContext';
import { permissionService } from '../../services/permissionService';
import { DataTable, Column } from '../common/DataTable';
import { ExportButton } from '../common/ExportButton';
import { CsvImportModal } from '../common/CsvImportModal';
import { PhotoCaptureField } from '../common/PhotoCaptureField';
import { Avatar } from '../common/Avatar';
import { calculateProfileCompleteness } from '../../utils/profileUtils';
import { EmployeeProfileModal } from './EmployeeProfileModal';
import { NewEmployeeModal } from './NewEmployeeModal';
import { OrgChart } from './OrgChart';
import { hrmsService } from '../../services/hrmsService';
import { readAssignments } from '../clients/ClientManagement';
import {
  UserPlus,
  LayoutList,
  GitFork,
  Eye,
  ShieldCheck,
  Mail,
  Phone,
  Upload,
  Edit3,
  Power,
  RotateCcw,
  Users,
  Plus,
  FileText,
  HeartPulse,
  Briefcase,
  CreditCard,
  User,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Download,
  Trash2,
  Check,
  FolderOpen
} from 'lucide-react';

interface VaultDoc {
  id: string;
  title: string;
  category: string;
  uploadedAt: string;
  issueDate?: string;
  expiryDate?: string;
  status: 'Verified' | 'Pending' | 'Rejected';
  uploadedBy: string;
  rejectionReason?: string;
  fileName?: string;
  fileSize?: string;
  fileUrl?: string;
}

interface EmployeeDirectoryProps {
  navContext?: NavigationContext;
  onOpenPolicies?: () => void;
}

export const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({
  navContext,
  onOpenPolicies
}) => {
  const { currentUser, canManageOrganization } = useAuth();
  const isRegularEmployee = currentUser.role === 'employee';
  const isManager = currentUser.role === 'senior_manager' || currentUser.role === 'reporting_manager';
  const isHR = currentUser.role === 'hr_admin';

  const [viewMode, setViewMode] = useState<'reportees' | 'directory' | 'hierarchy'>(() => {
    if (navContext?.subTab === 'directory') return 'directory';
    if (navContext?.subTab === 'hierarchy') return 'hierarchy';
    return isRegularEmployee ? 'directory' : 'reportees';
  });
  const [reporteeManagerFilter, setReporteeManagerFilter] = useState<string>(() => {
    if (navContext?.managerId) return navContext.managerId;
    return currentUser.role === 'hr_admin' ? 'ALL_REPORTEES' : currentUser.employeeId;
  });
  const [, setTick] = useState(0);

  useEffect(() => {
    return subscribeToDB(() => setTick((t) => t + 1));
  }, []);

  useEffect(() => {
    if (navContext?.subTab === 'reportees') {
      setViewMode('reportees');
      if (navContext.managerId) setReporteeManagerFilter(navContext.managerId);
    } else if (navContext?.subTab === 'directory') {
      setViewMode('directory');
    } else if (navContext?.subTab === 'hierarchy') {
      setViewMode('hierarchy');
    }
    if (navContext?.statusFilter) {
      setSelectedStatusFilter(navContext.statusFilter);
    }
    if (navContext?.departmentFilter) {
      setSelectedDeptFilter(navContext.departmentFilter);
    }
  }, [navContext]);

  useEffect(() => {
    if (!navContext?.managerId) {
      setReporteeManagerFilter(
        currentUser.role === 'hr_admin' ? 'ALL_REPORTEES' : currentUser.employeeId
      );
    }
    if (!navContext?.subTab) {
      setViewMode(currentUser.role === 'employee' ? 'directory' : 'reportees');
    }
  }, [currentUser.employeeId, currentUser.role, navContext]);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | BasicDirectoryEmployee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editError, setEditError] = useState<string>('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [notice, setNotice] = useState('');

  // Filters
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>(() => navContext?.departmentFilter || 'ALL');
  const [selectedDesigFilter, setSelectedDesigFilter] = useState<string>('ALL');
  const [selectedManagerFilter, setSelectedManagerFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>(() => navContext?.statusFilter || 'ALL');
  const [selectedClientFilter, setSelectedClientFilter] = useState<'ALL' | 'DEPLOYED' | 'INTERNAL'>('ALL');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');
  const [selectedEmpTypeFilter, setSelectedEmpTypeFilter] = useState<string>('ALL');
  const [editModalTab, setEditModalTab] = useState<'personal' | 'employment' | 'org' | 'salary' | 'statutory' | 'insurance' | 'documents'>('personal');

  // Document Vault states for Edit Modal
  const [editingDocs, setEditingDocs] = useState<VaultDoc[]>([]);
  const [docCategoryFilter, setDocCategoryFilter] = useState('All');
  const [docUploadTitle, setDocUploadTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Education Certificate');
  const [docIssueDate, setDocIssueDate] = useState('');
  const [docExpiryDate, setDocExpiryDate] = useState('');
  const [docUploadFile, setDocUploadFile] = useState<{ name: string; size: string; dataUrl: string } | null>(null);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const [docSuccessNotice, setDocSuccessNotice] = useState<string | null>(null);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewDoc, setPreviewDoc] = useState<VaultDoc | null>(null);
  const editDocInputRef = React.useRef<HTMLInputElement | null>(null);

  // Insurance Policies & Nominees states for Edit Modal
  const [employeePolicies, setEmployeePolicies] = useState<InsurancePolicyRecord[]>([]);
  const [showAddPolicyForm, setShowAddPolicyForm] = useState(false);
  const [polCategory, setPolCategory] = useState<InsurancePolicyCategory>('Group Medical Insurance');
  const [polProvider, setPolProvider] = useState('Star Health & Allied Insurance');
  const [polName, setPolName] = useState('Orbyx Corporate Group Health Shield');
  const [polNumber, setPolNumber] = useState('');
  const [polGroupNumber, setPolGroupNumber] = useState('GRP-ORBYX-01');
  const [polStartDate, setPolStartDate] = useState('2026-04-01');
  const [polEndDate, setPolEndDate] = useState('2027-03-31');
  const [polCoverageAmount, setPolCoverageAmount] = useState(500000);
  const [polCoverageType, setPolCoverageType] = useState<'Self Only' | 'Self + Spouse' | 'Self + Family' | 'Parents Coverage'>('Self + Family');
  const [polStatus, setPolStatus] = useState<InsurancePolicyStatus>('Enrolled');
  const [polError, setPolError] = useState<string | null>(null);
  const [polSuccess, setPolSuccess] = useState<string | null>(null);
  const [polNominees, setPolNominees] = useState<InsuranceNominee[]>([
    {
      id: 'NOM-1',
      fullName: '',
      relationship: 'Spouse',
      dateOfBirth: '1995-05-15',
      mobileNumber: '',
      sharePercentage: 100,
      isMinor: false
    }
  ]);
  const [polDependents, setPolDependents] = useState<InsuranceDependent[]>([]);
  const [polDocBlob, setPolDocBlob] = useState<{ name: string; size: string; dataUrl: string } | null>(null);
  const editPolFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Load documents and insurance policies whenever editingEmployee changes
  useEffect(() => {
    if (editingEmployee?.id) {
      const storageKey = `orbyx_extra_docs_${editingEmployee.id}`;
      const defaultDocs: VaultDoc[] = [
        {
          id: `DOC-${editingEmployee.id}-1`,
          title: 'Employment Contract & Signed Offer.pdf',
          category: 'Offer Letter',
          uploadedAt: editingEmployee.dateOfJoining,
          issueDate: editingEmployee.dateOfJoining,
          expiryDate: '',
          status: 'Verified',
          uploadedBy: 'Raseedh (HR Admin)'
        },
        {
          id: `DOC-${editingEmployee.id}-2`,
          title: 'Government Tax ID & PAN Card.pdf',
          category: 'ID Proof',
          uploadedAt: editingEmployee.dateOfJoining,
          issueDate: '2021-04-01',
          expiryDate: '',
          status: 'Verified',
          uploadedBy: `${editingEmployee.firstName} ${editingEmployee.lastName}`
        },
        {
          id: `DOC-${editingEmployee.id}-3`,
          title: 'B.Tech / Postgraduate Degree Certificate.pdf',
          category: 'Education Certificate',
          uploadedAt: editingEmployee.dateOfJoining,
          issueDate: '2019-06-15',
          expiryDate: '',
          status: 'Verified',
          uploadedBy: `${editingEmployee.firstName} ${editingEmployee.lastName}`
        }
      ];

      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          setEditingDocs(JSON.parse(raw) as VaultDoc[]);
        } else {
          setEditingDocs(defaultDocs);
        }
      } catch {
        setEditingDocs(defaultDocs);
      }

      setEmployeePolicies(db.getInsurancePoliciesByEmployeeId(editingEmployee.id));
      setShowAddPolicyForm(false);
      setPolNumber(`POL-${editingEmployee.id}-01`);
    } else {
      setEditingDocs([]);
      setEmployeePolicies([]);
      setShowAddPolicyForm(false);
    }
  }, [editingEmployee?.id]);

  const saveDocsForEditingEmployee = (docsToSave: VaultDoc[]) => {
    if (!editingEmployee?.id) return;
    const storageKey = `orbyx_extra_docs_${editingEmployee.id}`;
    localStorage.setItem(storageKey, JSON.stringify(docsToSave));
    setEditingDocs(docsToSave);
  };

  const handleUploadDocInModal = (e: React.FormEvent) => {
    e.preventDefault();
    setDocUploadError(null);
    if (!editingEmployee) return;

    if (!docUploadTitle.trim() && !docUploadFile) {
      setDocUploadError('Please specify document title and attach a document file.');
      return;
    }

    const finalTitle = docUploadTitle.trim() || docUploadFile?.name || `${docCategory} Document`;
    const newDoc: VaultDoc = {
      id: `DOC-${editingEmployee.id}-${Date.now()}`,
      title: finalTitle.endsWith('.pdf') ? finalTitle : `${finalTitle}.pdf`,
      category: docCategory,
      uploadedAt: new Date().toISOString().split('T')[0],
      issueDate: docIssueDate || new Date().toISOString().split('T')[0],
      expiryDate: docExpiryDate || '',
      status: (isHR ? 'Verified' : 'Pending') as 'Verified' | 'Pending' | 'Rejected',
      uploadedBy: `${currentUser.name} (${currentUser.role})`,
      fileName: docUploadFile?.name || `${finalTitle.replace(/\s+/g, '_')}.pdf`,
      fileSize: docUploadFile?.size || '320 KB',
      fileUrl: docUploadFile?.dataUrl
    };

    const nextDocs = [newDoc, ...editingDocs];
    saveDocsForEditingEmployee(nextDocs);

    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      module: 'EMPLOYEE',
      action: 'CREATE',
      entityId: editingEmployee.id,
      entityName: `${editingEmployee.firstName} ${editingEmployee.lastName}`,
      description: `Uploaded document "${newDoc.title}" (${newDoc.category}) via Edit Employee interface`
    });

    setDocSuccessNotice(`Document "${newDoc.title}" uploaded successfully!`);
    setDocUploadTitle('');
    setDocIssueDate('');
    setDocExpiryDate('');
    setDocUploadFile(null);
    if (editDocInputRef.current) editDocInputRef.current.value = '';
    setTimeout(() => setDocSuccessNotice(null), 3000);
  };

  const handleUpdateDocStatusInModal = (docId: string, nextStatus: 'Verified' | 'Rejected', reasonText?: string) => {
    if (!editingEmployee || !isHR) return;
    const nextDocs = editingDocs.map((d) => (d.id === docId ? { ...d, status: nextStatus, rejectionReason: reasonText } : d));
    saveDocsForEditingEmployee(nextDocs);

    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      module: 'EMPLOYEE',
      action: nextStatus === 'Verified' ? 'APPROVE' : 'REJECT',
      entityId: editingEmployee.id,
      entityName: `${editingEmployee.firstName} ${editingEmployee.lastName}`,
      description: `Document ${docId} marked as ${nextStatus} by ${currentUser.name}${reasonText ? ` [Reason: ${reasonText}]` : ''}`
    });

    setRejectingDocId(null);
    setRejectReason('');
  };

  const handleDeleteDocInModal = (docId: string) => {
    if (!editingEmployee || !isHR) return;
    const nextDocs = editingDocs.filter((d) => d.id !== docId);
    saveDocsForEditingEmployee(nextDocs);
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      module: 'EMPLOYEE',
      action: 'DELETE',
      entityId: editingEmployee.id,
      entityName: `${editingEmployee.firstName} ${editingEmployee.lastName}`,
      description: `Deleted document ${docId} from Document Vault`
    });
  };

  const handleSaveInsurancePolicyInModal = (e: React.FormEvent) => {
    e.preventDefault();
    setPolError(null);
    if (!editingEmployee || !isHR) return;

    if (!polName.trim() || !polProvider.trim() || !polNumber.trim()) {
      setPolError('Policy Name, Insurer Provider, and Policy Number are required.');
      return;
    }

    if (polNominees.length > 0) {
      const totalPct = polNominees.reduce((acc, n) => acc + (Number(n.sharePercentage) || 0), 0);
      if (totalPct !== 100) {
        setPolError(`Nominee share percentages must total exactly 100% (currently ${totalPct}%).`);
        return;
      }
      const hasNegative = polNominees.some((n) => Number(n.sharePercentage) < 0);
      if (hasNegative) {
        setPolError('Negative nominee share percentage is invalid.');
        return;
      }
      const missingMinorGuardian = polNominees.some(
        (n) => n.isMinor && (!n.guardianName || !n.guardianName.trim() || !n.guardianRelationship?.trim())
      );
      if (missingMinorGuardian) {
        setPolError('Guardian Name and Relationship are required for minor nominees.');
        return;
      }
    }

    const newRecord: InsurancePolicyRecord = {
      id: `POL-${editingEmployee.id}-${Date.now()}`,
      employeeId: editingEmployee.id,
      policyType: polCategory,
      provider: polProvider.trim(),
      policyName: polName.trim(),
      policyNumber: polNumber.trim(),
      groupPolicyNumber: polGroupNumber.trim() || undefined,
      startDate: polStartDate,
      endDate: polEndDate,
      coverageAmount: Number(polCoverageAmount) || 0,
      coverageType: polCoverageType,
      status: polStatus,
      dependents: polDependents,
      nominees: polNominees,
      documents: polDocBlob
        ? [
            {
              id: `DOC-POL-${Date.now()}`,
              title: polDocBlob.name,
              fileName: polDocBlob.name,
              fileSize: polDocBlob.size,
              uploadedAt: new Date().toISOString().split('T')[0],
              uploadedBy: currentUser.name,
              fileData: polDocBlob.dataUrl
            }
          ]
        : [],
      updatedAt: new Date().toISOString()
    };

    db.saveInsurancePolicy(newRecord);
    setEmployeePolicies(db.getInsurancePoliciesByEmployeeId(editingEmployee.id));
    setShowAddPolicyForm(false);
    setPolSuccess('Insurance policy and nominee details saved successfully!');
    setPolDocBlob(null);
    setTimeout(() => setPolSuccess(null), 3000);
  };

  const handleDeleteInsurancePolicy = (policyId: string) => {
    if (!editingEmployee || !isHR) return;
    db.deleteInsurancePolicy(policyId);
    setEmployeePolicies(db.getInsurancePoliciesByEmployeeId(editingEmployee.id));
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      module: 'EMPLOYEE',
      action: 'DELETE',
      entityId: editingEmployee.id,
      entityName: `${editingEmployee.firstName} ${editingEmployee.lastName}`,
      description: `Removed insurance policy ${policyId}`
    });
  };

  const departments = db.getDepartments();
  const designations = db.getDesignations();
  const branches = db.getBranches();
  const allEmployees = db.getEmployees();
  const activeClientAssignments = readAssignments().filter((a) => a.status === 'Active');
  const deployedEmpIds = new Set(activeClientAssignments.map((a) => a.employeeId));

  // Retrieve authorized rows (sanitized strictly at service layer)
  const rawRows = permissionService.getAuthorizedDirectoryRows(currentUser);

  // Direct Reportees list for "My Reportees" tab strictly limited to employees reporting to currentUser
  const myDirectReportees = allEmployees.filter(
    (e) => e.reportingManagerId === currentUser.employeeId && e.id !== currentUser.employeeId
  );

  // In My Reportees tab, direct reportees is strictly the logged in user's direct reportees
  const directReportees = myDirectReportees;

  // Apply filters if permitted
  const filteredRows = rawRows.filter((r) => {
    if (isRegularEmployee) return true;
    const emp = r as Employee;
    if ('departmentId' in r && selectedDeptFilter !== 'ALL' && emp.departmentId !== selectedDeptFilter) return false;
    if ('designationId' in r && selectedDesigFilter !== 'ALL' && emp.designationId !== selectedDesigFilter) return false;
    if ('reportingManagerId' in r && selectedManagerFilter !== 'ALL' && emp.reportingManagerId !== selectedManagerFilter) return false;
    if ('status' in r && selectedStatusFilter !== 'ALL' && emp.status !== selectedStatusFilter) return false;
    if ('branchId' in r && selectedBranchFilter !== 'ALL' && emp.branchId !== selectedBranchFilter) return false;
    if ('employmentType' in r && selectedEmpTypeFilter !== 'ALL' && emp.employmentType !== selectedEmpTypeFilter) return false;
    if (selectedClientFilter === 'DEPLOYED' && !deployedEmpIds.has(emp.id)) return false;
    if (selectedClientFilter === 'INTERNAL' && deployedEmpIds.has(emp.id)) return false;
    return true;
  });

  const isDescendantOf = (candidateManagerId: string, empId: string): boolean => {
    const visited = new Set<string>();
    const queue = [empId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === candidateManagerId) return true;
      if (visited.has(curr)) continue;
      visited.add(curr);
      const children = allEmployees.filter((e) => e.reportingManagerId === curr && e.id !== curr);
      children.forEach((c) => queue.push(c.id));
    }
    return false;
  };

  const handleToggleEmployeeActive = (emp: Employee) => {
    if (!isHR) return;
    const nextStatus: EmploymentStatus = emp.status === 'Inactive' ? 'Active' : 'Inactive';
    const updated: Employee = { ...emp, status: nextStatus };
    hrmsService.updateEmployee(updated, currentUser.id, currentUser.name);
    setNotice(`Employee ${emp.firstName} ${emp.lastName} (${emp.id}) status updated to ${nextStatus}.`);
  };

  const handleSaveEditedEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee || !isHR) return;
    if (editingEmployee.reportingManagerId === editingEmployee.id) {
      setEditError('An employee cannot be assigned as their own reporting manager.');
      return;
    }
    if (
      editingEmployee.reportingManagerId &&
      isDescendantOf(editingEmployee.reportingManagerId, editingEmployee.id)
    ) {
      setEditError(
        'Circular reporting detected: Cannot assign a direct or indirect reportee as this employee’s reporting manager.'
      );
      return;
    }
    setEditError('');
    hrmsService.updateEmployee(editingEmployee, currentUser.id, currentUser.name);
    setNotice(`Saved changes to ${editingEmployee.firstName} ${editingEmployee.lastName} (${editingEmployee.id}).`);
    setEditingEmployee(null);
  };

  let columns: Column<any>[] = [];

  if (isRegularEmployee) {
    columns = [
      {
        header: 'Colleague',
        accessorKey: 'firstName',
        sortable: true,
        cell: (emp: BasicDirectoryEmployee) => (
          <div className="flex items-center gap-3">
            <Avatar
              src={emp.avatarUrl}
              firstName={emp.firstName}
              lastName={emp.lastName}
              size="md"
            />
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 truncate">
                {emp.firstName} {emp.lastName}
              </div>
              <span className="text-[11px] text-slate-400">Company Colleague</span>
            </div>
          </div>
        )
      },
      {
        header: 'Official Mobile Number',
        accessorKey: 'officialPhone',
        sortable: true,
        cell: (emp: BasicDirectoryEmployee) => (
          <div className="flex items-center gap-1.5 font-mono text-slate-700 font-medium">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            <span>{emp.officialPhone}</span>
          </div>
        )
      },
      {
        header: 'Official Email Address',
        accessorKey: 'officialEmail',
        sortable: true,
        cell: (emp: BasicDirectoryEmployee) => (
          <div className="flex items-center gap-1.5 text-indigo-700">
            <Mail className="h-3.5 w-3.5 text-indigo-500" />
            <a href={`mailto:${emp.officialEmail}`} className="hover:underline">
              {emp.officialEmail}
            </a>
          </div>
        )
      },
      {
        header: 'Directory Access',
        cell: (emp: BasicDirectoryEmployee) => (
          <button
            onClick={() => setSelectedEmployee(emp)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View Contact</span>
          </button>
        )
      }
    ];
  } else if (isManager) {
    columns = [
      {
        header: 'Employee',
        accessorKey: 'firstName',
        sortable: true,
        cell: (r: any) => {
          const isDirectReport = r.isDirectReport;
          const desig = designations.find((d) => d.id === r.designationId);
          return (
            <div className="flex items-center gap-3">
              <Avatar
                src={r.avatarUrl}
                firstName={r.firstName}
                lastName={r.lastName}
                size="sm"
              />
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate flex items-center gap-2">
                  <span>{r.firstName} {r.lastName}</span>
                  {isDirectReport && (
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                      Direct Report
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {desig ? desig.title : 'Organization Colleague'}
                </div>
              </div>
            </div>
          );
        }
      },
      {
        header: 'Official Mobile',
        accessorKey: 'officialPhone',
        cell: (r: any) => <span className="font-mono text-slate-700">{r.officialPhone}</span>
      },
      {
        header: 'Official Email',
        accessorKey: 'officialEmail',
        cell: (r: any) => (
          <a href={`mailto:${r.officialEmail}`} className="text-indigo-700 hover:underline">
            {r.officialEmail}
          </a>
        )
      },
      {
        header: 'Reporting Scope',
        cell: (r: any) => (
          <span className="text-xs text-slate-600 font-medium">
            {r.isDirectReport ? 'Reporting to You' : 'Organization Colleague'}
          </span>
        )
      },
      {
        header: 'Actions',
        cell: (r: any) => (
          <button
            onClick={() => setSelectedEmployee(r)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              r.isDirectReport
                ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <Eye className="h-3 w-3" />
            <span>{r.isDirectReport ? 'Team Profile' : 'View Contact'}</span>
          </button>
        )
      }
    ];
  } else {
    columns = [
      {
        header: 'Employee',
        accessorKey: 'firstName',
        sortable: true,
        cell: (emp: Employee) => {
          const desig = designations.find((d) => d.id === emp.designationId);
          const isClientDeployed = deployedEmpIds.has(emp.id);
          return (
            <div className="flex items-center gap-3">
              <Avatar
                src={emp.avatarUrl}
                firstName={emp.firstName}
                lastName={emp.lastName}
                size="sm"
              />
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                  <span>{emp.firstName} {emp.lastName}</span>
                  {isClientDeployed && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Client Site
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                  <span>{desig?.title || 'Staff'}</span>
                  <span>·</span>
                  <span className="font-mono text-slate-400">{emp.id}</span>
                </div>
              </div>
            </div>
          );
        }
      },
      {
        header: 'Department & Branch',
        accessorKey: 'departmentId',
        sortable: true,
        cell: (emp: Employee) => {
          const dept = departments.find((d) => d.id === emp.departmentId);
          const br = branches.find((b) => b.id === emp.branchId);
          return (
            <div>
              <span className="font-medium text-slate-800 block">{dept?.name || emp.departmentId}</span>
              <span className="text-[11px] text-slate-400">{br?.city || 'Bengaluru'}</span>
            </div>
          );
        }
      },
      {
        header: 'Status & Completeness',
        accessorKey: 'status',
        sortable: true,
        cell: (emp: Employee) => {
          const comp = calculateProfileCompleteness(emp);
          return (
            <div className="space-y-1">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                  emp.status === 'Active'
                    ? 'text-emerald-700'
                    : emp.status === 'On Leave'
                    ? 'text-amber-700'
                    : 'text-slate-600'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    emp.status === 'Active' ? 'bg-emerald-500' : emp.status === 'On Leave' ? 'bg-amber-500' : 'bg-slate-400'
                  }`}
                />
                <span>{emp.status}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    comp.percentage >= 85
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : comp.percentage >= 50
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {comp.percentage}%
                </span>
                <span className="text-[10px] text-slate-400 truncate">{comp.status}</span>
              </div>
            </div>
          );
        }
      },
      {
        header: 'Official Contact',
        accessorKey: 'email',
        cell: (emp: Employee) => (
          <div className="text-[11px] space-y-0.5">
            <p className="text-slate-700">{emp.officialEmail || emp.email}</p>
            <p className="text-slate-400">{emp.officialPhone || emp.phone}</p>
          </div>
        )
      },
      {
        header: 'Joined',
        accessorKey: 'dateOfJoining',
        sortable: true,
        cell: (emp: Employee) => <span className="font-mono text-slate-600 text-xs">{emp.dateOfJoining}</span>
      },
      {
        header: 'Actions',
        cell: (emp: Employee) => (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedEmployee(emp)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <Eye className="h-3 w-3" />
              <span>View Profile</span>
            </button>
            {isHR && (
              <>
                <button
                  onClick={() => setEditingEmployee({ ...emp })}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleToggleEmployeeActive(emp)}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-colors ${
                    emp.status === 'Inactive'
                      ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                  }`}
                  title={emp.status === 'Inactive' ? 'Activate Employee' : 'Deactivate Employee'}
                >
                  <Power className="h-3 w-3" />
                  <span>{emp.status === 'Inactive' ? 'Activate' : 'Deactivate'}</span>
                </button>
              </>
            )}
          </div>
        )
      }
    ];
  }

  const exportData = permissionService.getAuthorizedDirectoryExport(currentUser);

  const hasActiveFilters =
    selectedDeptFilter !== 'ALL' ||
    selectedDesigFilter !== 'ALL' ||
    selectedManagerFilter !== 'ALL' ||
    selectedStatusFilter !== 'ALL' ||
    selectedClientFilter !== 'ALL' ||
    selectedBranchFilter !== 'ALL' ||
    selectedEmpTypeFilter !== 'ALL';

  return (
    <div className="space-y-4">
      {isRegularEmployee && (
        <div className="p-3.5 bg-indigo-50/80 rounded-xl border border-indigo-100 flex items-center justify-between text-indigo-950">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0" />
            <span className="text-xs font-medium">
              <span className="font-bold">Privacy-Protected Directory:</span> You can view colleagues' names, official mobile numbers, official email addresses, and profile photos. Confidential HR, salary, and personal details are restricted.
            </span>
          </div>
        </div>
      )}

      {notice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="font-bold ml-3">Dismiss</button>
        </div>
      )}

      {/* Reordered Employee Setup Tabs (Req 4): 1. My Reportees -> 2. Employee Directory -> 3. Reporting Hierarchy -> 4. Promotions & Appraisals -> 5. Exit & Clearance */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode('reportees')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'reportees' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-3.5 w-3.5 text-indigo-600" />
            <span>My Reportees ({directReportees.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('directory')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'directory' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            <span>Employee Directory ({filteredRows.length})</span>
          </button>

          {!isRegularEmployee && (
            <button
              type="button"
              onClick={() => setViewMode('hierarchy')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'hierarchy' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitFork className="h-3.5 w-3.5" />
              <span>Reporting Hierarchy</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenPolicies && (
            <button
              type="button"
              onClick={onOpenPolicies}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Employee Policies &rarr;</span>
            </button>
          )}
          <ExportButton data={exportData} fileName="Orbyx_Employee_Directory" />
          {canManageOrganization() && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Import CSV</span>
              </button>
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add Employee</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: MY REPORTEES */}
      {viewMode === 'reportees' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                My Direct Reportees ({directReportees.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Employees reporting directly to {currentUser.name} according to configured reporting relationships.
              </p>
            </div>
          </div>

          {directReportees.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
              <Users className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No Direct Reportees Assigned</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                There are currently no employees assigned directly under this reporting manager. Switch to the{' '}
                <button
                  type="button"
                  onClick={() => setViewMode('directory')}
                  className="text-indigo-600 font-semibold underline"
                >
                  Employee Directory
                </button>{' '}
                to browse the organization roster.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {directReportees.map((rep) => {
                const dept = departments.find((d) => d.id === rep.departmentId);
                const desig = designations.find((d) => d.id === rep.designationId);
                const activeDeploy = activeClientAssignments.find((a) => a.employeeId === rep.id);
                return (
                  <div
                    key={rep.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white shadow-2xs transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar
                        src={rep.avatarUrl}
                        firstName={rep.firstName}
                        lastName={rep.lastName}
                        size="md"
                        className="ring-2 ring-indigo-50"
                      />
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-slate-900 truncate">
                            {rep.firstName} {rep.lastName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">{rep.id}</span>
                        </div>
                        <p className="text-slate-600 font-medium truncate mt-0.5">{desig?.title || 'Staff'}</p>
                        <p className="text-[11px] text-slate-400">{dept?.name}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              rep.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {rep.status}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              activeDeploy
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {activeDeploy ? `Client: ${activeDeploy.project}` : 'Internal Operations'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400 font-mono truncate">{rep.officialEmail || rep.email}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedEmployee(rep)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg shrink-0"
                      >
                        <Eye className="h-3 w-3" />
                        <span>View Profile</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Comprehensive Filter Bar for HR & Managers on Tab 2: Employee Directory */}
      {viewMode === 'directory' && !isRegularEmployee && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2 text-xs">
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={selectedDesigFilter}
            onChange={(e) => setSelectedDesigFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Designations</option>
            {designations.map((d) => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>

          <select
            value={selectedManagerFilter}
            onChange={(e) => setSelectedManagerFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Managers</option>
            {allEmployees.map((m) => (
              <option key={m.id} value={m.id}>
                Mgr: {m.firstName} {m.lastName}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Probation">Probation</option>
            <option value="Separated">Separated</option>
            <option value="Inactive">Inactive</option>
          </select>

          <select
            value={selectedClientFilter}
            onChange={(e) => setSelectedClientFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Assignments</option>
            <option value="DEPLOYED">Deployed to Client</option>
            <option value="INTERNAL">Internal Operations</option>
          </select>

          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
            ))}
          </select>

          <select
            value={selectedEmpTypeFilter}
            onChange={(e) => setSelectedEmpTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Employment Types</option>
            <option value="Permanent">Permanent</option>
            <option value="Contract">Contract</option>
            <option value="Intern">Intern</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSelectedDeptFilter('ALL');
                setSelectedDesigFilter('ALL');
                setSelectedManagerFilter('ALL');
                setSelectedStatusFilter('ALL');
                setSelectedClientFilter('ALL');
                setSelectedBranchFilter('ALL');
                setSelectedEmpTypeFilter('ALL');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-indigo-700 hover:bg-indigo-50 rounded-lg font-semibold"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      )}

      {/* TAB 2: EMPLOYEE DIRECTORY TABLE */}
      {viewMode === 'directory' && (
        <DataTable
          data={filteredRows}
          columns={columns}
          searchPlaceholder={isRegularEmployee ? "Search colleagues by name or official contact..." : "Search employees by name, ID, or email..."}
          searchFilterKey={(emp: any) => `${emp.id || ''} ${emp.firstName} ${emp.lastName} ${emp.officialEmail || emp.email || ''} ${emp.officialPhone || emp.phone || ''}`}
        />
      )}

      {/* TAB 3: REPORTING HIERARCHY */}
      {viewMode === 'hierarchy' && (
        <OrgChart onSelectEmployee={(emp) => setSelectedEmployee(emp)} />
      )}


      {/* Profile Modal with Role-Based Scoped Rendering */}
      <EmployeeProfileModal
        employee={selectedEmployee ? db.getEmployeeById(selectedEmployee.id) || selectedEmployee : null}
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
      />

            {/* Edit Employee Modal - Comprehensive Multi-Section / Tabbed Form */}
      {editingEmployee && isHR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEditedEmployee}
            className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-indigo-600" />
                  <span>Edit Employee Record: {editingEmployee.firstName} {editingEmployee.lastName} ({editingEmployee.id})</span>
                </h4>
                <p className="text-slate-500">Comprehensive HR administration - update personal, employment, org, compensation, statutory, and insurance details.</p>
              </div>
              <button
                type="button"
                onClick={() => { setEditingEmployee(null); setEditError(''); }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {editError}
              </div>
            )}

            {/* Navigation Tabs for Comprehensive Edit */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setEditModalTab('personal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  editModalTab === 'personal' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Personal & Contact</span>
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('employment')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  editModalTab === 'employment' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>Employment</span>
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('org')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  editModalTab === 'org' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <GitFork className="h-3.5 w-3.5" />
                <span>Org & Reporting</span>
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('salary')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  editModalTab === 'salary' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Salary & Bank</span>
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('statutory')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  editModalTab === 'statutory' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Statutory & Tax</span>
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('insurance')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  editModalTab === 'insurance' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <HeartPulse className="h-3.5 w-3.5" />
                <span>Insurance & Nominees</span>
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('documents')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  editModalTab === 'documents' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Documents / Document Vault</span>
              </button>
            </div>

            {/* TAB 1: Personal & Contact */}
            {editModalTab === 'personal' && (
              <div className="space-y-3 pt-1">
                <PhotoCaptureField
                  value={editingEmployee.avatarUrl}
                  onChange={(newUrl) => setEditingEmployee({ ...editingEmployee, avatarUrl: newUrl })}
                  label="Employee Photograph (Live Camera Capture or File Upload)"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">First Name *</label>
                    <input
                      required
                      value={editingEmployee.firstName}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, firstName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Last Name *</label>
                    <input
                      required
                      value={editingEmployee.lastName}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, lastName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Official Work Email *</label>
                    <input
                      type="email"
                      required
                      value={editingEmployee.officialEmail || editingEmployee.email}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          email: e.target.value,
                          officialEmail: e.target.value
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Personal Email</label>
                    <input
                      type="email"
                      value={editingEmployee.personalEmail || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, personalEmail: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Official Mobile *</label>
                    <input
                      required
                      value={editingEmployee.officialPhone || editingEmployee.phone}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          phone: e.target.value,
                          officialPhone: e.target.value
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Personal Mobile</label>
                    <input
                      value={editingEmployee.personalPhone || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, personalPhone: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={editingEmployee.dateOfBirth || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Gender</label>
                    <select
                      value={editingEmployee.gender || 'Male'}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, gender: e.target.value as any })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Blood Group</label>
                    <select
                      value={editingEmployee.bloodGroup || 'O+'}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, bloodGroup: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Marital Status</label>
                    <select
                      value={editingEmployee.maritalStatus || 'Single'}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, maritalStatus: e.target.value as any })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-semibold mb-1">Permanent Address</label>
                    <input
                      value={editingEmployee.permanentAddress || editingEmployee.address || ''}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          permanentAddress: e.target.value,
                          address: e.target.value
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-semibold mb-1">Current Address</label>
                    <input
                      value={editingEmployee.currentAddress || editingEmployee.address || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, currentAddress: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 mt-2">
                  <span className="font-bold text-slate-800 block">Emergency Contact</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Contact Name</label>
                      <input
                        value={editingEmployee.emergencyContact?.name || ''}
                        onChange={(e) =>
                          setEditingEmployee({
                            ...editingEmployee,
                            emergencyContact: {
                              name: e.target.value,
                              relationship: editingEmployee.emergencyContact?.relationship || 'Family',
                              phone: editingEmployee.emergencyContact?.phone || ''
                            }
                          })
                        }
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Relationship</label>
                      <input
                        value={editingEmployee.emergencyContact?.relationship || ''}
                        onChange={(e) =>
                          setEditingEmployee({
                            ...editingEmployee,
                            emergencyContact: {
                              name: editingEmployee.emergencyContact?.name || '',
                              relationship: e.target.value,
                              phone: editingEmployee.emergencyContact?.phone || ''
                            }
                          })
                        }
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Phone Number</label>
                      <input
                        value={editingEmployee.emergencyContact?.phone || ''}
                        onChange={(e) =>
                          setEditingEmployee({
                            ...editingEmployee,
                            emergencyContact: {
                              name: editingEmployee.emergencyContact?.name || '',
                              relationship: editingEmployee.emergencyContact?.relationship || 'Family',
                              phone: e.target.value
                            }
                          })
                        }
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Employment */}
            {editModalTab === 'employment' && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Employment Status</label>
                    <select
                      value={editingEmployee.status}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, status: e.target.value as EmploymentStatus })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="Active">Active</option>
                      <option value="Probation">Probation</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Notice Period">Notice Period</option>
                      <option value="Separated">Separated</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Employment Type</label>
                    <select
                      value={editingEmployee.employmentType}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, employmentType: e.target.value as any })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="Permanent">Permanent</option>
                      <option value="Contract">Contract</option>
                      <option value="Intern">Intern</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Date of Joining</label>
                    <input
                      type="date"
                      value={editingEmployee.dateOfJoining || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, dateOfJoining: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Confirmation Date</label>
                    <input
                      type="date"
                      value={editingEmployee.confirmationDate || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, confirmationDate: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Notice Period (Days)</label>
                    <input
                      type="number"
                      value={editingEmployee.noticePeriodDays || 60}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, noticePeriodDays: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Probation Period (Days)</label>
                    <input
                      type="number"
                      value={editingEmployee.probationPeriodDays || 180}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, probationPeriodDays: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Shift</label>
                    <select
                      value={editingEmployee.shiftId || 'SHIFT-GEN'}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, shiftId: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    >
                      {db.getShifts().map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Employee Category</label>
                    <input
                      value={editingEmployee.employeeCategory || 'Core Staff'}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, employeeCategory: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Org & Reporting */}
            {editModalTab === 'org' && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Department</label>
                    <select
                      value={editingEmployee.departmentId}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, departmentId: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Designation</label>
                    <select
                      value={editingEmployee.designationId}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, designationId: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    >
                      {designations.map((d) => (
                        <option key={d.id} value={d.id}>{d.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Branch / Location</label>
                    <select
                      value={editingEmployee.branchId}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, branchId: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Reporting Manager</label>
                    <select
                      value={editingEmployee.reportingManagerId || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, reportingManagerId: e.target.value || undefined })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="">Company Board (Top Level)</option>
                      {allEmployees
                        .filter((m) => m.id !== editingEmployee.id)
                        .map((m) => {
                          const isSub = isDescendantOf(m.id, editingEmployee.id);
                          return (
                            <option key={m.id} value={m.id} disabled={isSub}>
                              {m.firstName} {m.lastName} ({m.id}) {isSub ? '[Subordinate - Blocked]' : ''}
                            </option>
                          );
                        })}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">Self-reporting and circular manager chains are automatically blocked.</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Salary & Banking */}
            {editModalTab === 'salary' && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Annual CTC / Base Salary (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={editingEmployee.baseSalaryAnnual || 0}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, baseSalaryAnnual: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Salary Structure</label>
                    <select
                      value={editingEmployee.salaryStructureId || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, salaryStructureId: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    >
                      {db.getSalaryStructures().map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Bank Name</label>
                    <input
                      value={editingEmployee.bankDetails?.bankName || ''}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          bankDetails: {
                            bankName: e.target.value,
                            accountNumber: editingEmployee.bankDetails?.accountNumber || '',
                            ifscOrRouting: editingEmployee.bankDetails?.ifscOrRouting || '',
                            accountType: editingEmployee.bankDetails?.accountType || 'Savings'
                          }
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Bank Account Number</label>
                    <input
                      value={editingEmployee.bankDetails?.accountNumber || ''}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          bankDetails: {
                            bankName: editingEmployee.bankDetails?.bankName || '',
                            accountNumber: e.target.value,
                            ifscOrRouting: editingEmployee.bankDetails?.ifscOrRouting || '',
                            accountType: editingEmployee.bankDetails?.accountType || 'Savings'
                          }
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">IFSC Code</label>
                    <input
                      value={editingEmployee.bankDetails?.ifscOrRouting || ''}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          bankDetails: {
                            bankName: editingEmployee.bankDetails?.bankName || '',
                            accountNumber: editingEmployee.bankDetails?.accountNumber || '',
                            ifscOrRouting: e.target.value.toUpperCase(),
                            accountType: editingEmployee.bankDetails?.accountType || 'Savings'
                          }
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Account Type</label>
                    <select
                      value={editingEmployee.bankDetails?.accountType || 'Savings'}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          bankDetails: {
                            bankName: editingEmployee.bankDetails?.bankName || '',
                            accountNumber: editingEmployee.bankDetails?.accountNumber || '',
                            ifscOrRouting: editingEmployee.bankDetails?.ifscOrRouting || '',
                            accountType: e.target.value as any
                          }
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="Savings">Savings</option>
                      <option value="Current">Current</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Statutory & Tax */}
            {editModalTab === 'statutory' && (
              <div className="space-y-3 pt-1">
                <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-indigo-600" />
                      Statutory & Compliance Eligibility
                    </span>
                    <span className="text-[10px] text-indigo-700">Configurable per employee record</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">PAN / Tax ID</label>
                      <input
                        value={editingEmployee.panOrTaxNumber || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, panOrTaxNumber: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                        placeholder="e.g. ABCDE1234F"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">PF UAN</label>
                      <input
                        value={editingEmployee.pfUan || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, pfUan: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                        placeholder="12-digit UAN"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">ESI IP Number</label>
                      <input
                        value={editingEmployee.esiNumber || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, esiNumber: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                        placeholder="ESI Insurance Number"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Statutory Exemption Note</label>
                      <input
                        value={editingEmployee.statutoryExemptionReason || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, statutoryExemptionReason: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                        placeholder="e.g. Director exemption"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        checked={editingEmployee.epfApplicable !== false}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, epfApplicable: e.target.checked })}
                      />
                      <span>EPF Applicable</span>
                    </label>
                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        checked={editingEmployee.epfWageCeilingApplied !== false}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, epfWageCeilingApplied: e.target.checked })}
                      />
                      <span>Cap at ₹15k Ceiling</span>
                    </label>
                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        checked={editingEmployee.ptApplicable !== false}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, ptApplicable: e.target.checked })}
                      />
                      <span>Professional Tax (PT)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: Insurance & Nominees */}
            {editModalTab === 'insurance' && (
              <div className="space-y-4 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <HeartPulse className="h-4 w-4 text-rose-500" />
                      <span>Employee Insurance Policies & Nominees</span>
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Manage group health, accidental, term life insurance policies and statutory nominee declarations for this employee.
                    </p>
                  </div>

                  {!showAddPolicyForm && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddPolicyForm(true);
                        setPolError(null);
                        setPolSuccess(null);
                        setPolNumber(`POL-${editingEmployee.id}-${Date.now().toString().slice(-4)}`);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Insurance Policy</span>
                    </button>
                  )}
                </div>

                {polSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{polSuccess}</span>
                  </div>
                )}

                {/* Inline Add / Edit Policy Form */}
                {showAddPolicyForm && (
                  <div className="p-4 bg-slate-50/80 rounded-xl border border-indigo-200 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                        <HeartPulse className="h-4 w-4 text-indigo-600" />
                        Configure New Insurance Policy & Nominees
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddPolicyForm(false)}
                        className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                      >
                        ✕
                      </button>
                    </div>

                    {polError && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2 text-xs">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{polError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Insurance Category *</label>
                        <select
                          value={polCategory}
                          onChange={(e) => setPolCategory(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="Group Medical Insurance">Group Medical Insurance</option>
                          <option value="Group Life Insurance">Group Life Insurance</option>
                          <option value="Personal Accident Insurance">Personal Accident Insurance</option>
                          <option value="Other Company-Provided Insurance">Other Company Insurance</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Insurer Provider *</label>
                        <input
                          required
                          value={polProvider}
                          onChange={(e) => setPolProvider(e.target.value)}
                          placeholder="e.g. Star Health / ICICI Lombard"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Policy Plan Name *</label>
                        <input
                          required
                          value={polName}
                          onChange={(e) => setPolName(e.target.value)}
                          placeholder="e.g. Corporate Family Floater"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Policy Number *</label>
                        <input
                          required
                          value={polNumber}
                          onChange={(e) => setPolNumber(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Group / Master Policy</label>
                        <input
                          value={polGroupNumber}
                          onChange={(e) => setPolGroupNumber(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Sum Insured (₹) *</label>
                        <input
                          type="number"
                          required
                          min={50000}
                          step={10000}
                          value={polCoverageAmount}
                          onChange={(e) => setPolCoverageAmount(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Coverage Scope</label>
                        <select
                          value={polCoverageType}
                          onChange={(e) => setPolCoverageType(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="Self Only">Self Only</option>
                          <option value="Self + Spouse">Self + Spouse</option>
                          <option value="Self + Family">Self + Family</option>
                          <option value="Parents Coverage">Parents Coverage</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={polStartDate}
                          onChange={(e) => setPolStartDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                        <input
                          type="date"
                          value={polEndDate}
                          onChange={(e) => setPolEndDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Enrollment Status</label>
                        <select
                          value={polStatus}
                          onChange={(e) => setPolStatus(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-medium"
                        >
                          <option value="Enrolled">Enrolled</option>
                          <option value="Pending Information">Pending Information</option>
                          <option value="Expired">Expired</option>
                        </select>
                      </div>
                    </div>

                    {/* Nominees Section */}
                    <div className="pt-2 border-t border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">
                            Policy Nominees & Share Allocation *
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Total nominee shares must equal 100%. If nominee is minor (&lt;18), guardian details are mandatory.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPolNominees([
                              ...polNominees,
                              {
                                id: `NOM-${Date.now()}`,
                                fullName: '',
                                relationship: 'Child',
                                dateOfBirth: '2010-01-01',
                                mobileNumber: '',
                                sharePercentage: 0,
                                isMinor: true
                              }
                            ]);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add Nominee</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {polNominees.map((nom, index) => (
                          <div key={nom.id} className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                              <span>Nominee #{index + 1}</span>
                              <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-amber-900">
                                <input
                                  type="checkbox"
                                  checked={nom.isMinor}
                                  onChange={(e) => {
                                    const next = polNominees.map((n) =>
                                      n.id === nom.id ? { ...n, isMinor: e.target.checked } : n
                                    );
                                    setPolNominees(next);
                                  }}
                                />
                                <span>Nominee is Minor (&lt;18 years old)</span>
                              </label>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                              <input
                                required
                                placeholder="Full Legal Name *"
                                value={nom.fullName}
                                onChange={(e) => {
                                  const next = polNominees.map((n) =>
                                    n.id === nom.id ? { ...n, fullName: e.target.value } : n
                                  );
                                  setPolNominees(next);
                                }}
                                className="px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                              />
                              <input
                                required
                                placeholder="Relationship (e.g. Spouse) *"
                                value={nom.relationship}
                                onChange={(e) => {
                                  const next = polNominees.map((n) =>
                                    n.id === nom.id ? { ...n, relationship: e.target.value } : n
                                  );
                                  setPolNominees(next);
                                }}
                                className="px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                              />
                              <div>
                                <input
                                  type="date"
                                  required
                                  value={nom.dateOfBirth}
                                  onChange={(e) => {
                                    const next = polNominees.map((n) =>
                                      n.id === nom.id ? { ...n, dateOfBirth: e.target.value } : n
                                    );
                                    setPolNominees(next);
                                  }}
                                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  required
                                  min={1}
                                  max={100}
                                  placeholder="Share %"
                                  value={nom.sharePercentage}
                                  onChange={(e) => {
                                    const next = polNominees.map((n) =>
                                      n.id === nom.id ? { ...n, sharePercentage: Number(e.target.value) } : n
                                    );
                                    setPolNominees(next);
                                  }}
                                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-bold font-mono bg-white"
                                />
                                {polNominees.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setPolNominees(polNominees.filter((n) => n.id !== nom.id))}
                                    className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                placeholder="Contact Mobile (Optional)"
                                value={nom.mobileNumber || ''}
                                onChange={(e) => {
                                  const next = polNominees.map((n) =>
                                    n.id === nom.id ? { ...n, mobileNumber: e.target.value } : n
                                  );
                                  setPolNominees(next);
                                }}
                                className="px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                              />
                              <input
                                placeholder="Contact Email (Optional)"
                                value={nom.email || ''}
                                onChange={(e) => {
                                  const next = polNominees.map((n) =>
                                    n.id === nom.id ? { ...n, email: e.target.value } : n
                                  );
                                  setPolNominees(next);
                                }}
                                className="px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                              />
                            </div>

                            {nom.isMinor && (
                              <div className="p-2 bg-amber-50 rounded border border-amber-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-semibold text-amber-900 mb-0.5">
                                    Legal Guardian Full Name *
                                  </label>
                                  <input
                                    required
                                    value={nom.guardianName || ''}
                                    onChange={(e) => {
                                      const next = polNominees.map((n) =>
                                        n.id === nom.id ? { ...n, guardianName: e.target.value } : n
                                      );
                                      setPolNominees(next);
                                    }}
                                    placeholder="e.g. Fathima Raseedh"
                                    className="w-full px-2 py-1 border border-amber-300 rounded text-xs bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-amber-900 mb-0.5">
                                    Guardian Relationship *
                                  </label>
                                  <input
                                    required
                                    value={nom.guardianRelationship || ''}
                                    onChange={(e) => {
                                      const next = polNominees.map((n) =>
                                        n.id === nom.id ? { ...n, guardianRelationship: e.target.value } : n
                                      );
                                      setPolNominees(next);
                                    }}
                                    placeholder="e.g. Mother / Maternal Uncle"
                                    className="w-full px-2 py-1 border border-amber-300 rounded text-xs bg-white"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Attach Policy Copy */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-800 block">Attach Insurance Card or Policy Document</span>
                      <input
                        ref={editPolFileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const sz = f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(2)} MB` : `${Math.round(f.size / 1024)} KB`;
                            setPolDocBlob({ name: f.name, size: sz, dataUrl: reader.result as string });
                          };
                          reader.readAsDataURL(f);
                        }}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => editPolFileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-200 font-semibold text-xs"
                        >
                          <Upload className="h-3.5 w-3.5 text-indigo-600" />
                          <span>{polDocBlob ? 'Replace Attached File' : 'Attach Policy Copy'}</span>
                        </button>
                        {polDocBlob && (
                          <span className="text-emerald-700 font-medium text-xs flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" /> {polDocBlob.name} ({polDocBlob.size})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setShowAddPolicyForm(false)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveInsurancePolicyInModal}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-2xs"
                      >
                        Save Policy & Nominees
                      </button>
                    </div>
                  </div>
                )}

                {/* Existing Policy List */}
                {employeePolicies.length === 0 && !showAddPolicyForm ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
                    <HeartPulse className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No Insurance Policies Enrolled</p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Status: <span className="font-semibold text-amber-700">Not Enrolled / Pending Information</span>.
                      Click &ldquo;Add Insurance Policy&rdquo; above to record group health, accidental or life insurance coverage for {editingEmployee.firstName}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {employeePolicies.map((pol) => (
                      <div key={pol.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{pol.policyName}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  pol.status === 'Enrolled'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : pol.status === 'Pending Information'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {pol.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {pol.policyType} · Insurer: <span className="font-semibold text-slate-800">{pol.provider}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right text-xs">
                              <span className="text-slate-400 block text-[10px]">Sum Insured</span>
                              <span className="font-bold text-indigo-700 text-sm">₹{pol.coverageAmount.toLocaleString('en-IN')}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteInsurancePolicy(pol.id)}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition-colors"
                              title="Delete policy"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2.5 bg-slate-50/70 rounded-lg text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Policy Number</span>
                            <span className="font-mono font-semibold text-slate-800">{pol.policyNumber}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Group / Master</span>
                            <span className="font-mono text-slate-700">{pol.groupPolicyNumber || 'Corporate Group'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Validity</span>
                            <span className="font-medium text-slate-700">{pol.startDate} to {pol.endDate}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Scope</span>
                            <span className="font-semibold text-slate-800">{pol.coverageType}</span>
                          </div>
                        </div>

                        {/* Nominees */}
                        <div className="space-y-1.5">
                          <span className="font-bold text-slate-800 text-xs block">
                            Registered Nominees ({pol.nominees?.length || 0})
                          </span>
                          {(!pol.nominees || pol.nominees.length === 0) ? (
                            <p className="text-xs text-amber-700 italic">No nominees registered for this policy.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {pol.nominees.map((nom) => (
                                <div key={nom.id} className="p-2 rounded-lg border border-slate-200 bg-slate-50/50 text-xs space-y-0.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900">{nom.fullName}</span>
                                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      {nom.sharePercentage}%
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600">
                                    {nom.relationship} · DOB: {nom.dateOfBirth} {nom.isMinor && <span className="text-amber-700 font-semibold">[Minor]</span>}
                                  </p>
                                  {nom.isMinor && nom.guardianName && (
                                    <p className="text-[10px] text-amber-800 bg-amber-50 p-1 rounded border border-amber-200">
                                      Guardian: {nom.guardianName} ({nom.guardianRelationship || 'Guardian'})
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Attached Docs */}
                        {pol.documents && pol.documents.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">Policy Document:</span>
                            {pol.documents.map((doc) => (
                              <div key={doc.id} className="inline-flex items-center gap-1.5 text-xs text-indigo-700 font-medium">
                                <FileText className="h-3.5 w-3.5" />
                                <span>{doc.fileName}</span>
                                {doc.fileData && (
                                  <a href={doc.fileData} download={doc.fileName} className="hover:underline text-[11px] font-bold text-indigo-600">
                                    (Download)
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 7: Documents / Document Vault */}
            {editModalTab === 'documents' && (
              <div className="space-y-4 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <FolderOpen className="h-4 w-4 text-indigo-600" />
                      <span>Employee Document Vault</span>
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Upload, inspect, verify, and manage all verified corporate and personal employee credentials.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={docCategoryFilter}
                      onChange={(e) => setDocCategoryFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                    >
                      <option value="All">All Categories ({editingDocs.length})</option>
                      <option value="Resume">Resume / CV</option>
                      <option value="ID Proof">ID Proof</option>
                      <option value="Education Certificate">Education Certificate</option>
                      <option value="Professional Certificate">Professional Certificate</option>
                      <option value="Offer Letter">Offer Letter</option>
                      <option value="Appointment Letter">Appointment Letter</option>
                      <option value="Statutory & Tax">Statutory & Tax</option>
                      <option value="Performance & Appraisal">Performance & Appraisal</option>
                      <option value="Appraisal & Promotion Letter">Appraisal & Promotion Letter</option>
                    </select>
                  </div>
                </div>

                {docSuccessNotice && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{docSuccessNotice}</span>
                  </div>
                )}

                {/* Upload Form */}
                <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5 text-indigo-600" />
                    Upload New Document to Employee Vault
                  </span>

                  {docUploadError && (
                    <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                      {docUploadError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Document Category *</label>
                      <select
                        value={docCategory}
                        onChange={(e) => setDocCategory(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      >
                        <option value="Resume">Resume / CV</option>
                        <option value="ID Proof">Government ID Proof</option>
                        <option value="Education Certificate">Education Certificate</option>
                        <option value="Professional Certificate">Professional Certificate</option>
                        <option value="Offer Letter">Signed Offer Letter</option>
                        <option value="Appointment Letter">Appointment Letter</option>
                        <option value="Statutory & Tax">Statutory / PAN / UAN Document</option>
                        <option value="Performance & Appraisal">Performance & Appraisal</option>
                        <option value="Appraisal & Promotion Letter">Promotion / Appraisal Letter</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Document Title *</label>
                      <input
                        type="text"
                        placeholder="e.g. B.Tech Degree Certificate"
                        value={docUploadTitle}
                        onChange={(e) => setDocUploadTitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Issue Date</label>
                      <input
                        type="date"
                        value={docIssueDate}
                        onChange={(e) => setDocIssueDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Expiry Date</label>
                      <input
                        type="date"
                        value={docExpiryDate}
                        onChange={(e) => setDocExpiryDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <input
                        ref={editDocInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 10 * 1024 * 1024) {
                            setDocUploadError('File size exceeds 10MB limit.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            const sz = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : `${Math.round(file.size / 1024)} KB`;
                            setDocUploadFile({ name: file.name, size: sz, dataUrl: reader.result as string });
                            if (!docUploadTitle) {
                              setDocUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => editDocInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        <Upload className="h-3.5 w-3.5 text-indigo-600" />
                        <span>{docUploadFile ? 'Choose Different File' : 'Select File (PDF, Image, DOC up to 10MB)'}</span>
                      </button>
                      {docUploadFile && (
                        <span className="text-emerald-700 font-semibold text-xs flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          {docUploadFile.name} ({docUploadFile.size})
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleUploadDocInModal}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Upload to Vault</span>
                    </button>
                  </div>
                </div>

                {/* Document Table / List */}
                <div className="space-y-2">
                  {editingDocs
                    .filter((d) => docCategoryFilter === 'All' || d.category === docCategoryFilter)
                    .map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-xs">{doc.title}</p>
                            <p className="text-[11px] text-slate-500">
                              {doc.category} · Uploaded {doc.uploadedAt} by {doc.uploadedBy}
                              {doc.issueDate ? ` · Issued: ${doc.issueDate}` : ''}
                              {doc.expiryDate ? ` · Expires: ${doc.expiryDate}` : ''}
                            </p>
                            {doc.rejectionReason && (
                              <p className="text-[10px] text-rose-700 font-medium mt-0.5">
                                Reason for Rejection: {doc.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                              doc.status === 'Verified'
                                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                : doc.status === 'Rejected'
                                ? 'text-rose-700 bg-rose-50 border-rose-200'
                                : 'text-amber-700 bg-amber-50 border-amber-200'
                            }`}
                          >
                            {doc.status}
                          </span>

                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            Preview
                          </button>

                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              download={doc.fileName || doc.title}
                              className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1"
                              title="Download document file"
                            >
                              <Download className="h-3 w-3" />
                            </a>
                          )}

                          {doc.status !== 'Verified' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateDocStatusInModal(doc.id, 'Verified')}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                            >
                              Verify
                            </button>
                          )}

                          {doc.status !== 'Rejected' && (
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingDocId(doc.id);
                                setRejectReason('');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                            >
                              Reject
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteDocInModal(doc.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Delete document"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Reject Document Reason Dialog */}
                {rejectingDocId && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                        Reject Document ({rejectingDocId})
                      </span>
                      <button
                        type="button"
                        onClick={() => setRejectingDocId(null)}
                        className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                        Reason for Rejection *
                      </label>
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="e.g. Expired ID, blurred certificate, mismatching name"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-300 rounded-lg"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setRejectingDocId(null)}
                        className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!rejectReason.trim()) {
                            alert('Please enter a rejection reason.');
                            return;
                          }
                          handleUpdateDocStatusInModal(rejectingDocId, 'Rejected', rejectReason.trim());
                        }}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">All updates are instantly synchronized across Organization Directory, Profile, and Org Hierarchy.</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-1.5 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs"
                >
                  Save Employee Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Document Preview Lightbox Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{previewDoc.title}</h4>
                  <p className="text-[11px] text-slate-400">{previewDoc.category} · Status: {previewDoc.status}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50 rounded-lg p-4 flex flex-col items-center justify-center min-h-[280px]">
              {previewDoc.fileUrl && previewDoc.fileUrl.startsWith('data:image') ? (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.title}
                  className="max-h-[60vh] max-w-full object-contain rounded shadow-xs"
                />
              ) : previewDoc.fileUrl && previewDoc.fileUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewDoc.fileUrl}
                  title={previewDoc.title}
                  className="w-full h-[60vh] rounded border border-slate-200"
                />
              ) : (
                <div className="text-center space-y-2 py-8">
                  <FileText className="h-16 w-16 text-indigo-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">{previewDoc.title}</p>
                  <p className="text-xs text-slate-400">
                    {previewDoc.fileName || `${previewDoc.title}.pdf`} {previewDoc.fileSize ? `(${previewDoc.fileSize})` : ''}
                  </p>
                  <p className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full inline-block border border-emerald-200">
                    Document verified and archived in Orbyx Secure Vault
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">Uploaded by {previewDoc.uploadedBy} on {previewDoc.uploadedAt}</span>
              <div className="flex items-center gap-2">
                {previewDoc.fileUrl && (
                  <a
                    href={previewDoc.fileUrl}
                    download={previewDoc.fileName || previewDoc.title}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download File</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Employee Modal */}
      <NewEmployeeModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={(newEmp) => setSelectedEmployee(newEmp)}
      />

      {/* Validated CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Employees (CSV)"
        description="Download the template or upload a CSV file. Duplicate official emails and missing fields are flagged per row."
        templateFileName="Orbyx_Employees"
        headers={['FirstName', 'LastName', 'Email', 'Phone', 'DepartmentId', 'DesignationId', 'BaseSalaryAnnual']}
        sampleRows={[
          ['Rohan', 'Verma', 'rohan.verma@orbyx.internal', '+91 98450 77881', 'DEP-ENG', 'DES-SWE', '1250000'],
          ['Divya', 'Nair', 'divya.nair@orbyx.internal', '+91 98450 77882', 'DEP-OPS', 'DES-PM', '1450000']
        ]}
        validateRow={(cols) => {
          const [firstName, lastName, email, phone, deptId, desigId, salaryStr] = cols;
          if (!firstName || !lastName || !email) {
            return { valid: false, error: 'Missing FirstName, LastName, or Email' };
          }
          if (!email.includes('@')) {
            return { valid: false, error: `Invalid email address "${email}"` };
          }
          const exists = allEmployees.some(
            (e) => (e.officialEmail || e.email).toLowerCase() === email.toLowerCase()
          );
          if (exists) {
            return { valid: false, error: `Duplicate email "${email}" already registered` };
          }
          return {
            valid: true,
            data: {
              firstName,
              lastName,
              email,
              phone: phone || '+91 98450 00000',
              deptId: deptId || 'DEP-ENG',
              desigId: desigId || 'DES-SWE',
              salary: Number(salaryStr) || 1200000
            }
          };
        }}
        onCommit={(validRows) => {
          validRows.forEach((r, idx) => {
            hrmsService.createEmployee(
              {
                userId: `user_${Date.now()}_${idx}`,
                firstName: r.firstName,
                lastName: r.lastName,
                email: r.email,
                officialEmail: r.email,
                phone: r.phone,
                officialPhone: r.phone,
                avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                dateOfBirth: '1996-05-15',
                gender: 'Other',
                address: 'Bengaluru, Karnataka',
                emergencyContact: { name: 'Primary Kin', relationship: 'Family', phone: '+91 98000 00000' },
                departmentId: r.deptId,
                designationId: r.desigId,
                branchId: 'BR-BLR',
                employmentType: 'Permanent',
                status: 'Active',
                dateOfJoining: new Date().toISOString().slice(0, 10),
                noticePeriodDays: 60,
                reportingManagerId: 'EMP-002',
                shiftId: 'SHIFT-GEN',
                bankDetails: { accountNumber: '5010099887766', bankName: 'HDFC Bank', ifscOrRouting: 'HDFC0001234', accountType: 'Savings' },
                panOrTaxNumber: 'ABCDE1234F',
                baseSalaryAnnual: r.salary,
                salaryStructureId: 'STRUCT-MID'
              },
              currentUser.id,
              currentUser.name
            );
          });
          setNotice(`Successfully imported ${validRows.length} employee(s).`);
        }}
      />
    </div>
  );
};
