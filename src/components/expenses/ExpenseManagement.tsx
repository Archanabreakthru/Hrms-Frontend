import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { NavigationContext } from '../../types/hrms';
import { useAuth } from '../../services/authContext';
import {
  expenseApi,
  ExpenseClaimDTO,
  ExpenseCategoryDTO,
  ExpenseClaimStatus,
} from '../../services/expenseApi';
import { DataTable, Column } from '../common/DataTable';
import { ExportButton } from '../common/ExportButton';
import { StatCard } from '../common/StatCard';
import { NewExpenseModal } from './NewExpenseModal';
import { AdvancePettyCash } from './AdvancePettyCash';
import {
  Receipt,
  CheckCircle2,
  Clock,
  Plus,
  Check,
  X,
  CreditCard,
  Send,
  Eye,
  ShieldCheck,
  Loader2,
  AlertCircle,
  RefreshCw,
  Info,
  Lock,
} from 'lucide-react';

interface ExpenseManagementProps {
  navContext?: NavigationContext;
  onOpenPolicies?: () => void;
}

export const ExpenseManagement: React.FC<ExpenseManagementProps> = ({ navContext, onOpenPolicies }) => {
  const { currentUser, canApproveRequestFor } = useAuth();
  const isHR = currentUser.role === 'hr_admin' || currentUser.role === 'super_admin';
  const isManager = currentUser.role === 'senior_manager' || currentUser.role === 'reporting_manager';

  const [activeTab, setActiveTab] = useState<'claims' | 'approvals' | 'reimbursements' | 'categories' | 'advances'>(() => {
    if (navContext?.subTab === 'approvals' || navContext?.statusFilter === 'Pending Manager Approval') return 'approvals';
    if (navContext?.subTab === 'reimbursements' || navContext?.statusFilter === 'Approved') return 'reimbursements';
    if (navContext?.subTab === 'advances') return 'advances';
    return 'claims';
  });

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Live state from backend
  const [claims, setClaims] = useState<ExpenseClaimDTO[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Contextual filters for Claims
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState(() => navContext?.statusFilter || 'ALL');
  const [empFilter, setEmpFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (!navContext) return;
    if (navContext.subTab === 'approvals' || navContext.statusFilter === 'Pending Manager Approval') setActiveTab('approvals');
    else if (navContext.subTab === 'reimbursements' || navContext.statusFilter === 'Approved') setActiveTab('reimbursements');
    else if (navContext.subTab === 'advances') setActiveTab('advances');
    else if (navContext.subTab === 'claims') setActiveTab('claims');
    if (navContext.statusFilter) setStatusFilter(navContext.statusFilter);
  }, [navContext]);

  // Load claims and categories from backend
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [claimsData, catsData] = await Promise.all([
        expenseApi.getClaims(),
        expenseApi.getCategories(false),
      ]);
      setClaims(claimsData);
      setCategories(catsData);
    } catch (err: any) {
      setApiError(err?.message || 'Unable to load expense data from the API gateway.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // View Claim modal
  const [viewingClaim, setViewingClaim] = useState<ExpenseClaimDTO | null>(null);

  // Review modal (Manager or HR Final)
  const [reviewClaim, setReviewClaim] = useState<{
    claim: ExpenseClaimDTO;
    stage: 'manager' | 'hr';
    decision: 'Approved' | 'Rejected';
  } | null>(null);
  const [reviewComments, setReviewComments] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Reimbursement modal
  const [reimburseClaim, setReimburseClaim] = useState<ExpenseClaimDTO | null>(null);
  const [reimburseRef, setReimburseRef] = useState('');
  const [reimburseRemarks, setReimburseRemarks] = useState('');
  const [isSubmittingReimburse, setIsSubmittingReimburse] = useState(false);

  // Action message
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Visible claims based on current filters
  const visibleClaims = useMemo(() => {
    return claims.filter((c) => {
      if (categoryFilter !== 'ALL' && c.categoryId !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (empFilter !== 'ALL' && c.employeeId !== empFilter) return false;
      if (fromDate && c.expenseDate < fromDate) return false;
      if (toDate && c.expenseDate > toDate) return false;
      return true;
    });
  }, [claims, categoryFilter, statusFilter, empFilter, fromDate, toDate]);

  // Manager Approval Queue
  const pendingApprovals = useMemo(() => {
    return claims.filter((c) => {
      if (c.status !== 'Pending Manager Approval') return false;
      // Self cannot approve own claim
      if (c.employeeId === currentUser.employeeId) return false;
      // Must have manager or HR authority
      return isHR || isManager || canApproveRequestFor(c.employeeId);
    });
  }, [claims, currentUser.employeeId, isHR, isManager, canApproveRequestFor]);

  // HR Reimbursement Queue (Approved claims awaiting payment)
  const pendingReimbursements = useMemo(() => {
    return claims.filter((c) => c.status === 'Approved');
  }, [claims]);

  // Total Reimbursed Amount
  const totalReimbursed = useMemo(() => {
    return claims
      .filter((c) => c.status === 'Reimbursed')
      .reduce((acc, c) => acc + c.amount, 0);
  }, [claims]);

  // Handle Manager Review / HR Final Approval
  const handleDecisionConfirm = async () => {
    if (!reviewClaim) return;
    setIsSubmittingReview(true);
    setApiError(null);

    try {
      if (reviewClaim.stage === 'manager') {
        await expenseApi.managerReview(
          reviewClaim.claim.id,
          reviewClaim.decision,
          reviewComments.trim() || undefined
        );
        setActionSuccess(`Claim ${reviewClaim.claim.claimNumber} manager review recorded as ${reviewClaim.decision}.`);
      } else {
        await expenseApi.hrFinalApprove(
          reviewClaim.claim.id,
          reviewClaim.decision,
          reviewComments.trim() || undefined
        );
        setActionSuccess(`Claim ${reviewClaim.claim.claimNumber} HR final approval recorded as ${reviewClaim.decision}.`);
      }

      setReviewClaim(null);
      setReviewComments('');
      await loadData();
    } catch (err: any) {
      if (err?.status === 409) {
        setApiError('Concurrency Conflict: This claim was modified by another user. Reloading latest state...');
      } else {
        setApiError(err?.message || 'Failed to submit review decision.');
      }
      await loadData();
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Handle Reimbursement Payment
  const handleReimburseConfirm = async () => {
    if (!reimburseClaim || !reimburseRef.trim()) return;
    setIsSubmittingReimburse(true);
    setApiError(null);

    try {
      await expenseApi.reimburseClaim(
        reimburseClaim.id,
        reimburseRef.trim(),
        reimburseRemarks.trim() || undefined
      );
      setActionSuccess(`Claim ${reimburseClaim.claimNumber} marked as Reimbursed (Ref: ${reimburseRef.trim()}).`);
      setReimburseClaim(null);
      setReimburseRef('');
      setReimburseRemarks('');
      await loadData();
    } catch (err: any) {
      if (err?.status === 409) {
        setApiError('Concurrency Conflict: This claim was already reimbursed or modified. Reloading...');
      } else {
        setApiError(err?.message || 'Failed to record reimbursement payout.');
      }
      await loadData();
    } finally {
      setIsSubmittingReimburse(false);
    }
  };

  // Table Columns Definition
  const columns: Column<ExpenseClaimDTO>[] = [
    {
      header: 'Claim Number',
      accessorKey: 'claimNumber',
      sortable: true,
      cell: (claim) => (
        <div>
          <span className="font-bold text-slate-900 font-mono">{claim.claimNumber}</span>
          <span className="text-[11px] text-slate-500 block">{claim.expenseDate}</span>
        </div>
      ),
    },
    {
      header: 'Employee ID',
      accessorKey: 'employeeId',
      sortable: true,
      cell: (claim) => (
        <div>
          <span className="font-mono text-xs font-semibold text-slate-900">{claim.employeeId}</span>
          {claim.employeeId === currentUser.employeeId && (
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded ml-1 font-sans">
              You
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Category & Purpose',
      accessorKey: 'purpose',
      sortable: true,
      cell: (claim) => {
        const cat = categories.find((c) => c.id === claim.categoryId) || claim.category;
        return (
          <div className="max-w-xs">
            <span className="font-medium text-slate-800 line-clamp-1">{claim.purpose}</span>
            <span className="text-[11px] text-indigo-600 block">{cat?.name || 'Standard Expense'}</span>
            {claim.receiptFileName && (
              <span className="text-[10px] text-slate-500 block font-mono">Receipt: {claim.receiptFileName}</span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      sortable: true,
      cell: (claim) => (
        <span className="font-bold text-slate-900 font-mono">
          ₹{claim.amount.toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (claim) => {
        let badgeStyle = 'bg-amber-50 text-amber-700 border border-amber-200';
        if (claim.status === 'Reimbursed') badgeStyle = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        else if (claim.status === 'Approved') badgeStyle = 'bg-blue-50 text-blue-700 border border-blue-200';
        else if (claim.status === 'Approved by Manager') badgeStyle = 'bg-indigo-50 text-indigo-700 border border-indigo-200';
        else if (claim.status === 'Rejected') badgeStyle = 'bg-rose-50 text-rose-700 border border-rose-200';

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeStyle}`}>
            {claim.status}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      cell: (claim) => {
        const isOwn = claim.employeeId === currentUser.employeeId;
        const canManagerReview = claim.status === 'Pending Manager Approval' && !isOwn && (isManager || isHR || canApproveRequestFor(claim.employeeId));
        const canHrApprove = claim.status === 'Approved by Manager' && isHR;
        const canReimburse = claim.status === 'Approved' && isHR;

        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewingClaim(claim)}
              className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="View Claim Details"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>

            {/* Manager Review */}
            {canManagerReview && (
              <>
                <button
                  onClick={() => setReviewClaim({ claim, stage: 'manager', decision: 'Approved' })}
                  className="p-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                  title="Manager Approve"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setReviewClaim({ claim, stage: 'manager', decision: 'Rejected' })}
                  className="p-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                  title="Manager Reject"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            {/* HR Final Approval */}
            {canHrApprove && (
              <>
                <button
                  onClick={() => setReviewClaim({ claim, stage: 'hr', decision: 'Approved' })}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200"
                  title="HR Final Approval"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>HR Approve</span>
                </button>
                <button
                  onClick={() => setReviewClaim({ claim, stage: 'hr', decision: 'Rejected' })}
                  className="p-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                  title="HR Reject"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            {/* HR Reimbursement Payout */}
            {canReimburse && (
              <button
                onClick={() => {
                  setReimburseClaim(claim);
                  setReimburseRef(`UTR-REIMB-${Date.now().toString().slice(-6)}`);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
              >
                <Send className="h-3 w-3" />
                <span>Pay Reimbursement</span>
              </button>
            )}

            {!canManagerReview && !canHrApprove && !canReimburse && claim.reimbursementReference && (
              <span className="text-[10px] text-slate-500 font-mono">Ref: {claim.reimbursementReference}</span>
            )}
          </div>
        );
      },
    },
  ];

  const exportData = visibleClaims.map((c) => ({
    ClaimNumber: c.claimNumber,
    EmployeeID: c.employeeId,
    Category: categories.find((cat) => cat.id === c.categoryId)?.name || '',
    Purpose: c.purpose,
    Amount: c.amount,
    Date: c.expenseDate,
    Status: c.status,
    PaymentReference: c.reimbursementReference || '',
  }));

  const hasFilters =
    categoryFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    empFilter !== 'ALL' ||
    Boolean(fromDate) ||
    Boolean(toDate);

  return (
    <div className="space-y-6">
      {/* Top Banner Alert on Error */}
      {apiError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{apiError}</span>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded font-semibold text-[11px]"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="font-bold text-emerald-900 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Claims"
          value={isLoading ? '...' : visibleClaims.length}
          subtitle="Accessible within role scope"
          icon={Receipt}
          badge="Live DB"
          badgeColor="slate"
        />
        <StatCard
          title="Pending Approvals"
          value={isLoading ? '...' : pendingApprovals.length}
          subtitle="Manager review queue"
          icon={Clock}
          badge={pendingApprovals.length > 0 ? 'Action Needed' : 'Cleared'}
          badgeColor={pendingApprovals.length > 0 ? 'amber' : 'emerald'}
          onClick={() => setActiveTab('approvals')}
        />
        <StatCard
          title="Awaiting Payment"
          value={isLoading ? '...' : pendingReimbursements.length}
          subtitle="Approved by HR"
          icon={CreditCard}
          badge={pendingReimbursements.length > 0 ? 'Pay Out' : 'None'}
          badgeColor={pendingReimbursements.length > 0 ? 'blue' : 'slate'}
          onClick={() => setActiveTab('reimbursements')}
        />
        <StatCard
          title="Reimbursed Total"
          value={isLoading ? '...' : `₹${totalReimbursed.toLocaleString()}`}
          subtitle="Disbursed via direct transfer"
          icon={CheckCircle2}
          badge="Processed"
          badgeColor="emerald"
        />
      </div>

      {/* Tabs and Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'claims' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Claims ({visibleClaims.length})
          </button>
          {pendingApprovals.length > 0 && (
            <button
              onClick={() => setActiveTab('approvals')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'approvals' ? 'bg-white text-amber-800 shadow-xs' : 'text-amber-700 hover:text-amber-900'
              }`}
            >
              Manager Queue ({pendingApprovals.length})
            </button>
          )}
          {isHR && (
            <button
              onClick={() => setActiveTab('reimbursements')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'reimbursements' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reimbursement Payouts ({pendingReimbursements.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab('advances')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'advances' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Advances & Petty Cash
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'categories' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Expense Categories ({categories.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh from server"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {onOpenPolicies && (
            <button
              type="button"
              onClick={onOpenPolicies}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors"
            >
              <span>View Policy</span>
            </button>
          )}

          <ExportButton data={exportData} fileName="orbyx_expenses" label="Export" />

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Claim</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'advances' ? (
        <AdvancePettyCash />
      ) : activeTab === 'categories' ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Expense Policy Categories</h3>
              <p className="text-xs text-slate-500">
                Categories and claim limits are enforced directly by the backend database service.
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
              <Lock className="h-3.5 w-3.5" />
              <span>Read-Only Policy (Managed via System Admin)</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-10 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600 mr-2" />
              <span>Loading categories...</span>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 bg-slate-50 rounded-xl">
              No categories configured in PostgreSQL table <code className="font-mono">expense.expense_categories</code>.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <div key={cat.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{cat.name}</h4>
                      <span className="font-mono text-[10px] text-slate-500">{cat.code}</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        cat.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {cat.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">{cat.description || 'No description provided'}</p>
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Max Limit:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {cat.policyLimitMax > 0 ? `₹${cat.policyLimitMax.toLocaleString()}` : 'No Limit'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Receipt Required:</span>
                    <span className="font-semibold text-slate-700">{cat.requiresReceipt ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Claims or Queue Table */
        <div className="space-y-3">
          {/* Filter Bar for Claims */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 text-xs">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending Manager Approval">Pending Manager Approval</option>
              <option value="Approved by Manager">Approved by Manager</option>
              <option value="Approved">Approved (Awaiting Payment)</option>
              <option value="Reimbursed">Reimbursed</option>
              <option value="Rejected">Rejected</option>
            </select>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="From Date"
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="To Date"
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            />

            {hasFilters && (
              <button
                onClick={() => {
                  setCategoryFilter('ALL');
                  setStatusFilter('ALL');
                  setEmpFilter('ALL');
                  setFromDate('');
                  setToDate('');
                }}
                className="px-2.5 py-1.5 text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto mb-2" />
              <span>Loading expense claims from database...</span>
            </div>
          ) : activeTab === 'approvals' ? (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between">
                <span>
                  Showing {pendingApprovals.length} claim(s) awaiting your managerial review. Self-approval is strictly prohibited.
                </span>
              </div>
              <DataTable
                data={pendingApprovals}
                columns={columns}
                emptyMessage="Manager queue is clear. No claims pending review."
              />
            </div>
          ) : activeTab === 'reimbursements' ? (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-center justify-between">
                <span>
                  Showing {pendingReimbursements.length} claim(s) approved by HR and awaiting bank transfer disbursement.
                </span>
              </div>
              <DataTable
                data={pendingReimbursements}
                columns={columns}
                emptyMessage="No approved claims awaiting reimbursement."
              />
            </div>
          ) : (
            <DataTable
              data={visibleClaims}
              columns={columns}
              emptyMessage="No expense claims found matching the criteria."
            />
          )}
        </div>
      )}

      {/* Review Modal (Manager or HR Final) */}
      {reviewClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              {reviewClaim.stage === 'manager' ? 'Manager Review' : 'HR Final Approval'} – {reviewClaim.decision} Claim
            </h3>
            <p className="text-slate-600">
              Confirm {reviewClaim.decision.toLowerCase()} for claim{' '}
              <strong className="font-mono text-slate-900">{reviewClaim.claim.claimNumber}</strong> (₹
              {reviewClaim.claim.amount.toLocaleString()}).
            </p>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Remarks / Comments {reviewClaim.decision === 'Rejected' && '* (Mandatory for Rejection)'}
              </label>
              <textarea
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                rows={3}
                placeholder={
                  reviewClaim.decision === 'Rejected'
                    ? 'State reasons for rejecting this claim...'
                    : 'Optional verification notes...'
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                required={reviewClaim.decision === 'Rejected'}
                disabled={isSubmittingReview}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setReviewClaim(null)}
                className="px-3.5 py-1.5 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                disabled={isSubmittingReview}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDecisionConfirm}
                className={`px-3.5 py-1.5 font-semibold text-white rounded-lg transition-colors flex items-center gap-1.5 ${
                  reviewClaim.decision === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
                disabled={isSubmittingReview || (reviewClaim.decision === 'Rejected' && !reviewComments.trim())}
              >
                {isSubmittingReview && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm {reviewClaim.decision}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reimbursement Modal */}
      {reimburseClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Record Reimbursement Payout</h3>
            <p className="text-slate-600">
              Disburse ₹{reimburseClaim.amount.toLocaleString()} for claim{' '}
              <strong className="font-mono text-slate-900">{reimburseClaim.claimNumber}</strong>.
            </p>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Payment / UTR Reference *</label>
              <input
                type="text"
                value={reimburseRef}
                onChange={(e) => setReimburseRef(e.target.value)}
                placeholder="e.g. UTR-HDFC-98213456"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono text-xs"
                required
                disabled={isSubmittingReimburse}
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Remarks</label>
              <input
                type="text"
                value={reimburseRemarks}
                onChange={(e) => setReimburseRemarks(e.target.value)}
                placeholder="Optional payment notes"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                disabled={isSubmittingReimburse}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setReimburseClaim(null)}
                className="px-3.5 py-1.5 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                disabled={isSubmittingReimburse}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReimburseConfirm}
                className="px-3.5 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                disabled={isSubmittingReimburse || !reimburseRef.trim()}
              >
                {isSubmittingReimburse && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm Payment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Claim Modal */}
      {viewingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">{viewingClaim.claimNumber}</h3>
                <span className="text-slate-500 text-xs">Submitted on {viewingClaim.expenseDate}</span>
              </div>
              <span className="px-2 py-0.5 rounded font-semibold text-xs bg-slate-100 text-slate-800">
                {viewingClaim.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Employee ID</span>
                <span className="font-mono font-bold text-slate-900">{viewingClaim.employeeId}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Amount</span>
                <span className="font-mono font-bold text-slate-900 text-sm">₹{viewingClaim.amount.toLocaleString()}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Purpose</span>
                <p className="text-slate-800 font-medium">{viewingClaim.purpose}</p>
              </div>
              {viewingClaim.receiptFileName && (
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Receipt Attachment</span>
                  <span className="font-mono text-indigo-600">{viewingClaim.receiptFileName}</span>
                </div>
              )}
              {viewingClaim.reimbursementReference && (
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Payment Reference</span>
                  <span className="font-mono text-emerald-700 font-semibold">{viewingClaim.reimbursementReference}</span>
                </div>
              )}
            </div>

            {/* Audit History Timeline */}
            {viewingClaim.approvalHistory && viewingClaim.approvalHistory.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Approval History</h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {viewingClaim.approvalHistory.map((item, idx) => (
                    <div key={idx} className="p-2 rounded bg-slate-50 border border-slate-200/60 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{item.action}</span>
                        <span className="text-slate-400 text-[10px]">{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      <span className="text-slate-500 block">By: {item.actorName || item.actorId}</span>
                      {item.comments && <p className="text-slate-700 italic mt-0.5">"{item.comments}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setViewingClaim(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Expense Modal */}
      <NewExpenseModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={() => {
          setActionSuccess('Expense claim submitted successfully.');
          loadData();
        }}
      />
    </div>
  );
};
