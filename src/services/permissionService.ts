import {
  Employee,
  CurrentUser,
  Permission,
  BasicDirectoryEmployee,
  AccessScope,
  ProfileViewResult
} from '../types/hrms';
import { db } from '../db/storage';

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  hr_admin: [
    'employee.profile.read_self',
    'employee.profile.update_self',
    'employee.directory.read_basic',
    'employee.profile.read_team',
    'employee.profile.read_all',
    'employee.profile.read_org',
    'employee.profile.read_sensitive',
    'employee.profile.edit_personal',
    'employee.profile.edit_employment',
    'employee.profile.edit_reporting',
    'employee.documents.read_team',
    'employee.documents.read_all',
    'employee.documents.manage',
    'employee.documents.verify',
    'employee.salary.read',
    'employee.salary.edit',
    'employee.bank_details.read',
    'employee.bank_details.edit',
    'employee.identity_documents.read',
    'employee.service_records.manage',
    'employee.service_records.approve',
    'employee.leave.read_team',
    'employee.attendance.read_team',
    'employee.expenses.read_team',
    'employee.assets.read_team',
    'employee.assets.read_all',
    'employee.assets.administer',
    'reports.organization.read',
    'leave.approve_team',
    'expenses.approve_team',
    'attendance.approve_team',
    'payroll.process'
  ],
  senior_manager: [
    'employee.profile.read_self',
    'employee.profile.update_self',
    'employee.directory.read_basic',
    'employee.profile.read_team',
    'employee.profile.read_org',
    'employee.profile.edit_reporting',
    'employee.documents.read_team',
    'employee.documents.read_all',
    'employee.service_records.manage',
    'employee.service_records.approve',
    'employee.assets.read_all',
    'reports.organization.read',
    'leave.approve_team',
    'expenses.approve_team',
    'attendance.approve_team'
  ],
  reporting_manager: [
    'employee.profile.read_self',
    'employee.profile.update_self',
    'employee.directory.read_basic',
    'employee.profile.read_team',
    'employee.documents.read_team',
    'employee.documents.manage',
    'employee.service_records.manage',
    'employee.leave.read_team',
    'employee.attendance.read_team',
    'employee.expenses.read_team',
    'employee.assets.read_team',
    'leave.approve_team',
    'expenses.approve_team',
    'attendance.approve_team'
  ],
  employee: [
    'employee.profile.read_self',
    'employee.profile.update_self',
    'employee.profile.edit_personal',
    'employee.directory.read_basic',
    'employee.documents.manage'
  ]
};

const ALLOWED_INTERNAL_ROLES = new Set(['employee', 'reporting_manager', 'hr_admin', 'senior_manager']);

