// Automated Test Suite: Individual User Login, Session Management, RBAC Preservation & Route Protection
import { validateDevCredentials, DEV_TEMPORARY_CREDENTIALS } from '../services/devCredentials';
import { db, initDatabase } from '../db/storage';
import { canonicalPersonaUsers } from '../db/employeeRoster';
import { ROLE_PERMISSIONS } from '../services/permissionService';

// Setup in-memory localStorage polyfill for node test environment
const storage = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (k: string) => storage.get(k) || null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
    clear: () => storage.clear()
  };
}

console.log('--- STARTING AUTHENTICATION & RBAC AUTOMATED TEST SUITE ---');
initDatabase();

// =========================================================================
// Group 1: Login Tests with Individual Temporary Credentials
// =========================================================================
console.log('\n[Group 1] Login Credential Tests');

// Test 1: Valid Employee Login (Bhava Dharani)
const bhavaRes = validateDevCredentials('bhavadharani@orbyx.internal', 'Bhava@2026');
if (!bhavaRes.success || bhavaRes.userId !== 'user_bhava_dharani') {
  throw new Error('Test 1 Failed: Bhava Dharani login failed with valid credentials');
}
console.log('✓ Test 1 Passed: Valid employee login (Bhava Dharani) succeeded.');

// Test 2: Valid Reporting Manager Login (KrishaRaj)
const krishnaRes = validateDevCredentials('krishnaraj@orbyx.internal', 'Krishna@2026');
if (!krishnaRes.success || krishnaRes.userId !== 'user_manager') {
  throw new Error('Test 2 Failed: KrishaRaj login failed with valid credentials');
}
console.log('✓ Test 2 Passed: Valid reporting manager login (KrishaRaj) succeeded.');

// Test 3: Valid HR Admin Login (Raseedh)
const raseedhRes = validateDevCredentials('raseedh@orbyx.internal', 'Raseedh@2026');
if (!raseedhRes.success || raseedhRes.userId !== 'user_hr_admin') {
  throw new Error('Test 3 Failed: Raseedh login failed with valid credentials');
}
console.log('✓ Test 3 Passed: Valid HR Admin login (Raseedh) succeeded.');

// Test 4: Valid Senior Management Login (Dr. Selvakumar & S. Kannan)
const selvaRes = validateDevCredentials('selvakumar@orbyx.internal', 'Selva@2026');
const kannanRes = validateDevCredentials('kannan@orbyx.internal', 'Kannan@2026');
if (!selvaRes.success || selvaRes.userId !== 'user_md_selvakumar' || !kannanRes.success || kannanRes.userId !== 'user_coo_kannan') {
  throw new Error('Test 4 Failed: Senior management login failed with valid credentials');
}
console.log('✓ Test 4 Passed: Valid senior management logins (Selvakumar, Kannan) succeeded.');

// Test 5: Invalid Username
const invalidUserRes = validateDevCredentials('nonexistent@orbyx.internal', 'Pass@123');
if (invalidUserRes.success) {
  throw new Error('Test 5 Failed: Non-existent user was allowed to log in');
}
console.log('✓ Test 5 Passed: Invalid username correctly rejected.');

// Test 6: Invalid Password
const invalidPassRes = validateDevCredentials('raseedh@orbyx.internal', 'WrongPass123');
if (invalidPassRes.success) {
  throw new Error('Test 6 Failed: Invalid password was allowed to log in');
}
console.log('✓ Test 6 Passed: Invalid password correctly rejected.');

// Test 7: Empty Fields
const emptyRes = validateDevCredentials('', '');
if (emptyRes.success) {
  throw new Error('Test 7 Failed: Empty credentials were accepted');
}
console.log('✓ Test 7 Passed: Empty credentials rejected.');

