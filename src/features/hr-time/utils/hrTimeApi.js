function relationName(value) {
  if (typeof value === 'string') return value
  return value?.fullName ?? value?.name ?? null
}

export function normalizeIdArray(value) {
  const ids = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  return [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))]
}

export function formatMinutes(value, t) {
  if (value === null || value === undefined) return '-'
  const minutes = Number(value || 0)
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (!hours) return t('hrTime.units.minutes', { count: remainder, defaultValue: '{{count}}m' })
  if (!remainder) return t('hrTime.units.hours', { count: hours, defaultValue: '{{count}}h' })
  return t('hrTime.units.hoursMinutes', {
    hours,
    minutes: remainder,
    defaultValue: '{{hours}}h{{minutes}}m',
  })
}

function scheduleRelationName(row, relation) {
  return relationName(row?.[relation]) ?? relationName(row?.scheduleSnapshot?.[relation])
}

function employeeName(row) {
  return (
    relationName(row?.employee) ??
    relationName(row?.requester) ??
    relationName(row?.profile) ??
    relationName(row?.employeeProfile) ??
    row?.fullName ??
    'Unknown employee'
  )
}

function mapEmployeeRelatedRow(row) {
  if (!row) return null

  return {
    ...row,
    employeeName: employeeName(row),
    departmentName: scheduleRelationName(row, 'department'),
    shiftName: scheduleRelationName(row, 'shift'),
    workLocationName: scheduleRelationName(row, 'workLocation'),
    actions: getHrTimeActions(row),
  }
}

export function normalizeHrTimeQuery(params = {}) {
  return Object.keys(params)
    .sort()
    .reduce((query, key) => {
      const value = params[key]
      const normalized = typeof value === 'string' ? value.trim() : value

      if (normalized !== null && normalized !== undefined && normalized !== '') {
        query[key] = normalized
      }

      return query
    }, {})
}

export function unwrapHrTimeResponse(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

export function mapHrTimeCollection(payload, mapper) {
  if (Array.isArray(payload)) return payload.map(mapper)
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.items)) return payload

  return { ...payload, items: payload.items.map(mapper) }
}

export function mapEmployeeProfileRow(row) {
  const mapped = mapEmployeeRelatedRow(row)
  if (!mapped) return null

  return {
    ...mapped,
    isDeleted: Boolean(row.isDeleted),
    deletedAt: row.deletedAt || null,
    capabilities: {
      ...row.capabilities,
      delete: Boolean(row.capabilities?.delete),
      restore: Boolean(row.capabilities?.restore),
    },
  }
}

export function mapWorkLocationRow(row) {
  return row
    ? {
        ...row,
        workLocationName: relationName(row.workLocation) ?? row.name ?? null,
        actions: getHrTimeActions(row),
      }
    : null
}

export function mapShiftRow(row) {
  return row
    ? {
        ...row,
        shiftName: relationName(row.shift) ?? row.name ?? null,
        workLocationName: scheduleRelationName(row, 'workLocation'),
        actions: getHrTimeActions(row),
      }
    : null
}

export function mapShiftAssignmentRow(row) {
  return mapEmployeeRelatedRow(row)
}

export function mapCalendarOverrideRow(row) {
  return row
    ? { ...row, calendarOverrideName: row.name ?? null, actions: getHrTimeActions(row) }
    : null
}

export function mapAttendanceRow(row) {
  return mapEmployeeRelatedRow(row)
}

export function mapAttendanceMonthMatrix(payload) {
  if (!payload || typeof payload !== 'object') return payload
  return {
    ...payload,
    items: Array.isArray(payload.items) ? payload.items.map(mapMatrixRow) : [],
  }
}

export function mapLeaveBalanceRow(row) {
  return mapEmployeeRelatedRow(row)
}

export function mapLeaveRequestRow(row) {
  return mapEmployeeRelatedRow(row)
}

export function mapOvertimeRequestRow(row) {
  return mapEmployeeRelatedRow(row)
}

export function getHrTimeActions(row) {
  const capabilities = row?.capabilities

  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) return {}

  return Object.fromEntries(
    Object.entries(capabilities).map(([action, allowed]) => [action, Boolean(allowed)]),
  )
}

export function getSelfAttendanceActions(payload = {}) {
  const actions =
    payload?.selfActions ||
    payload?.selfAttendanceActions ||
    payload?.summary?.selfActions ||
    payload?.summary?.selfAttendanceActions ||
    payload?.capabilities ||
    {}

  return {
    checkIn: Boolean(actions.checkIn ?? actions.canCheckIn),
    checkOut: Boolean(actions.checkOut ?? actions.canCheckOut),
  }
}

function compactPayload(values, fields, nullableFields = []) {
  return fields.reduce((payload, field) => {
    if (!Object.hasOwn(values, field) || values[field] === undefined) return payload
    const value = typeof values[field] === 'string' ? values[field].trim() : values[field]
    payload[field] = value === '' && nullableFields.includes(field) ? null : value
    return payload
  }, {})
}

