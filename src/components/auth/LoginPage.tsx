// Orbyx HRMS - Enterprise Login Page
// Development Phase: Individual Username/Password Authentication
import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../services/authContext';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedEmail = emailInput.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your official email or username.');
      return;
    }

    if (!passwordInput) {
      setErrorMessage('Please enter your password.');
      return;
    }

    const res = await login(trimmedEmail, passwordInput);
    if (!res.success) {
      setErrorMessage(res.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Bar with Brand Badge */}
      <header className="border-b border-slate-800 bg-slate-950/70 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
            O
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-wide text-white">ORBYX HRMS</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Enterprise
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Enterprise Human Resource Management System</p>
          </div>
        </div>

        {/* Portal Quick Access Link */}
        <a
          href="#client-portal/login"
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          title="Open External Client Partner Portal"
        >
          Client Supervisor Portal &rarr;
        </a>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/80 p-8 shadow-2xl space-y-6">
          {/* Header & Welcome Title */}
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Welcome Back</h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Sign in with your Orbyx credentials to access your workforce dashboard and services.
            </p>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150"
            >
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Username Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Official Email or Username <span className="text-rose-400">*</span>
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  disabled={isLoading}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. raseedh@orbyx.internal"
                  className="block w-full pl-9 pr-3 py-2.5 text-xs text-white bg-slate-900/80 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-500 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password <span className="text-rose-400">*</span>
                </label>
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isLoading}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full pl-9 pr-10 py-2.5 text-xs text-white bg-slate-900/80 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Development Notice */}
          <div className="pt-2 text-center">
            <p className="text-[11px] text-slate-500">
              Frontend Development Authentication &bull; Individual credentials verified against prototype roster
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/60 px-6 py-3.5 text-center text-slate-500 text-xs">
        Orbyx HRMS &copy; 2026. All rights reserved. Enterprise Workforce Operating System.
      </footer>
    </div>
  );
};