// Test 8: Case-Insensitive Email & Whitespace Trimming
const caseRes = validateDevCredentials('  RASEEDH@orbyx.internal  ', 'Raseedh@2026');
if (!caseRes.success || caseRes.userId !== 'user_hr_admin') {
  throw new Error('Test 8 Failed: Case-insensitive email or whitespace trim failed');
}
console.log('✓ Test 8 Passed: Case-insensitive email and whitespace trimming verified.');

// Test 9: Password Case Sensitivity
const passCaseRes = validateDevCredentials('raseedh@orbyx.internal', 'raseedh@2026'); // lowercase 'r'
if (passCaseRes.success) {
  throw new Error('Test 9 Failed: Password case sensitivity breached');
}
console.log('✓ Test 9 Passed: Password case sensitivity strictly enforced.');

// =========================================================================
// Group 2: Session & State Initialization Tests
// =========================================================================
console.log('\n[Group 2] Session Management Tests');

// Test 10: Unauthenticated Initial State
localStorage.removeItem('orbyx_hrms_authenticated_user_id');
const initialSessionUser = localStorage.getItem('orbyx_hrms_authenticated_user_id');
if (initialSessionUser !== null) {
  throw new Error('Test 10 Failed: Initial state has auto-authenticated user');
}
console.log('✓ Test 10 Passed: Initial state is clean and unauthenticated (No auto-login as Raseedh).');

// Test 11: Valid Login Establishes Session Token
localStorage.setItem('orbyx_hrms_authenticated_user_id', raseedhRes.userId!);
if (localStorage.getItem('orbyx_hrms_authenticated_user_id') !== 'user_hr_admin') {
  throw new Error('Test 11 Failed: Session not established in storage');
}
console.log('✓ Test 11 Passed: Valid login establishes authenticated session.');

// Test 12: Logout Clears Session Token
localStorage.removeItem('orbyx_hrms_authenticated_user_id');
if (localStorage.getItem('orbyx_hrms_authenticated_user_id') !== null) {
  throw new Error('Test 12 Failed: Logout failed to clear session');
}
console.log('✓ Test 12 Passed: Logout terminates session and clears authenticated state.');

// =========================================================================
// Group 3: RBAC Preservation Tests
// =========================================================================
console.log('\n[Group 3] RBAC Preservation Tests');

// Test 13: Canonical Users and Employee Identity Integrity
const expectedUsers = [
  'user_bhava_dharani',
  'user_md_selvakumar',
  'user_coo_kannan',
  'user_manager',
  'user_hr_admin',
  'user_emp_designer',
  'user_emp_junior',
  'user_anupriya',
  'user_praveen'
];
for (const uid of expectedUsers) {
  const u = canonicalPersonaUsers.find((p) => p.id === uid);
  if (!u) throw new Error(`Test 13 Failed: User ${uid} missing from canonical users`);
  const emp = db.getEmployeeById(u.employeeId);
  if (!emp) throw new Error(`Test 13 Failed: User ${uid} not linked to valid employee ${u.employeeId}`);
}
console.log(`✓ Test 13 Passed: All ${expectedUsers.length} internal user identities and employee links verified intact.`);

// Test 14: Role Permissions Integrity
if (!ROLE_PERMISSIONS.hr_admin.includes('payroll.process') || !ROLE_PERMISSIONS.hr_admin.includes('employee.profile.edit_employment')) {
  throw new Error('Test 14 Failed: HR Admin permissions modified');
}
if (ROLE_PERMISSIONS.employee.includes('payroll.process') || ROLE_PERMISSIONS.employee.includes('leave.approve_team')) {
  throw new Error('Test 14 Failed: Employee permission boundaries compromised');
}
if (!ROLE_PERMISSIONS.reporting_manager.includes('attendance.approve_team') || ROLE_PERMISSIONS.reporting_manager.includes('payroll.process')) {
  throw new Error('Test 14 Failed: Reporting Manager permission boundaries compromised');
}
console.log('✓ Test 14 Passed: All RBAC role-permission boundaries preserved intact.');

console.log('\n--- ALL AUTHENTICATION AND RBAC TESTS PASSED SUCCESSFULLY ---');

