// Development-Only Temporary Individual Credentials Configuration
// NOTICE: FOR FRONTEND DEVELOPMENT AND PROTOTYPE TESTING ONLY.
// In production, this module will be replaced by a secure backend authentication API (e.g., OAuth2/JWT).
// Passwords are NOT stored in employeeRoster.ts and are kept isolated here.

export interface DevCredentialEntry {
  userId: string;
  officialEmail: string;
  temporaryPassword: string; // Case-sensitive
  expectedRole: string;
}

export const DEV_TEMPORARY_CREDENTIALS: Record<string, DevCredentialEntry> = {
  'bhavadharani@orbyx.internal': {
    userId: 'user_bhava_dharani',
    officialEmail: 'bhavadharani@orbyx.internal',
    temporaryPassword: 'Bhava@2026',
    expectedRole: 'employee'
  },
  'selvakumar@orbyx.internal': {
    userId: 'user_md_selvakumar',
    officialEmail: 'selvakumar@orbyx.internal',
    temporaryPassword: 'Selva@2026',
    expectedRole: 'senior_manager'
  },
  'kannan@orbyx.internal': {
    userId: 'user_coo_kannan',
    officialEmail: 'kannan@orbyx.internal',
    temporaryPassword: 'Kannan@2026',
    expectedRole: 'senior_manager'
  },
  'krishnaraj@orbyx.internal': {
    userId: 'user_manager',
    officialEmail: 'krishnaraj@orbyx.internal',
    temporaryPassword: 'Krishna@2026',
    expectedRole: 'reporting_manager'
  },
  'raseedh@orbyx.internal': {
    userId: 'user_hr_admin',
    officialEmail: 'raseedh@orbyx.internal',
    temporaryPassword: 'Raseedh@2026',
    expectedRole: 'hr_admin'
  },
  'archana@orbyx.internal': {
    userId: 'user_emp_designer',
    officialEmail: 'archana@orbyx.internal',
    temporaryPassword: 'Archana@2026',
    expectedRole: 'employee'
  },
  'mahalakshmi@orbyx.internal': {
    userId: 'user_emp_junior',
    officialEmail: 'mahalakshmi@orbyx.internal',
    temporaryPassword: 'Maha@2026',
    expectedRole: 'employee'
  },
  'anupriya@orbyx.internal': {
    userId: 'user_anupriya',
    officialEmail: 'anupriya@orbyx.internal',
    temporaryPassword: 'Anu@2026',
    expectedRole: 'employee'
  },
  'praveen@orbyx.internal': {
    userId: 'user_praveen',
    officialEmail: 'praveen@orbyx.internal',
    temporaryPassword: 'Praveen@2026',
    expectedRole: 'employee'
  }
};

/**
 * Validates credentials against development-only credential store.
 * Email is case-insensitive and trims accidental leading/trailing whitespace.
 * Password is case-sensitive.
 */
export function validateDevCredentials(
  emailOrUsername: string,
  passwordInput: string
): { success: boolean; userId?: string; error?: string } {
  const normalizedInput = emailOrUsername.trim().toLowerCase();
  if (!normalizedInput || !passwordInput) {
    return { success: false, error: 'Please enter both your official email and password.' };
  }

  // Support lookup by full official email or username prefix
  let matchedEntry: DevCredentialEntry | undefined = DEV_TEMPORARY_CREDENTIALS[normalizedInput];
  if (!matchedEntry) {
    const fullEmailCandidate = `${normalizedInput}@orbyx.internal`;
    matchedEntry = DEV_TEMPORARY_CREDENTIALS[fullEmailCandidate];
  }

  if (!matchedEntry) {
    return { success: false, error: 'Invalid credentials. Please verify your email and password.' };
  }

  // Exact case-sensitive password check
  if (matchedEntry.temporaryPassword !== passwordInput) {
    return { success: false, error: 'Invalid credentials. Please verify your email and password.' };
  }

  return { success: true, userId: matchedEntry.userId };
}

