export const PERMISSION_MODULE_OPTIONS = [
  { value: 'ACCOUNTS', label: 'Accounts' },
  { value: 'EMPLOYEES', label: 'Employees' },
  { value: 'LEAVES', label: 'Leaves' },
  { value: 'ROLES', label: 'Roles' },
  { value: 'SYSTEM', label: 'System' },
  { value: 'LEGACY', label: 'Legacy' },
]

export const PERMISSION_ACTION_OPTIONS = [
  { value: 'READ', label: 'Read' },
  { value: 'WRITE', label: 'Write' },
  { value: 'APPROVE', label: 'Approve' },
  { value: 'MANAGE', label: 'Manage' },
]

export function buildPermissionCode(values = {}) {
  const code = String(values.code || '').trim()

  if (code) return code.toUpperCase()

  const action = String(values.action || '')
    .trim()
    .toUpperCase()
  const module = String(values.module || '')
    .trim()
    .toUpperCase()

  return action && module ? `${action}_${module}` : ''
}

export function filterPermissionItems(items = [], filters = {}) {
  const keyword = String(filters.search || '')
    .trim()
    .toLowerCase()

  return items.filter((permission) => {
    const moduleMatch = !filters.module || permission.module === filters.module
    const actionMatch = !filters.action || permission.action === filters.action
    const searchMatch =
      !keyword ||
      [permission.code, permission.name, permission.description].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(keyword),
      )

    return moduleMatch && actionMatch && searchMatch
  })
}
