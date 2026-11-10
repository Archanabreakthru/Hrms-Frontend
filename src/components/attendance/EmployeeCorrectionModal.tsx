// Dedicated Employee - Forgot Check-In / Check-Out Correction Modal
// Specifically for employees who forgot to mark attendance or entered an incorrect punch.
// Automatically populates authenticated employee context, derives shift and original punch info,
// and strictly collects only the missing/incorrect punch information and required explanation.

import React, { useState, useMemo } from 'react';
import { X, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../services/authContext';
import {
  AttendanceCorrectionEntry,
  DailyAttendanceRecord,
  AttendancePunchStatus
} from './attendanceModuleTypes';

interface EmployeeCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRecords: DailyAttendanceRecord[];
  onSubmitCorrection: (correction: AttendanceCorrectionEntry) => void;
}

export const EmployeeCorrectionModal: React.FC<EmployeeCorrectionModalProps> = ({
  isOpen,
  onClose,
  existingRecords,
  onSubmitCorrection
}) => {
  const { currentUser } = useAuth();
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [attendanceDate, setAttendanceDate] = useState(todayStr);
  const [correctionType, setCorrectionType] = useState<
    | 'Forgot Check-in'
    | 'Forgot Check-out'
    | 'Incorrect Punch'
    | 'Missing Punch'
    | 'Incorrect Attendance Status'
  >('Forgot Check-in');

  const [requestedCheckIn, setRequestedCheckIn] = useState('09:30');
  const [requestedCheckOut, setRequestedCheckOut] = useState('18:30');
  const [correctionReason, setCorrectionReason] = useState('');
  const [supportingEvidence, setSupportingEvidence] = useState('');
  const [validationError, setValidationError] = useState('');

  // Automatically lookup existing punch record for selected date
  const originalRecord = useMemo(() => {
    return existingRecords.find(
      (r) =>
        r.date === attendanceDate &&
        (r.employeeId === currentUser?.employeeId || r.employeeName === currentUser?.name)
    );
  }, [existingRecords, attendanceDate, currentUser]);

  const originalCheckIn = originalRecord?.checkInTime || '--:--';
  const originalCheckOut = originalRecord?.checkOutTime || '--:--';
  const originalStatus = originalRecord?.status || 'Absent';

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!attendanceDate) {
      setValidationError('Attendance date is required.');
      return;
    }
    if (!correctionReason.trim()) {
      setValidationError('Correction reason is mandatory.');
      return;
    }

    // Calculate requested net hours
    const [inH, inM] = requestedCheckIn.split(':').map(Number);
    const [outH, outM] = requestedCheckOut.split(':').map(Number);
    let totalMins = outH * 60 + outM - (inH * 60 + inM);
    if (totalMins < 0) totalMins += 24 * 60;
    const netHours = Math.max(0, +(totalMins / 60 - 1).toFixed(2));

    const newCorrection: AttendanceCorrectionEntry = {
      id: `CORR-${Date.now().toString().slice(-4)}`,
      employeeId: currentUser?.employeeId || 'EMP-ME',
      employeeName: currentUser?.name || 'Current User',
      attendanceDate,
      originalCheckIn: originalCheckIn !== '--:--' ? originalCheckIn : undefined,
      originalCheckOut: originalCheckOut !== '--:--' ? originalCheckOut : undefined,
      originalStatus,
      requestedCheckIn,
      requestedCheckOut,
      requestedOutcome: netHours >= 8 ? 'Present' : 'Half Day',
      calculatedHours: netHours,
      reasonCategory: correctionType,
      reasonRemarks: correctionReason.trim(),
      status: 'Pending Manager Approval',
      submittedAt: new Date().toISOString()
    };

    onSubmitCorrection(newCorrection);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Request Attendance Correction</h3>
              <p className="text-xs text-slate-500">
                Submit forgotten or incorrect punch for Reporting Manager review.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {validationError && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* Employee & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Employee</label>
              <input
                type="text"
                readOnly
                value={`${currentUser?.name || 'Current User'} (${currentUser?.employeeId || 'EMP-ME'})`}
                className="w-full px-3 py-2 border rounded-lg bg-slate-100 text-slate-700 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Attendance Date *</label>
              <input
                type="date"
                required
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Original Values Auto-Display */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Original In:</span>
              <span className="font-mono font-semibold text-slate-700">{originalCheckIn}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Original Out:</span>
              <span className="font-mono font-semibold text-slate-700">{originalCheckOut}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Recorded Status:</span>
              <span className="font-semibold text-slate-700">{originalStatus}</span>
            </div>
          </div>

          {/* Correction Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Correction Type *</label>
            <select
              value={correctionType}
              onChange={(e) => setCorrectionType(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Forgot Check-in">Forgot Check-in</option>
              <option value="Forgot Check-out">Forgot Check-out</option>
              <option value="Incorrect Punch">Incorrect Punch</option>
              <option value="Missing Punch">Missing Punch</option>
              <option value="Incorrect Attendance Status">Incorrect Attendance Status</option>
            </select>
          </div>

          {/* Requested Punches */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Requested Check-In</label>
              <input
                type="time"
                value={requestedCheckIn}
                onChange={(e) => setRequestedCheckIn(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Requested Check-Out</label>
              <input
                type="time"
                value={requestedCheckOut}
                onChange={(e) => setRequestedCheckOut(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Mandatory Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Correction Reason *</label>
            <textarea
              rows={2}
              required
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="Explain why check-in/out was missed or incorrect..."
              className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Supporting Evidence (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Supporting Evidence / Reference (Optional)</label>
            <input
              type="text"
              value={supportingEvidence}
              onChange={(e) => setSupportingEvidence(e.target.value)}
              placeholder="e.g. Email confirmation, Manager verbal consent, Jira Ticket"
              className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Workflow Note */}
          <div className="p-2.5 bg-indigo-50/60 rounded-lg border border-indigo-100 text-[11px] text-indigo-900">
            <strong>Approval Workflow:</strong> Submitted to your Reporting Manager $\rightarrow$ HR Manager Final Verification. Attendance record will update upon final approval.
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-bold"
            >
              Submit to Reporting Manager
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

