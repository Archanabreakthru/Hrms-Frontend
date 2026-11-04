// Orbyx HRMS - Client Manager Dedicated Login Screen
import React, { useState } from 'react';
import { Building2, Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, Info } from 'lucide-react';
import { ClientManagerProfile, DEFAULT_CLIENT_MANAGER } from './mockClientData';

interface ClientManagerLoginProps {
  onLoginSuccess: (manager: ClientManagerProfile) => void;
  onReturnToHRMS?: () => void;
}

export const ClientManagerLogin: React.FC<ClientManagerLoginProps> = ({
  onLoginSuccess,
  onReturnToHRMS
}) => {
  const [email, setEmail] = useState<string>('rohit.kumar@acme-tech.example.com');
  const [password, setPassword] = useState<string>('client@pass2025');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter your client manager email and password.');
      return;
    }

    setLoading(true);

    // Mock authentication with realistic delay
    setTimeout(() => {
      setLoading(false);
      // Validate mock credentials or allow default credentials
      if (email.toLowerCase().includes('acme') || email.toLowerCase().includes('client') || email.toLowerCase().includes('rohit')) {
        const profile: ClientManagerProfile = {
          ...DEFAULT_CLIENT_MANAGER,
          email: email.trim()
        };
        onLoginSuccess(profile);
      } else {
        // Still allow prototype sign in with entered details
        const profile: ClientManagerProfile = {
          id: 'CM-002',
          name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          email: email.trim(),
          roleTitle: 'Client Manager',
          companyName: 'Acme Technologies Pvt. Ltd.',
          avatarInitials: email.substring(0, 2).toUpperCase()
        };
        onLoginSuccess(profile);
      }
    }, 400);
  };

  const handleUseDemoCredentials = () => {
    setEmail(DEFAULT_CLIENT_MANAGER.email);
    setPassword('client@pass2025');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/40 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo & Portal Tag */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-purple-700 flex items-center justify-center text-white font-black text-xl shadow-md shadow-purple-500/20">
            A
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">HRMS</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            Client Portal
          </span>
        </div>

        <h2 className="mt-2 text-center text-2xl font-bold tracking-tight text-slate-900">
          Client Manager Verification Portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 max-w-sm mx-auto">
          Secure portal for client managers to review and verify deployed employee attendance
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <span className="font-semibold">Error:</span> {errorMsg}
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client Manager Email
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@client.com"
                  required
                  className="block w-full pl-9 pr-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password field with show/hide toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="block w-full pl-9 pr-10 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Quick Demo Fill Pill */}
            <div className="pt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Prototype Demo Account:</span>
              <button
                type="button"
                onClick={handleUseDemoCredentials}
                className="text-purple-700 hover:text-purple-800 font-semibold underline underline-offset-2"
              >
                Autofill Rohit Kumar (Acme)
              </button>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-600 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Verification Portal</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Prototype disclaimer */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 bg-purple-50/50 p-2.5 rounded-lg border border-purple-100/60">
            <Info className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
            <p>
              This is a separate, dedicated Client Manager portal. Verification actions are performed on local state without affecting internal HR administrator roles.
            </p>
          </div>

          {/* Return to internal HRMS link */}
          {onReturnToHRMS && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={onReturnToHRMS}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
              >
                &larr; Return to Internal HRMS Workspace
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

