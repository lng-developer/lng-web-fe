import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAttendanceAdjustmentPayload,
  buildCalendarOverridePayload,
  buildEmployeeProfilePayload,
  buildShiftAssignmentPayload,
  getEmployeeProfileSections,
  isAttendanceException,
} from './utils/hrTimeApi.js'

test('operation payloads keep only fields accepted by each HR endpoint', () => {
  assert.deepEqual(
    buildAttendanceAdjustmentPayload({
      status: 'PRESENT',
      checkInAt: '2026-07-19T01:00:00.000Z',
      checkOutAt: '',
      reason: '  Corrected badge time  ',
      profileId: 'must-not-leak',
    }),
    {
      status: 'PRESENT',
      checkInAt: '2026-07-19T01:00:00.000Z',
      checkOutAt: null,
      reason: 'Corrected badge time',
    },
  )

  assert.deepEqual(
    buildShiftAssignmentPayload({
      profileId: 'profile-1',
      shiftId: 'shift-1',
      workLocationId: 'location-1',
      effectiveFrom: '2026-07-20',
      effectiveTo: '',
      status: 'ACTIVE',
      employeeName: 'must-not-leak',
    }),
    {
      profileId: 'profile-1',
      shiftId: 'shift-1',
      workLocationId: 'location-1',
      effectiveFrom: '2026-07-20',
      effectiveTo: null,
      status: 'ACTIVE',
    },
  )

  assert.deepEqual(
    buildCalendarOverridePayload({
      dateKey: '2026-09-02',
      kind: 'HOLIDAY',
      scopeType: 'GLOBAL',
      scopeId: 'must-not-leak',
      name: '  National Day  ',
      status: 'ACTIVE',
    }),
    {
      dateKey: '2026-09-02',
      kind: 'HOLIDAY',
      scopeType: 'GLOBAL',
      scopeId: null,
      name: 'National Day',
      status: 'ACTIVE',
    },
  )
})

test('employee payloads exclude restricted and display-only values', () => {
  assert.deepEqual(
    buildEmployeeProfilePayload(
      {
        accountId: 'account-1',
        employeeCode: ' emp-01 ',
        fullName: '  Nguyen An ',
        departmentId: '',
        teamId: '',
        jobTitle: ' Designer ',
        employmentType: 'FULL_TIME',
        workMode: 'ONSITE',
        startDate: '2026-07-19',
        status: 'ACTIVE',
        baseSalary: 1000000,
        personalEmail: 'private@example.com',
      },
      { create: true },
    ),
    {
      accountId: 'account-1',
      employeeCode: 'EMP-01',
      fullName: 'Nguyen An',
      departmentId: null,
      teamId: null,
      jobTitle: 'Designer',
      employmentType: 'FULL_TIME',
      workMode: 'ONSITE',
      startDate: '2026-07-19',
      status: 'ACTIVE',
    },
  )
})

test('profile sections contain only fields present in the detail projection', () => {
  const sections = getEmployeeProfileSections({
    fullName: 'Nguyen An',
    workEmail: 'an@lng.vn',
    contractType: 'FULL_TIME',
  })

  assert.deepEqual(
    sections.map((section) => section.key),
    ['work', 'contact', 'contract'],
  )
  assert.equal(
    sections.some((section) => section.key === 'compensation'),
    false,
  )
  assert.equal(getEmployeeProfileSections({ baseSalary: 1 }).at(0)?.key, 'compensation')
})

test('attendance exceptions include status and time-variance cases', () => {
  assert.equal(isAttendanceException({ status: 'ABSENT' }), true)
  assert.equal(isAttendanceException({ status: 'PRESENT', lateMinutes: 4 }), true)
  assert.equal(isAttendanceException({ status: 'PRESENT', lateMinutes: 0 }), false)
})
