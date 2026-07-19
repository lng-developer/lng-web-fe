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
