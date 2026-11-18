// Celestial HRMS - Unified Expense Service API Client
// Interfaces with Expense Service via API Gateway /api/v1/expenses
import { apiClient } from './apiClient';

export interface ExpenseCategoryDTO {
  id: string;
  code: string;
  name: string;
  description?: string;
  policyLimitMax: number;
  requiresReceipt: boolean;
  status: 'Active' | 'Inactive';
  createdAt?: string;
  updatedAt?: string;
}

export type ExpenseClaimStatus =
  | 'Draft'
  | 'Pending Manager Approval'
  | 'Approved by Manager'
  | 'Approved'
  | 'Rejected'
  | 'Pending Reimbursement'
  | 'Reimbursed';

export interface ApprovalHistoryEntry {
  stage: string;
  action: string;
  actorId: string;
  actorName: string;
  timestamp: string;
  comments?: string;
}

export interface ExpenseClaimDTO {
  id: string;
  claimNumber: string;
  employeeId: string;
  categoryId: string;
  amount: number;
  currency: string;
  expenseDate: string; // YYYY-MM-DD
  purpose: string;
  receiptUrl?: string;
  receiptFileName?: string;
  status: ExpenseClaimStatus;
  approverId?: string;
  managerRemarks?: string;
  managerActionAt?: string;
  hrAdminId?: string;
  hrRemarks?: string;
  hrActionAt?: string;
  reimbursedAt?: string;
  reimbursementReference?: string;
  isPettyCash: boolean;
  approvalHistory?: ApprovalHistoryEntry[];
  category?: ExpenseCategoryDTO;
  createdAt?: string;
  updatedAt?: string;
}

export type AdvanceType = 'Salary Advance' | 'Travel Petty Cash';
export type AdvanceStatus =
  | 'Pending Approval'
  | 'Approved'
  | 'Rejected'
  | 'Disbursed'
  | 'Settlement Pending'
  | 'Settled';

export interface AdvancePettyCashDTO {
  id: string;
  employeeId: string;
  advanceType: AdvanceType;
  amount: number;
  approvedAmount?: number;
  recoveredAmount: number;
  actualExpense?: number;
  purpose: string;
  requestDate: string; // YYYY-MM-DD
  status: AdvanceStatus;
  paymentReference?: string;
  settlementNote?: string;
  disbursedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClaimFilterParams {
  status?: string;
  categoryId?: string;
  fromDate?: string;
  toDate?: string;
  employeeId?: string;
  limit?: number;
  offset?: number;
}

export interface AdvanceFilterParams {
  status?: string;
  advanceType?: string;
  fromDate?: string;
  toDate?: string;
  employeeId?: string;
  limit?: number;
  offset?: number;
}

export interface SubmitClaimPayload {
  employeeId: string;
  categoryId: string;
  amount: number;
  currency?: string;
  expenseDate: string; // YYYY-MM-DD
  purpose: string;
  receiptUrl?: string | null;
  receiptFileName?: string | null;
  isPettyCash?: boolean;
}

export interface ReviewClaimPayload {
  decision: 'Approved' | 'Rejected';
  remarks?: string;
}

export interface ReimburseClaimPayload {
  reimbursementReference: string;
  remarks?: string;
}

export interface RequestAdvancePayload {
  employeeId: string;
  advanceType: AdvanceType;
  amount: number;
  purpose: string;
  requestDate: string; // YYYY-MM-DD
}

export interface ReviewAdvancePayload {
  decision: 'Approved' | 'Rejected';
  approvedAmount?: number;
  remarks?: string;
}

export interface DisburseAdvancePayload {
  paymentReference: string;
}

export interface SettleAdvancePayload {
  actualExpense: number;
  settlementNote: string;
}

class ExpenseApiService {
  private baseRoute = '/expenses';

  // ==========================================
  // Categories
  // ==========================================

  async getCategories(activeOnly: boolean = true): Promise<ExpenseCategoryDTO[]> {
    const query = activeOnly ? '?activeOnly=true' : '?activeOnly=false';
    return apiClient.request<ExpenseCategoryDTO[]>(`${this.baseRoute}/categories${query}`, {
      method: 'GET',
    });
  }

