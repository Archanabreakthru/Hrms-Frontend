// Celestial HRMS - Client Service API Client
// Interfaces with Client Service via API Gateway /api/v1/clients
import { apiClient } from './apiClient';

export interface BackendClientOrg {
  id: string;
  name: string;
  code?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  contractStart?: string;
  contractEnd?: string;
  status: 'Active' | 'Inactive' | 'Prospect';
  createdAt: string;
  updatedAt: string;
}

export interface BackendClientSupervisor {
  id: string;
  clientId: string;
  fullName: string;
  email: string;
  phone?: string;
  designation?: string;
  status: 'Active' | 'Invited' | 'Suspended';
  userId?: string;
  invitationStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendClientDeployment {
  id: string;
  clientId: string;
  employeeId: string;
  supervisorId?: string;
  project: string;
  location: string;
  workMode: string;
  startDate: string;
  plannedEndDate: string;
  actualEndDate?: string;
  allocation: number;
  allowanceMonthly: number;
  billingRateHourly?: number;
  status: 'Active' | 'Completed' | 'Terminated' | 'On_Hold';
  createdAt: string;
  updatedAt: string;
}

export interface BackendClientAttendanceVerification {
  id: string;
  attendanceId: string;
  employeeId: string;
  clientId: string;
  deploymentId: string;
  supervisorId?: string;
  date: string;
  periodKey: string;
  workingHours: number;
  workMode: string;
  notes?: string;
  clientVerificationStatus: string;
  clientVerifiedAt?: string;
  clientVerifiedBy?: string;
  disputeDetails?: string;
  companyApprovalStatus: string;
  companyApprovedAt?: string;
  companyApprovedBy?: string;
  companyComments?: string;
  payrollEligibilityStatus: string;
  approvalHistory?: any[];
  createdAt: string;
  updatedAt: string;
}

export const clientApi = {
  // ==========================================
  // Client Organizations
  // ==========================================
  async getClients(params?: { status?: string; search?: string }): Promise<BackendClientOrg[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient.request<{ success: boolean; data: BackendClientOrg[] }>(`/clients${qs}`);
    return res.data;
  },

  async getClientById(id: string): Promise<BackendClientOrg> {
    const res = await apiClient.request<{ success: boolean; data: BackendClientOrg }>(`/clients/${id}`);
    return res.data;
  },

  async createClient(payload: {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    contractStart?: string;
    contractEnd?: string;
    status?: string;
  }): Promise<BackendClientOrg> {
    const res = await apiClient.request<{ success: boolean; data: BackendClientOrg }>('/clients', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateClient(
    id: string,
    payload: Partial<{
      name: string;
      contactName?: string;
      email?: string;
      phone?: string;
      address?: string;
      contractStart?: string;
      contractEnd?: string;
      status?: string;
    }>
  ): Promise<BackendClientOrg> {
    const res = await apiClient.request<{ success: boolean; data: BackendClientOrg }>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  // ==========================================
  // Client Supervisors
  // ==========================================
  async getSupervisors(clientId?: string): Promise<BackendClientSupervisor[]> {
    const qs = clientId ? `?clientId=${clientId}` : '';
    const res = await apiClient.request<{ success: boolean; data: BackendClientSupervisor[] }>(`/clients/supervisors${qs}`);
    return res.data;
  },

  async createSupervisor(payload: {
    clientId: string;
    fullName: string;
    email: string;
    phone?: string;
    designation?: string;
    status?: string;
    userId?: string;
  }): Promise<BackendClientSupervisor> {
    const res = await apiClient.request<{ success: boolean; data: BackendClientSupervisor }>('/clients/supervisors', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateSupervisor(
    id: string,
    payload: Partial<{
      fullName?: string;
      email?: string;
      phone?: string;
      designation?: string;
      status?: string;
      userId?: string;
    }>
  ): Promise<BackendClientSupervisor> {
    const res = await apiClient.request<{ success: boolean; data: BackendClientSupervisor }>(`/clients/supervisors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  // ==========================================
  // Employee Deployments
  // ==========================================
  async getDeployments(params?: {
    clientId?: string;
    employeeId?: string;
    status?: string;
  }): Promise<BackendClientDeployment[]> {
    const query = new URLSearchParams();
    if (params?.clientId) query.append('clientId', params.clientId);
    if (params?.employeeId) query.append('employeeId', params.employeeId);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient.request<{ success: boolean; data: BackendClientDeployment[] }>(`/clients/deployments${qs}`);
    return res.data;
  },

  async createDeployment(payload: {
    clientId: string;
    employeeId: string;
    supervisorId?: string;
    project: string;
    location: string;
    workMode?: string;
    startDate: string;
    plannedEndDate: string;
    allocation?: number;
    allowanceMonthly?: number;
    status?: string;
  }): Promise<BackendClientDeployment> {
    const res = await apiClient.request<{ success: boolean; data: BackendClientDeployment }>('/clients/deployments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateDeployment(
    id: string,
    payload: Partial<{
      supervisorId?: string;
      project?: string;
      location?: string;
      workMode?: string;
      plannedEndDate?: string;
      actualEndDate?: string;
      allocation?: number;
      allowanceMonthly?: number;
      status?: string;
    }>
  ): Promise<BackendClientDeployment> {
    const res = await apiClient.request<{ success: boolean; data: BackendClientDeployment }>(`/clients/deployments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  // ==========================================
  // Client Attendance Verifications
  // ==========================================
  async getVerifications(params?: {
    clientId?: string;
    employeeId?: string;
    periodKey?: string;
    status?: string;
  }): Promise<BackendClientAttendanceVerification[]> {
    const query = new URLSearchParams();
    if (params?.clientId) query.append('clientId', params.clientId);
    if (params?.employeeId) query.append('employeeId', params.employeeId);
    if (params?.periodKey) query.append('periodKey', params.periodKey);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient.request<{ success: boolean; data: BackendClientAttendanceVerification[] }>(`/clients/verifications${qs}`);
    return res.data;
  },

  async supervisorVerify(
    id: string,
    decision: 'Approved' | 'Rejected',
    remarks?: string
  ): Promise<BackendClientAttendanceVerification> {
    const res = await apiClient.request<{ success: boolean; data: BackendClientAttendanceVerification }>(
      `/clients/verifications/${id}/verify`,
      {
        method: 'PUT',
        body: JSON.stringify({ decision, remarks }),
      }
    );
    return res.data;
  },

  async hrApprove(
    id: string,
    decision: 'Approved' | 'Rejected',
    hrComments?: string
  ): Promise<BackendClientAttendanceVerification> {
    const res = await apiClient.request<{ success: boolean; data: BackendClientAttendanceVerification }>(
      `/clients/verifications/${id}/hr-approve`,
      {
        method: 'PUT',
        body: JSON.stringify({ decision, hrComments }),
      }
    );
    return res.data;
  },
};

