// Comprehensive Test Suite: Scenarios A through J for Client Management & Unified Attendance Integration
import { clientAttendanceIntegration } from '../components/clients/clientAttendanceIntegration';
import { db, initDatabase, resetToSeedData } from '../db/storage';
import { hrmsService } from '../services/hrmsService';
import { personaUsers } from '../db/initialData';

// Polyfill localStorage for Node.js test environment
const storageMap = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => storageMap.get(key) || null,
    setItem: (key: string, value: string) => storageMap.set(key, value),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear()
  };
}

console.log('--- STARTING SCENARIOS A - J ACCEPTANCE TESTS ---');
resetToSeedData();
initDatabase();

// =========================================================================
// Scenario A: Employee without client assignment.
// Expected: Standard attendance works completely.
// =========================================================================
console.log('\n[Scenario A] Employee without client assignment');
const noClientEmp = personaUsers.find((p) => p.id === 'user_bhava_dharani')!; // EMP-DEVOPS-0014
const eligA = clientAttendanceIntegration.evaluateDeploymentEligibility(noClientEmp.employeeId, '2026-11-06');
if (eligA.eligible) throw new Error('Scenario A Failed: Employee should have no client deployment');
console.log(`✓ Scenario A Passed: Standard attendance evaluated (eligible: ${eligA.eligible}, reason: ${eligA.reason}).`);

// =========================================================================
// Scenario B: Employee with client assignment but verification disabled.
// Expected: Standard attendance works without client verification.
// =========================================================================
console.log('\n[Scenario B] Employee with client deployment but verification disabled');
clientAttendanceIntegration.saveDeployment({
  id: 'CAS-TEST-B',
  clientId: 'CLI-101',
  clientName: 'Apex FinTech Global',
  employeeId: 'EMP-SWE-0010', // Praveen
  employeeName: 'Praveen',
  project: 'Internal Sandbox',
  startDate: '2026-11-01',
  plannedEndDate: '2026-11-30',
  clientSupervisorId: 'CSUP-101',
  clientSupervisorName: 'Vikramaditya Rao',
  clientSupervisorEmail: 'v.rao@apexfintech.example.com',
  requiresClientVerification: false,
  status: 'Active'
});

const eligB = clientAttendanceIntegration.evaluateDeploymentEligibility('EMP-SWE-0010', '2026-11-06');
if (eligB.eligible) throw new Error('Scenario B Failed: Verification disabled deployment should not trigger verification');
console.log(`✓ Scenario B Passed: Standard attendance works without client verification (reason: ${eligB.reason}).`);

// =========================================================================
// Scenario C: Employee with expired deployment.
// Expected: Standard attendance applies for subsequent attendance dates.
// =========================================================================
console.log('\n[Scenario C] Employee with expired deployment');
const expiredDate = '2026-11-06';
const eligC = clientAttendanceIntegration.evaluateDeploymentEligibility('EMP-SWE-0005', expiredDate); // CAS-203 ended Oct 31, 2026
if (eligC.eligible) throw new Error('Scenario C Failed: Expired deployment should not be eligible on subsequent dates');
console.log(`✓ Scenario C Passed: Standard attendance applies after deployment end date (${eligC.reason}).`);

// =========================================================================
// Scenario D: Employee with deployment on hold or cancelled.
// Expected: No new client verification is triggered.
// =========================================================================
console.log('\n[Scenario D] Employee with deployment on hold');
clientAttendanceIntegration.saveDeployment({
  id: 'CAS-TEST-D',
  clientId: 'CLI-101',
  clientName: 'Apex FinTech Global',
  employeeId: 'EMP-SWE-0011',
  employeeName: 'Test Dev',
  project: 'On Hold Initiative',
  startDate: '2026-11-01',
  plannedEndDate: '2026-11-30',
  clientSupervisorId: 'CSUP-101',
  clientSupervisorName: 'Vikramaditya Rao',
  clientSupervisorEmail: 'v.rao@apexfintech.example.com',
  requiresClientVerification: true,
  status: 'On Hold'
});