export function buildAttendanceAdjustmentPayload(values) {
  return compactPayload(
    values,
    ['status', 'checkInAt', 'checkOutAt', 'reason'],
    ['checkInAt', 'checkOutAt'],
  )
}

export function buildLeaveAttachmentPayload(assets = []) {
  return {
    attachments: assets.map((asset) => ({
      mediaId: asset.mediaId || asset.id,
      filename: asset.filename || asset.originalFilename || null,
      mimeType: asset.mimeType || null,
    })),
  }
}

export function buildLeaveRefundPayload({ dateKeys = [], reason = '' }) {
  return {
    dateKeys: [...new Set(dateKeys.map((dateKey) => String(dateKey).trim()).filter(Boolean))],
    reason: reason.trim(),
  }
}

export function buildShiftAssignmentPayload(values) {
  return compactPayload(
    values,
    ['profileId', 'shiftId', 'workLocationId', 'effectiveFrom', 'effectiveTo', 'status'],
    ['effectiveTo'],
  )
}

export function buildCalendarOverridePayload(values) {
  const payload = compactPayload(values, [
    'dateKey',
    'kind',
    'scopeType',
    'scopeId',
    'name',
    'status',
  ])
  if (payload.scopeType === 'GLOBAL') payload.scopeId = null
  return payload
}

export function buildWorkLocationPayload(values) {
  const payload = compactPayload(values, ['code', 'name', 'timezone', 'status'])
  if (payload.code) payload.code = payload.code.toUpperCase()
  return payload
}

export function buildShiftPayload(values) {
  const payload = compactPayload(
    values,
    [
      'code',
      'name',
      'workLocationId',
      'startTime',
      'endTime',
      'breakMinutes',
      'graceMinutes',
      'workdays',
      'status',
    ],
    ['workLocationId'],
  )

  if (payload.code) payload.code = payload.code.toUpperCase()
  for (const field of ['breakMinutes', 'graceMinutes']) {
    if (payload[field] !== undefined) payload[field] = Number(payload[field])
  }
  return payload
}

export function getScheduleScopeOptions({ employees = [], locations = [], overrides = [] } = {}) {
  const options = [
    ...employees.map((employee) => ({
      type: 'PROFILE',
      id: employee.id,
      label: employee.fullName
        ? `${employee.fullName}${employee.employeeCode ? ` (${employee.employeeCode})` : ''}`
        : '',
    })),
    ...locations.map((location) => ({
      type: 'WORK_LOCATION',
      id: location.id,
      label: location.name,
    })),
    ...employees.map((employee) => ({
      type: 'DEPARTMENT',
      id: employee.department?.id,
      label: employee.department?.name,
    })),
    ...employees.map((employee) => ({
      type: 'TEAM',
      id: employee.team?.id,
      label: employee.team?.name,
    })),
    ...overrides.map((override) => ({
      type: override.scopeType,
      id: override.scopeTarget?.id,
      label: override.scopeTarget?.name || override.scopeTarget?.label,
    })),
  ].filter((option) => option.id && option.label)

  return [...new Map(options.map((option) => [`${option.type}:${option.id}`, option])).values()]
}

export function buildEmployeeProfilePayload(values, { create = false } = {}) {
  const fields = [
    ...(create ? ['accountId'] : []),
    'employeeCode',
    'fullName',
    'departmentId',
    'teamId',
    'jobTitle',
    'jobLevel',
    'employmentType',
    'workMode',
    'startDate',
    'status',
  ]
  const payload = compactPayload(values, fields, [
    'departmentId',
    'teamId',
    'jobTitle',
    'jobLevel',
    'startDate',
  ])
  if (payload.employeeCode) payload.employeeCode = payload.employeeCode.toUpperCase()
  return payload
}

const profileSectionFields = {
  work: [
    'employeeCode',
    'fullName',
    'department',
    'team',
    'jobTitle',
    'jobLevel',
    'employmentType',
    'workMode',
    'startDate',
    'status',
  ],
  contact: [
    'workEmail',
    'personalEmail',
    'phoneNumber',
    'address',
    'birthDate',
    'emergencyContact',
  ],
  contract: [
    'contractType',
    'contractNumber',
    'contractStartDate',
    'contractEndDate',
    'probationEndDate',
    'promotionDate',
    'transferDate',
    'endDate',
  ],
  compensation: [
    'baseCurrency',
    'baseSalary',
    'allowances',
    'responsibilityAllowance',
    'identityCard',
    'taxIdentification',
    'socialInsuranceNumber',
    'bankAccount',
  ],
}

export function getEmployeeProfileSections(profile = {}) {
  return Object.entries(profileSectionFields).flatMap(([key, fields]) => {
    const visibleFields = fields
      .filter((field) => Object.hasOwn(profile, field))
      .map((field) => ({ key: field, value: profile[field] }))
    return visibleFields.length ? [{ key, fields: visibleFields }] : []
  })
}

