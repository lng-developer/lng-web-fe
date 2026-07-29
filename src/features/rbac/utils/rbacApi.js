import { buildPermissionCode } from './permissionsDisplay.js'

const MAX_LIMIT = 100
const SCOPE_ASSIGNMENT_VALUE_SEPARATOR = '::'

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : value
}

function optionalString(value) {
  const cleaned = cleanString(value)
  return cleaned ? cleaned : null
}

function cleanArray(values = []) {
  return Array.isArray(values) ? values.filter(Boolean) : []
}

function hasOwnValue(values, key) {
  return Object.hasOwn(values || {}, key) && values[key] !== undefined
}

function normalizePermissionOverride(values = {}) {
  if (!hasOwnValue(values, 'overridePermissionIds')) return {}

  return {
    overridePermissionIds:
      values.overridePermissionIds === null ? null : cleanArray(values.overridePermissionIds),
  }
}

export function buildScopeAssignmentValue(scope = {}) {
  return scope.scopeType && scope.scopeId
    ? `${scope.scopeType}${SCOPE_ASSIGNMENT_VALUE_SEPARATOR}${scope.scopeId}`
    : ''
}

export function parseScopeAssignmentValue(value = '') {
  const [scopeType = '', scopeId = ''] = String(value).split(SCOPE_ASSIGNMENT_VALUE_SEPARATOR)

  return { scopeType, scopeId }
}

export function buildCleanQuery(query = {}) {
  return Object.entries(query).reduce((params, [key, rawValue]) => {
    const value = cleanString(rawValue)

    if (value === '' || value === null || value === undefined) {
      return params
    }

    if (key === 'limit') {
      return { ...params, limit: Math.min(Number(value) || MAX_LIMIT, MAX_LIMIT) }
    }

    if (key === 'page') {
      return { ...params, page: Math.max(Number(value) || 1, 1) }
    }

    return { ...params, [key]: value }
  }, {})
}

export function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

export function buildAccountCreatePayload(values) {
  const scopeId = optionalString(values.scopeId)

  return {
    email: cleanString(values.email)?.toLowerCase(),
    password: values.password,
    assignments: [
      {
        roleId: values.roleId,
        scopeType: values.scopeType || 'global',
        scopeId,
        customPermissionIds: cleanArray(values.customPermissionIds),
      },
    ],
  }
}

export function buildAccountAccessPayload(values) {
  return {
    roleIds: cleanArray(values.roleIds),
    customPermissionIds: cleanArray(values.customPermissionIds),
  }
}

export function hasUnsavedAccessChanges(globalDraft, assignmentForm = {}) {
  return Boolean(globalDraft || assignmentForm.roleId || assignmentForm.scopeAssignmentValue)
}

export function buildRolePayload(values) {
  return {
    code: cleanString(values.code)?.toUpperCase(),
    name: cleanString(values.name),
    description: optionalString(values.description),
    permissionIds: cleanArray(values.permissionIds),
  }
}

export function buildPermissionPayload(values) {
  return {
    code: buildPermissionCode(values),
    name: optionalString(values.name),
    description: optionalString(values.description),
  }
}

export function buildScopePayload(values) {
  return {
    scopeType: values.scopeType,
    scopeId: values.scopeId,
    name: cleanString(values.name),
  }
}

export function buildAccessAssignmentPayload(values) {
  return {
    accountId: values.accountId,
    roleId: values.roleId,
    scopeType: values.scopeType || 'global',
    scopeId: optionalString(values.scopeId),
    customPermissionIds: cleanArray(values.customPermissionIds),
    ...normalizePermissionOverride(values),
  }
}

export function buildAccessAssignmentUpdatePayload(values = {}) {
  return {
    ...(hasOwnValue(values, 'roleId') ? { roleId: values.roleId } : {}),
    ...(hasOwnValue(values, 'scopeType') ? { scopeType: values.scopeType } : {}),
    ...(hasOwnValue(values, 'scopeId') ? { scopeId: optionalString(values.scopeId) } : {}),
    ...(hasOwnValue(values, 'customPermissionIds')
      ? { customPermissionIds: cleanArray(values.customPermissionIds) }
      : {}),
    ...normalizePermissionOverride(values),
    ...(hasOwnValue(values, 'status') ? { status: values.status } : {}),
  }
}

export function buildAccessAssignmentResetPayload(values = {}) {
  return buildAccessAssignmentUpdatePayload({
    roleId: values.roleId,
    scopeType: values.scopeType,
    scopeId: values.scopeId,
    overridePermissionIds: null,
  })
}

export function buildScopedRolePermissionPayload(values) {
  return {
    scopeType: values.scopeType,
    scopeId: values.scopeId,
    roleId: values.roleId,
    permissionIds: cleanArray(values.permissionIds),
  }
}
