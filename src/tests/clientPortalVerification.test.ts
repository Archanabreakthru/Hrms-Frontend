// Test Suite: Client Supervisor Portal & Two-Stage Verification
// Simple in-memory localStorage polyfill for Node.js test runner
const storageMap = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => storageMap.get(key) || null,
    setItem: (key: string, value: string) => storageMap.set(key, value),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear()
  };
}

import { db, initDatabase } from '../db/storage';
import { hrmsService } from '../services/hrmsService';
import { ClientSupervisor } from '../types/hrms';

console.log('--- STARTING VERIFICATION TESTS ---');
initDatabase();

// Test 1: Registered supervisors exist
const supervisors = db.getClientSupervisors();
console.log(`[Test 1] Registered Supervisors Count: ${supervisors.length}`);
const apexSup = supervisors.find((s) => s.id === 'CSUP-101');
const horizonSup = supervisors.find((s) => s.id === 'CSUP-102');
const inactiveSup = supervisors.find((s) => s.id === 'CSUP-103');
const expiredSup = supervisors.find((s) => s.id === 'CSUP-104');

if (!apexSup || !horizonSup || !inactiveSup || !expiredSup) {
  throw new Error('Test 1 Failed: Seed supervisors missing');
}
console.log('✓ Test 1 Passed: Apex, Horizon, Inactive, and Expired supervisors exist.');

// Test 2: Inactive supervisor cannot submit attendance
const inactiveRes = hrmsService.submitClientSupervisorAttendanceDirect({
  supervisorId: inactiveSup.id,
  supervisorName: inactiveSup.name,
  supervisorEmail: inactiveSup.officialEmail,
  clientId: inactiveSup.clientId,
  records: [
    {
      employeeId: 'EMP-003',
      date: '2026-11-04',
      checkInTime: '09:30',
      checkOutTime: '18:30',
      totalHoursWorked: 8,
      status: 'Present'
    }
  ],
  decision: 'Verified'
});

if (inactiveRes.success) {
  throw new Error('Test 2 Failed: Inactive supervisor was allowed to submit attendance');
}
console.log('✓ Test 2 Passed: Inactive supervisor blocked with message:', inactiveRes.message);

// Test 3: Active supervisor submits attendance
const testDate = '2026-11-04';
const submitRes = hrmsService.submitClientSupervisorAttendanceDirect({
  supervisorId: apexSup.id,
  supervisorName: apexSup.name,
  supervisorEmail: apexSup.officialEmail,
  clientId: apexSup.clientId,
  records: [
    {
      employeeId: 'EMP-003',
      date: testDate,
      checkInTime: '09:00',
      checkOutTime: '18:00',
      totalHoursWorked: 8,
      status: 'Present',
      notes: 'Test portal submission'
    }
  ],
  decision: 'Verified'
});

if (!submitRes.success || submitRes.updatedCount !== 1) {
  throw new Error('Test 3 Failed: Active supervisor could not submit attendance');
}
console.log('✓ Test 3 Passed: Active supervisor successfully submitted attendance.');

// Test 4: Verify attendance record state
const attRecord = db.getAttendanceRecords().find((r) => r.employeeId === 'EMP-003' && r.date === testDate);
if (!attRecord) throw new Error('Test 4 Failed: Attendance record not saved');

console.log(`[Test 4] Record State:`);
console.log(`  - clientVerificationStatus: ${attRecord.clientVerificationStatus}`);
console.log(`  - companyApprovalStatus: ${attRecord.companyApprovalStatus}`);
console.log(`  - payrollEligibilityStatus: ${attRecord.payrollEligibilityStatus}`);
console.log(`  - verificationMethod: ${attRecord.verificationMethod}`);

if (attRecord.clientVerificationStatus !== 'Verified') {
  throw new Error('Test 4 Failed: clientVerificationStatus is not Verified');
}
if (attRecord.companyApprovalStatus !== 'Pending') {
  throw new Error('Test 4 Failed: companyApprovalStatus should be Pending (Client approval must never finalize!)');
}
if (attRecord.payrollEligibilityStatus !== 'Not Eligible') {
  throw new Error('Test 4 Failed: payrollEligibilityStatus must be Not Eligible prior to HR approval');
}
console.log('✓ Test 4 Passed: Two-stage verification state verified (Stage 1 Done, Stage 2 Pending, Payroll Not Eligible).');

// Test 5: Internal HR Final Approval
const hrApprovalRes = hrmsService.decideCompanyAttendanceApproval({
  attendanceRecordId: attRecord.id,
  decision: 'Approved',
  comments: 'Stage 2 HR Final Approval confirmed by HR Admin',
  actorUserId: 'user_hr_admin',
  actorName: 'Priya Sharma',
  actorRole: 'hr_admin'
});

if (!hrApprovalRes.success) throw new Error('Test 5 Failed: HR approval failed');

const approvedRecord = db.getAttendanceRecords().find((r) => r.id === attRecord.id);
if (approvedRecord?.companyApprovalStatus !== 'Approved') {
  throw new Error('Test 5 Failed: Record not marked Approved');
}
if (approvedRecord?.payrollEligibilityStatus !== 'Eligible for Draft Payroll') {
  throw new Error('Test 5 Failed: Record not marked Eligible for Draft Payroll');
}
console.log('✓ Test 5 Passed: Stage 2 HR Final Approval successfully transitioned record to Eligible for Draft Payroll.');

// Test 6: Audit log recorded
const auditLogs = db.getAuditLogs().filter((l) => l.actorUserId === apexSup.id);
if (auditLogs.length === 0) throw new Error('Test 6 Failed: Audit log missing for supervisor submission');
console.log(`✓ Test 6 Passed: Found ${auditLogs.length} audit log entry for supervisor ${apexSup.name}.`);

console.log('--- ALL 6 AUTOMATED TESTS PASSED SUCCESSFULLY ---');
