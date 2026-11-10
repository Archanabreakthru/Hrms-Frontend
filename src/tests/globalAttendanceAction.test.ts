// Automated verification test suite for GlobalAttendanceAction and attendance state integration
import { db, initDatabase, resetToSeedData } from '../db/storage';
import { hrmsService } from '../services/hrmsService';
import { personaUsers } from '../db/initialData';

// Polyfill localStorage if in Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    }
  };
}

console.log('--- STARTING GLOBAL ATTENDANCE INTEGRATION TESTS ---');

resetToSeedData();
initDatabase();

const todayStr = new Date().toISOString().split('T')[0];

// Test 1: Authenticated roles coverage
const roles = ['employee', 'reporting_manager', 'hr_admin', 'senior_manager'];
const foundPersonas = roles.map((role) => personaUsers.find((p) => p.role === role));
const allRolesFound = foundPersonas.every((p) => Boolean(p && p.employeeId));
console.log(`[Test 1] Authenticated roles present: ${allRolesFound}`);
if (!allRolesFound) throw new Error('Not all roles present in persona roster');
console.log('✓ Test 1 Passed: All authenticated user roles mapped with valid employee IDs.');

// Test 2: Clean slate - user starts without today punch
const testEmp = personaUsers.find((p) => p.id === 'user_emp_designer')!; // Archana (EMP-SWE-0004)
const initialRecord = db.getAttendanceRecords().find((r) => r.employeeId === testEmp.employeeId && r.date === todayStr);
console.log(`[Test 2] Initial record exists: ${Boolean(initialRecord)}`);

// Test 3: Perform Check In
const checkInResult = hrmsService.punchAttendance(
  testEmp.employeeId,
  'check-in',
  testEmp.id,
  testEmp.name,
  { workMode: 'Office' }
);
console.log(`[Test 3] Check In punch success: ${checkInResult.success}`);
if (!checkInResult.success) throw new Error(`Check In failed: ${checkInResult.error}`);

const afterInRecord = db.getAttendanceRecords().find((r) => r.employeeId === testEmp.employeeId && r.date === todayStr);
if (!afterInRecord?.checkInTime) throw new Error('CheckInTime not recorded');
console.log(`✓ Test 3 Passed: Check In succeeded at ${afterInRecord.checkInTime}.`);

// Test 4: Duplicate Check In prevention
const dupCheckIn = hrmsService.punchAttendance(
  testEmp.employeeId,
  'check-in',
  testEmp.id,
  testEmp.name,
  { workMode: 'Office' }
);
if (dupCheckIn.success) throw new Error('Duplicate check in should have failed');
console.log(`✓ Test 4 Passed: Duplicate Check In prevented (${dupCheckIn.error || dupCheckIn.message}).`);

// Test 5: Perform Check Out
const checkOutResult = hrmsService.punchAttendance(
  testEmp.employeeId,
  'check-out',
  testEmp.id,
  testEmp.name,
  { workMode: 'Office' }
);
console.log(`[Test 5] Check Out punch success: ${checkOutResult.success}`);
if (!checkOutResult.success) throw new Error(`Check Out failed: ${checkOutResult.error}`);

const afterOutRecord = db.getAttendanceRecords().find((r) => r.employeeId === testEmp.employeeId && r.date === todayStr);
if (!afterOutRecord?.checkOutTime) throw new Error('CheckOutTime not recorded');
console.log(`✓ Test 5 Passed: Check Out succeeded at ${afterOutRecord.checkOutTime}. Hours worked: ${afterOutRecord.totalHoursWorked}`);

// Test 6: Duplicate Check Out prevention
const dupCheckOut = hrmsService.punchAttendance(
  testEmp.employeeId,
  'check-out',
  testEmp.id,
  testEmp.name,
  { workMode: 'Office' }
);
if (dupCheckOut.success) throw new Error('Duplicate check out should have failed');
console.log(`✓ Test 6 Passed: Duplicate Check Out prevented (${dupCheckOut.error || dupCheckOut.message}).`);

// Test 7: Holiday detection logic
const holidays = db.getHolidays();
console.log(`[Test 7] System holidays loaded: ${holidays.length}`);
if (holidays.length === 0) throw new Error('No holidays found in database');
console.log('✓ Test 7 Passed: Holidays correctly configured for status resolution.');

// Test 8: Approved leave detection logic
const leaveApps = db.getLeaveApplications();
console.log(`[Test 8] Leave applications loaded: ${leaveApps.length}`);
if (leaveApps.length === 0) throw new Error('No leave applications found in database');
console.log('✓ Test 8 Passed: Leave applications correctly configured for status resolution.');

console.log('--- ALL GLOBAL ATTENDANCE INTEGRATION TESTS PASSED SUCCESSFULLY ---');

