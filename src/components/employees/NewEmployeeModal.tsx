import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { PhotoCaptureField } from '../common/PhotoCaptureField';
import { db } from '../../db/storage';
import { hrmsService } from '../../services/hrmsService';
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

  const nextId = hrmsService.generateNextEmployeeId();
  const departments = db.getDepartments();
  const designations = db.getDesignations();
  const branches = db.getBranches();
  const shifts = db.getShifts();
  const allEmployees = db.getEmployees();
  const structures = db.getSalaryStructures();

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
  const [dob, setDob] = useState('1996-01-01');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [maritalStatus, setMaritalStatus] = useState<'Single' | 'Married' | 'Other'>('Single');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [sameAsPermanent, setSameAsPermanent] = useState(true);

  // Emergency contact
  const [emName, setEmName] = useState('');
  const [emRelation, setEmRelation] = useState('Parent');
  const [emPhone, setEmPhone] = useState('');

  // -------------------------------------------------------------
  // Section 2: Employment & Organization Details
  // -------------------------------------------------------------
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || 'DEP-ENG');
  const [designationId, setDesignationId] = useState(designations[0]?.id || 'DES-SWE');
  const [branchId, setBranchId] = useState(branches[0]?.id || 'BR-BLR');
  const [shiftId, setShiftId] = useState(shifts[0]?.id || 'SHIFT-GEN');
  const [reportingManagerId, setReportingManagerId] = useState(allEmployees[1]?.id || 'EMP-002');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('Permanent');
  const [employeeCategory, setEmployeeCategory] = useState('Core Engineering Staff');
  const [employmentStatus, setEmploymentStatus] = useState<'Active' | 'Probation' | 'Notice Period'>('Active');
  const [dateOfJoining, setDateOfJoining] = useState(new Date().toISOString().split('T')[0]);
  const [confirmationDate, setConfirmationDate] = useState('');
  const [noticePeriodDays, setNoticePeriodDays] = useState(60);
  const [probationPeriodDays, setProbationPeriodDays] = useState(180);

  // -------------------------------------------------------------
  // Section 3: Salary and Banking Details
  // -------------------------------------------------------------
  const [baseSalaryAnnual, setBaseSalaryAnnual] = useState(1200000);
  const [salaryStructureId, setSalaryStructureId] = useState(structures[0]?.id || 'SS-ENG-LEAD');
  const [bankName, setBankName] = useState('HDFC Bank Ltd');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('HDFC0001234');
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
  const [stagedDocs, setStagedDocs] = useState<StagedDoc[]>([
    {
      id: 'DOC-INIT-1',
      name: 'Signed Offer Letter',
      category: 'Offer Letter',
      fileName: 'Signed_Offer_Letter.pdf',
      fileSize: '420 KB',
      issueDate: new Date().toISOString().split('T')[0]
    }
  ]);
  const [newDocCategory, setNewDocCategory] = useState<DocumentCategory>('ID Proof');
  const [newDocName, setNewDocName] = useState('');
  const [newDocIssueDate, setNewDocIssueDate] = useState('');
  const [newDocExpiryDate, setNewDocExpiryDate] = useState('');

  const [error, setError] = useState<string | null>(null);

  // Completeness Preview
  const previewEmp: Partial<Employee> = {
    firstName,
    lastName,
    email: officialEmail,
    phone,
    dateOfBirth: dob,
    gender,
    bloodGroup,
    address: permanentAddress,
    departmentId,
    designationId,
    branchId,
    employmentType,
    dateOfJoining,
    bankDetails: {
      bankName,
      accountNumber,
      ifscOrRouting: ifsc,
      accountType: 'Savings'
    },
    panOrTaxNumber: panNumber,
    baseSalaryAnnual,
    emergencyContact: {
      name: emName,
      relationship: emRelation,
      phone: emPhone
    },
    epfApplicable,
    ptApplicable
  };

  const completeness = calculateProfileCompleteness(previewEmp);

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;
    const doc: StagedDoc = {
      id: `DOC-STAGE-${Date.now()}`,
      name: newDocName.trim(),
      category: newDocCategory,
      fileName: `${newDocName.trim().replace(/\s+/g, '_')}.pdf`,
      fileSize: '350 KB',
      issueDate: newDocIssueDate || undefined,
      expiryDate: newDocExpiryDate || undefined
    };
    setStagedDocs([...stagedDocs, doc]);
    setNewDocName('');
    setNewDocIssueDate('');
    setNewDocExpiryDate('');
  };

  const handleRemoveDoc = (id: string) => {
    setStagedDocs(stagedDocs.filter((d) => d.id !== id));
  };

  const handleSave = (isDraft: boolean) => {
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
      if (completeness.missingFields.length > 0 && completeness.percentage < 70) {
        setError(`Please complete mandatory onboarding information. Missing: ${completeness.missingFields.slice(0, 3).join(', ')}.`);
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

      const created = hrmsService.createEmployee(
        {
          userId: `user_${(firstName || 'draft').toLowerCase()}_${Math.floor(Math.random() * 1000)}`,
          firstName: firstName.trim() || 'Draft',
          lastName: lastName.trim(),
          email: officialEmail.trim() || `pending_${Date.now()}@orbyx.internal`,
          officialEmail: officialEmail.trim(),
          personalEmail: personalEmail.trim() || undefined,
          phone: phone.trim() || 'Pending',
          officialPhone: phone.trim(),
          avatarUrl: avatarUrl.trim(),
          dateOfBirth: dob,
          gender,
          bloodGroup,
          maritalStatus,
          address: finalPermanent,
          permanentAddress: finalPermanent,
          currentAddress: finalCurrent,
          emergencyContact: {
            name: emName.trim() || 'Pending HR Verification',
            relationship: emRelation,
            phone: emPhone.trim() || phone.trim()
          },
          departmentId,
          designationId,
          branchId,
          employmentType,
          status: employmentStatus,
          profileStatus: isDraft ? 'Draft' : completeness.percentage >= 85 ? 'Active' : 'Profile Incomplete',
          employeeCategory,
          dateOfJoining,
          confirmationDate: confirmationDate || undefined,
          noticePeriodDays,
          probationPeriodDays,
          reportingManagerId,
          shiftId,
          bankDetails: {
            bankName: bankName.trim() || 'Pending Collection',
            accountNumber: accountNumber.trim() || 'PENDING',
            ifscOrRouting: ifsc.trim() || 'PENDING',
            accountType: 'Savings'
          },
          panOrTaxNumber: (panNumber.trim() || 'PENDING').toUpperCase(),
          pfUan: pfUan.trim() || undefined,
          esiNumber: esiNumber.trim() || undefined,
          epfApplicable,
          epfWageCeilingApplied,
          esiApplicable,
          ptApplicable,
          statutoryExemptionReason: statutoryExemptionReason.trim() || undefined,
          baseSalaryAnnual: Number(baseSalaryAnnual) || 0,
          salaryStructureId
        },
        currentUser.id,
        currentUser.name
      );

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
        localStorage.setItem(`orbyx_extra_docs_${created.id}`, JSON.stringify(vaultDocs));
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
      description={`Comprehensive corporate employee registration — Assigned ID: ${nextId}`}
      maxWidth="3xl"
    >
      <div className="space-y-4 text-xs">
        {/* Progress & Completeness Banner */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Profile Data Completeness:</span>
              <span className={`px-2 py-0.5 rounded font-semibold ${
                completeness.percentage >= 85
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : completeness.percentage >= 50
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {completeness.percentage}% — {completeness.status}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Assigned ID: {nextId}</span>
          </div>

          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                completeness.percentage >= 85 ? 'bg-emerald-500' : completeness.percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${completeness.percentage}%` }}
            />
          </div>

          {completeness.missingFields.length > 0 && (
            <p className="text-[11px] text-slate-500 truncate">
              <span className="font-semibold text-slate-700">Pending Information:</span> {completeness.missingFields.slice(0, 6).join(', ')}
              {completeness.missingFields.length > 6 ? ` +${completeness.missingFields.length - 6} more` : ''}
            </p>
          )}
        </div>

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
              label="Actual Employee Photograph (Webcam or File Upload)"
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
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
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
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} [{d.level}]
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
                  onChange={(e) => setProbationPeriodDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Notice Period (Days)</label>
                <input
                  type="number"
                  value={noticePeriodDays}
                  onChange={(e) => setNoticePeriodDays(Number(e.target.value))}
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
                  value={baseSalaryAnnual}
                  onChange={(e) => setBaseSalaryAnnual(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono text-sm"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Monthly Gross Base: ₹{Math.round(baseSalaryAnnual / 12).toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Salary Structure *</label>
                <select
                  value={salaryStructureId}
                  onChange={(e) => setSalaryStructureId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
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
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={newDocCategory}
                    onChange={(e) => setNewDocCategory(e.target.value as any)}
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
                    onChange={(e) => setNewDocName(e.target.value)}
                    placeholder="e.g. Aadhaar Card Front & Back.pdf"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddDocument}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Attach</span>
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
                          {doc.category} — {doc.fileSize} — Initial Status: Pending Verification
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
