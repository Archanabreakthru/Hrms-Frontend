// Celestial HRMS - Employee Account Activation Page
// Public UI for Single-Use Activation Token Verification & Password Setup
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { authApi } from '../../services/authApi';
import { db } from '../../db/storage';
import { CompanyProfile } from '../../types/hrms';

interface AccountActivationPageProps {
  onReturnToLogin: () => void;
}

export const AccountActivationPage: React.FC<AccountActivationPageProps> = ({ onReturnToLogin }) => {
  const [token, setToken] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(() => db.getCompanyProfile());

  useEffect(() => {
    try {
      const profile = db.getCompanyProfile();
      if (profile) setCompanyProfile(profile);
    } catch {
      // fallback
    }

    // Extract token from URL hash or query string
    // Supported formats: #activate?token=XYZ or ?token=XYZ
    const fullHash = window.location.hash;
    const fullSearch = window.location.search;

    let extractedToken = '';
    if (fullHash.includes('token=')) {
      const hashParams = new URLSearchParams(fullHash.substring(fullHash.indexOf('?')));
      extractedToken = hashParams.get('token') || '';
    } else if (fullSearch.includes('token=')) {
      const searchParams = new URLSearchParams(fullSearch);
      extractedToken = searchParams.get('token') || '';
    }

    if (extractedToken) {
      setToken(extractedToken.trim());
    } else {
      setErrorMessage('Activation token is missing. Please check your invitation email link.');
    }
  }, []);

  const companyName = companyProfile?.name || 'Celestial HRMS';
  const brandInitial = companyName.charAt(0).toUpperCase() || 'O';

  // Password complexity checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && passwordsMatch && token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!token) {
      setErrorMessage('Invalid or missing activation token.');
      return;
    }

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
      setErrorMessage('Password does not meet complexity requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authApi.activateAccount(token, password);
      if (res.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(res.error || 'Failed to activate account. The invitation link may have expired or already been used.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error occurred while connecting to authentication gateway.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-950/70 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {companyProfile?.logoUrl ? (
            <img 
              src={companyProfile.logoUrl} 
              alt={companyName} 
              className="h-9 w-9 rounded-lg object-contain bg-slate-800 p-1 border border-slate-700" 
            />
          ) : (
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
              {brandInitial}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-wide text-white">{companyName}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Account Activation
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Enterprise Workforce Management Platform</p>
          </div>
        </div>

        <button
          onClick={onReturnToLogin}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          Return to Sign In &rarr;
        </button>
      </header>

      {/* Main Activation Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/80 p-8 shadow-2xl space-y-6">
          {isSuccess ? (
            <div className="text-center space-y-4 py-4 animate-in fade-in duration-200">
              <div className="h-14 w-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Account Activated!</h2>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                Your employee credentials have been secured and your HRMS account is now active. You may now sign in using your official email and new password.
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={onReturnToLogin}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="h-12 w-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Activate Your Account</h1>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Create a secure password to complete your account setup and access {companyName}.
                </p>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150"
                >
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Activation Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    New Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      disabled={isLoading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter minimum 8 characters"
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

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      disabled={isLoading}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="block w-full pl-9 pr-10 py-2.5 text-xs text-white bg-slate-900/80 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-500 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Criteria List */}
                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 space-y-1.5 text-[11px]">
                  <p className="text-slate-400 font-medium">Password Requirements:</p>
                  <ul className="space-y-1">
                    <li className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      At least 8 characters
                    </li>
                    <li className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      At least one uppercase letter (A-Z)
                    </li>
                    <li className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      At least one lowercase letter (a-z)
                    </li>
                    <li className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      At least one number (0-9)
                    </li>
                    {confirmPassword.length > 0 && (
                      <li className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                      </li>
                    )}
                  </ul>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || !isFormValid}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Activating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Activate Account</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/60 px-6 py-3.5 text-center text-slate-500 text-xs">
        Secure access to your organization's workforce platform. &copy; {new Date().getFullYear()} {companyName}.
      </footer>
    </div>
  );
};

