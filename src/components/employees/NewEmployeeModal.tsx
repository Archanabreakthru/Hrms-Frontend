// Celestial HRMS New Employee Modal - 4-stage registration
import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { PhotoCaptureField } from '../common/PhotoCaptureField';
import { db } from '../../db/storage';
import { hrmsService } from '../../services/hrmsService';
import { employeeApi } from '../../services/employeeApi';
import { orgApi } from '../../services/orgApi';
import { attendanceApi } from '../../services/attendanceApi';
import { useAuth } from '../../services/authContext';
import { Employee, EmploymentType, DocumentCategory } from '../../types/hrms';
import { calculateProfileCompleteness } from '../../utils/profileUtils';
import {
  User,
  Briefcase,
  CreditCard,
  ShieldCheck,
  FileText,
  AlertCircle,
  Save,
  Check,
  Plus,
  Trash2
} from 'lucide-react';

interface NewEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (emp: Employee) => void;
}

interface StagedDoc {
  id: string;
  name: string;
  category: DocumentCategory;
  issueDate?: string;
  expiryDate?: string;
  fileSize: string;
  fileName: string;
}

export const NewEmployeeModal: React.FC<NewEmployeeModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { currentUser } = useAuth();

  // Master data state loaded from authoritative backend APIs
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [designations, setDesignations] = useState<Array<{ id: string; title: string; level?: string }>>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string; city: string }>>([]);
  const [shifts, setShifts] = useState<Array<{ id: string; name: string; startTime: string; endTime: string }>>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const structures = db.getSalaryStructures();

  // Load master data from orgApi, attendanceApi, and employeeApi when modal is opened
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    async function fetchMasterData() {
      try {
        const [depts, desigs, brs, shfts, empRes] = await Promise.all([
          orgApi.getDepartments().catch(() => []),
          orgApi.getDesignations().catch(() => []),
          orgApi.getBranches().catch(() => []),
          attendanceApi.listShifts().catch(() => []),
          employeeApi.list({ limit: 100 }).catch(() => ({ employees: [] })),
        ]);
        if (isMounted) {
          if (Array.isArray(depts)) {
            setDepartments(depts.map((d) => ({ id: d.id, name: d.name, code: d.code })));
          }
          if (Array.isArray(desigs)) {
            setDesignations(desigs.map((ds) => ({ id: ds.id, title: ds.title, level: String(ds.level || 1), code: ds.code })));
          }
          if (Array.isArray(brs)) {
            setBranches(brs.map((b) => ({ id: b.id, name: b.name, city: b.city, code: b.code })));
          }
          if (Array.isArray(shfts) && shfts.length > 0) {
            setShifts(shfts.map((s) => ({ id: s.id, name: s.name, startTime: s.startTime, endTime: s.endTime })));
          } else {
            setShifts([{ id: 'd3b07384-d113-4e00-bf7d-9442fa6054be', name: 'General Day Shift (09:30 - 18:30)', startTime: '09:30', endTime: '18:30' }]);
          }
          if (empRes && Array.isArray(empRes.employees)) {
            setAllEmployees(empRes.employees);
          }
        }
      } catch (err) {
        console.warn('Failed to load live master data in NewEmployeeModal:', err);
      }
    }
    fetchMasterData();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const [activeTab, setActiveTab] = useState<'personal' | 'employment' | 'salary' | 'statutory' | 'documents'>('personal');

  // -------------------------------------------------------------
  // Section 1: Personal & Contact Information
  // -------------------------------------------------------------
  const [avatarUrl, setAvatarUrl] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<'Single' | 'Married' | 'Other' | ''>('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [enableLoginAccess, setEnableLoginAccess] = useState(true);

  // Emergency contact
  const [emName, setEmName] = useState('');
  const [emRelation, setEmRelation] = useState('');
  const [emPhone, setEmPhone] = useState('');

  // -------------------------------------------------------------
  // Section 2: Employment & Organization Details
  // -------------------------------------------------------------
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [reportingManagerId, setReportingManagerId] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType | ''>('');
  const [employeeCategory, setEmployeeCategory] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<'Active' | 'Probation' | 'Notice Period' | ''>('');
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [confirmationDate, setConfirmationDate] = useState('');
  const [noticePeriodDays, setNoticePeriodDays] = useState<number | ''>('');
  const [probationPeriodDays, setProbationPeriodDays] = useState<number | ''>('');

  // -------------------------------------------------------------
  // Section 3: Salary and Banking Details
  // -------------------------------------------------------------
  const [baseSalaryAnnual, setBaseSalaryAnnual] = useState<number | ''>('');
  const [salaryStructureId, setSalaryStructureId] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [panNumber, setPanNumber] = useState('');

  // -------------------------------------------------------------
  // Section 4: Statutory and Compliance Details
  // -------------------------------------------------------------
  const [epfApplicable, setEpfApplicable] = useState(true);
  const [epfWageCeilingApplied, setEpfWageCeilingApplied] = useState(true);
  const [pfUan, setPfUan] = useState('');
  const [esiApplicable, setEsiApplicable] = useState(false);
  const [esiNumber, setEsiNumber] = useState('');
  const [ptApplicable, setPtApplicable] = useState(true);
  const [statutoryExemptionReason, setStatutoryExemptionReason] = useState('');

  // -------------------------------------------------------------
  // Section 5: Employee Documents
  // -------------------------------------------------------------
  const [stagedDocs, setStagedDocs] = useState<StagedDoc[]>([]);
  const [newDocCategory, setNewDocCategory] = useState<DocumentCategory>('ID Proof');
  const [newDocName, setNewDocName] = useState('');
  const [newDocIssueDate, setNewDocIssueDate] = useState('');
  const [newDocExpiryDate, setNewDocExpiryDate] = useState('');
  const [stagedFileBlob, setStagedFileBlob] = useState<{ name: string; size: string; dataUrl: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Dynamic generated employee ID based on selected designation
  const nextId = hrmsService.generateNextEmployeeId(designationId, designations);

  // Error and file upload state
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Completeness Preview
  const previewEmp: Partial<Employee> = {
    firstName,
    lastName,
    email: officialEmail,
    phone,
    dateOfBirth: dob,
    gender: (gender || undefined) as any,
    bloodGroup,
    address: permanentAddress,
    departmentId,
    designationId,
    branchId,
    employmentType: (employmentType || undefined) as any,
    dateOfJoining,
    bankDetails: {
      bankName,
      accountNumber,
      ifscOrRouting: ifsc,
      accountType: 'Savings'
    },
    panOrTaxNumber: panNumber,
    baseSalaryAnnual: Number(baseSalaryAnnual) || 0,
    emergencyContact: {
      name: emName,
      relationship: emRelation,
      phone: emPhone
    },
    epfApplicable,
    ptApplicable
  };

  const completeness = calculateProfileCompleteness(previewEmp);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Supported formats: PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, XLSX
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExtensions.includes(ext)) {
      setUploadError(`Unsupported file format (.${ext}). Supported formats: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX.`);
      e.target.value = '';
      return;
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      setUploadError(`File size exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB). Please select a smaller file.`);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : `${Math.round(file.size / 1024)} KB`;
      setStagedFileBlob({
        name: file.name,
        size: sizeStr,
        dataUrl
      });
      if (!newDocName.trim()) {
        setNewDocName(file.name);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read file from local disk. Please retry.');
    };
    reader.readAsDataURL(file);
  };

  const handleAttachClick = () => {
    setUploadError(null);
    if (!newDocCategory) {
      setUploadError('Please select a document category before attaching.');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    if (!stagedFileBlob && !newDocName.trim()) {
      setUploadError('Please click Attach to select an actual document file.');
      return;
    }
    const docTitle = newDocName.trim() || stagedFileBlob?.name || `${newDocCategory} Document`;
    const doc: StagedDoc = {
      id: `DOC-STAGE-${Date.now()}`,
      name: docTitle,
      category: newDocCategory,
      fileName: stagedFileBlob?.name || `${docTitle.replace(/\s+/g, '_')}.pdf`,
      fileSize: stagedFileBlob?.size || '250 KB',
      issueDate: newDocIssueDate || undefined,
      expiryDate: newDocExpiryDate || undefined
    };
    setStagedDocs([...stagedDocs, doc]);
    setNewDocName('');
    setNewDocIssueDate('');
    setNewDocExpiryDate('');
    setStagedFileBlob(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveDoc = (id: string) => {
    setStagedDocs(stagedDocs.filter((d) => d.id !== id));
  };

  const handleSave = async (isDraft: boolean) => {
    setError(null);

    if (!isDraft) {
      if (!firstName.trim() || !lastName.trim() || !officialEmail.trim() || !phone.trim()) {
        setError('Section 1: First name, last name, official email, and mobile number are strictly required.');
        setActiveTab('personal');
        return;
      }
      if (!accountNumber.trim() || !panNumber.trim() || !bankName.trim() || !ifsc.trim()) {
        setError('Section 3: Bank account number, IFSC code, and PAN are mandatory for verified onboarding.');
        setActiveTab('salary');
        return;
      }
    } else {
      if (!firstName.trim() && !officialEmail.trim()) {
        setError('To save a draft, please provide at least an employee first name or email.');
        return;
      }
    }

    try {
      const finalPermanent = permanentAddress.trim() || (isDraft ? '' : 'Address Pending HR Collection');
      const finalCurrent = sameAsPermanent ? finalPermanent : (currentAddress.trim() || finalPermanent);

      const clientGeneratedUserId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'c' + Math.random().toString(16).substring(2, 9) + '-' + Math.random().toString(16).substring(2, 6) + '-4' + Math.random().toString(16).substring(2, 5) + '-a' + Math.random().toString(16).substring(2, 5) + '-' + Math.random().toString(16).substring(2, 14);

      const created = hrmsService.createEmployee(
        {
          userId: clientGeneratedUserId,
          firstName: firstName.trim() || (isDraft ? 'Draft' : ''),
          lastName: lastName.trim(),
          email: officialEmail.trim() || (isDraft ? `draft.${Date.now()}@orbyx.internal` : ''),
          officialEmail: officialEmail.trim(),
          personalEmail: personalEmail.trim() || undefined,
          phone: phone.trim(),
          officialPhone: phone.trim(),
          avatarUrl: avatarUrl.trim(),
          dateOfBirth: dob || undefined,
          gender: gender || undefined,
          bloodGroup: bloodGroup || undefined,
          maritalStatus: maritalStatus || undefined,
          address: finalPermanent || undefined,
          permanentAddress: finalPermanent || undefined,
          currentAddress: finalCurrent || undefined,
          emergencyContact: emName.trim() ? {
            name: emName.trim(),
            relationship: emRelation.trim(),
            phone: emPhone.trim() || phone.trim()
          } : undefined,
          departmentId: departmentId || undefined,
          designationId: designationId || undefined,
          branchId: branchId || undefined,
          employmentType: (employmentType as EmploymentType) || 'Permanent',
          status: employmentStatus || 'Active',
          profileStatus: isDraft ? 'Draft' : completeness.percentage >= 85 ? 'Active' : 'Profile Incomplete',
          accountStatus: enableLoginAccess ? 'PENDING_ACTIVATION' : 'DISABLED',
          invitationStatus: enableLoginAccess ? 'PENDING_INVITE' : 'NOT_REQUIRED',
          employeeCategory: employeeCategory.trim() || undefined,
          dateOfJoining: dateOfJoining || new Date().toISOString().split('T')[0],
          confirmationDate: confirmationDate || undefined,
          noticePeriodDays: typeof noticePeriodDays === 'number' ? noticePeriodDays : undefined,
          probationPeriodDays: typeof probationPeriodDays === 'number' ? probationPeriodDays : undefined,
          reportingManagerId: reportingManagerId || undefined,
          shiftId: shiftId || undefined,
          bankDetails: (bankName.trim() || accountNumber.trim() || ifsc.trim()) ? {
            bankName: bankName.trim(),
            accountNumber: accountNumber.trim(),
            ifscOrRouting: ifsc.trim(),
            accountType: 'Savings'
          } : undefined,
          panOrTaxNumber: panNumber.trim() ? panNumber.trim().toUpperCase() : undefined,
          pfUan: pfUan.trim() || undefined,
          esiNumber: esiNumber.trim() || undefined,
          epfApplicable,
          epfWageCeilingApplied,
          esiApplicable,
          ptApplicable,
          statutoryExemptionReason: statutoryExemptionReason.trim() || undefined,
          baseSalaryAnnual: Number(baseSalaryAnnual) || 0,
          salaryStructureId: salaryStructureId || undefined
        },
        currentUser.id,
        currentUser.name
      );

      // Connect to Employee Service backend enrollment API
      if (isDraft) {
        const safeDraftEmail = (created.officialEmail && created.officialEmail.includes('@'))
          ? created.officialEmail
          : (created.email && created.email.includes('@'))
          ? created.email
          : `draft.${Date.now()}@orbyx.internal`;
        const draftRes = await employeeApi.createDraft({
          firstName: created.firstName,
          lastName: created.lastName || '',
          email: safeDraftEmail,
          phone: created.phone || '',
          userId: created.userId,
          departmentId: created.departmentId || undefined,
          designationId: created.designationId || undefined,
          branchId: created.branchId || undefined,
          employmentType: created.employmentType,
        });
        if (draftRes?.id) {
          created.id = draftRes.id;
        }
      } else {
        const enrollRes = await employeeApi.enroll({
          id: undefined,
          userId: created.userId,
          firstName: created.firstName,
          lastName: created.lastName,
          email: created.officialEmail || created.email,
          phone: created.phone,
          dateOfBirth: created.dateOfBirth,
          gender: created.gender as any,
          address: created.address,
          emergencyContact: {
            name: created.emergencyContact?.name || 'Primary Contact',
            relationship: created.emergencyContact?.relationship || 'Family',
            phone: created.emergencyContact?.phone || created.phone,
          },
          departmentId: created.departmentId,
          designationId: created.designationId,
          branchId: created.branchId,
          employmentType: created.employmentType,
          dateOfJoining: created.dateOfJoining,
          noticePeriodDays: created.noticePeriodDays,
          shiftId: created.shiftId,
          bankDetails: {
            accountNumber: created.bankDetails.accountNumber,
            ifscCode: created.bankDetails.ifscOrRouting,
            bankName: created.bankDetails.bankName,
          },
          panOrTaxNumber: created.panOrTaxNumber,
          pfUan: created.pfUan,
          esiNumber: created.esiNumber,
          baseSalaryAnnual: created.baseSalaryAnnual,
          salaryStructureId: created.salaryStructureId,
        });
        if (enrollRes?.id) {
          created.id = enrollRes.id;
        }
      }

      // Create initial Date of Joining Service Record
      db.saveServiceRecord({
        id: `SR-${created.id}-1`,
        employeeId: created.id,
        employeeName: `${created.firstName} ${created.lastName}`.trim(),
        recordType: 'Date of Joining',
        effectiveDate: created.dateOfJoining,
        newDesignation: designations.find((d) => d.id === created.designationId)?.title,
        newDepartment: departments.find((d) => d.id === created.departmentId)?.name,
        newReportingManager: allEmployees.find((e) => e.id === created.reportingManagerId)?.firstName,
        revisedSalary: created.baseSalaryAnnual,
        description: isDraft ? 'Initial draft employee onboarding record created.' : 'Completed employee onboarding and service record initialization.',
        createdBy: currentUser.name,
        approvedBy: currentUser.role === 'hr_admin' ? currentUser.name : undefined,
        createdDate: new Date().toISOString().split('T')[0],
        approvalStatus: isDraft ? 'Pending' : 'Approved'
      });

      // Save staged documents to vault
      if (stagedDocs.length > 0) {
        const vaultDocs = stagedDocs.map((doc, idx) => ({
          id: `DOC-${created.id}-${idx + 1}`,
          title: doc.name,
          category: doc.category,
          uploadedAt: created.dateOfJoining,
          issueDate: doc.issueDate || created.dateOfJoining,
          expiryDate: doc.expiryDate || '',
          status: 'Pending' as const,
          uploadedBy: currentUser.name
        }));
        localStorage.setItem(`celestial_extra_docs_${created.id}`, JSON.stringify(vaultDocs));
      }

      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to onboard employee.');
    }
  };

  const sections: { id: 'personal' | 'employment' | 'salary' | 'statutory' | 'documents'; label: string; icon: React.ElementType }[] = [
    { id: 'personal', label: '1. Personal & Contact', icon: User },
    { id: 'employment', label: '2. Employment & Org', icon: Briefcase },
    { id: 'salary', label: '3. Salary & Banking', icon: CreditCard },
    { id: 'statutory', label: '4. Statutory & Compliance', icon: ShieldCheck },
    { id: 'documents', label: '5. Documents Vault', icon: FileText }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Employee Onboarding Setup"
      description={`Comprehensive corporate employee registration - Assigned ID: ${nextId}`}
      maxWidth="3xl"
    >
      <div className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-1">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeTab === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveTab(sec.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* SECTION 1: PERSONAL & CONTACT */}
        {activeTab === 'personal' && (
          <div className="space-y-4 pt-1">
            <PhotoCaptureField
              value={avatarUrl}
              onChange={setAvatarUrl}
              label="Actual Employee Photograph (Optional - Webcam or File Upload)"
              placeholderInitials={firstName ? `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ''}`.toUpperCase() : undefined}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Employee ID <span className="text-slate-400 font-normal">(System Generated)</span>
                </label>
                <input
                  disabled
                  value={nextId}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 font-mono text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Priya"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Dharshini"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Official Work Email <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="email"
                  value={officialEmail}
                  onChange={(e) => setOfficialEmail(e.target.value)}
                  placeholder="name@orbyx.internal"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Personal Email <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  placeholder="personal@example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98410 12345"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>

            {/* HRMS Login Access Provisioning Control */}
            <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-start gap-3">
              <input
                type="checkbox"
                id="enableLoginAccess"
                checked={enableLoginAccess}
                onChange={(e) => setEnableLoginAccess(e.target.checked)}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 mt-0.5 cursor-pointer"
              />
              <div className="space-y-0.5">
                <label htmlFor="enableLoginAccess" className="font-semibold text-indigo-950 text-xs cursor-pointer">
                  Enable HRMS Login Access
                </label>
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  Automatically provision an HRMS user account and send an account activation email with a single-use setup link.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Marital Status</label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Select Marital Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Permanent Address <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={permanentAddress}
                  onChange={(e) => setPermanentAddress(e.target.value)}
                  placeholder="Door/Flat No, Street, Area, City, State, PIN"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sameAsPermanent"
                  checked={sameAsPermanent}
                  onChange={(e) => setSameAsPermanent(e.target.checked)}
                  className="h-3.5 w-3.5 rounded text-indigo-600"
                />
                <label htmlFor="sameAsPermanent" className="font-medium text-slate-700 text-[11px]">
                  Current address is same as permanent address
                </label>
              </div>

              {!sameAsPermanent && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Current Living Address</label>
                  <input
                    value={currentAddress}
                    onChange={(e) => setCurrentAddress(e.target.value)}
                    placeholder="Current residential address"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 block">Emergency Contact Details</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Contact Person Name</label>
                  <input
                    value={emName}
                    onChange={(e) => setEmName(e.target.value)}
                    placeholder="e.g. S. Ramachandran"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Relationship</label>
                  <select
                    value={emRelation}
                    onChange={(e) => setEmRelation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">Select Relationship</option>
                    <option value="Parent">Parent</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Friend">Friend</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Emergency Phone</label>
                  <input
                    value={emPhone}
                    onChange={(e) => setEmPhone(e.target.value)}
                    placeholder="+91 98410 99887"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: EMPLOYMENT & ORGANIZATION */}
        {activeTab === 'employment' && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department *</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.code ? `(${d.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Designation *</label>
                <select
                  value={designationId}
                  onChange={(e) => setDesignationId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Select Designation</option>
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} {d.level ? `[${d.level}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reporting Manager *</label>
                <select
                  value={reportingManagerId}
                  onChange={(e) => setReportingManagerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Select Manager</option>
                  {allEmployees.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch Location *</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employment Type *</label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Select Employment Type</option>
                  <option value="Permanent">Permanent</option>
                  <option value="Probation">Probation</option>
                  <option value="Contract">Contract</option>
                  <option value="Intern">Intern</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Work Shift *</label>
                <select
                  value={shiftId}
                  onChange={(e) => setShiftId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Select Shift</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} - {s.endTime})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date of Joining *</label>
                <input
                  type="date"
                  required
                  value={dateOfJoining}
                  onChange={(e) => setDateOfJoining(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employment Status</label>
                <select
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Select Status</option>
                  <option value="Active">Active</option>
                  <option value="Probation">Probation</option>
                  <option value="Notice Period">Notice Period</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employee Category</label>
                <input
                  value={employeeCategory}
                  onChange={(e) => setEmployeeCategory(e.target.value)}
                  placeholder="e.g. Core Engineering Staff"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Probation Period (Days)</label>
                <input
                  type="number"
                  value={probationPeriodDays}
                  placeholder="e.g. 180"
                  onChange={(e) => setProbationPeriodDays(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Notice Period (Days)</label>
                <input
                  type="number"
                  value={noticePeriodDays}
                  placeholder="e.g. 60"
                  onChange={(e) => setNoticePeriodDays(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Confirmation Date (Optional)</label>
                <input
                  type="date"
                  value={confirmationDate}
                  onChange={(e) => setConfirmationDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: SALARY AND BANKING */}
        {activeTab === 'salary' && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Annual CTC (INR) *</label>
                <input
                  type="number"
                  required
                  value={baseSalaryAnnual || ''}
                  onChange={(e) => setBaseSalaryAnnual(Number(e.target.value) || 0)}
                  placeholder="e.g. 1200000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono text-sm"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Monthly Gross Base: ₹{baseSalaryAnnual ? Math.round(Number(baseSalaryAnnual) / 12).toLocaleString('en-IN') : '0'}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Salary Structure *</label>
                <select
                  value={salaryStructureId}
                  onChange={(e) => setSalaryStructureId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Select Salary Structure</option>
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
              <span className="font-bold text-slate-800 block">Banking Details & PAN</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Bank Name *</label>
                  <input
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank Ltd"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Account Holder Name</label>
                  <input
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder={`${firstName} ${lastName}`.trim() || 'Account Holder Name'}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Account Number *</label>
                  <input
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 50100498761234"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">IFSC Code *</label>
                  <input
                    required
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0001234"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Income Tax PAN *</label>
                <input
                  required
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. ABCDE1234F"
                  maxLength={10}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono uppercase"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: STATUTORY AND COMPLIANCE */}
        {activeTab === 'statutory' && (
          <div className="space-y-4 pt-1">
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Employees' Provident Fund (EPF)</span>
                  <span className="text-[11px] text-slate-500">Statutory PF under EPFO (12% employee + 12% employer)</span>
                </div>
                <input
                  type="checkbox"
                  checked={epfApplicable}
                  onChange={(e) => setEpfApplicable(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600"
                />
              </div>

              {epfApplicable && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Universal Account Number (UAN)</label>
                    <input
                      value={pfUan}
                      onChange={(e) => setPfUan(e.target.value)}
                      placeholder="12-digit UAN"
                      maxLength={12}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="epfCeiling"
                      checked={epfWageCeilingApplied}
                      onChange={(e) => setEpfWageCeilingApplied(e.target.checked)}
                      className="h-3.5 w-3.5 rounded text-indigo-600"
                    />
                    <label htmlFor="epfCeiling" className="text-[11px] font-medium text-slate-700">
                      Restrict EPF to ₹15,000 monthly statutory basic wage ceiling
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Employees' State Insurance (ESI)</span>
                  <span className="text-[11px] text-slate-500">Applicable if gross salary is within ₹21,000/month threshold</span>
                </div>
                <input
                  type="checkbox"
                  checked={esiApplicable}
                  onChange={(e) => setEsiApplicable(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600"
                />
              </div>

              {esiApplicable && (
                <div className="pt-2 border-t border-slate-200/60">
                  <label className="block font-medium text-slate-700 mb-1">ESIC Insurance IP Number</label>
                  <input
                    value={esiNumber}
                    onChange={(e) => setEsiNumber(e.target.value)}
                    placeholder="17-digit ESIC IP number"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono"
                  />
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Professional Tax (PT)</span>
                  <span className="text-[11px] text-slate-500">State jurisdiction deductions (e.g. Karnataka PT ₹200/mo)</span>
                </div>
                <input
                  type="checkbox"
                  checked={ptApplicable}
                  onChange={(e) => setPtApplicable(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600"
                />
              </div>
            </div>

            {(!epfApplicable || !ptApplicable) && (
              <div>
                <label className="block font-medium text-slate-700 mb-1">Statutory Exemption Justification</label>
                <input
                  value={statutoryExemptionReason}
                  onChange={(e) => setStatutoryExemptionReason(e.target.value)}
                  placeholder="Reason for statutory exemption (e.g., Director / Contractual / Pre-existing exemption)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
            )}
          </div>
        )}

        {/* SECTION 5: EMPLOYEE DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-4 pt-1">
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
              <span className="font-bold text-slate-800 block">Add Document to Initial Vault</span>
              
              {uploadError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Hidden native file input triggered by Attach button */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category <span className="text-rose-500">*</span></label>
                  <select
                    value={newDocCategory}
                    onChange={(e) => {
                      setNewDocCategory(e.target.value as any);
                      setUploadError(null);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                  >
                    <option value="Offer Letter">Offer Letter</option>
                    <option value="Appointment Letter">Appointment Letter</option>
                    <option value="Joining Documents">Joining Documents</option>
                    <option value="Government ID Proof">Government ID Proof</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Address Proof">Address Proof</option>
                    <option value="Education Certificate">Education Certificate</option>
                    <option value="Previous Employment Documents">Previous Employment</option>
                    <option value="Other Organization Documents">Other Org Document</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">Document Title / File Name</label>
                  <input
                    value={newDocName}
                    onChange={(e) => {
                      setNewDocName(e.target.value);
                      setUploadError(null);
                    }}
                    placeholder="e.g. Aadhaar Card Front & Back.pdf"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                  />
                  {stagedFileBlob && (
                    <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
                      <Check className="h-3 w-3" /> Selected file: {stagedFileBlob.name} ({stagedFileBlob.size})
                    </p>
                  )}
                </div>

                <div className="flex items-end gap-1.5">
                  <button
                    type="button"
                    onClick={handleAttachClick}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors border border-slate-200"
                    title="Open file selector (PDF, JPG, PNG, DOC, XLS)"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Attach</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddDocument}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Stage</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Staged Documents List */}
            <div className="space-y-2">
              <span className="font-semibold text-slate-700 block">
                Staged Onboarding Documents ({stagedDocs.length})
              </span>

              {stagedDocs.length === 0 ? (
                <div className="p-4 text-center rounded-xl border border-dashed border-slate-200 text-slate-400">
                  No documents staged. Attach offer letters, identity proofs, or educational records above.
                </div>
              ) : (
                stagedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                      <div>
                        <span className="font-medium text-slate-800 block">{doc.name}</span>
                        <span className="text-[11px] text-slate-400">
                          {doc.category} - {doc.fileSize} - Initial Status: Pending Verification
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDoc(doc.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">
              Mandatory fields marked with <span className="text-rose-500 font-bold">*</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg border border-amber-200 transition-colors text-xs"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save as Draft / Incomplete</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition-colors text-xs"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Complete Onboarding</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
