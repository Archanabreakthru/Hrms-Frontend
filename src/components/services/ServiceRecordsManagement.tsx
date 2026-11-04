import React, { useState, useEffect } from 'react';
import { db, subscribeToDB } from '../../db/storage';
import { ServiceRecord, ServiceRecordType, Employee, EmploymentType } from '../../types/hrms';
import { useAuth } from '../../services/authContext';
import { permissionService } from '../../services/permissionService';
import { calculateServiceYears } from '../../utils/profileUtils';
import { Avatar } from '../common/Avatar';
import {
  Award,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Calendar,
  User,
  GitFork,
  Briefcase,
  CreditCard,
  Building2,
  MapPin,
  Check,
  X,
  Eye,
  ChevronRight,
  TrendingUp,
  History,
  FileText,
  Download,
  ShieldCheck,
  ArrowUpRight,
  ChevronDown,
  Layers,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

export const ServiceRecordsManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [dbTick, setDbTick] = useState(0);

  // Subscribe to DB updates
  useEffect(() => {
    return subscribeToDB(() => setDbTick((t) => t + 1));
  }, []);

  const allEmployees = db.getEmployees();
  const departments = db.getDepartments();
  const designations = db.getDesignations();
  const branches = db.getBranches();

  // Role permissions
  const isHR = currentUser.role === 'hr_admin';
  const isSeniorManager = currentUser.role === 'senior_manager';
  const isReportingManager = currentUser.role === 'reporting_manager';
  const isRegularEmployee = currentUser.role === 'employee';

  const canApprove = permissionService.canApproveServiceRecords(currentUser);
  const canAddRecord = isHR || isSeniorManager || isReportingManager;

  // Strict backend-style data filtering:
  // - HR Admin / Senior Manager: All organization employees
  // - Reporting Manager: Direct and indirect reportees + self
  // - Regular Employee: ONLY self (empId matches currentUser.employeeId)
  const getPermittedEmployees = (): Employee[] => {
    if (isHR || isSeniorManager) {
      return allEmployees;
    }
    if (isReportingManager) {
      return allEmployees.filter(
        (e) => e.reportingManagerId === currentUser.employeeId || e.id === currentUser.employeeId
      );
    }
    // Strict isolation for regular employees
    return allEmployees.filter((e) => e.id === currentUser.employeeId);
  };

  const permittedEmployees = getPermittedEmployees();
  const permittedEmpIds = new Set(permittedEmployees.map((e) => e.id));

  // Active Selected Employee for Detailed View
  const [selectedEmpId, setSelectedEmpId] = useState<string>(() => {
    if (isRegularEmployee) return currentUser.employeeId;
    return permittedEmployees[0]?.id || currentUser.employeeId;
  });

  // Ensure selectedEmpId cannot be hijacked or out of permitted bounds
  const activeEmployee: Employee | undefined =
    permittedEmployees.find((e) => e.id === selectedEmpId) || permittedEmployees[0];

  // Raw records filtered strictly by permitted scope
  const rawRecords = db.getServiceRecords().filter((r) => permittedEmpIds.has(r.employeeId));

  // Employee-specific service history records
  const employeeRecords = activeEmployee
    ? rawRecords
        .filter((r) => r.employeeId === activeEmployee.id)
        .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())
    : [];

  // Search & Filter state for Employee List / Timeline
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [selectedDesigFilter, setSelectedDesigFilter] = useState('ALL');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');

  // Expanded Event Detail Modal / Lightbox
  const [inspectedEvent, setInspectedEvent] = useState<ServiceRecord | null>(null);

  // Add Service Record Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formEmpId, setFormEmpId] = useState<string>(() => activeEmployee?.id || currentUser.employeeId);
  const [srType, setSrType] = useState<ServiceRecordType>('Promotion');
  const [srEffectiveDate, setSrEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [srPrevDesig, setSrPrevDesig] = useState('');
  const [srNewDesig, setSrNewDesig] = useState('');
  const [srPrevDept, setSrPrevDept] = useState('');
  const [srNewDept, setSrNewDept] = useState('');
  const [srPrevBranch, setSrPrevBranch] = useState('');
  const [srNewBranch, setSrNewBranch] = useState('');
  const [srPrevManager, setSrPrevManager] = useState('');
  const [srNewManager, setSrNewManager] = useState('');
  const [srPrevEmpType, setSrPrevEmpType] = useState<EmploymentType>('Permanent');
  const [srNewEmpType, setSrNewEmpType] = useState<EmploymentType>('Permanent');
  const [srPrevSalary, setSrPrevSalary] = useState<number | ''>('');
  const [srRevisedSalary, setSrRevisedSalary] = useState<number | ''>('');
  const [srSalaryRevisionType, setSrSalaryRevisionType] = useState<'Annual Increment' | 'Promotion Adjustment' | 'Market Correction' | 'Band Realignment'>('Annual Increment');
  const [srProbationDays, setSrProbationDays] = useState<number>(180);
  const [srConfirmationStatus, setSrConfirmationStatus] = useState<'Confirmed' | 'Extended' | 'Under Review'>('Confirmed');
  const [srReason, setSrReason] = useState('');
  const [srRemarks, setSrRemarks] = useState('');
  const [srDocName, setSrDocName] = useState('');
  const [srDocBlob, setSrDocBlob] = useState<{ name: string; size: string; dataUrl: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [actionNotice, setActionNotice] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Target employee for Add Modal
  const formTargetEmployee = allEmployees.find((e) => e.id === formEmpId);

  // Prefill defaults when formEmpId changes
  useEffect(() => {
    if (formTargetEmployee) {
      const d = designations.find((x) => x.id === formTargetEmployee.designationId);
      const dp = departments.find((x) => x.id === formTargetEmployee.departmentId);
      const b = branches.find((x) => x.id === formTargetEmployee.branchId);
      const m = allEmployees.find((x) => x.id === formTargetEmployee.reportingManagerId);
      setSrPrevDesig(d?.title || '');
      setSrPrevDept(dp?.name || '');
      setSrPrevBranch(b?.name || '');
      setSrPrevManager(m ? `${m.firstName} ${m.lastName}` : '');
      setSrPrevEmpType(formTargetEmployee.employmentType || 'Permanent');
      setSrPrevSalary(formTargetEmployee.baseSalaryAnnual || '');
    }
  }, [formEmpId]);

  // Filtered staff list for HR / Senior Managers to pick from
  const filteredStaffList = permittedEmployees.filter((emp) => {
    if (selectedDeptFilter !== 'ALL' && emp.departmentId !== selectedDeptFilter) return false;
    if (selectedDesigFilter !== 'ALL' && emp.designationId !== selectedDesigFilter) return false;
    if (selectedBranchFilter !== 'ALL' && emp.branchId !== selectedBranchFilter) return false;
    if (selectedStatusFilter !== 'ALL' && emp.status !== selectedStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q);
      const matchId = emp.id.toLowerCase().includes(q);
      const matchEmail = (emp.officialEmail || emp.email).toLowerCase().includes(q);
      if (!matchName && !matchId && !matchEmail) return false;
    }
    return true;
  });

  // Filtered timeline events for the active employee
  const filteredTimelineEvents = employeeRecords.filter((rec) => {
    if (selectedTypeFilter !== 'ALL' && rec.recordType !== selectedTypeFilter) return false;
    return true;
  });

  // Check if current user can view compensation details for active employee
  const canViewCTC =
    isHR ||
    (isSeniorManager && (currentUser.employeeId === activeEmployee?.id || isHR)) ||
    currentUser.employeeId === activeEmployee?.id;

  // Handle Event Creation
  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formTargetEmployee) {
      setFormError('Please select a valid employee.');
      return;
    }

    if (!srEffectiveDate) {
      setFormError('Effective date is mandatory.');
      return;
    }

    const newRecord: ServiceRecord = {
      id: `SR-${formTargetEmployee.id}-${Date.now()}`,
      employeeId: formTargetEmployee.id,
      employeeName: `${formTargetEmployee.firstName} ${formTargetEmployee.lastName}`.trim(),
      recordType: srType,
      effectiveDate: srEffectiveDate,
      previousDesignation: srPrevDesig || undefined,
      newDesignation: srNewDesig || undefined,
      previousDepartment: srPrevDept || undefined,
      newDepartment: srNewDept || undefined,
      previousReportingManager: srPrevManager || undefined,
      newReportingManager: srNewManager || undefined,
      previousBranch: srPrevBranch || undefined,
      newBranch: srNewBranch || undefined,
      previousEmploymentType: srPrevEmpType,
      newEmploymentType: srNewEmpType,
      previousSalary: srPrevSalary ? Number(srPrevSalary) : undefined,
      revisedSalary: srRevisedSalary ? Number(srRevisedSalary) : undefined,
      salaryRevisionType: srType === 'Salary Revision' ? srSalaryRevisionType : undefined,
      probationDurationDays: srType === 'Probation Completion' || srType === 'Employment Confirmation' ? srProbationDays : undefined,
      confirmationStatus: srType === 'Employment Confirmation' ? srConfirmationStatus : undefined,
      description: srRemarks || undefined,
      reason: srReason || undefined,
      supportingDocument: srDocName || (srDocBlob ? srDocBlob.name : undefined),
      documentCategory: srType,
      documentUrl: srDocBlob?.dataUrl,
      createdBy: `${currentUser.name} (${currentUser.role})`,
      approvedBy: isHR ? currentUser.name : undefined,
      createdDate: new Date().toISOString().split('T')[0],
      approvalStatus: isHR ? 'Approved' : 'Pending',
      approvalDate: isHR ? new Date().toISOString().split('T')[0] : undefined
    };

    db.saveServiceRecord(newRecord);

    // If auto-approved by HR, synchronize with employee master
    if (isHR) {
      const rawEmp = db.getEmployeeById(formTargetEmployee.id);
      if (rawEmp) {
        let updated = false;
        let patch = { ...rawEmp };

        if (srNewDesig) {
          const matchD = designations.find((d) => d.title.toLowerCase() === srNewDesig.toLowerCase());
          if (matchD) {
            patch.designationId = matchD.id;
            updated = true;
          }
        }
        if (srNewDept) {
          const matchDp = departments.find((dp) => dp.name.toLowerCase() === srNewDept.toLowerCase());
          if (matchDp) {
            patch.departmentId = matchDp.id;
            updated = true;
          }
        }
        if (srNewBranch) {
          const matchB = branches.find((b) => b.name.toLowerCase() === srNewBranch.toLowerCase());
          if (matchB) {
            patch.branchId = matchB.id;
            updated = true;
          }
        }
        if (srRevisedSalary) {
          patch.baseSalaryAnnual = Number(srRevisedSalary);
          updated = true;
        }
        if (srType === 'Employment Confirmation' && srConfirmationStatus === 'Confirmed') {
          patch.status = 'Active';
          patch.confirmationDate = srEffectiveDate;
          updated = true;
        }
        if (updated) {
          db.saveEmployee(patch);
        }
      }
    }

    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      module: 'EMPLOYEE',
      action: 'CREATE',
      entityId: formTargetEmployee.id,
      entityName: `${formTargetEmployee.firstName} ${formTargetEmployee.lastName}`,
      description: `Logged official service milestone "${srType}" effective ${srEffectiveDate} for ${formTargetEmployee.id}`
    });

    setActionNotice(`Service milestone "${srType}" recorded successfully!`);
    setShowAddModal(false);
    setSrRemarks('');
    setSrReason('');
    setSrNewDesig('');
    setSrNewDept('');
    setSrNewManager('');
    setSrNewBranch('');
    setSrRevisedSalary('');
    setSrDocBlob(null);
    setSrDocName('');
    setTimeout(() => setActionNotice(''), 3500);
  };

  // Handle HR Approval
  const handleUpdateStatus = (rec: ServiceRecord, status: 'Approved' | 'Rejected') => {
    if (!canApprove) return;

    const allRecs = db.getServiceRecords();
    const updatedList = allRecs.map((r) =>
      r.id === rec.id
        ? {
            ...r,
            approvalStatus: status,
            approvedBy: currentUser.name,
            approvalDate: new Date().toISOString().split('T')[0]
          }
        : r
    );
    localStorage.setItem('orbyx_hrms_v3_serviceRecords', JSON.stringify(updatedList));

    if (status === 'Approved') {
      const rawEmp = db.getEmployeeById(rec.employeeId);
      if (rawEmp) {
        let changed = false;
        let nextEmp = { ...rawEmp };

        if (rec.newDesignation) {
          const matchD = designations.find(
            (d) => d.title.toLowerCase() === rec.newDesignation!.toLowerCase()
          );
          if (matchD) {
            nextEmp.designationId = matchD.id;
            changed = true;
          }
        }
        if (rec.revisedSalary) {
          nextEmp.baseSalaryAnnual = Number(rec.revisedSalary);
          changed = true;
        }
        if (rec.newDepartment) {
          const matchDp = departments.find(
            (dp) => dp.name.toLowerCase() === rec.newDepartment!.toLowerCase()
          );
          if (matchDp) {
            nextEmp.departmentId = matchDp.id;
            changed = true;
          }
        }
        if (changed) {
          db.saveEmployee(nextEmp);
        }
      }
    }

    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      module: 'EMPLOYEE',
      action: status === 'Approved' ? 'APPROVE' : 'REJECT',
      entityId: rec.employeeId,
      entityName: rec.employeeName || rec.employeeId,
      description: `Marked service record "${rec.recordType}" (${rec.id}) as ${status} by ${currentUser.name}`
    });

    setActionNotice(`Service milestone ${rec.id} marked as ${status}.`);
    if (inspectedEvent?.id === rec.id) {
      setInspectedEvent({
        ...rec,
        approvalStatus: status,
        approvedBy: currentUser.name,
        approvalDate: new Date().toISOString().split('T')[0]
      });
    }
    setDbTick((t) => t + 1);
    setTimeout(() => setActionNotice(''), 3000);
  };

  // Active Employee Metadata Lookups
  const activeDept = departments.find((d) => d.id === activeEmployee?.departmentId);
  const activeDesig = designations.find((d) => d.id === activeEmployee?.designationId);
  const activeBranch = branches.find((b) => b.id === activeEmployee?.branchId);
  const activeManager = allEmployees.find((e) => e.id === activeEmployee?.reportingManagerId);
  const activeTenure = activeEmployee ? calculateServiceYears(activeEmployee.dateOfJoining) : null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* SECTION 1: HEADER & ACTION BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Award className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {isRegularEmployee ? 'My Employment Service History' : 'Service Records & Career Milestones'}
              </h2>
              <p className="text-xs font-medium text-slate-600 mt-0.5">
                {isRegularEmployee
                  ? 'Official chronological timeline of your appointments, confirmations, promotions, and recognition at Orbyx.'
                  : 'Organization-wide official career histories, appointments, promotions, transfers, compensation revisions, and work anniversaries.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canAddRecord && (
            <button
              onClick={() => {
                setShowAddModal(true);
                setFormError('');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Record Career Milestone</span>
            </button>
          )}
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* SECTION 2: MAIN DUAL-PANE OR SINGLE-PANE WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: STAFF SELECTOR (Visible for HR, Senior Management & Reporting Managers) */}
        {!isRegularEmployee && (
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-300 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" />
                <span>Select Employee ({filteredStaffList.length})</span>
              </span>
            </div>

            {/* Quick Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search staff by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>

                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Probation">Probation</option>
                  <option value="Notice Period">Notice Period</option>
                </select>
              </div>
            </div>

            {/* Staff Roster List */}
            <div className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto pr-1">
              {filteredStaffList.length === 0 ? (
                <div className="p-6 text-center text-slate-600 text-xs">
                  No employees match the active filters.
                </div>
              ) : (
                filteredStaffList.map((emp) => {
                  const empDesig = designations.find((d) => d.id === emp.designationId);
                  const isSelected = emp.id === activeEmployee?.id;
                  const empRecCount = rawRecords.filter((r) => r.employeeId === emp.id).length;

                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setSelectedEmpId(emp.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-indigo-50 border border-indigo-300 text-indigo-950 font-semibold shadow-xs'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          src={emp.avatarUrl}
                          firstName={emp.firstName}
                          lastName={emp.lastName}
                          size="sm"
                          className="ring-2 ring-white shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div className="text-[11px] text-slate-600 font-medium truncate">
                            {empDesig?.title || 'Staff'} · <span className="font-mono text-slate-700">{emp.id}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                          {empRecCount} events
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: DETAILED EMPLOYEE SERVICE RECORD WORKSPACE */}
        <div className={`${isRegularEmployee ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-6`}>
          {activeEmployee ? (
            <>
              {/* EMPLOYEE OVERVIEW CARD */}
              <div className="bg-white rounded-2xl border border-slate-300 shadow-xs p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200">
                  <div className="flex items-start gap-4">
                    <Avatar
                      src={activeEmployee.avatarUrl}
                      firstName={activeEmployee.firstName}
                      lastName={activeEmployee.lastName}
                      size="lg"
                      className="ring-4 ring-indigo-50 shadow-xs"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          {activeEmployee.firstName} {activeEmployee.lastName}
                        </h3>
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {activeEmployee.id}
                        </span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                          {activeEmployee.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 mt-1">
                        {activeDesig?.title || 'Staff'} · <span className="text-slate-600 font-medium">{activeDept?.name}</span>
                      </p>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">
                        Reporting to: <span className="font-bold text-slate-800">{activeManager ? `${activeManager.firstName} ${activeManager.lastName}` : 'Executive Leadership'}</span> · Location: <span className="font-bold text-slate-800">{activeBranch?.name || 'Headquarters'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Tenure Highlights */}
                  {activeTenure && (
                    <div className="flex flex-col sm:items-end gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Service Association</span>
                      <span className="text-base font-extrabold text-indigo-900">{activeTenure.displayText}</span>
                      <span className="text-slate-600 font-medium text-[11px]">
                        Joined on <span className="font-bold text-slate-800">{activeEmployee.dateOfJoining}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Core Attributes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">Employment Type</span>
                    <span className="font-bold text-slate-900 text-xs mt-0.5 block">{activeEmployee.employmentType}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">Work Arrangement</span>
                    <span className="font-bold text-slate-900 text-xs mt-0.5 block">{activeEmployee.shiftId || 'General Shift'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">Next Work Anniversary</span>
                    <span className="font-bold text-amber-800 text-xs mt-0.5 block">
                      {activeTenure?.nextAnniversaryDate} ({activeTenure?.daysUntilNextAnniversary}d)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">Current Annual CTC</span>
                    <span className="font-bold font-mono text-emerald-800 text-xs mt-0.5 block">
                      {canViewCTC ? `₹${(activeEmployee.baseSalaryAnnual || 0).toLocaleString('en-IN')}` : 'Confidential'}
                    </span>
                  </div>
                </div>
              </div>

              {/* TIMELINE CONTROLS & CHRONOLOGICAL HISTORY */}
              <div className="bg-white rounded-2xl border border-slate-300 shadow-xs p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Layers className="h-4 w-4 text-indigo-600" />
                      <span>Chronological Career Timeline ({filteredTimelineEvents.length} Milestones)</span>
                    </h4>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">
                      Detailed chronological log of appointments, probation completion, designations, compensation, and department records.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTypeFilter}
                      onChange={(e) => setSelectedTypeFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                    >
                      <option value="ALL">All Event Types</option>
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

                    {selectedTypeFilter !== 'ALL' && (
                      <button
                        onClick={() => setSelectedTypeFilter('ALL')}
                        className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg"
                        title="Clear event filter"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Timeline Items */}
                {filteredTimelineEvents.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl space-y-1">
                    <Award className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700">No service events recorded for this criteria.</p>
                    <p className="text-slate-500">Add an event above or switch filters to view historical records.</p>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-indigo-100">
                    {filteredTimelineEvents.map((rec) => {
                      const isApproved = rec.approvalStatus === 'Approved';
                      const isPending = rec.approvalStatus === 'Pending';
                      const isRejected = rec.approvalStatus === 'Rejected';

                      return (
                        <div key={rec.id} className="relative group">
                          {/* Dot indicator */}
                          <div
                            className={`absolute -left-6 top-1.5 h-5 w-5 rounded-full border-2 bg-white flex items-center justify-center ${
                              isApproved
                                ? 'border-emerald-600 text-emerald-600'
                                : isPending
                                ? 'border-amber-500 text-amber-500'
                                : 'border-rose-600 text-rose-600'
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isApproved
                                  ? 'bg-emerald-600'
                                  : isPending
                                  ? 'bg-amber-500'
                                  : 'bg-rose-600'
                              }`}
                            />
                          </div>

                          {/* Card Content */}
                          <div className="p-4 rounded-xl border border-slate-300 bg-white hover:border-indigo-400 transition-all shadow-xs space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-slate-900 text-sm">{rec.recordType}</span>
                                  <span
                                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                      isApproved
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : isPending
                                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                                        : 'bg-rose-50 text-rose-800 border-rose-300'
                                    }`}
                                  >
                                    {rec.approvalStatus}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                                  Effective Date: <span className="font-bold text-slate-900 font-mono">{rec.effectiveDate}</span> · Recorded by <span className="font-medium text-slate-800">{rec.createdBy}</span>
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setInspectedEvent(rec)}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold rounded-lg text-xs transition-colors"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>View Details</span>
                                </button>

                                {canApprove && isPending && (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStatus(rec, 'Approved')}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStatus(rec, 'Rejected')}
                                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg text-xs transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Milestone Details Summary */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                              {rec.newDesignation && (
                                <div>
                                  <span className="text-slate-500 font-bold block text-[11px]">Designation</span>
                                  <span className="font-bold text-slate-900">
                                    {rec.previousDesignation ? `${rec.previousDesignation} → ` : ''}
                                    {rec.newDesignation}
                                  </span>
                                </div>
                              )}

                              {rec.newDepartment && (
                                <div>
                                  <span className="text-slate-500 font-bold block text-[11px]">Department</span>
                                  <span className="font-bold text-slate-900">
                                    {rec.previousDepartment ? `${rec.previousDepartment} → ` : ''}
                                    {rec.newDepartment}
                                  </span>
                                </div>
                              )}

                              {rec.newReportingManager && (
                                <div>
                                  <span className="text-slate-500 font-bold block text-[11px]">Reporting Manager</span>
                                  <span className="font-bold text-slate-900">
                                    {rec.previousReportingManager ? `${rec.previousReportingManager} → ` : ''}
                                    {rec.newReportingManager}
                                  </span>
                                </div>
                              )}

                              {rec.revisedSalary && canViewCTC && (
                                <div>
                                  <span className="text-slate-500 font-bold block text-[11px]">Annual CTC Revision</span>
                                  <span className="font-bold font-mono text-emerald-800">
                                    {rec.previousSalary ? `₹${rec.previousSalary.toLocaleString('en-IN')} → ` : ''}
                                    ₹{rec.revisedSalary.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              )}

                              {rec.reason && (
                                <div className="sm:col-span-2">
                                  <span className="text-slate-500 font-bold block text-[11px]">Event Reason</span>
                                  <span className="font-semibold text-slate-800">{rec.reason}</span>
                                </div>
                              )}

                              {rec.description && (
                                <div className="sm:col-span-2">
                                  <span className="text-slate-500 font-bold block text-[11px]">Remarks / Description</span>
                                  <span className="font-medium text-slate-700 italic">{rec.description}</span>
                                </div>
                              )}
                            </div>

                            {/* Attached Supporting Document */}
                            {rec.supportingDocument && (
                              <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-indigo-700 shrink-0" />
                                  <span className="font-bold text-indigo-950">{rec.supportingDocument}</span>
                                  <span className="text-[11px] text-indigo-700 font-medium">({rec.documentCategory || 'Official Document'})</span>
                                </div>
                                {rec.documentUrl && (
                                  <a
                                    href={rec.documentUrl}
                                    download={rec.supportingDocument}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 underline"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    <span>Download</span>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs text-slate-600">
              Please select an employee to view their service history.
            </div>
          )}
        </div>
      </div>

      {/* DETAILED EVENT INSPECTION MODAL */}
      {inspectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-300 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">{inspectedEvent.recordType}</h4>
                  <p className="text-xs font-medium text-slate-600">
                    Milestone Identifier: <span className="font-mono font-bold text-slate-800">{inspectedEvent.id}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedEvent(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 text-base"
              >
                ✕
              </button>
            </div>

            {/* Event Content Details */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 font-bold block text-[11px]">Employee</span>
                  <span className="font-bold text-slate-900 text-xs mt-0.5 block">{inspectedEvent.employeeName}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block text-[11px]">Effective Date</span>
                  <span className="font-bold text-slate-900 font-mono text-xs mt-0.5 block">{inspectedEvent.effectiveDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block text-[11px]">Approval Status</span>
                  <span
                    className={`inline-block font-bold px-2 py-0.5 rounded text-xs mt-0.5 border ${
                      inspectedEvent.approvalStatus === 'Approved'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : inspectedEvent.approvalStatus === 'Pending'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}
                  >
                    {inspectedEvent.approvalStatus}
                  </span>
                </div>
              </div>

              {/* Event specific comparisons */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 text-xs block border-b border-slate-100 pb-1.5">
                  Milestone Audit & Changes
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {inspectedEvent.newDesignation && (
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-slate-500 font-bold block text-[11px]">Designation Shift</span>
                      <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                        {inspectedEvent.previousDesignation || 'Initial'} → {inspectedEvent.newDesignation}
                      </span>
                    </div>
                  )}

                  {inspectedEvent.newDepartment && (
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-slate-500 font-bold block text-[11px]">Department Transfer</span>
                      <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                        {inspectedEvent.previousDepartment || 'Initial'} → {inspectedEvent.newDepartment}
                      </span>
                    </div>
                  )}

                  {inspectedEvent.newReportingManager && (
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-slate-500 font-bold block text-[11px]">Manager Realignment</span>
                      <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                        {inspectedEvent.previousReportingManager || 'Unassigned'} → {inspectedEvent.newReportingManager}
                      </span>
                    </div>
                  )}

                  {inspectedEvent.revisedSalary && canViewCTC && (
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-slate-500 font-bold block text-[11px]">
                        Annual CTC Revision ({inspectedEvent.salaryRevisionType || 'Revision'})
                      </span>
                      <span className="font-bold font-mono text-emerald-800 text-xs mt-0.5 block">
                        {inspectedEvent.previousSalary ? `₹${inspectedEvent.previousSalary.toLocaleString('en-IN')} → ` : ''}
                        ₹{inspectedEvent.revisedSalary.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  {inspectedEvent.confirmationStatus && (
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-slate-500 font-bold block text-[11px]">Confirmation Assessment</span>
                      <span className="font-bold text-indigo-900 text-xs mt-0.5 block">
                        Status: {inspectedEvent.confirmationStatus} ({inspectedEvent.probationDurationDays || 180} days probation)
                      </span>
                    </div>
                  )}
                </div>

                {inspectedEvent.reason && (
                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">Official Reason</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{inspectedEvent.reason}</p>
                  </div>
                )}

                {inspectedEvent.description && (
                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">Remarks & Documentation Details</span>
                    <p className="font-medium text-slate-700 italic mt-0.5">{inspectedEvent.description}</p>
                  </div>
                )}
              </div>

              {/* Supporting Document */}
              {inspectedEvent.supportingDocument && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-700 shrink-0" />
                    <div>
                      <span className="font-bold text-indigo-950 block">{inspectedEvent.supportingDocument}</span>
                      <span className="text-[11px] text-indigo-700 font-medium">Attached Milestone Credential</span>
                    </div>
                  </div>
                  {inspectedEvent.documentUrl && (
                    <a
                      href={inspectedEvent.documentUrl}
                      download={inspectedEvent.supportingDocument}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download File</span>
                    </a>
                  )}
                </div>
              )}

              {/* Approval & Audit Metadata */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 space-y-1 text-[11px]">
                <p>Created by: <span className="font-semibold text-slate-800">{inspectedEvent.createdBy}</span> on {inspectedEvent.createdDate}</p>
                {inspectedEvent.approvedBy && (
                  <p>Sanctioned by: <span className="font-semibold text-slate-800">{inspectedEvent.approvedBy}</span> on {inspectedEvent.approvalDate || inspectedEvent.effectiveDate}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Orbyx HRMS Certified Employment Record</span>
              <button
                type="button"
                onClick={() => setInspectedEvent(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD SERVICE EVENT MODAL */}
      {showAddModal && canAddRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleCreateRecord}
            className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-300 space-y-4 text-xs max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Record Employment Service Event</h4>
                  <p className="text-xs font-medium text-slate-600">Register promotions, transfers, confirmation or CTC revisions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 text-base"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl font-bold text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-700" />
                <span>{formError}</span>
              </div>
            )}

            {/* Target Employee Selection */}
            {!isRegularEmployee && (
              <div>
                <label className="block font-bold text-slate-800 mb-1">Target Employee *</label>
                <select
                  value={formEmpId}
                  onChange={(e) => setFormEmpId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 text-xs"
                >
                  {permittedEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Service Event Type *</label>
                <select
                  value={srType}
                  onChange={(e) => setSrType(e.target.value as ServiceRecordType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 text-xs"
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
                <label className="block font-bold text-slate-800 mb-1">Effective Date *</label>
                <input
                  type="date"
                  required
                  value={srEffectiveDate}
                  onChange={(e) => setSrEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 text-xs"
                />
              </div>
            </div>

            {/* CONDITIONAL EVENT-SPECIFIC FIELDS */}
            {(srType === 'Promotion' || srType === 'Designation Change') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Previous Designation</label>
                  <input
                    value={srPrevDesig}
                    onChange={(e) => setSrPrevDesig(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-indigo-900 mb-1">New Designation *</label>
                  <input
                    required
                    value={srNewDesig}
                    onChange={(e) => setSrNewDesig(e.target.value)}
                    placeholder="e.g. Lead Technical Architect"
                    className="w-full px-2.5 py-1.5 border border-indigo-300 rounded-lg bg-white text-xs font-bold text-indigo-950"
                  />
                </div>
              </div>
            )}

            {srType === 'Department Transfer' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Previous Department</label>
                  <input
                    value={srPrevDept}
                    onChange={(e) => setSrPrevDept(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-indigo-900 mb-1">New Department *</label>
                  <input
                    required
                    value={srNewDept}
                    onChange={(e) => setSrNewDept(e.target.value)}
                    placeholder="e.g. Engineering Delivery"
                    className="w-full px-2.5 py-1.5 border border-indigo-300 rounded-lg bg-white text-xs font-bold text-indigo-950"
                  />
                </div>
              </div>
            )}

            {srType === 'Reporting Manager Change' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Previous Reporting Manager</label>
                  <input
                    value={srPrevManager}
                    onChange={(e) => setSrPrevManager(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-indigo-900 mb-1">New Reporting Manager *</label>
                  <input
                    required
                    value={srNewManager}
                    onChange={(e) => setSrNewManager(e.target.value)}
                    placeholder="e.g. S. Kannan (COO)"
                    className="w-full px-2.5 py-1.5 border border-indigo-300 rounded-lg bg-white text-xs font-bold text-indigo-950"
                  />
                </div>
              </div>
            )}

            {srType === 'Salary Revision' && (
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Previous Annual CTC (₹)</label>
                    <input
                      type="number"
                      value={srPrevSalary}
                      onChange={(e) => setSrPrevSalary(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-emerald-900 mb-1">Revised Annual CTC (₹) *</label>
                    <input
                      type="number"
                      required
                      value={srRevisedSalary}
                      onChange={(e) => setSrRevisedSalary(e.target.value ? Number(e.target.value) : '')}
                      placeholder="e.g. 1800000"
                      className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg bg-white font-mono text-xs font-bold text-emerald-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Revision Nature</label>
                    <select
                      value={srSalaryRevisionType}
                      onChange={(e) => setSrSalaryRevisionType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold"
                    >
                      <option value="Annual Increment">Annual Increment</option>
                      <option value="Promotion Adjustment">Promotion Adjustment</option>
                      <option value="Market Correction">Market Correction</option>
                      <option value="Band Realignment">Band Realignment</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {(srType === 'Employment Confirmation' || srType === 'Probation Completion') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Probation Duration (Days)</label>
                  <input
                    type="number"
                    value={srProbationDays}
                    onChange={(e) => setSrProbationDays(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Confirmation Status</label>
                  <select
                    value={srConfirmationStatus}
                    onChange={(e) => setSrConfirmationStatus(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-bold text-indigo-950"
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="Extended">Extended</option>
                    <option value="Under Review">Under Review</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-800 mb-1">Reason / Justification</label>
              <input
                type="text"
                value={srReason}
                onChange={(e) => setSrReason(e.target.value)}
                placeholder="e.g. Annual Appraisal Cycle, Client squad expansion, or Promotion sanction"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Detailed Remarks / Description</label>
              <textarea
                rows={2}
                value={srRemarks}
                onChange={(e) => setSrRemarks(e.target.value)}
                placeholder="Detailed event documentation, promotion notes, or approval board references"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs text-slate-900"
              />
            </div>

            {/* Document Upload */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block text-xs">Attach Supporting Credential / Document</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const sz = f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(2)} MB` : `${Math.round(f.size / 1024)} KB`;
                    setSrDocBlob({ name: f.name, size: sz, dataUrl: reader.result as string });
                    if (!srDocName) setSrDocName(f.name);
                  };
                  reader.readAsDataURL(f);
                }}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-800 text-xs shadow-2xs"
                >
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <span>{srDocBlob ? 'Replace Attached File' : 'Attach Supporting Document'}</span>
                </button>
                {srDocBlob && (
                  <span className="text-emerald-800 font-bold text-xs flex items-center gap-1">
                    <Check className="h-3.5 w-3.5 text-emerald-600" /> {srDocBlob.name} ({srDocBlob.size})
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm"
              >
                Save Milestone Record
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
