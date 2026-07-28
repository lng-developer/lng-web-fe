export const SCOPE_TYPE_FILTER_OPTIONS = [
  { value: 'global', labelKey: 'rbac.scopes.types.global' },
  { value: 'department', labelKey: 'rbac.scopes.types.department' },
  { value: 'team', labelKey: 'rbac.scopes.types.team' },
]

export const SCOPE_CREATE_TYPE_OPTIONS = [
  { value: 'department', labelKey: 'rbac.scopes.types.department' },
  { value: 'team', labelKey: 'rbac.scopes.types.team' },
]

export const SCOPE_STATUS_OPTIONS = [
  { value: 'active', labelKey: 'rbac.scopes.status.active' },
  { value: 'inactive', labelKey: 'rbac.scopes.status.inactive' },
]

export const SCOPE_DEPARTMENT_FALLBACK = '—'

export const SCOPE_TYPE_UNKNOWN_LABEL = 'unknown'

const SCOPE_TYPE_META = {
  global: {
    labelKey: 'rbac.scopes.types.global',
    className: '!border-primary !bg-primary-light !text-primary',
  },
  department: {
    labelKey: 'rbac.scopes.types.department',
    className: '!border-secondary !bg-secondary-light !text-secondary',
  },
  team: {
    labelKey: 'rbac.scopes.types.team',
    className: '!border-success !bg-success-bg !text-success',
  },
  shop: {
    className: '!border-warning !bg-warning-bg !text-warning',
  },
}

const SCOPE_TYPE_FALLBACK_META = {
  className: '!border-border !bg-page !text-ink-muted',
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : value
}

function getResourceName(resource) {
  return resource?.name || resource?.displayName || resource?.code || ''
}

function getResourceId(resource) {
  return resource?.id || resource?._id || ''
}

function normalizeLookup(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function getTeamDepartmentIds(team = {}) {
  return [
    team.departmentId,
    team.department?.id,
    team.department?._id,
    team.parentDepartmentId,
    team.parentDepartment?.id,
    team.parentDepartment?._id,
  ]
    .filter(Boolean)
    .map(String)
}

function getTeamDepartmentNames(team = {}) {
  return [
    team.departmentName,
    team.department?.name,
    team.parentDepartment?.name,
    team.resource?.departmentName,
    team.resource?.department?.name,
  ]
    .filter(Boolean)
    .map(normalizeLookup)
}

export function getScopeTypeMeta(scopeType = '') {
  return SCOPE_TYPE_META[scopeType] || SCOPE_TYPE_FALLBACK_META
}

export function getScopeTypeLabel(scopeType) {
  return cleanString(scopeType) || SCOPE_TYPE_UNKNOWN_LABEL
}

export function getScopeResourceOptions(scopeType, departments = [], teams = []) {
  return scopeType === 'team' ? teams : departments
}

export function getScopeDisplayName(scope) {
  return scope?.scope?.name || scope?.resource?.name || scope?.name || scope?.scopeName || '—'
}

export function getScopeDepartmentName(scope) {
  if (!scope || scope.scopeType !== 'team') return SCOPE_DEPARTMENT_FALLBACK

  return (
    scope.parentDepartment?.name ||
    scope.resource?.departmentName ||
    scope.resource?.department?.name ||
    scope.scope?.parentDepartment?.name ||
    SCOPE_DEPARTMENT_FALLBACK
  )
}

export function canDeactivateScope(scope = {}) {
  return scope.status === 'active' && Number(scope.assignmentCount || 0) === 0
}

export function filterScopeItems(items = [], filters = {}) {
  const keyword = String(filters.search || '')
    .trim()
    .toLowerCase()

  return items.filter((scope) => {
    const typeMatch = !filters.scopeType || scope.scopeType === filters.scopeType
    const statusMatch = !filters.status || (scope.status || 'active') === filters.status
    const searchMatch =
      !keyword ||
      [
        scope.name,
        scope.scopeName,
        scope.scopeId,
        scope.resourceId,
        scope.resource?.code,
        scope.resource?.name,
        scope.resource?.departmentName,
        scope.resource?.department?.name,
        scope.parentDepartment?.name,
      ].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(keyword),
      )

    return typeMatch && statusMatch && searchMatch
  })
}

export function buildScopeFormPayload(values = {}, resources = []) {
  const selectedResource = resources.find((resource) => resource.id === values.scopeId)

  return {
    scopeType: values.scopeType,
    scopeId: values.scopeId,
    name: cleanString(values.name) || getResourceName(selectedResource),
  }
}

export function buildAddScopePayload(values = {}, departments = [], teams = []) {
  const selectedDepartment = departments.find(
    (department) => getResourceId(department) === values.scopeId,
  )

  if (!selectedDepartment) {
    return {
      payload: null,
      errorKey: 'rbac.scopes.addModal.errors.departmentRequired',
    }
  }

  const teamName = cleanString(values.name)

  if (!teamName) {
    return {
      payload: {
        scopeType: 'department',
        scopeId: getResourceId(selectedDepartment),
        name: getResourceName(selectedDepartment),
      },
      errorKey: null,
    }
  }

  const selectedDepartmentId = String(getResourceId(selectedDepartment))
  const selectedDepartmentName = normalizeLookup(getResourceName(selectedDepartment))
  const normalizedTeamName = normalizeLookup(teamName)
  const selectedTeam = teams.find((team) => {
    const teamLabel = normalizeLookup(getResourceName(team))
    const departmentMatches =
      getTeamDepartmentIds(team).includes(selectedDepartmentId) ||
      getTeamDepartmentNames(team).includes(selectedDepartmentName)

    return teamLabel === normalizedTeamName && departmentMatches
  })

  if (!selectedTeam) {
    return {
      payload: null,
      errorKey: 'rbac.scopes.addModal.errors.teamNotFound',
    }
  }

  return {
    payload: {
      scopeType: 'team',
      scopeId: getResourceId(selectedTeam),
      name: teamName,
    },
    errorKey: null,
  }
}
