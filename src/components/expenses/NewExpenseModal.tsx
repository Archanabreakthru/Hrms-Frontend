import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../services/authContext';
import { expenseApi, ExpenseCategoryDTO } from '../../services/expenseApi';
import { AlertCircle, Check, Loader2, Info } from 'lucide-react';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();

  const [categories, setCategories] = useState<ExpenseCategoryDTO[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [businessPurpose, setBusinessPurpose] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load active expense categories from live Expense Service
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingCategories(true);
    setCategoryError(null);

    expenseApi
      .getCategories(true)
      .then((data) => {
        if (!isMounted) return;
        setCategories(data);
        if (data.length > 0 && !categoryId) {
          setCategoryId(data[0].id);
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setCategoryError(err?.message || 'Failed to load expense categories from server.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingCategories(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!categoryId) {
      setError('Please select a valid expense category.');
      return;
    }

    if (!title.trim() || !amount || Number(amount) <= 0) {
      setError('Please provide a valid expense title and positive amount.');
      return;
    }

    const numericAmount = Number(amount);

    if (selectedCategory && selectedCategory.policyLimitMax > 0 && numericAmount > selectedCategory.policyLimitMax) {
      setError(
        `Amount of ₹${numericAmount.toLocaleString()} exceeds policy maximum of ₹${selectedCategory.policyLimitMax.toLocaleString()} for ${selectedCategory.name}.`
      );
      return;
    }

    if (selectedCategory?.requiresReceipt && !receiptFileName.trim()) {
      setError(`Receipt or bill invoice attachment is required for ${selectedCategory.name}.`);
      return;
    }

    if (!currentUser.employeeId) {
      setError('Your user account is not associated with an Employee ID. Please contact HR.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Concatenate title and description into the purpose field expected by backend
      const combinedPurpose = title.trim() === businessPurpose.trim()
        ? title.trim()
        : `${title.trim()}: ${businessPurpose.trim()}`;

      await expenseApi.submitClaim({
        employeeId: currentUser.employeeId,
        categoryId,
        amount: numericAmount,
        currency: 'INR',
        expenseDate,
        purpose: combinedPurpose,
        receiptFileName: receiptFileName.trim() || null,
        isPettyCash: false,
      });

      // Clear form
      setTitle('');
      setAmount('');
      setBusinessPurpose('');
      setReceiptFileName('');
      setError(null);

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit expense claim. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Expense Reimbursement Claim"
      description={`Submitting as ${currentUser.name} (ID: ${currentUser.employeeId || 'N/A'})`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {categoryError && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{categoryError}</span>
          </div>
        )}

        {/* Category selector */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-600 font-semibold">Expense Category *</label>
            {selectedCategory && (
              <span className="text-[11px] text-slate-500">
                Max Limit:{' '}
                <span className="font-bold font-mono">
                  {selectedCategory.policyLimitMax > 0
                    ? `₹${selectedCategory.policyLimitMax.toLocaleString()}`
                    : 'No Limit'}
                </span>
              </span>
            )}
          </div>

          {isLoadingCategories ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <span>Loading policy categories from server...</span>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-400" />
              <span>No active expense categories configured in the system.</span>
            </div>
          ) : (
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
              disabled={isSubmitting}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.code}) - {cat.policyLimitMax > 0 ? `Max: ₹${cat.policyLimitMax.toLocaleString()}` : 'No Limit'}
                  {cat.requiresReceipt ? ' [Receipt Required]' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Claim Title */}
        <div>
          <label className="block text-slate-600 font-medium mb-1">Claim Title / Item Description *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Flight ticket to Mumbai client site or Ergonomic keyboard"
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Amount (₹ INR) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 4500"
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
              required
              min={1}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">Expense Date *</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Business Purpose */}
        <div>
          <label className="block text-slate-600 font-medium mb-1">Business Purpose / Justification *</label>
          <textarea
            value={businessPurpose}
            onChange={(e) => setBusinessPurpose(e.target.value)}
            rows={2}
            placeholder="Explain how this relates to official company duties..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Receipt Attachment Reference */}
        <div>
          <label className="block text-slate-600 font-medium mb-1">
            Receipt / Tax Invoice {selectedCategory?.requiresReceipt && '* (Mandatory for this Category)'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={receiptFileName}
              onChange={(e) => setReceiptFileName(e.target.value)}
              placeholder="e.g. inv_flight_ticket_2026.pdf"
              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setReceiptFileName(`receipt_${Date.now().toString().slice(-4)}.pdf`)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
              disabled={isSubmitting}
            >
              Attach Sample
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Attach invoice or bill document reference for audit verification.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            disabled={isSubmitting || categories.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Submit Claim</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