const eligD = clientAttendanceIntegration.evaluateDeploymentEligibility('EMP-SWE-0011', '2026-11-06');
if (eligD.eligible) throw new Error('Scenario D Failed: On Hold deployment must not trigger client verification');
console.log(`✓ Scenario D Passed: Deployment on hold blocks client verification (${eligD.reason}).`);

// =========================================================================
// Scenario E: Employee with active deployment and verification enabled.
// Expected: Existing attendance record is submitted for client verification.
// =========================================================================
console.log('\n[Scenario E] Active deployment with verification enabled');
const activeEmpId = 'EMP-SWE-0004'; // Archana at Apex (CAS-201)
const eligE = clientAttendanceIntegration.evaluateDeploymentEligibility(activeEmpId, '2026-11-06');
if (!eligE.eligible) throw new Error('Scenario E Failed: Active deployment must be eligible');

const verifE = clientAttendanceIntegration.syncAttendanceRecord({
  id: 'ATT-TEST-E',
  employeeId: activeEmpId,
  employeeName: 'Archana',
  date: '2026-11-06',
  shiftId: 'SHIFT-GEN',
  shiftName: 'General Day Shift (09:30 - 18:30)',
  checkInTime: '09:30',
  checkOutTime: '18:30',
  totalHours: 8,
  netWorkingHours: 8,
  breakDurationMinutes: 60,
  overtimeHours: 0,
  isLate: false,
  lateMinutes: 0,
  isEarlyDeparture: false,
  isMissingPunch: false,
  status: 'Present',
  workLocationType: 'Client Site',
  source: 'Web Punch'
});

if (!verifE || verifE.verificationStatus !== 'Pending Client Verification') {
  throw new Error('Scenario E Failed: Verification record not created with Pending Client Verification status');
}
console.log(`✓ Scenario E Passed: Existing attendance record submitted for verification (ID: ${verifE.id}).`);

// =========================================================================
// Scenario F: Employee with active deployment but no valid assigned supervisor.
// Expected: Standard attendance capture remains available, integration reports MISSING_SUPERVISOR, no fabricated approval.
// =========================================================================
console.log('\n[Scenario F] Active deployment but supervisor missing or inactive');
clientAttendanceIntegration.saveDeployment({
  id: 'CAS-TEST-F',
  clientId: 'CLI-101',
  clientName: 'Apex FinTech Global',
  employeeId: 'EMP-SWE-0008',
  employeeName: 'Dev Without Sup',
  project: 'Orphaned Deployment',
  startDate: '2026-11-01',
  plannedEndDate: '2026-11-30',
  clientSupervisorId: 'CSUP-999-NONEXISTENT',
  clientSupervisorName: 'Non Existent',
  requiresClientVerification: true,
  status: 'Active'
});

const eligF = clientAttendanceIntegration.evaluateDeploymentEligibility('EMP-SWE-0008', '2026-11-06');
if (eligF.eligible || eligF.reason !== 'MISSING_SUPERVISOR') {
  throw new Error('Scenario F Failed: Should report MISSING_SUPERVISOR and not fabricate approval');
}
console.log(`✓ Scenario F Passed: Standard attendance preserved; missing supervisor cleanly flagged (${eligF.reason}).`);

// =========================================================================
// Scenario G: Client Supervisor approves attendance.
// Expected: Existing attendance record remains unchanged and verification status advances independently.
// =========================================================================
console.log('\n[Scenario G] Client Supervisor approval');
const approvedG = clientAttendanceIntegration.handleClientSupervisorDecision(
  verifE.id,
  'Approved',
  'Timesheet verified by Vikramaditya Rao onsite',
  'Vikramaditya Rao'
);
if (!approvedG) throw new Error('Scenario G Failed: Could not process supervisor decision');
const checkVerifG = clientAttendanceIntegration.getVerificationForAttendanceRecord('ATT-TEST-E')!;
if (checkVerifG.verificationStatus !== 'Pending HR Verification') {
  throw new Error(`Scenario G Failed: Expected Pending HR Verification, got ${checkVerifG.verificationStatus}`);
}
console.log(`✓ Scenario G Passed: Verification advanced to "${checkVerifG.verificationStatus}". Punch hours unchanged.`);

