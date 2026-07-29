import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAttendanceAdjustmentPayload,
  buildCalendarOverridePayload,
  buildEmployeeProfilePayload,
  buildShiftAssignmentPayload,
  buildShiftPayload,
  buildStaffProvisioningPayload,
  buildWorkLocationPayload,
  canAccessTeamScope,
  getAuthorizedTeamScopeIds,
  getEmployeeProfileSections,
  getScheduleScopeOptions,
  hasGlobalPermissionCode,
  isAttendanceException,
  mapEmployeeProfileRow,
  normalizeIdArray,
  resolveCalendarScopeQuery,
  resolveRotationTeamId,
  resolveScheduleTab,
} from './utils/hrTimeApi.js'

test('rotation employee ids remain an array when a multi-select returns a string', () => {
  assert.deepEqual(normalizeIdArray('profile-1,profile-2'), ['profile-1', 'profile-2'])
  assert.deepEqual(normalizeIdArray(['profile-1', 'profile-2']), ['profile-1', 'profile-2'])
})

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

test('global schedule configuration payloads use readable fields and normalize values', () => {
  assert.deepEqual(
    buildWorkLocationPayload({
      code: ' hn-office ',
      name: ' Hanoi office ',
      timezone: ' Asia/Ho_Chi_Minh ',
      status: 'ACTIVE',
      ignoredId: 'must-not-leak',
    }),
    {
      code: 'HN-OFFICE',
      name: 'Hanoi office',
      timezone: 'Asia/Ho_Chi_Minh',
      status: 'ACTIVE',
    },
  )

  assert.deepEqual(
    buildShiftPayload({
      code: ' night ',
      name: ' Night production ',
      workLocationId: '',
      startTime: '22:00',
      endTime: '06:00',
      breakMinutes: '45',
      graceMinutes: '10',
      workdays: [1, 2, 3, 4, 5],
      status: 'ACTIVE',
      ignoredId: 'must-not-leak',
    }),
    {
      code: 'NIGHT',
      name: 'Night production',
      workLocationId: null,
      startTime: '22:00',
      endTime: '06:00',
      breakMinutes: 45,
      graceMinutes: 10,
      workdays: [1, 2, 3, 4, 5],
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

test('staff provisioning payload keeps HR-owned fields and one access assignment', () => {
  assert.deepEqual(
    buildStaffProvisioningPayload({
      employeeCode: ' emp-01 ',
      workEmail: ' AN@LNG.VN ',
      fullName: ' Nguyen An ',
      departmentId: 'department-1',
      teamId: 'team-1',
      jobTitle: ' Designer ',
      jobLevel: 'L2',
      employmentType: 'FULL_TIME',
      workMode: 'ONSITE',
      startDate: '2026-07-29',
      probationEndDate: '',
      status: 'ACTIVE',
      roleId: 'role-1',
      scopeType: 'team',
      scopeId: 'team-1',
      personalEmail: 'private@example.com',
      password: 'must-not-leak',
    }),
    {
      employeeCode: 'EMP-01',
      workEmail: 'an@lng.vn',
      fullName: 'Nguyen An',
      departmentId: 'department-1',
      teamId: 'team-1',
      jobTitle: 'Designer',
      jobLevel: 'L2',
      employmentType: 'FULL_TIME',
      workMode: 'ONSITE',
      startDate: '2026-07-29',
      probationEndDate: null,
      status: 'ACTIVE',
      assignments: [
        {
          roleId: 'role-1',
          scopeType: 'team',
          scopeId: 'team-1',
          customPermissionIds: [],
        },
      ],
    },
  )
})

test('employee directory rows retain server-owned lifecycle fields', () => {
  assert.deepEqual(
    mapEmployeeProfileRow({
      id: 'profile-1',
      isDeleted: 'yes',
      deletedAt: '',
      capabilities: { edit: 1, delete: 'allowed', restore: 0 },
    }),
    {
      id: 'profile-1',
      isDeleted: true,
      deletedAt: null,
      capabilities: { edit: 1, delete: true, restore: false },
      employeeName: 'Unknown employee',
      departmentName: null,
      shiftName: null,
      workLocationName: null,
      actions: { edit: true, delete: true, restore: false },
    },
  )
})

test('directory maps the server onboarding state without deriving it from client guesses', () => {
  assert.equal(
    mapEmployeeProfileRow({ onboardingStatus: 'PROFILE_INCOMPLETE' }).onboardingStatus,
    'PROFILE_INCOMPLETE',
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

test('schedule scope options use named HR directory relationships and skip bare ids', () => {
  assert.deepEqual(
    getScheduleScopeOptions({
      employees: [
        {
          id: 'profile-1',
          fullName: 'Nguyen An',
          employeeCode: 'EMP-01',
          department: { id: 'dept-1', name: 'Design' },
          team: { id: 'team-1', name: 'POD' },
        },
        {
          id: 'profile-2',
          fullName: 'Tran Binh',
          employeeCode: 'EMP-02',
          department: { id: 'dept-1', name: 'Design' },
          team: { id: 'team-hidden' },
        },
      ],
      locations: [{ id: 'location-1', name: 'Hanoi Office' }],
    }),
    [
      { type: 'PROFILE', id: 'profile-1', label: 'Nguyen An (EMP-01)' },
      { type: 'PROFILE', id: 'profile-2', label: 'Tran Binh (EMP-02)' },
      { type: 'WORK_LOCATION', id: 'location-1', label: 'Hanoi Office' },
      { type: 'DEPARTMENT', id: 'dept-1', label: 'Design' },
      { type: 'TEAM', id: 'team-1', label: 'POD' },
    ],
  )
})

test('rotation team scope resolution fails closed for scoped calendar access', () => {
  const user = {
    permissions: [],
    scopes: [
      { scopeType: 'team', scopeId: 'team-1', permissions: ['HR_CALENDAR:WRITE'] },
      { scopeType: 'team', scopeId: 'team-2', permissions: ['HR_SCHEDULE:WRITE'] },
    ],
  }

  assert.deepEqual(getAuthorizedTeamScopeIds(user, 'HR_CALENDAR:WRITE'), ['team-1'])
  assert.equal(resolveRotationTeamId('', ['team-1'], false), 'team-1')
  assert.equal(resolveRotationTeamId('team-2', ['team-1'], false), '')
  assert.equal(resolveRotationTeamId('team-2', ['team-1'], true), 'team-2')
  assert.equal(resolveRotationTeamId('', [], false), '')
  assert.equal(
    hasGlobalPermissionCode({ permissions: ['MANAGE_SYSTEM'] }, 'HR_CALENDAR:WRITE'),
    true,
  )
})

test('schedule tab defaults calendar-only users to a readable calendar workspace', () => {
  assert.equal(
    resolveScheduleTab('', { canScheduleRead: true, canCalendarRead: true }),
    'assignments',
  )
  assert.equal(
    resolveScheduleTab('', { canScheduleRead: false, canCalendarRead: true }),
    'holidays',
  )
  assert.equal(
    resolveScheduleTab('rotations', { canScheduleRead: false, canCalendarRead: true }),
    'rotations',
  )
  assert.equal(
    resolveScheduleTab('assignments', { canScheduleRead: false, canCalendarRead: true }),
    'holidays',
  )
  assert.equal(
    resolveScheduleTab('holidays', { canScheduleRead: true, canCalendarRead: false }),
    'assignments',
  )
})

test('rotation read and write scopes are resolved independently', () => {
  const user = {
    permissions: [],
    scopes: [
      { scopeType: 'team', scopeId: 'team-read', permissions: ['HR_CALENDAR:READ'] },
      { scopeType: 'team', scopeId: 'team-write', permissions: ['HR_CALENDAR:WRITE'] },
    ],
  }

  assert.deepEqual(getAuthorizedTeamScopeIds(user, ['HR_CALENDAR:READ', 'HR_CALENDAR:WRITE']), [
    'team-read',
    'team-write',
  ])
  assert.equal(
    canAccessTeamScope(user, ['HR_CALENDAR:READ', 'HR_CALENDAR:WRITE'], 'team-read'),
    true,
  )
  assert.equal(canAccessTeamScope(user, 'HR_CALENDAR:WRITE', 'team-read'), false)
  assert.equal(canAccessTeamScope(user, 'HR_CALENDAR:WRITE', 'team-write'), true)
  assert.equal(
    canAccessTeamScope({ permissions: ['HR_CALENDAR:READ'] }, 'HR_CALENDAR:READ', 'any-team'),
    true,
  )
  assert.equal(canAccessTeamScope({ scopes: [] }, 'HR_CALENDAR:READ', 'team-read'), false)
})

test('global holiday policy mutations require global calendar write', () => {
  const scopedWriter = {
    scopes: [{ scopeType: 'team', scopeId: 'team-1', permissions: ['HR_CALENDAR:WRITE'] }],
  }

  assert.equal(hasGlobalPermissionCode(scopedWriter, 'HR_CALENDAR:WRITE'), false)
  assert.equal(
    hasGlobalPermissionCode({ permissions: ['HR_CALENDAR:WRITE'] }, 'HR_CALENDAR:WRITE'),
    true,
  )
})

test('holiday scope query resolves team and department readers without leaking unscoped access', () => {
  const teamReader = {
    scopes: [{ scopeType: 'team', scopeId: 'team-1', permissions: ['HR_CALENDAR:READ'] }],
  }
  const departmentReader = {
    scopes: [
      { scopeType: 'department', scopeId: 'department-1', permissions: ['HR_CALENDAR:READ'] },
    ],
  }

  assert.deepEqual(
    resolveCalendarScopeQuery(teamReader, '', ['HR_CALENDAR:READ', 'HR_CALENDAR:WRITE']),
    {
      enabled: true,
      global: false,
      params: { teamId: 'team-1' },
      scopes: [{ key: 'team:team-1', scopeType: 'team', scopeId: 'team-1' }],
      selectedScopeKey: 'team:team-1',
    },
  )
  assert.deepEqual(
    resolveCalendarScopeQuery(departmentReader, '', ['HR_CALENDAR:READ', 'HR_CALENDAR:WRITE'])
      .params,
    { departmentId: 'department-1' },
  )
})

test('holiday scope query stays unscoped only for global readers and otherwise fails closed', () => {
  assert.deepEqual(
    resolveCalendarScopeQuery({ permissions: ['HR_CALENDAR:READ'] }, '', [
      'HR_CALENDAR:READ',
      'HR_CALENDAR:WRITE',
    ]),
    { enabled: true, global: true, params: {}, scopes: [], selectedScopeKey: 'global' },
  )
  assert.deepEqual(
    resolveCalendarScopeQuery(
      { scopes: [{ scopeType: 'shop', scopeId: 'shop-1', permissions: ['HR_CALENDAR:READ'] }] },
      '',
      ['HR_CALENDAR:READ', 'HR_CALENDAR:WRITE'],
    ),
    { enabled: false, global: false, params: {}, scopes: [], selectedScopeKey: '' },
  )
})
