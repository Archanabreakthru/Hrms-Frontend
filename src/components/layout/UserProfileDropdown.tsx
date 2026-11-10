// Orbyx HRMS - Authenticated User Profile & Logout Component
// Replaces the demonstration PersonaSwitcher in the Global Header
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../services/authContext';
import { ChevronDown, LogOut, ShieldCheck, Mail, Building2, User } from 'lucide-react';
import { UserRole } from '../../types/hrms';

const ROLE_LABELS: Record<UserRole, string> = {
  founder: 'Founder & Chairman',
  senior_manager: 'Senior Management (MD)',
  super_admin: 'Super Admin',
  admin: 'Admin',
  hr_admin: 'HR Admin',
  reporting_manager: 'Reporting Manager',
  employee: 'Employee'
};

export const UserProfileDropdown: React.FC = () => {
  const { currentUser, currentEmployee, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const roleLabel = ROLE_LABELS[currentUser.role] || currentUser.role;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Header Profile Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
        title="View Profile & Account"
      >
        <div className="h-6 w-6 rounded-full overflow-hidden shrink-0 border border-slate-200">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="text-left hidden sm:block">
          <span className="font-semibold text-slate-900">{currentUser.name}</span>
          <span className="text-slate-400 ml-1">({roleLabel})</span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
      </button>

      {/* Profile Details Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* User Header Details */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full overflow-hidden shrink-0 border border-slate-200">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-1 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="truncate">{currentUser.email}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="truncate">{currentUser.designationTitle}</span>
              </div>
              {currentEmployee && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="font-mono text-slate-600">ID: {currentEmployee.id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Account Security Badge */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50/60">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="font-medium">Authenticated Session Active</span>
          </div>

          {/* Logout Action */}
          <div className="px-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

