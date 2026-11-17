import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Wallet, Plus, CheckCircle2, Clock, ArrowLeftRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../services/authContext';
import { expenseApi, AdvancePettyCashDTO, AdvanceType } from '../../services/expenseApi';

const field = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

export const AdvancePettyCash: React.FC = () => {
  const { currentUser } = useAuth();

  const [records, setRecords] = useState<AdvancePettyCashDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<AdvanceType>('Salary Advance');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Settlement state
  const [settleRecord, setSettleRecord] = useState<AdvancePettyCashDTO | null>(null);
  const [actual, setActual] = useState('');
  const [note, setNote] = useState('');
  const [isSettling, setIsSettling] = useState(false);

  // Disbursement state
  const [disbursingId, setDisbursingId] = useState<string | null>(null);
  const [disburseRefInput, setDisburseRefInput] = useState('');
  const [isDisbursing, setIsDisbursing] = useState(false);

  // Review state
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const [message, setMessage] = useState('');

  const isHR = currentUser.role === 'hr_admin' || currentUser.role === 'super_admin';
  const isManager = currentUser.role === 'senior_manager' || currentUser.role === 'reporting_manager';
  const canApprove = isHR || isManager;

  // Load advances from backend API
  const loadAdvances = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const data = await expenseApi.getAdvances();
      setRecords(data);
    } catch (err: any) {
      setApiError(err?.message || 'Failed to connect to the expense service. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdvances();
  }, [loadAdvances]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0 || !purpose.trim()) return;

    if (!currentUser.employeeId) {
      setApiError('Your account is not linked to an Employee ID. Please contact HR.');
      return;
    }

    setIsSubmitting(true);
    setApiError(null);
    try {
      await expenseApi.requestAdvance({
        employeeId: currentUser.employeeId,
        advanceType: type,
        amount: n,
        purpose: purpose.trim(),
        requestDate: new Date().toISOString().slice(0, 10),
      });

      setAmount('');
      setPurpose('');
      setShowForm(false);
      setMessage('Request submitted successfully.');
      await loadAdvances();
    } catch (err: any) {
      setApiError(err?.message || 'Failed to submit advance request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (id: string, decision: 'Approved' | 'Rejected') => {
    setReviewingId(id);
    setApiError(null);
    try {
      await expenseApi.reviewAdvance(id, decision);
      setMessage(`Request marked as ${decision}.`);
      await loadAdvances();
    } catch (err: any) {
      if (err?.status === 409) {
        setApiError('Concurrency Conflict: This record was already modified by another user. Reloading latest state...');
      } else {
        setApiError(err?.message || `Failed to ${decision.toLowerCase()} request.`);
      }
      await loadAdvances();
    } finally {
      setReviewingId(null);
    }
  };

  const confirmDisbursement = async (id: string) => {
    if (!disburseRefInput.trim()) return;
    setIsDisbursing(true);
    setApiError(null);
    try {
      await expenseApi.disburseAdvance(id, disburseRefInput.trim());
      setDisbursingId(null);
      setDisburseRefInput('');
      setMessage('Advance disbursement recorded successfully.');
      await loadAdvances();
    } catch (err: any) {
      if (err?.status === 409) {
        setApiError('Concurrency Conflict: This advance has already been disbursed or updated. Reloading...');
      } else {
        setApiError(err?.message || 'Failed to record disbursement.');
      }
      await loadAdvances();
    } finally {
      setIsDisbursing(false);
    }
  };

  const submitSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleRecord) return;
    const n = Number(actual);
    if (!Number.isFinite(n) || n < 0) return;

    setIsSettling(true);
    setApiError(null);
    try {
      await expenseApi.settleAdvance(settleRecord.id, n, note.trim() || 'Settlement submitted by employee');
      setSettleRecord(null);
      setActual('');
      setNote('');
      setMessage('Settlement submitted and recorded successfully.');
      await loadAdvances();
    } catch (err: any) {
      if (err?.status === 409) {
        setApiError('Concurrency Conflict: This record was already settled. Reloading...');
      } else {
        setApiError(err?.message || 'Failed to submit settlement.');
      }
      await loadAdvances();
    } finally {
      setIsSettling(false);
    }
  };

  const totals = {
    requested: records
      .filter((r) => r.status === 'Pending Approval')
      .reduce((s, r) => s + r.amount, 0),
    outstanding: records
      .filter((r) => r.status === 'Disbursed' || r.status === 'Settlement Pending')
      .reduce((s, r) => s + Math.max(0, (r.approvedAmount ?? r.amount) - (r.recoveredAmount ?? 0)), 0),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Salary Advances & Travel Petty Cash</h2>
          <p className="mt-1 text-sm text-slate-500">
            Track requests, approvals, disbursements and travel settlements as verified backend financial events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAdvances}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            title="Refresh from server"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-indigo-600' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-2xs"
          >
            <Plus size={16} />
            New request
          </button>
        </div>
      </div>

      {apiError && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{apiError}</span>
          </div>
          <button
            onClick={() => setApiError(null)}
            className="text-xs font-semibold underline text-rose-700 hover:text-rose-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {message && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="ml-3 text-xs font-bold text-emerald-900 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Summary icon={Clock} title="Pending approval" value={`₹${totals.requested.toLocaleString('en-IN')}`} />
        <Summary icon={Wallet} title="Outstanding advances" value={`₹${totals.outstanding.toLocaleString('en-IN')}`} />
        <Summary icon={CreditCard} title="Total requests" value={String(records.length)} />
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border border-indigo-100 bg-white p-4 space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Create financial request</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              Request type
              <select
                className={`${field} mt-1`}
                value={type}
                onChange={(e) => setType(e.target.value as AdvanceType)}
                disabled={isSubmitting}
              >
                <option value="Salary Advance">Salary Advance</option>
                <option value="Travel Petty Cash">Travel Petty Cash</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Requested amount (₹)
              <input
                required
                type="number"
                min="1"
                step="0.01"
                className={`${field} mt-1`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. 15000"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600 md:col-span-2">
              Purpose / reason
              <textarea
                required
                rows={2}
                className={`${field} mt-1`}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                disabled={isSubmitting}
                placeholder={
                  type === 'Travel Petty Cash'
                    ? 'Destination, travel dates and business purpose'
                    : 'Reason for salary advance & repayment schedule'
                }
              />
            </label>
          </div>
          <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
            Submitting a request records a pending financial event on the server. Approval and disbursement are recorded as distinct transitions.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              <span>Submit request</span>
            </button>
          </div>
        </form>
      )}

      {settleRecord && (
        <form onSubmit={submitSettlement} className="rounded-xl border border-indigo-100 bg-white p-4 space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Settle travel petty cash</h3>
          <p className="text-sm text-slate-500">
            Advance disbursed: ₹{(settleRecord.approvedAmount ?? settleRecord.amount).toLocaleString('en-IN')}
          </p>
          <label className="block text-xs font-semibold text-slate-600">
            Actual eligible expenses (₹)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              className={`${field} mt-1`}
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              disabled={isSettling}
              placeholder="e.g. 14200"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Receipt references / settlement note
            <textarea
              className={`${field} mt-1`}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSettling}
              placeholder="Record receipt names or refund details"
            />
          </label>
          {actual !== '' && (
            <p className="rounded-lg bg-slate-50 p-2.5 text-sm">
              Settlement difference:{' '}
              <strong>
                {Number(actual) - (settleRecord.approvedAmount ?? settleRecord.amount) >= 0
                  ? `₹${(Number(actual) - (settleRecord.approvedAmount ?? settleRecord.amount)).toLocaleString('en-IN')} potentially payable to employee`
                  : `₹${Math.abs(Number(actual) - (settleRecord.approvedAmount ?? settleRecord.amount)).toLocaleString('en-IN')} recoverable from employee`}
              </strong>
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSettleRecord(null)}
              className="rounded-lg border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              disabled={isSettling}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
              disabled={isSettling}
            >
              {isSettling && <Loader2 size={14} className="animate-spin" />}
              <span>Submit settlement</span>
            </button>
          </div>
        </form>
      )}

      {/* Advance Records Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <th className="p-3">Request</th>
              <th className="p-3">Employee</th>
              <th className="p-3">Requested / Balance</th>
              <th className="p-3">Settlement</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-sm text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                    <span>Loading financial records from server...</span>
                  </div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-sm text-slate-500">
                  No advance or petty cash requests recorded in the system yet.
                </td>
              </tr>
            ) : (
              records.map((r) => {
                const diff =
                  r.actualExpense === undefined
                    ? undefined
                    : r.actualExpense - (r.approvedAmount ?? r.amount);
                const isOwnRequest = r.employeeId === currentUser.employeeId;

                return (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="p-3">
                      <p className="font-semibold text-slate-900">{r.advanceType}</p>
                      <p className="text-xs text-slate-400 font-mono">
                        {r.id.slice(0, 18)} · {r.requestDate}
                      </p>
                      <p className="mt-1 max-w-xs text-xs text-slate-500">{r.purpose}</p>
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-xs font-semibold text-slate-800">{r.employeeId}</span>
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-slate-900 font-mono">₹{r.amount.toLocaleString('en-IN')}</p>
                      {r.recoveredAmount > 0 && (
                        <p className="text-xs text-emerald-700">
                          Recovered: ₹{r.recoveredAmount.toLocaleString('en-IN')} · Bal: ₹
                          {Math.max(0, (r.approvedAmount ?? r.amount) - r.recoveredAmount).toLocaleString('en-IN')}
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      {diff === undefined
                        ? '-'
                        : diff === 0
                        ? 'Balanced'
                        : diff > 0
                        ? `₹${diff.toLocaleString('en-IN')} payable`
                        : `₹${Math.abs(diff).toLocaleString('en-IN')} recoverable`}
                      {r.settlementNote && (
                        <p className="text-[10px] text-slate-400 block max-w-xs truncate">{r.settlementNote}</p>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          r.status === 'Settled' || r.status === 'Disbursed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : r.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : r.status === 'Approved'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Approval actions for Manager/HR */}
                        {canApprove && !isOwnRequest && r.status === 'Pending Approval' && (
                          <>
                            <button
                              onClick={() => handleReview(r.id, 'Approved')}
                              disabled={reviewingId === r.id}
                              className="rounded bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                            >
                              {reviewingId === r.id ? 'Saving...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleReview(r.id, 'Rejected')}
                              disabled={reviewingId === r.id}
                              className="rounded bg-rose-600 hover:bg-rose-700 px-2.5 py-1 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                            >
                              {reviewingId === r.id ? 'Saving...' : 'Reject'}
                            </button>
                          </>
                        )}

                        {/* Disbursement action for HR */}
                        {isHR && r.status === 'Approved' && (
                          disbursingId === r.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={disburseRefInput}
                                onChange={(e) => setDisburseRefInput(e.target.value)}
                                placeholder="UTR / Bank Ref"
                                className="w-28 rounded border border-slate-300 px-2 py-1 text-xs font-mono"
                                disabled={isDisbursing}
                              />
                              <button
                                onClick={() => confirmDisbursement(r.id)}
                                disabled={isDisbursing || !disburseRefInput.trim()}
                                className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                              >
                                {isDisbursing ? '...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setDisbursingId(null)}
                                className="rounded border px-1.5 py-1 text-xs text-slate-600 hover:bg-slate-100"
                                disabled={isDisbursing}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setDisbursingId(r.id);
                                setDisburseRefInput(`UTR-${Date.now().toString().slice(-6)}`);
                              }}
                              className="rounded bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200 transition-colors"
                            >
                              Record disbursement
                            </button>
                          )
                        )}

                        {/* Settlement action for Employee */}
                        {r.advanceType === 'Travel Petty Cash' &&
                          r.status === 'Disbursed' &&
                          isOwnRequest && (
                            <button
                              onClick={() => {
                                setSettleRecord(r);
                                setActual('');
                                setNote('');
                              }}
                              className="rounded bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 transition-colors"
                            >
                              Settle Expenses
                            </button>
                          )}

                        {/* Review & Close for HR */}
                        {isHR && r.status === 'Settlement Pending' && (
                          <button
                            onClick={() => {
                              setSettleRecord(r);
                              setActual(r.actualExpense ? String(r.actualExpense) : '');
                              setNote(r.settlementNote || '');
                            }}
                            className="rounded bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200"
                          >
                            <CheckCircle2 size={12} className="mr-1 inline" />
                            Review & Close
                          </button>
                        )}

                        {r.paymentReference && (
                          <span className="self-center text-[10px] font-mono text-slate-400">
                            Ref: {r.paymentReference}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        <ArrowLeftRight size={12} className="mr-1 inline" />
        Disbursed salary advances are audited and persist in the PostgreSQL database.
      </p>
    </div>
  );
};

const Summary: React.FC<{ icon: React.ElementType; title: string; value: string }> = ({
  icon: Icon,
  title,
  value,
}) => (
  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
    <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700">
      <Icon size={18} />
    </div>
    <div>
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-lg font-bold text-slate-900">{value}</p>
    </div>
  </div>
);