export const permissionService = {
  /**
   * Section 3 Strict Access Control:
   * Orbyx HRMS is strictly an internal company HRMS.
   * Rejects any external client supervisor, client manager, client HR, or non-company account.
   */
  isInternalCompanyUser(user: Partial<CurrentUser> | null | undefined): boolean {
    if (!user || !user.id || !user.role || !user.employeeId) return false;
    const roleLower = String(user.role).toLowerCase();
    if (roleLower.includes('client') || roleLower.includes('external') || roleLower.includes('vendor')) {
      return false;
    }
    if (!ALLOWED_INTERNAL_ROLES.has(user.role)) return false;
    // Must map to an actual internal company employee record
    const emp = db.getEmployeeById(user.employeeId);
    if (!emp) return false;
    return true;
  },

  validateLoginAttempt(candidate: Partial<CurrentUser> & { organizationType?: string }): {
    allowed: boolean;
    reason?: string;
  } {
    if (!candidate) {
      return { allowed: false, reason: 'Invalid user credentials.' };
    }
    const roleStr = String(candidate.role || '').toLowerCase();
    const emailStr = String(candidate.email || '').toLowerCase();
    if (
      candidate.organizationType === 'external_client' ||
      roleStr.includes('client') ||
      roleStr.includes('external') ||
      (!emailStr.endsWith('@orbyx.internal') && !emailStr.endsWith('@orbyx.com'))
    ) {
      return {
        allowed: false,
        reason:
          'Access Denied: Orbyx HRMS is strictly restricted to internal company personnel. External client supervisors and client staff do not have login accounts and must verify attendance via external email confirmation.'
      };
    }
    if (!this.isInternalCompanyUser(candidate)) {
      return {
        allowed: false,
        reason: 'Access Denied: User does not match an active internal Orbyx employee record or permitted internal role.'
      };
    }
    return { allowed: true };
  },

  canRecordClientEmailVerification(actor: CurrentUser, targetEmployeeId?: string): boolean {
    if (!this.isInternalCompanyUser(actor)) return false;
    if (targetEmployeeId && actor.employeeId === targetEmployeeId && actor.role === 'employee') {
      return false; // Employees cannot record their own client supervisor verification
    }
    return (
      actor.role === 'hr_admin' ||
      actor.role === 'reporting_manager' ||
      actor.role === 'senior_manager'
    );
  },

  canApproveCompanyAttendance(actor: CurrentUser, targetEmployeeId: string): boolean {
    if (!this.isInternalCompanyUser(actor)) return false;
    if (actor.employeeId === targetEmployeeId) return false; // Strict no self-approval
    if (actor.role === 'hr_admin' || actor.role === 'senior_manager') return true;
    if (actor.role === 'reporting_manager') {
      const target = db.getEmployeeById(targetEmployeeId);
      return Boolean(target && target.reportingManagerId === actor.employeeId);
    }
    return false;
  },

  hasPermission(role: string, permission: Permission): boolean {
    if (!ALLOWED_INTERNAL_ROLES.has(role)) return false;
    const list = ROLE_PERMISSIONS[role] || [];
    return list.includes(permission);
  },

  isSelf(targetEmployeeId: string, currentUser: CurrentUser): boolean {
    return targetEmployeeId === currentUser.employeeId;
  },

  isDirectReport(targetEmployeeId: string, currentUser: CurrentUser): boolean {
    const target = db.getEmployeeById(targetEmployeeId);
    if (!target) return false;
    return target.reportingManagerId === currentUser.employeeId;
  },

  resolveAccessScope(targetEmployeeId: string, currentUser: CurrentUser): AccessScope {
    if (!this.isInternalCompanyUser(currentUser)) {
      return 'colleague_basic';
    }
    if (this.isSelf(targetEmployeeId, currentUser)) {
      return 'self';
    }
    if (currentUser.role === 'hr_admin') {
      return 'organization_admin';
    }
    if (this.isDirectReport(targetEmployeeId, currentUser)) {
      return 'direct_report';
    }
    if (currentUser.role === 'senior_manager') {
      return 'senior_management';
    }
    return 'colleague_basic';
  },

  /**
   * Field Filtering & Authorization Enforcement:
   * Returns ONLY the fields permitted for that relationship and role.
   * Strips out all confidential fields when viewed by a colleague.
   * Pure read function — safe to call during React render without side-effects.
   */
  getAuthorizedProfile(targetEmployeeId: string, currentUser: CurrentUser): ProfileViewResult | null {
    const raw = db.getEmployeeById(targetEmployeeId);
    if (!raw) return null;

    const scope = this.resolveAccessScope(targetEmployeeId, currentUser);

    if (scope === 'colleague_basic') {
      // Regular employee viewing a colleague, or manager viewing an unrelated employee outside hierarchy
      const basicProfile: BasicDirectoryEmployee = {
        id: raw.id,
        firstName: raw.firstName,
        lastName: raw.lastName,
        officialEmail: raw.officialEmail || raw.email,
        officialPhone: raw.officialPhone || raw.phone,
        avatarUrl: raw.avatarUrl,
        viewScope: 'colleague_basic'
      };
      return basicProfile;
    }

    if (scope === 'direct_report' || scope === 'senior_management') {
      // Reporting Manager or Senior Manager viewing authorized employee
      // Salary and sensitive bank details are masked unless explicit permission exists
      const sanitized: Employee = {
        ...raw,
        officialEmail: raw.officialEmail || raw.email,
        officialPhone: raw.officialPhone || raw.phone,
        // Mask confidential financial details
        baseSalaryAnnual: 0,
        bankDetails: {
          accountNumber: '••••••••••••',
          bankName: raw.bankDetails.bankName,
          ifscOrRouting: '••••••••',
          accountType: raw.bankDetails.accountType
        },
        panOrTaxNumber: '••••••••••'
      };

      return {
        ...sanitized,
        viewScope: scope,
        canViewSalary: false
      };
    }

    if (scope === 'self') {
      return {
        ...raw,
        officialEmail: raw.officialEmail || raw.email,
        officialPhone: raw.officialPhone || raw.phone,
        viewScope: 'self',
        canViewSalary: true
      };
    }

    // Organization Admin (HR)
    return {
      ...raw,
      officialEmail: raw.officialEmail || raw.email,
      officialPhone: raw.officialPhone || raw.phone,
      viewScope: 'organization_admin',
      canViewSalary: true
    };
  },

  /**
   * Logs an audit trail entry when an authorized manager, senior manager, or HR admin opens an employee profile.
   * Must be invoked in an effect or event handler (never during component render).
   */
  logProfileAccessAudit(targetEmployeeId: string, currentUser: CurrentUser): void {
    const raw = db.getEmployeeById(targetEmployeeId);
    if (!raw) return;
    const scope = this.resolveAccessScope(targetEmployeeId, currentUser);
    if (scope === 'direct_report' || scope === 'senior_management' || scope === 'organization_admin') {
      db.logAudit({
        actorUserId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'UPDATE',
        module: 'EMPLOYEE',
        entityId: raw.id,
        entityName: `${raw.firstName} ${raw.lastName}`,
        description:
          scope === 'organization_admin'
            ? `HR Admin accessed employee record ${raw.id} (org admin scope)`
            : `${currentUser.role} accessed profile ${raw.id} (${scope} scope)`
      });
    }
  },

  /**
   * Enforces document download and read access:
   * Only HR Admin, Self, Direct Reporting Manager, or Senior Manager can access documents.
   */
  canAccessEmployeeDocuments(targetEmployeeId: string, currentUser: CurrentUser): boolean {
    const scope = this.resolveAccessScope(targetEmployeeId, currentUser);
    return scope === 'self' || scope === 'direct_report' || scope === 'senior_management' || scope === 'organization_admin';
  },

  // =========================================================================
  // PRIVILEGE-BASED EDITING ENFORCEMENT (Personal, Employment, Salary, Docs, Services)
  // =========================================================================

  canEditPersonal(targetEmployeeId: string, currentUser: CurrentUser): boolean {
    if (!this.isInternalCompanyUser(currentUser)) return false;
    const scope = this.resolveAccessScope(targetEmployeeId, currentUser);
    // HR Admin can edit all; individual employee can edit their own personal info
    if (scope === 'organization_admin' && this.hasPermission(currentUser.role, 'employee.profile.edit_personal')) return true;
    if (scope === 'self' && this.hasPermission(currentUser.role, 'employee.profile.edit_personal')) return true;
    return false;
  },

  canEditEmployment(targetEmployeeId: string, currentUser: CurrentUser): boolean {
    if (!this.isInternalCompanyUser(currentUser)) return false;
    // Strictly HR Admin (users cannot modify their own employment status/terms)
    return currentUser.role === 'hr_admin' && this.hasPermission(currentUser.role, 'employee.profile.edit_employment');
  },

  canEditReporting(targetEmployeeId: string, currentUser: CurrentUser): boolean {
    if (!this.isInternalCompanyUser(currentUser)) return false;
    // HR Admin and Senior Management (MD/COO) can edit reporting relationships
    if (currentUser.role === 'hr_admin' || currentUser.role === 'senior_manager') {
      return this.hasPermission(currentUser.role, 'employee.profile.edit_reporting');
    }
    return false;
  },

  canViewSalary(targetEmployeeId: string, currentUser: CurrentUser): boolean {
    if (!this.isInternalCompanyUser(currentUser)) return false;
    const scope = this.resolveAccessScope(targetEmployeeId, currentUser);
    if (scope === 'self' && this.hasPermission(currentUser.role, 'employee.salary.read')) return true;
    if (scope === 'organization_admin' && this.hasPermission(currentUser.role, 'employee.salary.read')) return true;
    return false;
  },

  canEditSalary(targetEmployeeId: string, currentUser: CurrentUser): boolean {
    if (!this.isInternalCompanyUser(currentUser)) return false;
    // Strictly HR Admin — employees can NEVER edit their own salary or banking
    return currentUser.role === 'hr_admin' && this.hasPermission(currentUser.role, 'employee.salary.edit');
  },

  canManageDocuments(targetEmployeeId: string, currentUser: CurrentUser): boolean {
    if (!this.isInternalCompanyUser(currentUser)) return false;
    const scope = this.resolveAccessScope(targetEmployeeId, currentUser);
    // HR Admin, Reporting Manager, or Self can upload/manage documents
    if (scope === 'organization_admin' || scope === 'self' || scope === 'direct_report') {
      return this.hasPermission(currentUser.role, 'employee.documents.manage');
    }
    return false;
  },

  canVerifyDocuments(currentUser: CurrentUser): boolean {
    if (!this.isInternalCompanyUser(currentUser)) return false;
    // Strictly HR Admin
    return currentUser.role === 'hr_admin' && this.hasPermission(currentUser.role, 'employee.documents.verify');
  },

  canManageServiceRecords(targetEmployeeId: string, currentUser: CurrentUser): boolean {
    if (!this.isInternalCompanyUser(currentUser)) return false;
    // HR Admin, Senior Manager, or Reporting Manager can create service records
    return (
      (currentUser.role === 'hr_admin' || currentUser.role === 'senior_manager' || currentUser.role === 'reporting_manager') &&
      this.hasPermission(currentUser.role, 'employee.service_records.manage')
    );
  },

  canApproveServiceRecords(currentUser: CurrentUser): boolean {
    if (!this.isInternalCompanyUser(currentUser)) return false;
    // HR Admin and Senior Management
    return (
      (currentUser.role === 'hr_admin' || currentUser.role === 'senior_manager') &&
      this.hasPermission(currentUser.role, 'employee.service_records.approve')
    );
  },

  /**
   * Secure backend-enforced employee update method.
   * Validates actor permissions, checks field scopes, maintains audit log, and persists changes.
   */
  updateEmployeeSection(
    targetEmployeeId: string,
    section: 'personal' | 'employment' | 'reporting' | 'salary',
    patch: Partial<Employee>,
    actor: CurrentUser
  ): { success: boolean; error?: string; updatedEmployee?: Employee } {
    if (!this.isInternalCompanyUser(actor)) {
      return { success: false, error: 'Unauthorized: Actor is not a valid internal company user.' };
    }

    const target = db.getEmployeeById(targetEmployeeId);
    if (!target) {
      return { success: false, error: `Employee ${targetEmployeeId} not found.` };
    }

    // Permission check per section
    if (section === 'personal') {
      if (!this.canEditPersonal(targetEmployeeId, actor)) {
        return { success: false, error: 'Permission Denied: You do not have permission to edit personal details for this employee.' };
      }
    } else if (section === 'employment') {
      if (!this.canEditEmployment(targetEmployeeId, actor)) {
        return { success: false, error: 'Permission Denied: Only HR Administrators can modify employment lifecycle details.' };
      }
    } else if (section === 'reporting') {
      if (!this.canEditReporting(targetEmployeeId, actor)) {
        return { success: false, error: 'Permission Denied: Only HR Administrators or Senior Management can modify reporting lines.' };
      }
    } else if (section === 'salary') {
      if (!this.canEditSalary(targetEmployeeId, actor)) {
        return { success: false, error: 'Permission Denied: Strictly restricted to authorized HR Administrators. Self-modification prohibited.' };
      }
    }

    // Prepare updated record by section to prevent out-of-scope modifications
    let updated: Employee = { ...target, updatedAt: new Date().toISOString() };
    const changedFields: string[] = [];

    if (section === 'personal') {
      if (patch.firstName !== undefined && patch.firstName !== target.firstName) {
        updated.firstName = patch.firstName.trim();
        changedFields.push('firstName');
      }
      if (patch.lastName !== undefined && patch.lastName !== target.lastName) {
        updated.lastName = patch.lastName.trim();
        changedFields.push('lastName');
      }
      if (patch.dateOfBirth !== undefined && patch.dateOfBirth !== target.dateOfBirth) {
        updated.dateOfBirth = patch.dateOfBirth;
        changedFields.push('dateOfBirth');
      }
      if (patch.gender !== undefined && patch.gender !== target.gender) {
        updated.gender = patch.gender;
        changedFields.push('gender');
      }
      if (patch.bloodGroup !== undefined && patch.bloodGroup !== target.bloodGroup) {
        updated.bloodGroup = patch.bloodGroup;
        changedFields.push('bloodGroup');
      }
      if (patch.maritalStatus !== undefined && patch.maritalStatus !== target.maritalStatus) {
        updated.maritalStatus = patch.maritalStatus;
        changedFields.push('maritalStatus');
      }
      if (patch.personalEmail !== undefined && patch.personalEmail !== target.personalEmail) {
        updated.personalEmail = patch.personalEmail.trim();
        changedFields.push('personalEmail');
      }
      if (patch.personalPhone !== undefined && patch.personalPhone !== target.personalPhone) {
        updated.personalPhone = patch.personalPhone.trim();
        changedFields.push('personalPhone');
      }
      if (patch.permanentAddress !== undefined && patch.permanentAddress !== target.permanentAddress) {
        updated.permanentAddress = patch.permanentAddress.trim();
        changedFields.push('permanentAddress');
      }
      if (patch.currentAddress !== undefined && patch.currentAddress !== target.currentAddress) {
        updated.currentAddress = patch.currentAddress.trim();
        changedFields.push('currentAddress');
      }
      if (patch.address !== undefined && patch.address !== target.address) {
        updated.address = patch.address.trim();
      }
      if (patch.avatarUrl !== undefined && patch.avatarUrl !== target.avatarUrl) {
        updated.avatarUrl = patch.avatarUrl;
        changedFields.push('avatarUrl');
      }
      if (patch.emergencyContact !== undefined) {
        updated.emergencyContact = {
          name: patch.emergencyContact.name ?? target.emergencyContact?.name ?? '',
          relationship: patch.emergencyContact.relationship ?? target.emergencyContact?.relationship ?? '',
          phone: patch.emergencyContact.phone ?? target.emergencyContact?.phone ?? ''
        };
        changedFields.push('emergencyContact');
      }
    } else if (section === 'employment') {
      if (patch.departmentId !== undefined && patch.departmentId !== target.departmentId) {
        updated.departmentId = patch.departmentId;
        changedFields.push('departmentId');
      }
      if (patch.designationId !== undefined && patch.designationId !== target.designationId) {
        updated.designationId = patch.designationId;
        changedFields.push('designationId');
      }
      if (patch.branchId !== undefined && patch.branchId !== target.branchId) {
        updated.branchId = patch.branchId;
        changedFields.push('branchId');
      }
      if (patch.employmentType !== undefined && patch.employmentType !== target.employmentType) {
        updated.employmentType = patch.employmentType;
        changedFields.push('employmentType');
      }
      if (patch.dateOfJoining !== undefined && patch.dateOfJoining !== target.dateOfJoining) {
        updated.dateOfJoining = patch.dateOfJoining;
        changedFields.push('dateOfJoining');
      }
      if (patch.shiftId !== undefined && patch.shiftId !== target.shiftId) {
        updated.shiftId = patch.shiftId;
        changedFields.push('shiftId');
      }
      if (patch.status !== undefined && patch.status !== target.status) {
        updated.status = patch.status;
        changedFields.push('status');
      }
      if (patch.confirmationDate !== undefined && patch.confirmationDate !== target.confirmationDate) {
        updated.confirmationDate = patch.confirmationDate;
        changedFields.push('confirmationDate');
      }
      if (patch.noticePeriodDays !== undefined && patch.noticePeriodDays !== target.noticePeriodDays) {
        updated.noticePeriodDays = Number(patch.noticePeriodDays);
        changedFields.push('noticePeriodDays');
      }
      if (patch.probationPeriodDays !== undefined && patch.probationPeriodDays !== target.probationPeriodDays) {
        updated.probationPeriodDays = Number(patch.probationPeriodDays);
        changedFields.push('probationPeriodDays');
      }
      if (patch.employeeCategory !== undefined && patch.employeeCategory !== target.employeeCategory) {
        updated.employeeCategory = patch.employeeCategory;
        changedFields.push('employeeCategory');
      }
    } else if (section === 'reporting') {
      if (patch.reportingManagerId !== undefined && patch.reportingManagerId !== target.reportingManagerId) {
        updated.reportingManagerId = patch.reportingManagerId;
        changedFields.push('reportingManagerId');
      }
    } else if (section === 'salary') {
      if (patch.baseSalaryAnnual !== undefined && patch.baseSalaryAnnual !== target.baseSalaryAnnual) {
        updated.baseSalaryAnnual = Number(patch.baseSalaryAnnual);
        changedFields.push('baseSalaryAnnual');
      }
      if (patch.salaryStructureId !== undefined && patch.salaryStructureId !== target.salaryStructureId) {
        updated.salaryStructureId = patch.salaryStructureId;
        changedFields.push('salaryStructureId');
      }
      if (patch.panOrTaxNumber !== undefined && patch.panOrTaxNumber !== target.panOrTaxNumber) {
        updated.panOrTaxNumber = patch.panOrTaxNumber.trim().toUpperCase();
        changedFields.push('panOrTaxNumber');
      }
      if (patch.pfUan !== undefined && patch.pfUan !== target.pfUan) {
        updated.pfUan = patch.pfUan.trim();
        changedFields.push('pfUan');
      }
      if (patch.esiNumber !== undefined && patch.esiNumber !== target.esiNumber) {
        updated.esiNumber = patch.esiNumber.trim();
        changedFields.push('esiNumber');
      }
      if (patch.epfApplicable !== undefined && patch.epfApplicable !== target.epfApplicable) {
        updated.epfApplicable = Boolean(patch.epfApplicable);
        changedFields.push('epfApplicable');
      }
      if (patch.epfWageCeilingApplied !== undefined && patch.epfWageCeilingApplied !== target.epfWageCeilingApplied) {
        updated.epfWageCeilingApplied = Boolean(patch.epfWageCeilingApplied);
        changedFields.push('epfWageCeilingApplied');
      }
      if (patch.esiApplicable !== undefined && patch.esiApplicable !== target.esiApplicable) {
        updated.esiApplicable = Boolean(patch.esiApplicable);
        changedFields.push('esiApplicable');
      }
      if (patch.ptApplicable !== undefined && patch.ptApplicable !== target.ptApplicable) {
        updated.ptApplicable = Boolean(patch.ptApplicable);
        changedFields.push('ptApplicable');
      }
      if (patch.statutoryExemptionReason !== undefined && patch.statutoryExemptionReason !== target.statutoryExemptionReason) {
        updated.statutoryExemptionReason = patch.statutoryExemptionReason;
        changedFields.push('statutoryExemptionReason');
      }
      if (patch.bankDetails) {
        updated.bankDetails = {
          bankName: patch.bankDetails.bankName ?? target.bankDetails.bankName,
          accountNumber: patch.bankDetails.accountNumber ?? target.bankDetails.accountNumber,
          ifscOrRouting: (patch.bankDetails.ifscOrRouting ?? target.bankDetails.ifscOrRouting).toUpperCase(),
          accountType: patch.bankDetails.accountType ?? target.bankDetails.accountType
        };
        changedFields.push('bankDetails');
      }
    }

    if (changedFields.length === 0) {
      return { success: true, updatedEmployee: target };
    }

    // Persist to database
    db.saveEmployee(updated);

    // Maintain comprehensive audit trail
    db.logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      module: 'EMPLOYEE',
      action: 'UPDATE',
      entityId: target.id,
      entityName: `${target.firstName} ${target.lastName}`,
      description: `${actor.name} (${actor.role}) updated ${section} details for employee ${target.id} [Fields: ${changedFields.join(', ')}]`
    });

    return { success: true, updatedEmployee: updated };
  },

  /**
   * Serializes directory rows for the requesting user.
   * Deactivated / Inactive employees are removed from regular active directory listings.
   */
  getAuthorizedDirectoryRows(currentUser: CurrentUser): (BasicDirectoryEmployee | (Employee & { isDirectReport?: boolean }))[] {
    const all = db.getEmployees();
    const activeEmployees = all.filter((e) => e.status !== 'Inactive' && e.status !== 'Separated');

    if (currentUser.role === 'employee') {
      // Regular Employees see ONLY the permitted basic directory fields of active colleagues
      return activeEmployees.map((e) => ({
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        officialEmail: e.officialEmail || e.email,
        officialPhone: e.officialPhone || e.phone,
        avatarUrl: e.avatarUrl,
        viewScope: 'colleague_basic' as const
      }));
    }

    if (currentUser.role === 'reporting_manager') {
      // Reporting Manager (Krishnaraj) sees detailed rows for their 8 direct reports, basic directory for other active employees
      return activeEmployees.map((e) => {
        const isReport = e.reportingManagerId === currentUser.employeeId;
        if (isReport || e.id === currentUser.employeeId) {
          return {
            ...e,
            officialEmail: e.officialEmail || e.email,
            officialPhone: e.officialPhone || e.phone,
            isDirectReport: isReport
          };
        }
        return {
          id: e.id,
          firstName: e.firstName,
          lastName: e.lastName,
          officialEmail: e.officialEmail || e.email,
          officialPhone: e.officialPhone || e.phone,
          avatarUrl: e.avatarUrl,
          viewScope: 'colleague_basic' as const
        };
      });
    }

    if (currentUser.role === 'senior_manager') {
      // Senior Manager (Dr. Selvakumar) sees authorized organizational profiles (with sensitive fields masked)
      return activeEmployees.map((e) => ({
        ...e,
        officialEmail: e.officialEmail || e.email,
        officialPhone: e.officialPhone || e.phone,
        isDirectReport: e.reportingManagerId === currentUser.employeeId
      }));
    }

    // HR Admin: complete directory (both active and inactive)
    return all.map((e) => ({
      ...e,
      officialEmail: e.officialEmail || e.email,
      officialPhone: e.officialPhone || e.phone
    }));
  },

  /**
   * Generates sanitized CSV export records according to user authorization.
   */
  getAuthorizedDirectoryExport(currentUser: CurrentUser): Record<string, any>[] {
    const rows = this.getAuthorizedDirectoryRows(currentUser);
    const departments = db.getDepartments();
    const designations = db.getDesignations();
    const branches = db.getBranches();

    if (currentUser.role === 'employee') {
      // Regular employees: ONLY Name, Official Mobile, Official Email
      return rows.map((r) => ({
        Name: `${r.firstName} ${r.lastName}`.trim(),
        'Official Mobile Number': (r as BasicDirectoryEmployee).officialPhone,
        'Official Email Address': (r as BasicDirectoryEmployee).officialEmail
      }));
    }

    if (currentUser.role === 'reporting_manager') {
      // Manager export: detailed for team, basic for others
      return rows.map((r) => {
        if ('viewScope' in r && r.viewScope === 'colleague_basic') {
          return {
            Name: `${r.firstName} ${r.lastName}`.trim(),
            'Official Mobile Number': r.officialPhone,
            'Official Email Address': r.officialEmail,
            Scope: 'Organization Colleague'
          };
        }
        const emp = r as Employee;
        return {
          Name: `${emp.firstName} ${emp.lastName}`.trim(),
          'Official Mobile Number': emp.officialPhone || emp.phone,
          'Official Email Address': emp.officialEmail || emp.email,
          Department: departments.find((d) => d.id === emp.departmentId)?.name || '',
          Designation: designations.find((d) => d.id === emp.designationId)?.title || '',
          Branch: branches.find((b) => b.id === emp.branchId)?.name || '',
          Status: emp.status,
          Scope: emp.reportingManagerId === currentUser.employeeId ? 'Direct Report' : 'Self'
        };
      });
    }

    // HR Admin & Senior Manager full export
    return (rows as Employee[]).map((e) => ({
      EmployeeID: e.id,
      Name: `${e.firstName} ${e.lastName}`.trim(),
      OfficialEmail: e.officialEmail || e.email,
      OfficialPhone: e.officialPhone || e.phone,
      Department: departments.find((d) => d.id === e.departmentId)?.name || '',
      Designation: designations.find((d) => d.id === e.designationId)?.title || '',
      Branch: branches.find((b) => b.id === e.branchId)?.name || '',
      Status: e.status,
      EmploymentType: e.employmentType,
      DateOfJoining: e.dateOfJoining
    }));
  }
};