export function isAttendanceException(row = {}) {
  return (
    row.status !== 'PRESENT' ||
    Number(row.lateMinutes || 0) > 0 ||
    Number(row.earlyLeaveMinutes || 0) > 0
  )
}

function permissionMatches(permission, code) {
  return typeof permission === 'string' ? permission === code : permission?.code === code
}

function permissionTreeIncludes(value, code) {
  if (!value) return false
  if (typeof value === 'string') return value === code
  if (Array.isArray(value)) return value.some((item) => permissionTreeIncludes(item, code))
  if (typeof value !== 'object') return false
  return (
    permissionMatches(value, code) ||
    permissionTreeIncludes(value.permissions, code) ||
    permissionTreeIncludes(value.customPermissions, code) ||
    permissionTreeIncludes(value.role, code)
  )
}

function permissionCodes(value) {
  return Array.isArray(value) ? value : [value]
}

export function getAuthorizedTeamScopeIds(user, requiredPermissions) {
  const codes = permissionCodes(requiredPermissions)
  return [
    ...new Set(
      (user?.scopes || [])
        .filter(
          (scope) =>
            String(scope?.scopeType || '').toLowerCase() === 'team' &&
            codes.some((code) =>
              (scope.permissions || []).some((permission) => permissionMatches(permission, code)),
            ),
        )
        .map((scope) => String(scope.scopeId || ''))
        .filter(Boolean),
    ),
  ]
}

export function canAccessTeamScope(user, requiredPermissions, teamId) {
  const codes = permissionCodes(requiredPermissions)
  if (codes.some((code) => hasGlobalPermissionCode(user, code))) return true
  return getAuthorizedTeamScopeIds(user, codes).includes(String(teamId || ''))
}

export function hasGlobalPermissionCode(user, permissionCode) {
  if (
    permissionTreeIncludes(
      [user?.permissions, user?.roles, user?.scopes, user?.accessAssignments, user?.assignments],
      'MANAGE_SYSTEM',
    )
  ) {
    return true
  }
  if (
    (user?.permissions || []).some((permission) => permissionMatches(permission, permissionCode))
  ) {
    return true
  }
  return (user?.scopes || []).some(
    (scope) =>
      String(scope?.scopeType || '').toLowerCase() === 'global' &&
      (scope.permissions || []).some((permission) => permissionMatches(permission, permissionCode)),
  )
}

export function resolveRotationTeamId(requestedTeamId, authorizedTeamIds, hasGlobalAccess) {
  const requested = String(requestedTeamId || '')
  if (hasGlobalAccess) return requested
  if (requested) return authorizedTeamIds.includes(requested) ? requested : ''
  return authorizedTeamIds.length === 1 ? authorizedTeamIds[0] : ''
}

export function resolveScheduleTab(requestedTab, { canScheduleRead, canCalendarRead }) {
  const scheduleTabs = ['assignments', 'shifts', 'locations', 'overrides']
  const calendarTabs = ['holidays', 'rotations']
  if (canScheduleRead && scheduleTabs.includes(requestedTab)) return requestedTab
  if (canCalendarRead && calendarTabs.includes(requestedTab)) return requestedTab
  if (canScheduleRead) return 'assignments'
  if (canCalendarRead) return 'holidays'
  return 'assignments'
}

export function resolveCalendarScopeQuery(user, requestedScopeKey, requiredPermissions) {
  const codes = permissionCodes(requiredPermissions)
  if (codes.some((code) => hasGlobalPermissionCode(user, code))) {
    return { enabled: true, global: true, params: {}, scopes: [], selectedScopeKey: 'global' }
  }

  const scopes = (user?.scopes || [])
    .filter((scope) => {
      const scopeType = String(scope?.scopeType || '').toLowerCase()
      return (
        ['department', 'team'].includes(scopeType) &&
        codes.some((code) =>
          (scope.permissions || []).some((permission) => permissionMatches(permission, code)),
        )
      )
    })
    .map((scope) => ({
      key: `${String(scope.scopeType).toLowerCase()}:${String(scope.scopeId)}`,
      scopeType: String(scope.scopeType).toLowerCase(),
      scopeId: String(scope.scopeId),
    }))
    .filter((scope) => scope.scopeId)
    .sort((left, right) => left.key.localeCompare(right.key))

  const selected = scopes.find((scope) => scope.key === requestedScopeKey) || scopes[0]
  if (!selected) {
    return { enabled: false, global: false, params: {}, scopes: [], selectedScopeKey: '' }
  }

  return {
    enabled: true,
    global: false,
    params:
      selected.scopeType === 'team'
        ? { teamId: selected.scopeId }
        : { departmentId: selected.scopeId },
    scopes,
    selectedScopeKey: selected.key,
  }
}
import { mapMatrixRow } from './monthMatrix.js'