  async getCategoryById(id: string): Promise<ExpenseCategoryDTO> {
    return apiClient.request<ExpenseCategoryDTO>(`${this.baseRoute}/categories/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  }

  // ==========================================
  // Expense Claims
  // ==========================================

  async getClaims(filters?: ClaimFilterParams): Promise<ExpenseClaimDTO[]> {
    const searchParams = new URLSearchParams();
    if (filters?.status && filters.status !== 'ALL') searchParams.append('status', filters.status);
    if (filters?.categoryId && filters.categoryId !== 'ALL') searchParams.append('categoryId', filters.categoryId);
    if (filters?.fromDate) searchParams.append('fromDate', filters.fromDate);
    if (filters?.toDate) searchParams.append('toDate', filters.toDate);
    if (filters?.employeeId && filters.employeeId !== 'ALL') searchParams.append('employeeId', filters.employeeId);
    if (filters?.limit) searchParams.append('limit', String(filters.limit));
    if (filters?.offset) searchParams.append('offset', String(filters.offset));

    const qs = searchParams.toString();
    const endpoint = qs ? `${this.baseRoute}/claims?${qs}` : `${this.baseRoute}/claims`;
    return apiClient.request<ExpenseClaimDTO[]>(endpoint, {
      method: 'GET',
    });
  }

  async getClaimById(id: string): Promise<ExpenseClaimDTO> {
    return apiClient.request<ExpenseClaimDTO>(`${this.baseRoute}/claims/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  }

  async submitClaim(payload: SubmitClaimPayload): Promise<ExpenseClaimDTO> {
    return apiClient.request<ExpenseClaimDTO>(`${this.baseRoute}/claims`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async managerReview(id: string, decision: 'Approved' | 'Rejected', remarks?: string): Promise<ExpenseClaimDTO> {
    return apiClient.request<ExpenseClaimDTO>(`${this.baseRoute}/claims/${encodeURIComponent(id)}/manager-review`, {
      method: 'PUT',
      body: JSON.stringify({ decision, remarks }),
    });
  }

  async hrFinalApprove(id: string, decision: 'Approved' | 'Rejected', remarks?: string): Promise<ExpenseClaimDTO> {
    return apiClient.request<ExpenseClaimDTO>(`${this.baseRoute}/claims/${encodeURIComponent(id)}/hr-approve`, {
      method: 'PUT',
      body: JSON.stringify({ decision, remarks }),
    });
  }

  async reimburseClaim(id: string, reimbursementReference: string, remarks?: string): Promise<ExpenseClaimDTO> {
    return apiClient.request<ExpenseClaimDTO>(`${this.baseRoute}/claims/${encodeURIComponent(id)}/reimburse`, {
      method: 'PUT',
      body: JSON.stringify({ reimbursementReference, remarks }),
    });
  }

  // ==========================================
  // Advances & Petty Cash
  // ==========================================

  async getAdvances(filters?: AdvanceFilterParams): Promise<AdvancePettyCashDTO[]> {
    const searchParams = new URLSearchParams();
    if (filters?.status && filters.status !== 'ALL') searchParams.append('status', filters.status);
    if (filters?.advanceType && filters.advanceType !== 'ALL') searchParams.append('advanceType', filters.advanceType);
    if (filters?.fromDate) searchParams.append('fromDate', filters.fromDate);
    if (filters?.toDate) searchParams.append('toDate', filters.toDate);
    if (filters?.employeeId && filters.employeeId !== 'ALL') searchParams.append('employeeId', filters.employeeId);
    if (filters?.limit) searchParams.append('limit', String(filters.limit));
    if (filters?.offset) searchParams.append('offset', String(filters.offset));

    const qs = searchParams.toString();
    const endpoint = qs ? `${this.baseRoute}/advances?${qs}` : `${this.baseRoute}/advances`;
    return apiClient.request<AdvancePettyCashDTO[]>(endpoint, {
      method: 'GET',
    });
  }

  async getAdvanceById(id: string): Promise<AdvancePettyCashDTO> {
    return apiClient.request<AdvancePettyCashDTO>(`${this.baseRoute}/advances/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  }

  async requestAdvance(payload: RequestAdvancePayload): Promise<AdvancePettyCashDTO> {
    return apiClient.request<AdvancePettyCashDTO>(`${this.baseRoute}/advances`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async reviewAdvance(
    id: string,
    decision: 'Approved' | 'Rejected',
    approvedAmount?: number,
    remarks?: string
  ): Promise<AdvancePettyCashDTO> {
    return apiClient.request<AdvancePettyCashDTO>(`${this.baseRoute}/advances/${encodeURIComponent(id)}/review`, {
      method: 'PUT',
      body: JSON.stringify({ decision, approvedAmount, remarks }),
    });
  }

  async disburseAdvance(id: string, paymentReference: string): Promise<AdvancePettyCashDTO> {
    return apiClient.request<AdvancePettyCashDTO>(`${this.baseRoute}/advances/${encodeURIComponent(id)}/disburse`, {
      method: 'PUT',
      body: JSON.stringify({ paymentReference }),
    });
  }

  async settleAdvance(id: string, actualExpense: number, settlementNote: string): Promise<AdvancePettyCashDTO> {
    return apiClient.request<AdvancePettyCashDTO>(`${this.baseRoute}/advances/${encodeURIComponent(id)}/settle`, {
      method: 'PUT',
      body: JSON.stringify({ actualExpense, settlementNote }),
    });
  }
}

export const expenseApi = new ExpenseApiService();

