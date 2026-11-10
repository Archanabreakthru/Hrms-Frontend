// Dedicated HR Only - Outage / Manual Attendance Entry Modal
// Strictly for HR to record attendance on behalf of an employee affected by operational/technical failures
// Structured into 4 clean sections: Section A (Employee Details), Section B (Attendance Details), Section C (Outage / Exception Details), Section D (Attendance Result)

import React, { useState, useMemo } from 'react';
import { X, AlertTriangle, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../../services/authContext';
import { DailyAttendanceRecord, ShiftDefinitionRecord, AttendancePunchStatus } from './attendanceModuleTypes';

interface HRManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  shifts: ShiftDefinitionRecord[];
  onSaveManualEntry: (record: DailyAttendanceRecord, details: {
    outageType: string;
    incidentRef: string;
    supportingEvidenceRef: string;
    remarks: string;
  }) => void;
}

export const HRManualEntryModal: React.FC<HRManualEntryModalProps> = ({
  isOpen,
  onClose,
  shifts,
  onSaveManualEntry
}) => {
  const { currentUser } = useAuth();
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Section A: Employee Details
  const [employeeName, setEmployeeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(todayStr);
  const [workLocationType, setWorkLocationType] = useState<'Office' | 'Client Site' | 'Remote'>('Office');
  const [clientDeploymentName, setClientDeploymentName] = useState('');

  // Section B: Attendance Details
  const [selectedShiftId, setSelectedShiftId] = useState(shifts[0]?.id || 'SHIFT-GEN');
  const [actualCheckIn, setActualCheckIn] = useState('09:30');
  const [actualCheckOut, setActualCheckOut] = useState('18:30');
  const [breakDurationMinutes, setBreakDurationMinutes] = useState(60);

  // Section C: Outage / Exception Details
  const [outageType, setOutageType] = useState<
    | 'Attendance Machine Failure'
    | 'Server Outage'
    | 'HRMS System Downtime'
    | 'Network / Connectivity Failure'
    | 'Power Failure'
    | 'Other Operational Exception'
  >('Attendance Machine Failure');
  const [outageOtherExplanation, setOutageOtherExplanation] = useState('');
  const [incidentRef, setIncidentRef] = useState('');
  const [supportingEvidenceRef, setSupportingEvidenceRef] = useState('');
  const [hrRemarks, setHrRemarks] = useState('');

  // Validation & Error
  const [validationError, setValidationError] = useState('');

  const selectedShift = useMemo(() => {
    return shifts.find((s) => s.id === selectedShiftId) || shifts[0];
  }, [shifts, selectedShiftId]);

  // Section D: Calculated Attendance Result
  const calculations = useMemo(() => {
    if (!actualCheckIn || !actualCheckOut) {
      return { totalHours: 0, netHours: 0, isLate: false, outcome: 'Absent' as AttendancePunchStatus };
    }
    const [inH, inM] = actualCheckIn.split(':').map(Number);
    const [outH, outM] = actualCheckOut.split(':').map(Number);
    let totalMins = outH * 60 + outM - (inH * 60 + inM);
    if (totalMins < 0) totalMins += 24 * 60; // Overnight shift handling
    const netMins = Math.max(0, totalMins - breakDurationMinutes);
    const netHrs = +(netMins / 60).toFixed(2);
    const totalHrs = +(totalMins / 60).toFixed(2);

    const shiftStart = selectedShift?.startTime || '09:30';
    const grace = selectedShift?.gracePeriodMinutes || 15;
    const [shH, shM] = shiftStart.split(':').map(Number);
    const thresholdMins = shH * 60 + shM + grace;
    const isLate = inH * 60 + inM > thresholdMins;

    let outcome: AttendancePunchStatus = 'Present';
    if (netHrs < 4) outcome = 'Absent';
    else if (netHrs < 7.5) outcome = 'Half Day';
    else if (isLate) outcome = 'Late';

    return { totalHours: totalHrs, netHours: netHrs, isLate, outcome };
  }, [actualCheckIn, actualCheckOut, breakDurationMinutes, selectedShift]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!employeeName.trim()) {
      setValidationError('Employee name is mandatory.');
      return;
    }
    if (!attendanceDate) {
      setValidationError('Attendance date is mandatory.');
      return;
    }
    if (!actualCheckIn || !actualCheckOut) {
      setValidationError('Both Check-In and Check-Out times are required.');
      return;
    }
    if (outageType === 'Other Operational Exception' && !outageOtherExplanation.trim()) {
      setValidationError('Please specify the operational exception details.');
      return;
    }
    if (!hrRemarks.trim()) {
      setValidationError('HR Remarks explaining the manual recording are mandatory.');
      return;
    }

    const effectiveEmpId = employeeId.trim() || `EMP-${Date.now().toString().slice(-4)}`;
    const effectiveException = outageType === 'Other Operational Exception'
      ? `Other: ${outageOtherExplanation}`
      : outageType;

    const newRecord: DailyAttendanceRecord = {
      id: `ATT-MAN-${Date.now().toString().slice(-4)}`,
      employeeId: effectiveEmpId,
      employeeName: employeeName.trim(),
      date: attendanceDate,
      shiftId: selectedShift?.id || 'SHIFT-GEN',
      shiftName: selectedShift?.name || 'General Day Shift (09:30 - 18:30)',
      checkInTime: actualCheckIn,
      checkOutTime: actualCheckOut,
      totalHours: calculations.totalHours,
      netWorkingHours: calculations.netHours,
      breakDurationMinutes,
      overtimeHours: calculations.netHours > 8 ? +(calculations.netHours - 8).toFixed(2) : 0,
      isLate: calculations.isLate,
      lateMinutes: calculations.isLate ? 15 : 0,
      isEarlyDeparture: false,
      isMissingPunch: false,
      status: calculations.outcome,
      workLocationType,
      hasClientDeployment: workLocationType === 'Client Site',
      clientName: clientDeploymentName || undefined,
      source: 'Manual HR Entry',
      notes: `[Outage / Manual Entry] ${effectiveException}. Incident Ref: ${incidentRef || 'N/A'}. Authorized by: ${currentUser?.name || 'HR Admin'}. Remarks: ${hrRemarks}`
    };

    onSaveManualEntry(newRecord, {
      outageType: effectiveException,
      incidentRef: incidentRef.trim(),
      supportingEvidenceRef: supportingEvidenceRef.trim(),
      remarks: hrRemarks.trim()
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Outage / Manual Attendance Entry</h3>
              <p className="text-xs text-slate-500">
                Authorized for HR to record attendance due to biometric machine failure, server downtime, or system outage.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {validationError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-sm">
          {/* SECTION A: EMPLOYEE DETAILS */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              Section A – Employee Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Name *</label>
                <input
                  type="text"
                  required
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="e.g. Archana"
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g. EMP-003 (Optional)"
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Attendance Date *</label>
                <input
                  type="date"
                  required
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Entry Date</label>
                <input
                  type="text"
                  readOnly
                  value={`${todayStr} (Today)`}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-100 text-slate-600 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Work Location</label>
                <select
                  value={workLocationType}
                  onChange={(e) => setWorkLocationType(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Office">Company Office</option>
                  <option value="Client Site">Client Site</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
            </div>

            {workLocationType === 'Client Site' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Client Deployment Name</label>
                <input
                  type="text"
                  value={clientDeploymentName}
                  onChange={(e) => setClientDeploymentName(e.target.value)}
                  placeholder="e.g. Apex FinTech Core Banking"
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* SECTION B: ATTENDANCE DETAILS */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              Section B – Attendance Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Applicable Shift</label>
                <select
                  value={selectedShiftId}
                  onChange={(e) => setSelectedShiftId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} - {s.endTime})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Break Duration (Minutes)</label>
                <input
                  type="number"
                  value={breakDurationMinutes}
                  onChange={(e) => setBreakDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Actual Check-In Time *</label>
                <input
                  type="time"
                  required
                  value={actualCheckIn}
                  onChange={(e) => setActualCheckIn(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Actual Check-Out Time *</label>
                <input
                  type="time"
                  required
                  value={actualCheckOut}
                  onChange={(e) => setActualCheckOut(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION C: OUTAGE / EXCEPTION DETAILS */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              Section C – Outage & Exception Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Failure / Exception Type *</label>
                <select
                  value={outageType}
                  onChange={(e) => setOutageType(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Attendance Machine Failure">Attendance Machine Failure</option>
                  <option value="Server Outage">Server Outage</option>
                  <option value="HRMS System Downtime">HRMS System Downtime</option>
                  <option value="Network / Connectivity Failure">Network / Connectivity Failure</option>
                  <option value="Power Failure">Power Failure</option>
                  <option value="Other Operational Exception">Other Operational Exception</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Incident / Ticket Reference</label>
                <input
                  type="text"
                  value={incidentRef}
                  onChange={(e) => setIncidentRef(e.target.value)}
                  placeholder="e.g. INC-2026-904"
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {outageType === 'Other Operational Exception' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Specific Operational Explanation *</label>
                <input
                  type="text"
                  required
                  value={outageOtherExplanation}
                  onChange={(e) => setOutageOtherExplanation(e.target.value)}
                  placeholder="Provide detailed description of operational exception..."
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Supporting Evidence / Log Reference</label>
              <input
                type="text"
                value={supportingEvidenceRef}
                onChange={(e) => setSupportingEvidenceRef(e.target.value)}
                placeholder="e.g. IT Helpdesk Ticket #4412, Gate Entry Log"
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">HR Remarks & Authorization Note *</label>
              <textarea
                rows={2}
                required
                value={hrRemarks}
                onChange={(e) => setHrRemarks(e.target.value)}
                placeholder="Reason for manual attendance capture on behalf of employee..."
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* SECTION D: ATTENDANCE RESULT SUMMARY */}
          <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-indigo-600" />
              Section D – Calculated Attendance Result (Read-Only Preview)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block">Total Duration:</span>
                <span className="font-bold text-slate-800">{calculations.totalHours} hrs</span>
              </div>
              <div>
                <span className="text-slate-500 block">Break Deducted:</span>
                <span className="font-bold text-slate-800">{breakDurationMinutes} mins</span>
              </div>
              <div>
                <span className="text-slate-500 block">Net Working Hours:</span>
                <span className="font-bold text-indigo-700 text-sm">{calculations.netHours} hrs</span>
              </div>
              <div>
                <span className="text-slate-500 block">Attendance Outcome:</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                    calculations.outcome === 'Present'
                      ? 'bg-emerald-100 text-emerald-800'
                      : calculations.outcome === 'Late'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {calculations.outcome}
                </span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-indigo-100 flex justify-between">
              <span>Recorded By: <strong className="text-slate-700">{currentUser?.name || 'HR Admin'}</strong> ({currentUser?.role})</span>
              <span>Source Tag: <strong className="text-indigo-700">HR Manual Entry</strong></span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm shadow-xs"
            >
              Record Attendance (HR Manual Entry)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

