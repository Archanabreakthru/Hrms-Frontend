// Orbyx HRMS - External Client Supervisor Portal Access Screen
import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Mail,
  KeyRound,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Info,
  UserCheck
} from 'lucide-react';
import { db } from '../../db/storage';
import { ClientSupervisor } from '../../types/hrms';

interface ClientPortalLoginProps {
  onLoginSuccess: (supervisor: ClientSupervisor) => void;
  onReturnToHRMS?: () => void;
}

export const ClientPortalLogin: React.FC<ClientPortalLoginProps> = ({
  onLoginSuccess,
  onReturnToHRMS
}) => {
  const supervisors = db.getClientSupervisors();
  const [selectedSupId, setSelectedSupId] = useState<string>('CSUP-101');
  const [invitationTokenInput, setInvitationTokenInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'demo-select' | 'token-entry'>('demo-select');

  const handleSimulateLogin = (supIdToUse?: string) => {
    setErrorMsg('');
    setSuccessNotice('');
    const targetId = supIdToUse || selectedSupId;
    const sup = supervisors.find((s) => s.id === targetId);

    if (!sup) {
      setErrorMsg('Access Denied: Unregistered supervisor account. Please contact Orbyx HR.');
      return;
    }

    if (sup.status === 'Inactive' || sup.invitationStatus === 'Revoked') {
      setErrorMsg(
        `Access Denied: This supervisor account (${sup.id} - ${sup.name}) has been deactivated by Orbyx HR Admin. Inactive supervisors cannot access the Client Portal.`
      );
      return;
    }

    if (sup.invitationStatus === 'Expired') {
      setErrorMsg(
        `Access Denied: The prototype invitation token for ${sup.name} has expired (72-hour window lapsed). Please request a re-invitation from Orbyx HR Admin.`
      );
      return;
    }

    // Success simulation
    const updatedSup: ClientSupervisor = {
      ...sup,
      invitationStatus: 'Accepted',
      lastLoginAt: new Date().toISOString()
    };
    db.saveClientSupervisor(updatedSup);

    setSuccessNotice(`Authentication Verified: Welcome, ${sup.name} (${sup.clientName || 'Client Partner'}). Initializing session...`);
    setTimeout(() => {
      onLoginSuccess(updatedSup);
    }, 400);
  };

  const handleAcceptInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessNotice('');

    const token = invitationTokenInput.trim();
    if (!token) {
      setErrorMsg('Please enter an invitation token.');
      return;
    }

    const matchedSup = supervisors.find(
      (s) => s.invitationToken?.toLowerCase() === token.toLowerCase()
    );

    if (!matchedSup) {
      setErrorMsg('Invalid Invitation Token: No supervisor account matches this token.');
      return;
    }

    if (matchedSup.status === 'Inactive') {
      setErrorMsg(`Cannot Accept: Supervisor account for ${matchedSup.name} is marked Inactive by Orbyx HR.`);
      return;
    }

    if (matchedSup.invitationStatus === 'Expired') {
      setErrorMsg(`Invitation Expired: Token ${token} has expired. Please ask Orbyx HR Admin to resend an invite.`);
      return;
    }

    // Accept invite
    const accepted: ClientSupervisor = {
      ...matchedSup,
      invitationStatus: 'Accepted',
      acceptedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    db.saveClientSupervisor(accepted);

    setSuccessNotice(`Invitation Accepted! Logged in as ${matchedSup.name} (${matchedSup.clientName}).`);
    setTimeout(() => {
      onLoginSuccess(accepted);
    }, 400);
  };

  const activeSupervisors = supervisors.filter((s) => s.status === 'Active' && s.invitationStatus === 'Accepted');
  const testSupervisors = supervisors.filter((s) => s.status === 'Inactive' || s.invitationStatus === 'Expired');

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between text-slate-100 font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Bar with Prototype Notice & Return to HRMS */}
      <header className="border-b border-slate-800 bg-slate-950/70 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-black tracking-wider">
            OX
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-white">ORBYX HRMS</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                Client Partner Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-400">External Client Supervisor Attendance & Verification Station</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
            <Info className="h-3.5 w-3.5" />
            <span>Prototype - Authentication Simulated</span>
          </span>
          {onReturnToHRMS && (
            <button
              type="button"
              onClick={onReturnToHRMS}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
            >
              <span>← Return to Internal HRMS</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 mb-1">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Client Supervisor Sign-In</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Secure, role-isolated portal for external client supervisors to record daily employee timesheets, verify hours, and submit attendance to Orbyx HR.
            </p>
          </div>

          {/* Prototype disclaimer pill */}
          <div className="p-3 bg-amber-950/30 border border-amber-700/40 rounded-xl text-amber-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Simulated Prototype Authentication</span>
            </div>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              In this frontend prototype, external authentication is simulated. External supervisors do NOT receive internal HRMS roles or credentials. Real token exchange and OAuth/SSO are deferred to production backend implementation.
            </p>
          </div>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('demo-select');
                setErrorMsg('');
                setSuccessNotice('');
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'demo-select'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1. Select Registered Supervisor
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('token-entry');
                setErrorMsg('');
                setSuccessNotice('');
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'token-entry'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2. Accept Invitation Token
            </button>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
              <XCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold">Authentication Blocked</span>
                <p className="text-[11px] text-rose-300/90">{errorMsg}</p>
              </div>
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 rounded-xl bg-teal-950/40 border border-teal-800/60 text-teal-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-400 mt-0.5" />
              <p className="text-xs font-medium">{successNotice}</p>
            </div>
          )}

          {/* TAB 1: Registered Supervisor Selector */}
          {activeTab === 'demo-select' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Select Registered Supervisor
                </label>
                <div className="space-y-2">
                  {supervisors.map((sup) => {
                    const isSelected = selectedSupId === sup.id;
                    const isInactive = sup.status === 'Inactive';
                    const isExpired = sup.invitationStatus === 'Expired';
                    return (
                      <div
                        key={sup.id}
                        onClick={() => setSelectedSupId(sup.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-teal-500 bg-teal-500/10 ring-1 ring-teal-500'
                            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{sup.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                {sup.id}
                              </span>
                              {isInactive ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  Inactive Account
                                </span>
                              ) : isExpired ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  Invitation Expired
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                                  Active Partner
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-3">
                              <span className="text-teal-300/80 font-medium">{sup.clientName || 'Client Org'}</span>
                              <span>•</span>
                              <span>{sup.officialEmail}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 italic">
                              Assigned Deployments: {sup.assignedDeploymentIds?.length || 0} employee assignment(s)
                            </p>
                          </div>
                          <div className="text-right">
                            <input
                              type="radio"
                              name="supervisorRadio"
                              checked={isSelected}
                              onChange={() => setSelectedSupId(sup.id)}
                              className="h-4 w-4 text-teal-500 border-slate-700 focus:ring-teal-400"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleSimulateLogin()}
                  className="w-full py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/20 cursor-pointer"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Launch Supervisor Session (Simulated)</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </button>
              </div>

              {/* Fast test action links */}
              <div className="pt-3 border-t border-slate-800/80">
                <span className="block text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-2">
                  Test Restriction Scenarios:
                </span>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSimulateLogin('CSUP-101')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700"
                  >
                    Test Apex Supervisor (Vikramaditya)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateLogin('CSUP-102')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700"
                  >
                    Test Horizon Supervisor (Meera)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateLogin('CSUP-103')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700"
                  >
                    Test Inactive Supervisor (Should Fail)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateLogin('CSUP-104')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
                  >
                    Test Expired Token (Should Fail)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Token Entry */}
          {activeTab === 'token-entry' && (
            <form onSubmit={handleAcceptInvitation} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Invitation Token or Onboarding Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={invitationTokenInput}
                    onChange={(e) => setInvitationTokenInput(e.target.value)}
                    placeholder="e.g. INV-APEX-RAO-9821"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Paste the one-time invitation token generated by Orbyx HR Admin from Client Management &rarr; Supervisors tab.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1 text-xs text-slate-400">
                <span className="font-semibold text-slate-300 block">Available Sample Tokens:</span>
                <div className="space-y-1 font-mono text-[11px]">
                  <p
                    className="cursor-pointer hover:text-teal-300 text-slate-300"
                    onClick={() => setInvitationTokenInput('INV-APEX-RAO-9821')}
                  >
                    • Apex: <span className="text-teal-400 font-bold">INV-APEX-RAO-9821</span> (Valid)
                  </p>
                  <p
                    className="cursor-pointer hover:text-teal-300 text-slate-300"
                    onClick={() => setInvitationTokenInput('INV-HORIZON-MEERA-4412')}
                  >
                    • Horizon: <span className="text-teal-400 font-bold">INV-HORIZON-MEERA-4412</span> (Valid)
                  </p>
                  <p
                    className="cursor-pointer hover:text-amber-300 text-amber-400"
                    onClick={() => setInvitationTokenInput('INV-HORIZON-ANANYA-EXP-772')}
                  >
                    • Expired Test: <span className="text-amber-400 font-bold">INV-HORIZON-ANANYA-EXP-772</span> (Expired)
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/20 cursor-pointer"
              >
                <span>Verify Token & Access Portal</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/70 px-6 py-3 text-center text-xs text-slate-500">
        Orbyx HRMS &copy; 2026. External Client Supervisor Portal - Isolated Client Partner Subsystem.
      </footer>
    </div>
  );
};
