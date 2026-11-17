// Celestial HRMS - Organization Service API Client
// Interfaces with Backend Organization Service via API Gateway /api/v1/organization
import { apiClient } from './apiClient';
import { Branch, Department, Designation, CompanyProfile } from '../types/hrms';

export interface BackendCompanyProfile {
  id: string;
  legalName: string;
  tradingName: string;
  cinNumber?: string;
  panNumber?: string;
  tanNumber?: string;
  gstin?: string;
  pfRegistrationNumber?: string;
  esiRegistrationNumber?: string;
  registeredAddress: string;
  headquartersAddress: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendBranch {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  country: string;
  address: string;
  isHeadquarters: boolean;
  timezone?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendDepartment {
  id: string;
  code: string;
  name: string;
  branchId?: string;
  parentDeptId?: string;
  headEmployeeId?: string;
  description?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendDesignation {
  id: string;
  code: string;
  title: string;
  departmentId?: string;
  level: number;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendStatutoryConfig {
  id: string;
  companyId: string;
  epfApplicable: boolean;
  epfEmployeeRatePercent: number;
  epfEmployerRatePercent: number;
  epfWageCeilingMonthly: number;
  epfRestrictToWageCeiling: boolean;
  epfEffectiveFrom: string;
  epfExemptionReason?: string;
  esiApplicable: boolean;
  esiGrossThresholdMonthly: number;
  esiEmployeeRatePercent: number;
  esiEmployerRatePercent: number;
  esiEffectiveFrom: string;
  esiExemptionReason?: string;
  ptApplicable: boolean;
  ptStateJurisdiction: string;
  ptMonthlySlabAmount: number;
  ptMinGrossThreshold: number;
  ptEffectiveFrom: string;
  tdsApplicable: boolean;
  tdsFinancialYear: string;
  tdsDefaultRegime: string;
  tdsEffectiveFrom: string;
  createdAt?: string;
  updatedAt?: string;
}

export const orgApi = {
  // Company Profile
  async getProfile(): Promise<BackendCompanyProfile> {
    return apiClient.request<BackendCompanyProfile>('/organization/profile');
  },

  async updateProfile(profileData: Partial<BackendCompanyProfile>): Promise<BackendCompanyProfile> {
    return apiClient.request<BackendCompanyProfile>('/organization/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Statutory Configuration
  async getStatutoryConfig(): Promise<BackendStatutoryConfig> {
    return apiClient.request<BackendStatutoryConfig>('/organization/statutory');
  },

  async updateStatutoryConfig(statutoryData: Partial<BackendStatutoryConfig>): Promise<BackendStatutoryConfig> {
    return apiClient.request<BackendStatutoryConfig>('/organization/statutory', {
      method: 'PUT',
      body: JSON.stringify(statutoryData),
    });
  },

  // Branches
  async getBranches(): Promise<BackendBranch[]> {
    return apiClient.request<BackendBranch[]>('/organization/branches');
  },

  async createBranch(branchData: {
    code: string;
    name: string;
    city: string;
    state: string;
    country?: string;
    address: string;
    isHeadquarters?: boolean;
  }): Promise<BackendBranch> {
    return apiClient.request<BackendBranch>('/organization/branches', {
      method: 'POST',
      body: JSON.stringify(branchData),
    });
  },

  async updateBranch(
    id: string,
    branchData: Partial<{
      name: string;
      city: string;
      state: string;
      country: string;
      address: string;
      isHeadquarters: boolean;
      status: string;
    }>
  ): Promise<BackendBranch> {
    return apiClient.request<BackendBranch>(`/organization/branches/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(branchData),
    });
  },

  async toggleBranchStatus(id: string, isActive: boolean): Promise<BackendBranch> {
    return apiClient.request<BackendBranch>(`/organization/branches/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  // Departments
  async getDepartments(): Promise<BackendDepartment[]> {
    return apiClient.request<BackendDepartment[]>('/organization/departments');
  },

  async createDepartment(departmentData: {
    code: string;
    name: string;
    branchId?: string;
    parentDeptId?: string;
    headEmployeeId?: string;
    description?: string;
  }): Promise<BackendDepartment> {
    return apiClient.request<BackendDepartment>('/organization/departments', {
      method: 'POST',
      body: JSON.stringify(departmentData),
    });
  },

  async updateDepartment(
    id: string,
    deptData: Partial<{
      name: string;
      branchId?: string;
      parentDeptId?: string;
      headEmployeeId?: string;
      description?: string;
      status: string;
    }>
  ): Promise<BackendDepartment> {
    return apiClient.request<BackendDepartment>(`/organization/departments/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(deptData),
    });
  },

  async toggleDepartmentStatus(id: string, isActive: boolean): Promise<BackendDepartment> {
    return apiClient.request<BackendDepartment>(`/organization/departments/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  // Designations
  async getDesignations(): Promise<BackendDesignation[]> {
    return apiClient.request<BackendDesignation[]>('/organization/designations');
  },

  async createDesignation(designationData: {
    code: string;
    title: string;
    departmentId?: string;
    level?: number;
    description?: string;
  }): Promise<BackendDesignation> {
    return apiClient.request<BackendDesignation>('/organization/designations', {
      method: 'POST',
      body: JSON.stringify(designationData),
    });
  },

  async updateDesignation(
    id: string,
    desigData: Partial<{
      title: string;
      departmentId?: string;
      level?: number;
      description?: string;
      status: string;
    }>
  ): Promise<BackendDesignation> {
    return apiClient.request<BackendDesignation>(`/organization/designations/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(desigData),
    });
  },

  async toggleDesignationStatus(id: string, isActive: boolean): Promise<BackendDesignation> {
    return apiClient.request<BackendDesignation>(`/organization/designations/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  async deleteBranch(id: string): Promise<boolean> {
    const res = await apiClient.request<{ deleted: boolean; id: string }>(`/organization/branches/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res?.deleted ?? true;
  },

  async deleteDepartment(id: string): Promise<boolean> {
    const res = await apiClient.request<{ deleted: boolean; id: string }>(`/organization/departments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res?.deleted ?? true;
  },

  async deleteDesignation(id: string): Promise<boolean> {
    const res = await apiClient.request<{ deleted: boolean; id: string }>(`/organization/designations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res?.deleted ?? true;
  },
};

