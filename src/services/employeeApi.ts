// Celestial HRMS - Employee Service API Client
// Interfaces with Employee Service via API Gateway /api/v1/employees
import { apiClient } from './apiClient';
import { Employee } from '../types/hrms';

export interface EmployeeListParams {
  departmentId?: string;
  branchId?: string;
  status?: string;
  profileStatus?: string;
  reportingManagerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface EmployeeListResponse {
  employees: Employee[];
  total: number;
  page: number;
  limit: number;
}

export interface BackendServiceRecord {
  id: string;
  employeeId: string;
  recordType: string;
  effectiveDate: string;
  previousDesignationId?: string | null;
  newDesignationId?: string | null;
  previousDepartmentId?: string | null;
  newDepartmentId?: string | null;
  previousReportingManagerId?: string | null;
  newReportingManagerId?: string | null;
  previousBranchId?: string | null;
  newBranchId?: string | null;
  previousEmploymentType?: string | null;
  newEmploymentType?: string | null;
  previousSalaryAmount?: number | null;
  newSalaryAmount?: number | null;
  notes?: string | null;
  approvalStatus: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const employeeApi = {
  /**
   * Fetches employees with scope filtering, search and pagination
   */
  async list(params: EmployeeListParams = {}): Promise<EmployeeListResponse> {
    const query = new URLSearchParams();
    if (params.departmentId && params.departmentId !== 'ALL') query.append('departmentId', params.departmentId);
    if (params.branchId && params.branchId !== 'ALL') query.append('branchId', params.branchId);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.profileStatus && params.profileStatus !== 'ALL') query.append('profileStatus', params.profileStatus);
    if (params.reportingManagerId && params.reportingManagerId !== 'ALL') query.append('reportingManagerId', params.reportingManagerId);
    if (params.search && params.search.trim()) query.append('search', params.search.trim());
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const qs = query.toString();
    const endpoint = `/employees${qs ? `?${qs}` : ''}`;
    
    // apiClient unwraps `data` from response
    const res = await apiClient.request<any>(endpoint);
    // res can be an array (data) or object { employees, total, ... }
    if (Array.isArray(res)) {
      return {
        employees: res,
        total: res.length,
        page: params.page || 1,
        limit: params.limit || 50,
      };
    }
    return {
      employees: res.employees || res.data || [],
      total: res.total ?? (res.employees ? res.employees.length : 0),
      page: res.page || params.page || 1,
      limit: res.limit || params.limit || 50,
    };
  },

  /**
   * Fetches single employee profile by ID with RBAC scope redaction
   */
  async getById(id: string): Promise<Employee> {
    return apiClient.request<Employee>(`/employees/${encodeURIComponent(id)}`);
  },

  /**
   * Create draft employee profile
   */
  async createDraft(payload: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    userId: string;
    departmentId?: string;
    designationId?: string;
    branchId?: string;
    employmentType?: string;
  }): Promise<Employee> {
    return apiClient.request<Employee>('/employees/draft', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Complete employee enrollment
   */
  async enroll(payload: {
    id?: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    address: string;
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
    };
    departmentId: string;
    designationId: string;
    branchId: string;
    employmentType: string;
    dateOfJoining: string;
    noticePeriodDays?: number;
    shiftId: string;
    bankDetails: {
      accountNumber: string;
      ifscCode: string;
      bankName: string;
      branchName?: string;
    };
    panOrTaxNumber: string;
    pfUan?: string;
    esiNumber?: string;
    baseSalaryAnnual?: number;
    salaryStructureId?: string;
  }): Promise<Employee> {
    return apiClient.request<Employee>('/employees/enroll', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update personal contact information
   */
  async updatePersonal(
    id: string,
    patch: {
      personalEmail?: string;
      personalPhone?: string;
      currentAddress?: string;
      permanentAddress?: string;
      bloodGroup?: string;
      maritalStatus?: string;
      emergencyContact?: { name: string; relationship: string; phone: string };
    }
  ): Promise<Employee> {
    return apiClient.request<Employee>(`/employees/${encodeURIComponent(id)}/personal`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
  },

  /**
   * Update employment lifecycle details (HR Admin)
   */
  async updateEmployment(
    id: string,
    patch: {
      departmentId?: string;
      designationId?: string;
      branchId?: string;
      employmentType?: string;
      status?: string;
      profileStatus?: string;
      noticePeriodDays?: number;
      probationPeriodDays?: number;
      confirmationDate?: string;
      dateOfSeparation?: string;
      separationReason?: string;
      shiftId?: string;
    }
  ): Promise<Employee> {
    return apiClient.request<Employee>(`/employees/${encodeURIComponent(id)}/employment`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
  },

  /**
   * Update reporting hierarchy manager
   */
  async updateReporting(id: string, reportingManagerId: string): Promise<Employee> {
    return apiClient.request<Employee>(`/employees/${encodeURIComponent(id)}/reporting`, {
      method: 'PUT',
      body: JSON.stringify({ reportingManagerId }),
    });
  },

  /**
   * Update salary and banking details (HR Admin only)
   */
  async updateSalaryBank(
    id: string,
    patch: {
      bankDetails?: {
        accountNumber: string;
        ifscCode: string;
        bankName: string;
        branchName?: string;
      };
      panOrTaxNumber?: string;
      pfUan?: string;
      esiNumber?: string;
      baseSalaryAnnual?: number;
      salaryStructureId?: string;
      epfApplicable?: boolean;
      esiApplicable?: boolean;
    }
  ): Promise<Employee> {
    return apiClient.request<Employee>(`/employees/${encodeURIComponent(id)}/salary-bank`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
  },

  /**
   * Service records: Fetch history for an employee
   */
  async getServiceRecords(employeeId: string): Promise<BackendServiceRecord[]> {
    return apiClient.request<BackendServiceRecord[]>(
      `/employees/${encodeURIComponent(employeeId)}/service-records`
    );
  },

  /**
   * Service records: Create record entry
   */
  async createServiceRecord(
    employeeId: string,
    payload: {
      recordType: string;
      effectiveDate: string;
      previousDesignationId?: string;
      newDesignationId?: string;
      previousDepartmentId?: string;
      newDepartmentId?: string;
      previousReportingManagerId?: string;
      newReportingManagerId?: string;
      previousBranchId?: string;
      newBranchId?: string;
      previousEmploymentType?: string;
      newEmploymentType?: string;
      previousSalaryAmount?: number;
      newSalaryAmount?: number;
      notes?: string;
      approvalStatus?: 'Pending' | 'Approved' | 'Rejected';
    }
  ): Promise<BackendServiceRecord> {
    return apiClient.request<BackendServiceRecord>(
      `/employees/${encodeURIComponent(employeeId)}/service-records`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * Service records: Approve or reject
   */
  async updateServiceRecordStatus(
    employeeId: string,
    recordId: string,
    approvalStatus: 'Approved' | 'Rejected'
  ): Promise<BackendServiceRecord> {
    return apiClient.request<BackendServiceRecord>(
      `/employees/${encodeURIComponent(employeeId)}/service-records/${encodeURIComponent(recordId)}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ approvalStatus }),
      }
    );
  },
};

