function relationName(value) {
  if (typeof value === 'string') return value
  return value?.fullName ?? value?.name ?? null
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
  return mapEmployeeRelatedRow(row)
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