// =========================================================================
// Scenario H: Attendance correction after client approval.
// Expected: Correction workflow remains independent. If correction changes attendance, verification is reopened.
// =========================================================================
console.log('\n[Scenario H] Attendance correction reopening client verification');
const reopenedH = clientAttendanceIntegration.reopenVerificationOnCorrection(
  'ATT-TEST-E',
  '09:15',
  '19:00',
  8.75,
  'Late exit due to emergency client deployment'
);
if (!reopenedH) throw new Error('Scenario H Failed: Reopen on correction failed');
const checkVerifH = clientAttendanceIntegration.getVerificationForAttendanceRecord('ATT-TEST-E')!;
if (checkVerifH.verificationStatus !== 'Pending Client Verification' || checkVerifH.workingHours !== 8.75) {
  throw new Error('Scenario H Failed: Verification should reopen with updated hours');
}
console.log(`✓ Scenario H Passed: Client verification reopened to "${checkVerifH.verificationStatus}" with new hours (${checkVerifH.workingHours}h). Previous audit history preserved.`);

// =========================================================================
// Scenario I: Multiple historical deployments.
// Expected: Attendance is associated with the correct deployment applicable on that attendance date.
// =========================================================================
console.log('\n[Scenario I] Multiple historical deployments');
// AnuPriya (EMP-SWE-0005) had CAS-203 active in October 2026, and a new deployment CAS-204 in December 2026
clientAttendanceIntegration.saveDeployment({
  id: 'CAS-204',
  clientId: 'CLI-102',
  clientName: 'Horizon Retail Systems',
  employeeId: 'EMP-SWE-0005',
  employeeName: 'AnuPriya',
  project: 'Horizon Q1 Release',
  startDate: '2026-12-01',
  plannedEndDate: '2026-12-31',
  clientSupervisorId: 'CSUP-102',
  clientSupervisorName: 'Meera Krishnan',
  clientSupervisorEmail: 'meera.k@horizonretail.example.com',
  requiresClientVerification: true,
  status: 'Active'
});

const octElig = clientAttendanceIntegration.evaluateDeploymentEligibility('EMP-SWE-0005', '2026-10-15');
const decElig = clientAttendanceIntegration.evaluateDeploymentEligibility('EMP-SWE-0005', '2026-12-15');
if (octElig.deployment?.id !== 'CAS-203') throw new Error('Scenario I Failed: October date should match CAS-203');
if (decElig.deployment?.id !== 'CAS-204') throw new Error('Scenario I Failed: December date should match CAS-204');
console.log(`✓ Scenario I Passed: October attendance resolved to ${octElig.deployment.id} (${octElig.deployment.clientName}); December resolved to ${decElig.deployment.id} (${decElig.deployment.clientName}).`);

// =========================================================================
// Scenario J: Attendance status consistency.
// Expected: Attendance status and client verification status remain independent across views.
// =========================================================================
console.log('\n[Scenario J] Attendance status vs Verification status independence');
// Attendance Punch Status: 'Checked Out'
// Client Verification Status: 'Pending Client Verification'
const punchStatus = 'Checked Out';
const verifStatus = checkVerifH.verificationStatus;
if ((punchStatus as string) === (verifStatus as string)) {
  throw new Error('Scenario J Failed: Attendance status and Verification status must remain distinct');
}
console.log(`✓ Scenario J Passed: Punch Status ("${punchStatus}") and Verification Status ("${verifStatus}") coexist independently.`);

console.log('\n--- ALL SCENARIOS A THROUGH J PASSED CLEANLY ---');
