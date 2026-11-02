import { Employee } from '../types/hrms';

export interface ProfileCompletenessResult {
  percentage: number;
  missingFields: string[];
  isComplete: boolean;
  status: 'Draft' | 'Profile Incomplete' | 'Pending Verification' | 'Active' | 'Inactive';
}

/**
 * Calculates profile completeness score and identifies missing mandatory fields.
 */
export function calculateProfileCompleteness(emp: Partial<Employee>): ProfileCompletenessResult {
  const missing: string[] = [];
  let totalScore = 0;

  // Section 1: Personal & Contact (Weight: 30)
  if (!emp.firstName || emp.firstName.trim() === '') missing.push('First Name');
  else totalScore += 5;

  if (!emp.lastName || emp.lastName.trim() === '') missing.push('Last Name');
  else totalScore += 5;

  if (!emp.email || emp.email.trim() === '') missing.push('Official Email');
  else totalScore += 5;

  if (!emp.phone || emp.phone.trim() === '') missing.push('Mobile Number');
  else totalScore += 5;

  if (!emp.dateOfBirth) missing.push('Date of Birth');
  else totalScore += 3;

  if (!emp.gender) missing.push('Gender');
  else totalScore += 2;

  if (!emp.bloodGroup) missing.push('Blood Group');
  else totalScore += 2;

  if (!emp.address || emp.address.trim() === '') missing.push('Permanent Address');
  else totalScore += 3;

  // Section 2: Employment Details (Weight: 25)
  if (!emp.departmentId) missing.push('Department');
  else totalScore += 5;

  if (!emp.designationId) missing.push('Designation');
  else totalScore += 5;

  if (!emp.branchId) missing.push('Branch Location');
  else totalScore += 5;

  if (!emp.dateOfJoining) missing.push('Date of Joining');
  else totalScore += 5;

  if (!emp.employmentType) missing.push('Employment Type');
  else totalScore += 5;

  // Section 3: Salary & Banking Details (Weight: 25)
  if (!emp.bankDetails?.bankName) missing.push('Bank Name');
  else totalScore += 5;

  if (!emp.bankDetails?.accountNumber) missing.push('Bank Account Number');
  else totalScore += 5;

  if (!emp.bankDetails?.ifscOrRouting) missing.push('IFSC Code');
  else totalScore += 5;

  if (!emp.panOrTaxNumber || emp.panOrTaxNumber.trim() === '') missing.push('PAN / Tax ID');
  else totalScore += 5;

  if (!emp.baseSalaryAnnual || emp.baseSalaryAnnual <= 0) missing.push('Annual CTC / Salary');
  else totalScore += 5;

  // Section 4: Emergency Contact & Statutory (Weight: 20)
  if (!emp.emergencyContact?.name || !emp.emergencyContact?.phone) {
    missing.push('Emergency Contact Details');
  } else {
    totalScore += 10;
  }

  // Statutory checks (EPF / ESI / PT)
  if (emp.epfApplicable !== undefined) totalScore += 5;
  if (emp.ptApplicable !== undefined) totalScore += 5;

  const percentage = Math.min(100, Math.round(totalScore));
  const isComplete = missing.length === 0;

  let derivedStatus: 'Draft' | 'Profile Incomplete' | 'Pending Verification' | 'Active' | 'Inactive' = 'Active';
  if (emp.status === 'Inactive' || emp.status === 'Separated') {
    derivedStatus = 'Inactive';
  } else if (emp.profileStatus === 'Draft') {
    derivedStatus = 'Draft';
  } else if (!isComplete || percentage < 85) {
    derivedStatus = 'Profile Incomplete';
  } else if (emp.profileStatus === 'Pending Verification') {
    derivedStatus = 'Pending Verification';
  } else {
    derivedStatus = 'Active';
  }

  return {
    percentage,
    missingFields: missing,
    isComplete,
    status: derivedStatus
  };
}

export interface ServiceYearsResult {
  totalYears: number;
  completedMonths: number;
  totalDays: number;
  displayText: string;
  nextAnniversaryDate: string;
  daysUntilNextAnniversary: number;
}

/**
 * Calculates years of service from actual dateOfJoining.
 */
export function calculateServiceYears(dateOfJoiningStr?: string): ServiceYearsResult {
  if (!dateOfJoiningStr) {
    return {
      totalYears: 0,
      completedMonths: 0,
      totalDays: 0,
      displayText: 'Joining date not recorded',
      nextAnniversaryDate: '-',
      daysUntilNextAnniversary: 0
    };
  }

  const joinDate = new Date(dateOfJoiningStr);
  if (isNaN(joinDate.getTime())) {
    return {
      totalYears: 0,
      completedMonths: 0,
      totalDays: 0,
      displayText: 'Invalid joining date',
      nextAnniversaryDate: '-',
      daysUntilNextAnniversary: 0
    };
  }

  const today = new Date();
  let years = today.getFullYear() - joinDate.getFullYear();
  let months = today.getMonth() - joinDate.getMonth();
  let days = today.getDate() - joinDate.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const diffMs = today.getTime() - joinDate.getTime();
  const totalDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  let nextYear = today.getFullYear();
  const thisYearAnniv = new Date(nextYear, joinDate.getMonth(), joinDate.getDate());
  if (thisYearAnniv < today) {
    nextYear += 1;
  }
  const nextAnniv = new Date(nextYear, joinDate.getMonth(), joinDate.getDate());
  const daysUntil = Math.max(0, Math.ceil((nextAnniv.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const parts: string[] = [];
  if (years > 0) parts.push(years + (years === 1 ? ' Year' : ' Years'));
  if (months > 0) parts.push(months + (months === 1 ? ' Month' : ' Months'));
  if (years === 0 && months === 0) parts.push(days + (days === 1 ? ' Day' : ' Days'));

  return {
    totalYears: Math.max(0, years),
    completedMonths: Math.max(0, months),
    totalDays,
    displayText: parts.join(', ') || 'Joined Today',
    nextAnniversaryDate: nextAnniv.toISOString().split('T')[0],
    daysUntilNextAnniversary: daysUntil
  };
}
