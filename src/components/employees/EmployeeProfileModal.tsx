import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { PhotoCaptureField } from '../common/PhotoCaptureField';
import { Avatar } from '../common/Avatar';
import { calculateProfileCompleteness, calculateServiceYears } from '../../utils/profileUtils';
import { Employee, BasicDirectoryEmployee, ServiceRecord, ServiceRecordType } from '../../types/hrms';
import { db } from '../../db/storage';
import { useAuth } from '../../services/authContext';
import { permissionService } from '../../services/permissionService';
import {
  User,
  Briefcase,
  GitFork,
  FileText,
  Calendar,
  Clock,
  Receipt,
  Laptop,
  CreditCard,
  History,
  ShieldAlert,
  Upload,
  CheckCircle2,
  Mail,
  Phone,
  ShieldCheck,
  Lock,
  Camera,
  Award,
  Milestone,
  Check,
  Plus,
  Edit2,
  X,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';

interface EmployeeProfileModalProps {
  employee: Employee | BasicDirectoryEmployee | null;
  isOpen: boolean;
  onClose: () => void;
}

type ProfileTab =
  | 'personal'
  | 'employment'
  | 'organization'
  | 'service'
  | 'documents'
  | 'leave'
  | 'attendance'
  | 'expenses'
  | 'assets'
  | 'clients'
  | 'lifecycle'
  | 'salary'
  | 'audit';

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  employee,
  isOpen,
  onClose
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [docUploadTitle, setDocUploadTitle] = useState('');
  const [docType, setDocType] = useState<
    | 'Resume'
    | 'ID Proof'
    | 'Education Certificate'
    | 'Professional Certificate'
    | 'Offer Letter'
    | 'Appointment Letter'
    | 'Statutory & Tax'
    | 'Performance & Appraisal'
    | 'Appraisal & Promotion Letter'
  >('Education Certificate');
  const [docIssueDate, setDocIssueDate] = useState('');
  const [docExpiryDate, setDocExpiryDate] = useState('');
  const [docCategoryFilter, setDocCategoryFilter] = useState('All');
  const [previewDoc, setPreviewDoc] = useState<{
    id: string;
    title: string;
    category: string;
    uploadedAt: string;
    issueDate?: string;
    expiryDate?: string;
    status: 'Verified' | 'Pending' | 'Rejected';
    uploadedBy: string;
  } | null>(null);
  const [, setDocRefresh] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showPhotoUpdater, setShowPhotoUpdater] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [srType, setSrType] = useState<ServiceRecordType>('Promotion');
  const [srEffectiveDate, setSrEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [srPrevDesig, setSrPrevDesig] = useState('');
  const [srNewDesig, setSrNewDesig] = useState('');
  const [srPrevDept, setSrPrevDept] = useState('');
  const [srNewDept, setSrNewDept] = useState('');
  const [srPrevManager, setSrPrevManager] = useState('');
  const [srNewManager, setSrNewManager] = useState('');
  const [srPrevSalary, setSrPrevSalary] = useState<number | ''>('');
  const [srRevisedSalary, setSrRevisedSalary] = useState<number | ''>('');
  const [srRemarks, setSrRemarks] = useState('');
  const [srSuccessNotice, setSrSuccessNotice] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [nameSavedNotice, setNameSavedNotice] = useState('');

  // -------------------------------------------------------------------------
  // PRIVILEGE-BASED SECTION EDITING STATES
  // -------------------------------------------------------------------------
  const [editingSection, setEditingSection] = useState<'personal' | 'employment' | 'organization' | 'salary' | null>(null);
  const [sectionSaveError, setSectionSaveError] = useState<string>('');
  const [sectionSaveNotice, setSectionSaveNotice] = useState<string>('');
  const [unsavedWarning, setUnsavedWarning] = useState<string>('');

  // Personal Form Fields
  const [pFirstName, setPFirstName] = useState('');
  const [pLastName, setPLastName] = useState('');
  const [pDob, setPDob] = useState('');
  const [pGender, setPGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [pBloodGroup, setPBloodGroup] = useState('');
  const [pMaritalStatus, setPMaritalStatus] = useState<'Single' | 'Married' | 'Other'>('Single');
  const [pPersonalEmail, setPPersonalEmail] = useState('');
  const [pPersonalPhone, setPPersonalPhone] = useState('');
  const [pPermanentAddress, setPPermanentAddress] = useState('');
  const [pCurrentAddress, setPCurrentAddress] = useState('');
  const [pEmergName, setPEmergName] = useState('');
  const [pEmergRel, setPEmergRel] = useState('');
  const [pEmergPhone, setPEmergPhone] = useState('');

  // Employment Form Fields
  const [eDepartmentId, setEDepartmentId] = useState('');
  const [eDesignationId, setEDesignationId] = useState('');
  const [eBranchId, setEBranchId] = useState('');
  const [eEmploymentType, setEEmploymentType] = useState<any>('Full-time');
  const [eDateOfJoining, setEDateOfJoining] = useState('');
  const [eShiftId, setEShiftId] = useState('');
  const [eStatus, setEStatus] = useState<any>('Active');
  const [eConfirmationDate, setEConfirmationDate] = useState('');
  const [eNoticePeriodDays, setENoticePeriodDays] = useState(60);
  const [eProbationPeriodDays, setEProbationPeriodDays] = useState(180);
  const [eEmployeeCategory, setEEmployeeCategory] = useState('Core Staff');

  // Org & Reporting Form Fields
  const [oReportingManagerId, setOReportingManagerId] = useState('');

  // Salary Form Fields
  const [sBaseSalaryAnnual, setSBaseSalaryAnnual] = useState<number>(0);
  const [sSalaryStructureId, setSSalaryStructureId] = useState('');
  const [sBankName, setSBankName] = useState('');
  const [sAccountHolderName, setSAccountHolderName] = useState('');
  const [sAccountNumber, setSAccountNumber] = useState('');
  const [sIfsc, setSIfsc] = useState('');
  const [sAccountType, setSAccountType] = useState<'Savings' | 'Current'>('Savings');
  const [sPan, setSPan] = useState('');
  const [sUan, setSUan] = useState('');
  const [sEpfApplicable, setSEpfApplicable] = useState(true);
  const [sEpfWageCeiling, setSEpfWageCeiling] = useState(false);
  const [sEsiApplicable, setSEsiApplicable] = useState(false);
  const [sPtApplicable, setSPtApplicable] = useState(true);
  const [sExemptionReason, setSExemptionReason] = useState('');

  // Reject doc modal / reason state
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  React.useEffect(() => {
    if (isOpen && employee?.id) {
      permissionService.logProfileAccessAudit(employee.id, currentUser);
      setEditingSection(null);
      setSectionSaveError('');
      setSectionSaveNotice('');
      setUnsavedWarning('');
    }
  }, [isOpen, employee?.id, currentUser.id]);

  if (!employee) return null;

  // Retrieve authorized profile through permissionService (backend-style security enforcement)
  const authorizedProfile = permissionService.getAuthorizedProfile(employee.id, currentUser);
  if (!authorizedProfile) return null;

  // -------------------------------------------------------------------------
  // CASE 1: REGULAR EMPLOYEE VIEWING A COLLEAGUE (OR UNRELATED OUT-OF-SCOPE)
  // Strictly display ONLY: Photo, Name, Official Mobile Number, Official Email.
  // -------------------------------------------------------------------------
  if (authorizedProfile.viewScope === 'colleague_basic') {
    const basic = authorizedProfile as BasicDirectoryEmployee;
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Employee Directory"
        description="Public corporate contact card"
        maxWidth="md"
      >
        <div className="space-y-5 text-xs">
          {/* Privacy Banner */}
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center gap-2 text-indigo-900">
            <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
            <p className="text-[11px] leading-relaxed">
              <span className="font-semibold">Privacy-Protected Directory Profile:</span> Only permitted official communication channels are accessible to colleagues.
            </p>
          </div>

          {/* Profile Card */}
          <div className="flex flex-col items-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <Avatar
              src={basic.avatarUrl}
              firstName={basic.firstName}
              lastName={basic.lastName}
              size="xl"
              className="ring-4 ring-white shadow-sm"
            />
            <h3 className="mt-3 text-lg font-bold text-slate-900">
              {basic.firstName} {basic.lastName}
            </h3>
            <span className="mt-1 text-[11px] font-mono text-slate-400">
              {basic.id}
            </span>

            {/* Official Contact Details */}
            <div className="mt-6 w-full space-y-2.5 text-left border-t border-slate-200/80 pt-4">
              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200/80">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Official Work Email
                  </span>
                  <a
                    href={`mailto:${basic.officialEmail}`}
                    className="font-medium text-indigo-700 hover:underline truncate block text-xs"
                  >
                    {basic.officialEmail}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200/80">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Official Mobile Number
                  </span>
                  <a
                    href={`tel:${basic.officialPhone}`}
                    className="font-medium text-slate-900 font-mono text-xs"
                  >
                    {basic.officialPhone}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // -------------------------------------------------------------------------
  // CASE 2: AUTHORIZED PROFILE (SELF, DIRECT REPORTING MANAGER, OR HR ADMIN)
  // -------------------------------------------------------------------------
  const full = authorizedProfile as Employee & { viewScope: string; canViewSalary: boolean };

  const departments = db.getDepartments();
  const designations = db.getDesignations();
  const branches = db.getBranches();
  const shifts = db.getShifts();
  const allEmployees = db.getEmployees();

  const dept = departments.find((d) => d.id === full.departmentId);
  const desig = designations.find((d) => d.id === full.designationId);
  const branch = branches.find((b) => b.id === full.branchId);
  const shift = shifts.find((s) => s.id === full.shiftId);
  const manager = allEmployees.find((e) => e.id === full.reportingManagerId);

  // Cross-module data
  const leaves = db.getLeaveApplications().filter((a) => a.employeeId === full.id);
  const attendance = db.getAttendanceRecords().filter((r) => r.employeeId === full.id);
  const expenses = db.getExpenseClaims().filter((c) => c.employeeId === full.id);
  const assets = db.getAssets().filter((a) => a.currentEmployeeId === full.id);
  const salaryStructure = db.getSalaryStructures().find((s) => s.id === full.salaryStructureId);
  const auditLogs = db.getAuditLogs().filter((l) => l.entityId === full.id || l.description.includes(full.id));

  // Determine permitted tabs based on relationship
  const isManager = full.viewScope === 'direct_report';
  const isSelf = full.viewScope === 'self';
  const isHR = full.viewScope === 'organization_admin';

  const tabs: { id: ProfileTab; label: string; icon: React.ElementType }[] = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'organization', label: 'Org & Reporting', icon: GitFork },
    { id: 'service', label: 'Service Records', icon: Award },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'leave', label: 'Leave History', icon: Calendar },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'assets', label: 'Assets', icon: Laptop },
    { id: 'clients', label: 'Client Assignments', icon: Briefcase },
    { id: 'lifecycle', label: 'Onboarding Lifecycle', icon: CheckCircle2 }
  ];

  if (isSelf || isHR) {
    tabs.push({ id: 'salary', label: 'Salary Structure', icon: CreditCard });
  }

  if (isHR) {
    tabs.push({ id: 'audit', label: 'Audit Trail', icon: History });
  }

  type VaultDoc = {
    id: string;
    title: string;
    category: string;
    uploadedAt: string;
    issueDate: string;
    expiryDate: string;
    status: 'Verified' | 'Pending' | 'Rejected';
    uploadedBy: string;
  };

  const docStorageKey = `orbyx_extra_docs_${full.id}`;
  const defaultDocs: VaultDoc[] = [
    {
      id: `DOC-${full.id}-1`,
      title: 'Employment Contract & Signed Offer.pdf',
      category: 'Offer Letter',
      uploadedAt: full.dateOfJoining,
      issueDate: full.dateOfJoining,
      expiryDate: '',
      status: 'Verified',
      uploadedBy: 'Raseedh (HR Admin)'
    },
    {
      id: `DOC-${full.id}-2`,
      title: 'Government Tax ID & PAN Card.pdf',
      category: 'ID Proof',
      uploadedAt: full.dateOfJoining,
      issueDate: '2021-04-01',
      expiryDate: '',
      status: 'Verified',
      uploadedBy: `${full.firstName} ${full.lastName}`
    },
    {
      id: `DOC-${full.id}-3`,
      title: 'B.Tech / Postgraduate Degree Certificate.pdf',
      category: 'Education Certificate',
      uploadedAt: full.dateOfJoining,
      issueDate: '2019-06-15',
      expiryDate: '',
      status: 'Verified',
      uploadedBy: `${full.firstName} ${full.lastName}`
    }
  ];

  const getEmployeeDocs = (): VaultDoc[] => {
    try {
      const raw = localStorage.getItem(docStorageKey);
      if (raw) return JSON.parse(raw) as VaultDoc[];
    } catch {
      // ignore
    }
    return defaultDocs;
  };

  const saveEmployeeDocs = (nextDocs: VaultDoc[]) => {
    localStorage.setItem(docStorageKey, JSON.stringify(nextDocs));
    setDocRefresh((n) => n + 1);
  };

  const employeeDocs = getEmployeeDocs();
  const filteredDocs = employeeDocs.filter((d) => docCategoryFilter === 'All' || d.category === docCategoryFilter);

  const handleMockDocUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUploadTitle.trim()) return;
    const newDoc = {
      id: `DOC-${full.id}-${Date.now()}`,
      title: docUploadTitle.trim().endsWith('.pdf') ? docUploadTitle.trim() : `${docUploadTitle.trim()}.pdf`,
      category: docType,
      uploadedAt: new Date().toISOString().split('T')[0],
      issueDate: docIssueDate || new Date().toISOString().split('T')[0],
      expiryDate: docExpiryDate || '',
      status: (isHR ? 'Verified' : 'Pending') as 'Verified' | 'Pending' | 'Rejected',
      uploadedBy: `${currentUser.name} (${currentUser.role})`
    };
    saveEmployeeDocs([newDoc, ...employeeDocs]);
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      module: 'EMPLOYEE',
      action: 'CREATE',
      entityId: full.id,
      entityName: `${full.firstName} ${full.lastName}`,
      description: `Uploaded document "${newDoc.title}" (${newDoc.category}) for ${full.firstName} ${full.lastName}`
    });
    setUploadSuccess(true);
    setDocUploadTitle('');
    setDocIssueDate('');
    setDocExpiryDate('');
    setTimeout(() => {
      setUploadSuccess(false);
    }, 2500);
  };

  const handleUpdateDocStatus = (docId: string, nextStatus: 'Verified' | 'Rejected', reasonText?: string) => {
    if (!permissionService.canVerifyDocuments(currentUser)) {
      setSectionSaveError('Permission Denied: Only HR Administrators can verify or reject documents.');
      return;
    }
    const next = employeeDocs.map((d) => (d.id === docId ? { ...d, status: nextStatus, rejectionReason: reasonText } : d));
    saveEmployeeDocs(next);
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      module: 'EMPLOYEE',
      action: nextStatus === 'Verified' ? 'APPROVE' : 'REJECT',
      entityId: full.id,
      entityName: `${full.firstName} ${full.lastName}`,
      description: `Document ${docId} marked as ${nextStatus} by ${currentUser.name}${reasonText ? ` [Reason: ${reasonText}]` : ''}`
    });
    setRejectingDocId(null);
    setRejectReason('');
  };

  // Section Editing Authorization checks
  const canEditPersonalSection = permissionService.canEditPersonal(full.id, currentUser);
  const canEditEmploymentSection = permissionService.canEditEmployment(full.id, currentUser);
  const canEditReportingSection = permissionService.canEditReporting(full.id, currentUser);
  const canEditSalarySection = permissionService.canEditSalary(full.id, currentUser);
  const canManageDocs = permissionService.canManageDocuments(full.id, currentUser);
  const canVerifyDocs = permissionService.canVerifyDocuments(currentUser);
  const canManageService = permissionService.canManageServiceRecords(full.id, currentUser);
  const canApproveService = permissionService.canApproveServiceRecords(currentUser);

  // Initializers for Edit mode
  const startEditingPersonal = () => {
    setPFirstName(full.firstName);
    setPLastName(full.lastName);
    setPDob(full.dateOfBirth || '');
    setPGender(full.gender || 'Male');
    setPBloodGroup(full.bloodGroup || '');
    setPMaritalStatus(full.maritalStatus || 'Single');
    setPPersonalEmail(full.personalEmail || '');
    setPPersonalPhone(full.personalPhone || '');
    setPPermanentAddress(full.permanentAddress || full.address || '');
    setPCurrentAddress(full.currentAddress || full.address || '');
    setPEmergName(full.emergencyContact?.name || '');
    setPEmergRel(full.emergencyContact?.relationship || '');
    setPEmergPhone(full.emergencyContact?.phone || '');
    setEditingSection('personal');
    setSectionSaveError('');
    setSectionSaveNotice('');
  };

  const startEditingEmployment = () => {
    setEDepartmentId(full.departmentId);
    setEDesignationId(full.designationId);
    setEBranchId(full.branchId);
    setEEmploymentType(full.employmentType);
    setEDateOfJoining(full.dateOfJoining);
    setEShiftId(full.shiftId);
    setEStatus(full.status);
    setEConfirmationDate(full.confirmationDate || '');
    setENoticePeriodDays(full.noticePeriodDays || 60);
    setEProbationPeriodDays(full.probationPeriodDays || 180);
    setEEmployeeCategory(full.employeeCategory || 'Core Staff');
    setEditingSection('employment');
    setSectionSaveError('');
    setSectionSaveNotice('');
  };

  const startEditingReporting = () => {
    setOReportingManagerId(full.reportingManagerId || '');
    setEditingSection('organization');
    setSectionSaveError('');
    setSectionSaveNotice('');
  };

  const startEditingSalary = () => {
    setSBaseSalaryAnnual(full.baseSalaryAnnual || 0);
    setSSalaryStructureId(full.salaryStructureId || '');
    setSBankName(full.bankDetails?.bankName || '');
    setSAccountHolderName(`${full.firstName} ${full.lastName}`);
    setSAccountNumber(full.bankDetails?.accountNumber || '');
    setSIfsc(full.bankDetails?.ifscOrRouting || '');
    setSAccountType(full.bankDetails?.accountType || 'Savings');
    setSPan(full.panOrTaxNumber || '');
    setSUan(full.pfUan || '');
    setSEpfApplicable(full.epfApplicable !== false);
    setSEpfWageCeiling(Boolean(full.epfWageCeilingApplied));
    setSEsiApplicable(Boolean(full.esiApplicable));
    setSPtApplicable(full.ptApplicable !== false);
    setSExemptionReason(full.statutoryExemptionReason || '');
    setEditingSection('salary');
    setSectionSaveError('');
    setSectionSaveNotice('');
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setSectionSaveError('');
    setUnsavedWarning('');
  };

  const handleTabSwitch = (newTab: ProfileTab) => {
    if (editingSection) {
      setUnsavedWarning(`You have unsaved changes in the ${editingSection.toUpperCase()} section. Save or Cancel before switching tabs.`);
      return;
    }
    setUnsavedWarning('');
    setActiveTab(newTab);
  };

  const savePersonalSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pFirstName.trim() || !pLastName.trim()) {
      setSectionSaveError('First Name and Last Name are required.');
      return;
    }
    const result = permissionService.updateEmployeeSection(
      full.id,
      'personal',
      {
        firstName: pFirstName.trim(),
        lastName: pLastName.trim(),
        dateOfBirth: pDob,
        gender: pGender,
        bloodGroup: pBloodGroup,
        maritalStatus: pMaritalStatus,
        personalEmail: pPersonalEmail.trim(),
        personalPhone: pPersonalPhone.trim(),
        permanentAddress: pPermanentAddress.trim(),
        currentAddress: pCurrentAddress.trim(),
        address: pCurrentAddress.trim() || pPermanentAddress.trim(),
        emergencyContact: {
          name: pEmergName.trim(),
          relationship: pEmergRel.trim(),
          phone: pEmergPhone.trim()
        }
      },
      currentUser
    );

    if (!result.success) {
      setSectionSaveError(result.error || 'Failed to update personal details.');
    } else {
      setEditingSection(null);
      setSectionSaveError('');
      setSectionSaveNotice('Personal details updated successfully!');
      setDocRefresh((n) => n + 1);
      setTimeout(() => setSectionSaveNotice(''), 3500);
    }
  };

  const saveEmploymentSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eDepartmentId || !eDesignationId || !eBranchId) {
      setSectionSaveError('Department, Designation, and Branch Location are required.');
      return;
    }
    const result = permissionService.updateEmployeeSection(
      full.id,
      'employment',
      {
        departmentId: eDepartmentId,
        designationId: eDesignationId,
        branchId: eBranchId,
        employmentType: eEmploymentType,
        dateOfJoining: eDateOfJoining,
        shiftId: eShiftId,
        status: eStatus,
        confirmationDate: eConfirmationDate,
        noticePeriodDays: Number(eNoticePeriodDays),
        probationPeriodDays: Number(eProbationPeriodDays),
        employeeCategory: eEmployeeCategory
      },
      currentUser
    );

    if (!result.success) {
      setSectionSaveError(result.error || 'Failed to update employment details.');
    } else {
      setEditingSection(null);
      setSectionSaveError('');
      setSectionSaveNotice('Employment lifecycle details updated successfully!');
      setDocRefresh((n) => n + 1);
      setTimeout(() => setSectionSaveNotice(''), 3500);
    }
  };

  const saveReportingSection = (e: React.FormEvent) => {
    e.preventDefault();
    const result = permissionService.updateEmployeeSection(
      full.id,
      'reporting',
      {
        reportingManagerId: oReportingManagerId || undefined
      },
      currentUser
    );

    if (!result.success) {
      setSectionSaveError(result.error || 'Failed to update reporting hierarchy.');
    } else {
      setEditingSection(null);
      setSectionSaveError('');
      setSectionSaveNotice('Reporting relationship updated successfully!');
      setDocRefresh((n) => n + 1);
      setTimeout(() => setSectionSaveNotice(''), 3500);
    }
  };

  const saveSalarySection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sBaseSalaryAnnual || Number(sBaseSalaryAnnual) <= 0) {
      setSectionSaveError('Please enter a valid Annual CTC.');
      return;
    }
    if (!sAccountNumber.trim() || !sIfsc.trim() || !sPan.trim()) {
      setSectionSaveError('Bank Account Number, IFSC Code, and PAN Number are mandatory.');
      return;
    }
    const result = permissionService.updateEmployeeSection(
      full.id,
      'salary',
      {
        baseSalaryAnnual: Number(sBaseSalaryAnnual),
        salaryStructureId: sSalaryStructureId,
        panOrTaxNumber: sPan.trim().toUpperCase(),
        pfUan: sUan.trim(),
        epfApplicable: sEpfApplicable,
        epfWageCeilingApplied: sEpfWageCeiling,
        esiApplicable: sEsiApplicable,
        ptApplicable: sPtApplicable,
        statutoryExemptionReason: sExemptionReason,
        bankDetails: {
          bankName: sBankName.trim(),
          accountNumber: sAccountNumber.trim(),
          ifscOrRouting: sIfsc.trim().toUpperCase(),
          accountType: sAccountType
        }
      },
      currentUser
    );

    if (!result.success) {
      setSectionSaveError(result.error || 'Failed to update salary and banking details.');
    } else {
      setEditingSection(null);
      setSectionSaveError('');
      setSectionSaveNotice('Salary structure and banking records updated securely!');
      setDocRefresh((n) => n + 1);
      setTimeout(() => setSectionSaveNotice(''), 3500);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${full.firstName} ${full.lastName}`}
      description={`${desig?.title || 'Staff'} · ${dept?.name || 'Department'} · ID: ${full.id} (${
        isSelf ? 'My Self-Service Profile' : isManager ? 'Direct Report Profile' : 'HR Admin View'
      })`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Header Summary */}
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-4">
            <Avatar
              src={full.avatarUrl}
              firstName={full.firstName}
              lastName={full.lastName}
              size="lg"
              className="ring-2 ring-white shadow-2xs"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-bold text-slate-900">{full.firstName} {full.lastName}</h4>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                  full.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700'
                }`}>
                  {full.status}
                </span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                  calculateProfileCompleteness(full).percentage >= 85
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : calculateProfileCompleteness(full).percentage >= 50
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {calculateProfileCompleteness(full).percentage}% Completeness
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200/60 text-slate-700 rounded">
                  Scope: {full.viewScope}
                </span>
                {(isHR || isSelf) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!showPhotoUpdater) {
                        setEditFirstName(full.firstName);
                        setEditLastName(full.lastName);
                        setNameSavedNotice('');
                      }
                      setShowPhotoUpdater(!showPhotoUpdater);
                    }}
                    className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                  >
                    <Camera className="h-3 w-3" />
                    <span>{showPhotoUpdater ? 'Hide Profile & Photo Editor' : 'Edit Name / Capture Photo'}</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Official Email: <span className="font-semibold text-slate-800">{full.officialEmail || full.email}</span> · Official Mobile: <span className="font-semibold text-slate-800">{full.officialPhone || full.phone}</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Branch: <span className="font-medium text-slate-700">{branch?.name}</span> · Reporting Manager:{' '}
                <span className="font-medium text-slate-700">
                  {manager ? `${manager.firstName} ${manager.lastName}` : 'Company Board'}
                </span>
              </p>
            </div>
          </div>

          {showPhotoUpdater && (isHR || isSelf) && (
            <div className="pt-3 border-t border-slate-200 space-y-3">
              {/* Name Synchronization Form */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">Employee Full Name (Global Sync)</span>
                  {nameSavedNotice && (
                    <span className="text-[11px] font-semibold text-emerald-700">{nameSavedNotice}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">First Name</label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Last Name</label>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editFirstName.trim()) return;
                      const rawEmp = db.getEmployeeById(full.id);
                      if (rawEmp) {
                        const updatedEmp: Employee = {
                          ...rawEmp,
                          firstName: editFirstName.trim(),
                          lastName: editLastName.trim(),
                          updatedAt: new Date().toISOString().split('T')[0]
                        };
                        db.saveEmployee(updatedEmp);
                        db.logAudit({
                          actorUserId: currentUser.id,
                          actorName: currentUser.name,
                          actorRole: currentUser.role,
                          module: 'EMPLOYEE',
                          action: 'UPDATE',
                          entityId: full.id,
                          entityName: `${updatedEmp.firstName} ${updatedEmp.lastName}`,
                          description: `Updated employee name to "${updatedEmp.firstName} ${updatedEmp.lastName}" (${full.id}); synchronized globally.`
                        });
                        setNameSavedNotice('Name updated & synced across all views!');
                        setDocRefresh((n) => n + 1);
                      }
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
                  >
                    Save Name
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600">Employee Profile Photograph</span>
                <button
                  type="button"
                  onClick={() => {
                    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      `${full.firstName} ${full.lastName}`
                    )}&background=4f46e5&color=fff&size=256`;
                    const rawEmp = db.getEmployeeById(full.id);
                    if (rawEmp) {
                      db.saveEmployee({ ...rawEmp, avatarUrl: defaultAvatar });
                      db.logAudit({
                        actorUserId: currentUser.id,
                        actorName: currentUser.name,
                        actorRole: currentUser.role,
                        module: 'EMPLOYEE',
                        action: 'UPDATE',
                        entityId: full.id,
                        entityName: `${full.firstName} ${full.lastName}`,
                        description: `Reset photograph to default corporate avatar for ${full.firstName} ${full.lastName}`
                      });
                      setDocRefresh((n) => n + 1);
                    }
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100"
                >
                  Reset to Default Avatar
                </button>
              </div>
              <PhotoCaptureField
                value={full.avatarUrl}
                onChange={(newDataUrl) => {
                  const rawEmp = db.getEmployeeById(full.id);
                  if (rawEmp) {
                    db.saveEmployee({ ...rawEmp, avatarUrl: newDataUrl });
                    db.logAudit({
                      actorUserId: currentUser.id,
                      actorName: currentUser.name,
                      actorRole: currentUser.role,
                      module: 'EMPLOYEE',
                      action: 'UPDATE',
                      entityId: full.id,
                      entityName: `${full.firstName} ${full.lastName}`,
                      description: `Updated employee photograph for ${full.firstName} ${full.lastName} (${full.id})`
                    });
                    setDocRefresh((n) => n + 1);
                  }
                }}
                label="Capture Live Webcam Photo or Upload Image"
              />
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 overflow-x-auto flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabSwitch(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Notifications and Unsaved Warnings */}
        {unsavedWarning && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>{unsavedWarning}</span>
            </div>
            <button
              type="button"
              onClick={() => setUnsavedWarning('')}
              className="text-amber-700 hover:text-amber-900 font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {sectionSaveNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{sectionSaveNotice}</span>
          </div>
        )}

        {sectionSaveError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 text-xs font-semibold">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{sectionSaveError}</span>
          </div>
        )}

        {/* Tab Contents */}
        <div className="py-2 min-h-64 text-xs">
          {/* TAB: PERSONAL */}
          {activeTab === 'personal' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">Personal & Emergency Contact Details</span>
                  <span className="text-[11px] text-slate-500">
                    {canEditPersonalSection
                      ? 'You have authorization to edit and maintain personal information.'
                      : 'Personal details are in read-only mode according to assigned permissions.'}
                  </span>
                </div>
                {canEditPersonalSection && editingSection !== 'personal' && (
                  <button
                    type="button"
                    onClick={startEditingPersonal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200 text-xs transition-colors"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit Personal Details</span>
                  </button>
                )}
              </div>

              {editingSection === 'personal' ? (
                <form onSubmit={savePersonalSection} className="p-4 bg-white rounded-xl border border-indigo-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                      <Edit2 className="h-3.5 w-3.5 text-indigo-600" />
                      Editing Personal Details
                    </span>
                    <span className="text-[10px] text-slate-400">Section: Personal</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        value={pFirstName}
                        onChange={(e) => setPFirstName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        value={pLastName}
                        onChange={(e) => setPLastName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={pDob}
                        onChange={(e) => setPDob(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Gender</label>
                      <select
                        value={pGender}
                        onChange={(e) => setPGender(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Blood Group</label>
                      <input
                        type="text"
                        value={pBloodGroup}
                        onChange={(e) => setPBloodGroup(e.target.value)}
                        placeholder="e.g. O+, B+, A+"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Marital Status</label>
                      <select
                        value={pMaritalStatus}
                        onChange={(e) => setPMaritalStatus(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      >
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Personal Email</label>
                      <input
                        type="email"
                        value={pPersonalEmail}
                        onChange={(e) => setPPersonalEmail(e.target.value)}
                        placeholder="name@personal.com"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Personal Mobile</label>
                      <input
                        type="tel"
                        value={pPersonalPhone}
                        onChange={(e) => setPPersonalPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Permanent Address</label>
                      <textarea
                        value={pPermanentAddress}
                        onChange={(e) => setPPermanentAddress(e.target.value)}
                        rows={2}
                        placeholder="Complete permanent residential address"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Current Address</label>
                      <textarea
                        value={pCurrentAddress}
                        onChange={(e) => setPCurrentAddress(e.target.value)}
                        rows={2}
                        placeholder="Complete current residential address"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 text-[11px] block">Emergency Contact</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Contact Name</label>
                        <input
                          type="text"
                          value={pEmergName}
                          onChange={(e) => setPEmergName(e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Relationship</label>
                        <input
                          type="text"
                          value={pEmergRel}
                          onChange={(e) => setPEmergRel(e.target.value)}
                          placeholder="e.g. Spouse, Parent"
                          className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Emergency Mobile</label>
                        <input
                          type="tel"
                          value={pEmergPhone}
                          onChange={(e) => setPEmergPhone(e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      Save Personal Details
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2.5">
                    <p className="font-semibold text-slate-900 text-xs border-b border-slate-200/60 pb-1">General Details</p>
                    <div className="flex justify-between"><span className="text-slate-500">Date of Birth:</span><span className="font-medium text-slate-800">{full.dateOfBirth || 'Pending HR Collection'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Gender:</span><span className="font-medium text-slate-800">{full.gender || 'Not Provided'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Blood Group:</span><span className="font-medium text-slate-800">{full.bloodGroup || 'Not Provided'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Marital Status:</span><span className="font-medium text-slate-800">{full.maritalStatus || 'Not Provided'}</span></div>
                    <div><span className="text-slate-500 block mb-0.5">Permanent Address:</span><span className="font-medium text-slate-800">{full.permanentAddress || full.address || 'Pending HR Collection'}</span></div>
                    <div><span className="text-slate-500 block mb-0.5">Current Address:</span><span className="font-medium text-slate-800">{full.currentAddress || full.address || 'Pending HR Collection'}</span></div>
                  </div>
                  <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2.5">
                    <p className="font-semibold text-slate-900 text-xs border-b border-slate-200/60 pb-1">Emergency Contact & Communication</p>
                    <div className="flex justify-between"><span className="text-slate-500">Personal Email:</span><span className="font-medium text-slate-800">{full.personalEmail || 'Not Provided'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Personal Mobile:</span><span className="font-medium text-slate-800">{full.personalPhone || 'Not Provided'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Emergency Contact:</span><span className="font-medium text-slate-800">{full.emergencyContact?.name || 'Pending HR Verification'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Relationship:</span><span className="font-medium text-slate-800">{full.emergencyContact?.relationship || 'Not Provided'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Emergency Phone:</span><span className="font-medium text-slate-800">{full.emergencyContact?.phone || 'Not Provided'}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: EMPLOYMENT */}
          {activeTab === 'employment' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">Employment Terms & Lifecycle Details</span>
                  <span className="text-[11px] text-slate-500">
                    {canEditEmploymentSection
                      ? 'You have authorization to edit organizational lifecycle terms.'
                      : 'Employment terms are managed exclusively by HR Administrators.'}
                  </span>
                </div>
                {canEditEmploymentSection && editingSection !== 'employment' && (
                  <button
                    type="button"
                    onClick={startEditingEmployment}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200 text-xs transition-colors"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit Employment Terms</span>
                  </button>
                )}
              </div>

              {editingSection === 'employment' ? (
                <form onSubmit={saveEmploymentSection} className="p-4 bg-white rounded-xl border border-indigo-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                      <Edit2 className="h-3.5 w-3.5 text-indigo-600" />
                      Editing Employment Terms
                    </span>
                    <span className="text-[10px] text-slate-400">Section: Employment</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Department *</label>
                      <select
                        value={eDepartmentId}
                        onChange={(e) => setEDepartmentId(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        required
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Designation *</label>
                      <select
                        value={eDesignationId}
                        onChange={(e) => setEDesignationId(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        required
                      >
                        {designations.map((d) => (
                          <option key={d.id} value={d.id}>{d.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Branch Location *</label>
                      <select
                        value={eBranchId}
                        onChange={(e) => setEBranchId(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        required
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Employment Type *</label>
                      <select
                        value={eEmploymentType}
                        onChange={(e) => setEEmploymentType(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Intern">Intern</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Date of Joining *</label>
                      <input
                        type="date"
                        value={eDateOfJoining}
                        onChange={(e) => setEDateOfJoining(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Work Shift</label>
                      <select
                        value={eShiftId}
                        onChange={(e) => setEShiftId(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      >
                        {shifts.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Employment Status</label>
                      <select
                        value={eStatus}
                        onChange={(e) => setEStatus(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      >
                        <option value="Active">Active</option>
                        <option value="Probation">Probation</option>
                        <option value="Notice Period">Notice Period</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Suspended">Suspended</option>
                        <option value="Separated">Separated</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Confirmation Date</label>
                      <input
                        type="date"
                        value={eConfirmationDate}
                        onChange={(e) => setEConfirmationDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Notice Period (Days)</label>
                      <input
                        type="number"
                        value={eNoticePeriodDays}
                        onChange={(e) => setENoticePeriodDays(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Probation Period (Days)</label>
                      <input
                        type="number"
                        value={eProbationPeriodDays}
                        onChange={(e) => setEProbationPeriodDays(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Employee Category</label>
                      <input
                        type="text"
                        value={eEmployeeCategory}
                        onChange={(e) => setEEmployeeCategory(e.target.value)}
                        placeholder="e.g. Core Staff, Executive"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      Save Employment Terms
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2.5">
                    <p className="font-semibold text-slate-900 text-xs border-b border-slate-200/60 pb-1">Lifecycle Milestones</p>
                    <div className="flex justify-between"><span className="text-slate-500">Date of Joining:</span><span className="font-medium text-slate-800">{full.dateOfJoining || 'Pending'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Employment Type:</span><span className="font-medium text-slate-800">{full.employmentType}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Employee Category:</span><span className="font-medium text-slate-800">{full.employeeCategory || 'Core Staff'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Probation Period:</span><span className="font-medium text-slate-800">{full.probationPeriodDays ? `${full.probationPeriodDays} days` : '180 days'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Confirmation Date:</span><span className="font-medium text-slate-800">{full.confirmationDate || 'In Probation / Pending'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Notice Period:</span><span className="font-medium text-slate-800">{full.noticePeriodDays} days</span></div>
                  </div>
                  <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2.5">
                    <p className="font-semibold text-slate-900 text-xs border-b border-slate-200/60 pb-1">Work Arrangement</p>
                    <div className="flex justify-between"><span className="text-slate-500">Assigned Shift:</span><span className="font-medium text-slate-800">{shift?.name || 'General Day'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Working Hours:</span><span className="font-medium text-slate-800">{shift ? `${shift.startTime} - ${shift.endTime}` : '09:30 - 18:30'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Branch Location:</span><span className="font-medium text-slate-800">{branch?.name || 'Main Delivery Center'} ({branch?.city || 'Bengaluru'})</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Profile Completeness:</span><span className="font-semibold text-indigo-700">{calculateProfileCompleteness(full).percentage}%</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: ORGANIZATION */}
          {activeTab === 'organization' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">Hierarchy & Department Assignment</span>
                  <span className="text-[11px] text-slate-500">
                    {canEditReportingSection
                      ? 'You have authorization to assign and reconfigure reporting managers.'
                      : 'Reporting relationships can only be modified by HR Admin or Senior Management.'}
                  </span>
                </div>
                {canEditReportingSection && editingSection !== 'organization' && (
                  <button
                    type="button"
                    onClick={startEditingReporting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200 text-xs transition-colors"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Change Reporting Manager</span>
                  </button>
                )}
              </div>

              {editingSection === 'organization' ? (
                <form onSubmit={saveReportingSection} className="p-4 bg-white rounded-xl border border-indigo-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                      <Edit2 className="h-3.5 w-3.5 text-indigo-600" />
                      Configure Reporting Hierarchy
                    </span>
                    <span className="text-[10px] text-slate-400">Section: Org & Reporting</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Direct Reporting Manager
                    </label>
                    <select
                      value={oReportingManagerId}
                      onChange={(e) => setOReportingManagerId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                    >
                      <option value="">Company Board / Top Leader (No Direct Manager)</option>
                      {allEmployees
                        .filter((e) => e.id !== full.id)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.firstName} {m.lastName} ({m.id}) · {designations.find((d) => d.id === m.designationId)?.title || 'Leader'}
                          </option>
                        ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Changing reporting manager automatically updates the organizational chart, team directories, and approval chains.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      Save Reporting Hierarchy
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 space-y-3">
                  <p className="font-semibold text-slate-900 text-xs">Hierarchy & Department Assignment</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-slate-500 block">Department:</span><span className="font-medium text-slate-800 text-sm">{dept?.name} ({dept?.code})</span></div>
                    <div><span className="text-slate-500 block">Designation:</span><span className="font-medium text-slate-800 text-sm">{desig?.title}</span></div>
                    <div><span className="text-slate-500 block">Job Level:</span><span className="font-medium text-slate-800">{desig?.level || 'Standard'}</span></div>
                    <div><span className="text-slate-500 block">Reports Directly To:</span><span className="font-medium text-indigo-700">{manager ? `${manager.firstName} ${manager.lastName} (${manager.id})` : 'Company Board'}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: SERVICE RECORDS (NEW FEATURE) */}
          {activeTab === 'service' && (() => {
            const serviceYears = calculateServiceYears(full.dateOfJoining);
            const records = db.getServiceRecordsByEmployeeId(full.id);

            const handleCreateServiceRecord = (e: React.FormEvent) => {
              e.preventDefault();
              const newRec: ServiceRecord = {
                id: `SR-${full.id}-${Date.now()}`,
                employeeId: full.id,
                employeeName: `${full.firstName} ${full.lastName}`.trim(),
                recordType: srType,
                effectiveDate: srEffectiveDate,
                previousDesignation: srPrevDesig || undefined,
                newDesignation: srNewDesig || undefined,
                previousDepartment: srPrevDept || undefined,
                newDepartment: srNewDept || undefined,
                previousReportingManager: srPrevManager || undefined,
                newReportingManager: srNewManager || undefined,
                previousSalary: srPrevSalary ? Number(srPrevSalary) : undefined,
                revisedSalary: srRevisedSalary ? Number(srRevisedSalary) : undefined,
                description: srRemarks || undefined,
                createdBy: `${currentUser.name} (${currentUser.role})`,
                approvedBy: isHR ? currentUser.name : undefined,
                createdDate: new Date().toISOString().split('T')[0],
                approvalStatus: isHR ? 'Approved' : 'Pending'
              };

              db.saveServiceRecord(newRec);

              // If approved promotion, update employee profile designation
              if (isHR && srNewDesig) {
                const targetDesig = designations.find((d) => d.title.toLowerCase() === srNewDesig.toLowerCase());
                if (targetDesig) {
                  const rawEmp = db.getEmployeeById(full.id);
                  if (rawEmp) {
                    db.saveEmployee({ ...rawEmp, designationId: targetDesig.id });
                  }
                }
              }

              // If salary revision, update baseSalaryAnnual
              if (isHR && srRevisedSalary) {
                const rawEmp = db.getEmployeeById(full.id);
                if (rawEmp) {
                  db.saveEmployee({ ...rawEmp, baseSalaryAnnual: Number(srRevisedSalary) });
                }
              }

              db.logAudit({
                actorUserId: currentUser.id,
                actorName: currentUser.name,
                actorRole: currentUser.role,
                module: 'EMPLOYEE',
                action: 'CREATE',
                entityId: full.id,
                entityName: `${full.firstName} ${full.lastName}`,
                description: `Created service history event "${srType}" effective ${srEffectiveDate} for ${full.id}`
              });

              setSrSuccessNotice(`Service record "${srType}" successfully saved!`);
              setShowAddServiceModal(false);
              setDocRefresh((n) => n + 1);
              setTimeout(() => setSrSuccessNotice(''), 3000);
            };

            return (
              <div className="space-y-4">
                {/* Years of Service Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider block">
                      Total Service Tenure
                    </span>
                    <span className="text-base font-extrabold text-indigo-950 mt-1 block">
                      {serviceYears.displayText}
                    </span>
                    <span className="text-[11px] text-indigo-600/90 mt-0.5 block">
                      Joining Date: <span className="font-semibold">{full.dateOfJoining}</span>
                    </span>
                  </div>

                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">
                      Completed Tenure
                    </span>
                    <span className="text-base font-extrabold text-emerald-950 mt-1 block">
                      {serviceYears.totalYears} yrs, {serviceYears.completedMonths} mos
                    </span>
                    <span className="text-[11px] text-emerald-600/90 mt-0.5 block">
                      {serviceYears.totalDays} Total Days of Association
                    </span>
                  </div>

                  <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider block">
                      Next Work Anniversary
                    </span>
                    <span className="text-base font-extrabold text-amber-950 mt-1 block">
                      {serviceYears.nextAnniversaryDate}
                    </span>
                    <span className="text-[11px] text-amber-700/90 mt-0.5 block">
                      {serviceYears.daysUntilNextAnniversary} Days remaining
                    </span>
                  </div>
                </div>

                {srSuccessNotice && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
                    {srSuccessNotice}
                  </div>
                )}

                {/* Service History Header & Add Action */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">Employment Service Timeline & History</h5>
                    <p className="text-[11px] text-slate-500">
                      Chronological log of appointments, confirmations, promotions, transfers, and salary revisions
                    </p>
                  </div>
                  {canManageService && (
                    <button
                      type="button"
                      onClick={() => {
                        setSrPrevDesig(desig?.title || '');
                        setSrNewDesig('');
                        setSrPrevDept(dept?.name || '');
                        setSrNewDept('');
                        setSrPrevManager(manager ? `${manager.firstName} ${manager.lastName}` : '');
                        setSrNewManager('');
                        setSrPrevSalary(full.baseSalaryAnnual || '');
                        setSrRevisedSalary('');
                        setSrRemarks('');
                        setShowAddServiceModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Service Record</span>
                    </button>
                  )}
                </div>

                {/* Timeline & Structured Records */}
                {records.length === 0 ? (
                  <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-slate-400">
                    No service history records logged yet for this employee.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {records.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-colors shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{rec.recordType}</span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                rec.approvalStatus === 'Approved'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : rec.approvalStatus === 'Rejected'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {rec.approvalStatus}
                            </span>
                          </div>
                          <span className="font-mono text-slate-500 text-[11px] font-medium">
                            Effective: {rec.effectiveDate}
                          </span>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                          {rec.newDesignation && (
                            <div>
                              <span className="text-slate-400 block">Designation:</span>
                              <span className="font-semibold text-slate-800">
                                {rec.previousDesignation ? `${rec.previousDesignation} → ` : ''}
                                {rec.newDesignation}
                              </span>
                            </div>
                          )}

                          {rec.newDepartment && (
                            <div>
                              <span className="text-slate-400 block">Department:</span>
                              <span className="font-semibold text-slate-800">
                                {rec.previousDepartment ? `${rec.previousDepartment} → ` : ''}
                                {rec.newDepartment}
                              </span>
                            </div>
                          )}

                          {rec.newReportingManager && (
                            <div>
                              <span className="text-slate-400 block">Reporting Manager:</span>
                              <span className="font-semibold text-slate-800">
                                {rec.previousReportingManager ? `${rec.previousReportingManager} → ` : ''}
                                {rec.newReportingManager}
                              </span>
                            </div>
                          )}

                          {rec.revisedSalary && (
                            <div>
                              <span className="text-slate-400 block">Annual CTC:</span>
                              <span className="font-semibold text-slate-800 font-mono">
                                {rec.previousSalary ? `₹${rec.previousSalary.toLocaleString('en-IN')} → ` : ''}
                                ₹{rec.revisedSalary.toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}

                          {rec.description && (
                            <div className="sm:col-span-2">
                              <span className="text-slate-400 block">Remarks / Reason:</span>
                              <span className="text-slate-700 italic">{rec.description}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span>Recorded by {rec.createdBy}</span>
                          <div className="flex items-center gap-2">
                            {rec.approvedBy && <span>Approved by {rec.approvedBy}</span>}
                            {canApproveService && rec.approvalStatus === 'Pending' && (
                              <div className="flex items-center gap-1.5 ml-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const allRecs = db.getServiceRecords();
                                    const updatedList = allRecs.map((r) =>
                                      r.id === rec.id
                                        ? { ...r, approvalStatus: 'Approved' as const, approvedBy: currentUser.name }
                                        : r
                                    );
                                    localStorage.setItem('orbyx_hrms_v3_serviceRecords', JSON.stringify(updatedList));
                                    db.logAudit({
                                      actorUserId: currentUser.id,
                                      actorName: currentUser.name,
                                      actorRole: currentUser.role,
                                      module: 'EMPLOYEE',
                                      action: 'APPROVE',
                                      entityId: full.id,
                                      entityName: `${full.firstName} ${full.lastName}`,
                                      description: `Approved service record "${rec.recordType}" (${rec.id}) for ${full.id}`
                                    });
                                    setDocRefresh((n) => n + 1);
                                  }}
                                  className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded font-semibold text-[10px]"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const allRecs = db.getServiceRecords();
                                    const updatedList = allRecs.map((r) =>
                                      r.id === rec.id
                                        ? { ...r, approvalStatus: 'Rejected' as const, approvedBy: currentUser.name }
                                        : r
                                    );
                                    localStorage.setItem('orbyx_hrms_v3_serviceRecords', JSON.stringify(updatedList));
                                    db.logAudit({
                                      actorUserId: currentUser.id,
                                      actorName: currentUser.name,
                                      actorRole: currentUser.role,
                                      module: 'EMPLOYEE',
                                      action: 'REJECT',
                                      entityId: full.id,
                                      entityName: `${full.firstName} ${full.lastName}`,
                                      description: `Rejected service record "${rec.recordType}" (${rec.id}) for ${full.id}`
                                    });
                                    setDocRefresh((n) => n + 1);
                                  }}
                                  className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded font-semibold text-[10px]"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Service Record Modal Form */}
                {showAddServiceModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
                    <form
                      onSubmit={handleCreateServiceRecord}
                      className="bg-white rounded-xl max-w-lg w-full p-5 shadow-xl border border-slate-200 space-y-3.5 text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Award className="h-4 w-4 text-indigo-600" />
                          <span>Add Employment Service Record</span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowAddServiceModal(false)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Service Event Type *</label>
                          <select
                            value={srType}
                            onChange={(e) => setSrType(e.target.value as ServiceRecordType)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                          >
                            <option value="Offer Letter Issued">Offer Letter Issued</option>
                            <option value="Appointment Letter Issued">Appointment Letter Issued</option>
                            <option value="Date of Joining">Date of Joining</option>
                            <option value="Employment Confirmation">Employment Confirmation</option>
                            <option value="Probation Completion">Probation Completion</option>
                            <option value="Promotion">Promotion</option>
                            <option value="Designation Change">Designation Change</option>
                            <option value="Department Transfer">Department Transfer</option>
                            <option value="Reporting Manager Change">Reporting Manager Change</option>
                            <option value="Salary Revision">Salary Revision</option>
                            <option value="Branch Transfer">Branch Transfer</option>
                            <option value="Employment Status Change">Employment Status Change</option>
                            <option value="Years of Service / Work Anniversary">Work Anniversary</option>
                            <option value="Resignation / Termination">Resignation / Termination</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Effective Date *</label>
                          <input
                            type="date"
                            required
                            value={srEffectiveDate}
                            onChange={(e) => setSrEffectiveDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                          />
                        </div>
                      </div>

                      {(srType === 'Promotion' || srType === 'Designation Change') && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-medium text-slate-600 mb-1">Previous Designation</label>
                            <input
                              value={srPrevDesig}
                              onChange={(e) => setSrPrevDesig(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-slate-600 mb-1">New Designation</label>
                            <input
                              value={srNewDesig}
                              onChange={(e) => setSrNewDesig(e.target.value)}
                              placeholder="e.g. Senior Software Engineer"
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                            />
                          </div>
                        </div>
                      )}

                      {srType === 'Department Transfer' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-medium text-slate-600 mb-1">Previous Department</label>
                            <input
                              value={srPrevDept}
                              onChange={(e) => setSrPrevDept(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-slate-600 mb-1">New Department</label>
                            <input
                              value={srNewDept}
                              onChange={(e) => setSrNewDept(e.target.value)}
                              placeholder="e.g. Engineering & Delivery"
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                            />
                          </div>
                        </div>
                      )}

                      {srType === 'Reporting Manager Change' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-medium text-slate-600 mb-1">Previous Manager</label>
                            <input
                              value={srPrevManager}
                              onChange={(e) => setSrPrevManager(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-slate-600 mb-1">New Manager</label>
                            <input
                              value={srNewManager}
                              onChange={(e) => setSrNewManager(e.target.value)}
                              placeholder="e.g. KrishaRaj"
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                            />
                          </div>
                        </div>
                      )}

                      {srType === 'Salary Revision' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-medium text-slate-600 mb-1">Previous Annual CTC</label>
                            <input
                              type="number"
                              value={srPrevSalary}
                              onChange={(e) => setSrPrevSalary(e.target.value ? Number(e.target.value) : '')}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-slate-600 mb-1">Revised Annual CTC</label>
                            <input
                              type="number"
                              value={srRevisedSalary}
                              onChange={(e) => setSrRevisedSalary(e.target.value ? Number(e.target.value) : '')}
                              placeholder="e.g. 1800000"
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block font-medium text-slate-700 mb-1">Remarks / Justification</label>
                        <textarea
                          rows={2}
                          value={srRemarks}
                          onChange={(e) => setSrRemarks(e.target.value)}
                          placeholder="Event description, promotion notes, or approval references"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setShowAddServiceModal(false)}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
                        >
                          Save Record
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-900 block">Employee Document Vault & Certificates</span>
                  <span className="text-[11px] text-slate-500">Verified educational, identity, statutory, and lifecycle documents</span>
                </div>
                <select
                  value={docCategoryFilter}
                  onChange={(e) => setDocCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="All">All Categories ({employeeDocs.length})</option>
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

              <div className="space-y-2">
                {filteredDocs.map((doc) => (
                  <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                      <div>
                        <p className="font-medium text-slate-800">{doc.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {doc.category} · Uploaded {doc.uploadedAt} by {doc.uploadedBy}
                          {doc.issueDate ? ` · Issued: ${doc.issueDate}` : ''}
                          {doc.expiryDate ? ` · Expires: ${doc.expiryDate}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-semibold border ${
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
                        className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                      >
                        Preview
                      </button>
                      {canVerifyDocs && doc.status !== 'Verified' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateDocStatus(doc.id, 'Verified')}
                          className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded"
                        >
                          Verify
                        </button>
                      )}
                      {canVerifyDocs && doc.status !== 'Rejected' && (
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingDocId(doc.id);
                            setRejectReason('');
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Document Rejection Modal with Reason */}
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
                      className="text-xs text-slate-400 hover:text-slate-600"
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
                      placeholder="e.g. Blurred scan, expired document, mismatching name"
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
                        handleUpdateDocStatus(rejectingDocId, 'Rejected', rejectReason.trim());
                      }}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}

              {previewDoc && (
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-950 text-xs">Document Metadata & Preview: {previewDoc.title}</span>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(null)}
                      className="text-[11px] font-semibold text-indigo-700 hover:underline"
                    >
                      Close Preview
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white p-3 rounded-lg border border-indigo-100">
                    <div>
                      <span className="text-slate-400 block">Document ID</span>
                      <span className="font-mono font-semibold text-slate-800">{previewDoc.id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Category</span>
                      <span className="font-semibold text-slate-800">{previewDoc.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Issue / Expiry</span>
                      <span className="font-semibold text-slate-800">
                        {previewDoc.issueDate || 'N/A'} {previewDoc.expiryDate ? `→ ${previewDoc.expiryDate}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Verification Status</span>
                      <span className="font-semibold text-indigo-700">{previewDoc.status}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Document Form */}
              {canManageDocs && (
                <form onSubmit={handleMockDocUpload} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                  <p className="font-medium text-slate-800 text-xs">Upload Certificate / Employee Document</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={docUploadTitle}
                      onChange={(e) => setDocUploadTitle(e.target.value)}
                      placeholder="Document Title (e.g. AWS Solutions Architect Certificate)"
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs"
                      required
                    />
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as any)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs"
                    >
                      <option value="Education Certificate">Education Certificate</option>
                      <option value="Professional Certificate">Professional Certificate</option>
                      <option value="ID Proof">Government ID Proof</option>
                      <option value="Resume">Resume / CV</option>
                      <option value="Offer Letter">Offer Letter</option>
                      <option value="Appointment Letter">Appointment Letter</option>
                      <option value="Statutory & Tax">Statutory & Tax Form</option>
                      <option value="Performance & Appraisal">Performance & Appraisal</option>
                      <option value="Exit & Clearance">Exit & Clearance</option>
                    </select>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Issue Date (Optional)</label>
                      <input
                        type="date"
                        value={docIssueDate}
                        onChange={(e) => setDocIssueDate(e.target.value)}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Expiry Date (Optional)</label>
                      <input
                        type="date"
                        value={docExpiryDate}
                        onChange={(e) => setDocExpiryDate(e.target.value)}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Persisted to Employee Document Vault (PDF, PNG, JPG)</span>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold"
                    >
                      <Upload className="h-3 w-3" />
                      Upload to Vault
                    </button>
                  </div>
                  {uploadSuccess && (
                    <p className="text-[11px] text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Document uploaded and saved to employee record.
                    </p>
                  )}
                </form>
              )}
            </div>
          )}

          {/* TAB: LEAVE */}
          {activeTab === 'leave' && (
            <div className="space-y-3">
              <p className="font-semibold text-slate-900">Leave Applications & History ({leaves.length})</p>
              {leaves.length === 0 ? (
                <p className="text-slate-400 py-6 text-center">No leave applications recorded.</p>
              ) : (
                leaves.map((l) => (
                  <div key={l.id} className="p-2.5 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-800">{l.totalDays} day(s) · {l.startDate} to {l.endDate}</p>
                      <p className="text-slate-500 text-[11px]">Reason: {l.reason}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      l.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-3">
              <p className="font-semibold text-slate-900">Attendance Records</p>
              {attendance.length === 0 ? (
                <p className="text-slate-400 py-6 text-center">No attendance punches recorded.</p>
              ) : (
                attendance.map((att) => (
                  <div key={att.id} className="p-2.5 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-800">{att.date} ({att.status})</p>
                      <p className="text-slate-500 text-[11px]">In: {att.checkInTime || '--'} | Out: {att.checkOutTime || '--'} | Total: {att.totalHoursWorked}h</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      att.isLate ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {att.source}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: EXPENSES */}
          {activeTab === 'expenses' && (
            <div className="space-y-3">
              <p className="font-semibold text-slate-900">Expense Claims ({expenses.length})</p>
              {expenses.length === 0 ? (
                <p className="text-slate-400 py-6 text-center">No expense claims filed.</p>
              ) : (
                expenses.map((exp) => (
                  <div key={exp.id} className="p-2.5 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{exp.claimNumber}</span>
                        <span className="font-mono text-indigo-700 font-bold">₹{exp.amount.toLocaleString()}</span>
                      </div>
                      <p className="text-slate-500 text-[11px]">{exp.title} · Date: {exp.expenseDate}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                      {exp.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: ASSETS */}
          {activeTab === 'assets' && (
            <div className="space-y-3">
              <p className="font-semibold text-slate-900">Assigned Company Assets ({assets.length})</p>
              {assets.length === 0 ? (
                <p className="text-slate-400 py-6 text-center">No assets allocated to this employee.</p>
              ) : (
                assets.map((asset) => (
                  <div key={asset.id} className="p-3 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-900">{asset.name}</p>
                      <p className="text-slate-500 text-[11px]">Tag: {asset.assetTag} · SN: {asset.serialNumber} · Condition: {asset.condition}</p>
                    </div>
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      {asset.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: CLIENT ASSIGNMENTS */}
          {activeTab === 'clients' && (
            <div className="space-y-3">
              <p className="font-semibold text-slate-900">Client Deployments & Engagements</p>
              {(() => {
                let empAssignments: any[] = [];
                try {
                  const raw = localStorage.getItem('orbyx_hrms_client_assignments_v1');
                  if (raw) {
                    empAssignments = (JSON.parse(raw) as any[]).filter((a) => a.employeeId === full.id);
                  }
                } catch {
                  empAssignments = [];
                }
                if (empAssignments.length === 0) {
                  return <p className="text-slate-400 py-6 text-center">No active or historical client deployments for this employee.</p>;
                }
                return empAssignments.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-900">{a.project} ({a.clientId})</p>
                      <p className="text-slate-500 text-[11px]">{a.workMode} · {a.location} · Period: {a.startDate} to {a.plannedEndDate || 'Ongoing'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      a.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* TAB: ONBOARDING LIFECYCLE */}
          {activeTab === 'lifecycle' && (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <p className="font-semibold text-slate-900 text-xs">Onboarding Lifecycle & Provisioning Checklist</p>
                    <p className="text-[11px] text-slate-500">Verified milestones for employee setup and IT readiness</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active Workforce Record
                  </span>
                </div>
                {[
                  { label: 'Unique Employee ID & Profile Created', done: true, desc: `ID: ${full.id} · Joined: ${full.dateOfJoining}` },
                  { label: 'Department, Designation & Reporting Manager Linked', done: true, desc: `${dept?.name || 'Assigned'} · ${desig?.title || 'Assigned'}` },
                  { label: 'Salary Structure & Statutory Compliance Assigned', done: true, desc: salaryStructure?.name || 'Standard Structure' },
                  { label: 'Hardware Workstation & Official Email Provisioned', done: assets.length > 0, desc: `${assets.length} Asset(s) allocated` },
                  { label: 'Identity, Education & Employment Documents Recorded', done: true, desc: `${employeeDocs.length} document(s) on file` }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                    <div>
                      <span className="text-slate-800 font-medium block">{item.label}</span>
                      <span className="text-[11px] text-slate-500">{item.desc}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ml-3 ${item.done ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {item.done ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SALARY STRUCTURE (CONFIDENTIAL - ACCESSIBLE ONLY TO SELF OR HR ADMIN) */}
          {activeTab === 'salary' && (
            <div>
              {!full.canViewSalary ? (
                <div className="p-8 text-center bg-rose-50 rounded-xl border border-rose-200">
                  <ShieldAlert className="h-8 w-8 text-rose-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-rose-900">Confidential Salary Record</h4>
                  <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">
                    Reporting Managers and colleagues are not authorized to view this employee's salary and bank account details.
                    Access is strictly limited to HR Administrators and the individual employee.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">Salary Structure & Banking Details</span>
                      <span className="text-[11px] text-slate-500">
                        {canEditSalarySection
                          ? 'Confidential financial information. You have authorization to adjust salary components and statutory settings.'
                          : 'Confidential view. Only authorized HR Administrators can edit salary and banking.'}
                      </span>
                    </div>
                    {canEditSalarySection && editingSection !== 'salary' && (
                      <button
                        type="button"
                        onClick={startEditingSalary}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200 text-xs transition-colors"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit Salary & Banking</span>
                      </button>
                    )}
                  </div>

                  {editingSection === 'salary' ? (
                    <form onSubmit={saveSalarySection} className="p-4 bg-white rounded-xl border border-indigo-200 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                          <Edit2 className="h-3.5 w-3.5 text-indigo-600" />
                          Editing Salary Structure & Banking
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">CONFIDENTIAL · HR ADMIN ONLY</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Annual CTC (₹) *</label>
                          <input
                            type="number"
                            value={sBaseSalaryAnnual || ''}
                            onChange={(e) => setSBaseSalaryAnnual(Number(e.target.value))}
                            placeholder="e.g. 1200000"
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                            required
                            min={0}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Salary Structure</label>
                          <select
                            value={sSalaryStructureId}
                            onChange={(e) => setSSalaryStructureId(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                          >
                            {db.getSalaryStructures().map((s) => (
                              <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bank Name *</label>
                          <input
                            type="text"
                            value={sBankName}
                            onChange={(e) => setSBankName(e.target.value)}
                            placeholder="e.g. HDFC Bank, ICICI Bank"
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Account Number *</label>
                          <input
                            type="text"
                            value={sAccountNumber}
                            onChange={(e) => setSAccountNumber(e.target.value)}
                            placeholder="e.g. 50100234567890"
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">IFSC Code *</label>
                          <input
                            type="text"
                            value={sIfsc}
                            onChange={(e) => setSIfsc(e.target.value)}
                            placeholder="e.g. HDFC0001234"
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono uppercase"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Account Type</label>
                          <select
                            value={sAccountType}
                            onChange={(e) => setSAccountType(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                          >
                            <option value="Savings">Savings Account</option>
                            <option value="Current">Current Account</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">PAN Number *</label>
                          <input
                            type="text"
                            value={sPan}
                            onChange={(e) => setSPan(e.target.value)}
                            placeholder="ABCDE1234F"
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono uppercase"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">PF UAN (12 digits)</label>
                          <input
                            type="text"
                            value={sUan}
                            onChange={(e) => setSUan(e.target.value)}
                            placeholder="100987654321"
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* Statutory Applicability */}
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                        <span className="font-bold text-slate-800 text-[11px] block">Statutory Eligibility & Compliance</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sEpfApplicable}
                              onChange={(e) => setSEpfApplicable(e.target.checked)}
                              className="rounded text-indigo-600"
                            />
                            <span className="text-[11px] font-medium text-slate-700">EPF Eligible</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sEpfWageCeiling}
                              onChange={(e) => setSEpfWageCeiling(e.target.checked)}
                              className="rounded text-indigo-600"
                            />
                            <span className="text-[11px] font-medium text-slate-700">₹15k Ceiling</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sEsiApplicable}
                              onChange={(e) => setSEsiApplicable(e.target.checked)}
                              className="rounded text-indigo-600"
                            />
                            <span className="text-[11px] font-medium text-slate-700">ESI Eligible</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sPtApplicable}
                              onChange={(e) => setSPtApplicable(e.target.checked)}
                              className="rounded text-indigo-600"
                            />
                            <span className="text-[11px] font-medium text-slate-700">PT Eligible</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                        >
                          Save Salary & Banking Details
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <div>
                            <span className="text-xs text-slate-500">Annual Cost to Company (CTC)</span>
                            <div className="text-xl font-bold text-slate-900 font-mono">
                              ₹{full.baseSalaryAnnual.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-500">Structure</span>
                            <p className="font-medium text-slate-800">{salaryStructure?.name || 'Default'}</p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-500 block">Bank Account:</span>
                            <span className="font-medium text-slate-800 font-mono">
                              {full.bankDetails.bankName} - {full.bankDetails.accountNumber}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">IFSC Code:</span>
                            <span className="font-medium text-slate-800 font-mono">{full.bankDetails.ifscOrRouting}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">PAN / Tax Number:</span>
                            <span className="font-medium text-slate-800 font-mono">{full.panOrTaxNumber}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">PF UAN:</span>
                            <span className="font-medium text-slate-800 font-mono">{full.pfUan || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {salaryStructure && (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2">Component</th>
                                <th className="px-3 py-2">Type</th>
                                <th className="px-3 py-2 text-right">Monthly Amount</th>
                                <th className="px-3 py-2 text-right">Annual Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {salaryStructure.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="px-3 py-2 font-medium text-slate-800">{item.componentName}</td>
                                  <td className="px-3 py-2 text-slate-500">{item.type}</td>
                                  <td className="px-3 py-2 text-right font-mono font-medium text-slate-900">₹{item.amountMonthly.toLocaleString()}</td>
                                  <td className="px-3 py-2 text-right font-mono text-slate-600">₹{item.amountAnnual.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: AUDIT */}
          {activeTab === 'audit' && isHR && (
            <div className="space-y-2">
              <p className="font-semibold text-slate-900">Historical Changes & Audit Records</p>
              {auditLogs.length === 0 ? (
                <p className="text-slate-400 py-6 text-center">No audit trail records for this employee.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 bg-slate-50 rounded border border-slate-200 text-xs">
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-800">{log.action} by {log.actorName}</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-600 mt-1">{log.description}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
