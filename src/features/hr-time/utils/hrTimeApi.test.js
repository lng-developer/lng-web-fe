import assert from 'node:assert/strict'
import test from 'node:test'

import { hrTimeKeys } from '../api/hrTime.keys.js'
import {
  getHrTimeActions,
  getSelfAttendanceActions,
  mapAttendanceRow,
  mapLeaveRequestRow,
  mapOvertimeRequestRow,
  mapShiftAssignmentRow,
  normalizeHrTimeQuery,
} from './hrTimeApi.js'

test('normalizes active HR Time list filters for stable query keys', () => {
  const query = normalizeHrTimeQuery({
    q: '  An  ',
    page: 2,
    status: '',
    departmentId: null,
    includeInactive: false,
  })

  assert.deepEqual(query, { includeInactive: false, page: 2, q: 'An' })
  assert.deepEqual(hrTimeKeys.listLeave(query), [
    'hr-time',
    'leave',
    { includeInactive: false, page: 2, q: 'An' },
  ])
})

test('maps employee, department, shift, and work-location relation labels', () => {
  const row = {
    id: 'attendance-1',
    employee: { fullName: 'Nguyen An' },
    department: { name: 'Operations' },
    shift: { name: 'Morning' },
    workLocation: { name: 'HCMC' },
    capabilities: { adjust: true, view: true },
  }

  assert.deepEqual(mapAttendanceRow(row), {
    ...row,
    employeeName: 'Nguyen An',
    departmentName: 'Operations',
    shiftName: 'Morning',
    workLocationName: 'HCMC',
    actions: { adjust: true, view: true },
  })
})

test('uses backend request snapshots and only falls back to Unknown employee without a relation', () => {
  assert.equal(
    mapLeaveRequestRow({ requester: { fullName: 'Tran Binh' } }).employeeName,
    'Tran Binh',
  )
  assert.equal(mapOvertimeRequestRow({ profileId: 'profile-1' }).employeeName, 'Unknown employee')
  assert.equal(mapShiftAssignmentRow({ profile: { fullName: 'Le Chi' } }).employeeName, 'Le Chi')
})

test('maps HR Time row actions from backend capabilities without role-name branching', () => {
  assert.deepEqual(
    getHrTimeActions({
      capabilities: { approve: true, cancel: false, reject: true, view: true },
    }),
    { approve: true, cancel: false, reject: true, view: true },
  )
})

test('uses the server-owned self attendance capability without inferring from attendance rows', () => {
  assert.deepEqual(
    getSelfAttendanceActions({ summary: { selfActions: { checkIn: true, checkOut: false } } }),
    { checkIn: true, checkOut: false },
  )
  assert.deepEqual(getSelfAttendanceActions({ selfAttendanceActions: { canCheckOut: true } }), {
    checkIn: false,
    checkOut: true,
  })
  assert.deepEqual(
    getSelfAttendanceActions({ items: [{ checkInAt: '2026-07-19T00:00:00.000Z' }] }),
    {
      checkIn: false,
      checkOut: false,
    },
  )
})
