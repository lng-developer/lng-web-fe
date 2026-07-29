import { useMemo, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SearchIcon from '@mui/icons-material/Search'
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'

import { filterPermissionItems } from '../utils/permissionsDisplay'
import {
  getDefaultPermissionMeta,
  getRolePermissionIds,
  groupPermissionsByModule,
} from '../utils/rolesDisplay'
import { PermissionCodeBadge, UserRoleChip } from './shared'

export default function RolesPoliciesWorkspace({
  roles,
  rolesQuery,
  permissions,
  permissionsQuery,
  roleSearch,
  permissionFilters,
  canWrite,
  deleteRolePending,
  onRoleSearch,
  onPermissionFiltersChange,
  onCreateRole,
  onEditRole,
  onDeleteRole,
  onCreatePermission,
  onEditPermission,
  t,
}) {
  const [mode, setMode] = useState('roles')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [selectedPermissionId, setSelectedPermissionId] = useState('')
  const selectedRole = roles.find((role) => role.id === selectedRoleId) || roles[0]
  const filteredPermissions = useMemo(
    () => filterPermissionItems(permissions, permissionFilters),
    [permissionFilters, permissions],
  )
  const selectedPermission =
    filteredPermissions.find((permission) => permission.id === selectedPermissionId) ||
    filteredPermissions[0]
  const modules = useMemo(
    () => [...new Set(permissions.map((permission) => permission.module).filter(Boolean))].sort(),
    [permissions],
  )
  const actions = useMemo(
    () => [...new Set(permissions.map((permission) => permission.action).filter(Boolean))].sort(),
    [permissions],
  )
  const rolePermissions = selectedRole
    ? permissions.filter((permission) => getRolePermissionIds(selectedRole).includes(permission.id))
    : []
  const permissionGroups = groupPermissionsByModule(rolePermissions)
  const permissionMeta = getDefaultPermissionMeta(selectedRole, permissions.length)

  const listError = mode === 'roles' ? rolesQuery.isError : permissionsQuery.isError
  const listPending = mode === 'roles' ? rolesQuery.isPending : permissionsQuery.isPending
  const retry = mode === 'roles' ? rolesQuery.refetch : permissionsQuery.refetch

  return (
    <Paper elevation={0} className="overflow-hidden rounded-xl border border-border bg-surface">
      <Box className="flex flex-col border-b border-border px-4 pt-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={mode} onChange={(_, value) => setMode(value)}>
          <Tab value="roles" label={t('rbac.policies.modes.roles')} className="!normal-case" />
          <Tab
            value="permissions"
            label={t('rbac.policies.modes.permissions')}
            className="!normal-case"
          />
        </Tabs>
        {canWrite && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            className="!mb-3 md:!mb-0"
            onClick={mode === 'roles' ? onCreateRole : onCreatePermission}
          >
            {t(
              mode === 'roles'
                ? 'rbac.roles.actions.addRole'
                : 'rbac.permissions.actions.addPermission',
            )}
          </Button>
        )}
      </Box>

      <Box className="grid min-h-[620px] grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)]">
        <Box className="border-b border-border md:border-b-0 md:border-r">
          <Box className="border-b border-border p-4">
            <TextField
              fullWidth
              size="small"
              value={mode === 'roles' ? roleSearch : permissionFilters.search}
              placeholder={t(
                mode === 'roles'
                  ? 'rbac.roles.searchPlaceholder'
                  : 'rbac.permissions.searchPlaceholder',
              )}
              onChange={(event) =>
                mode === 'roles'
                  ? onRoleSearch(event.target.value)
                  : onPermissionFiltersChange({
                      ...permissionFilters,
                      search: event.target.value,
                    })
              }
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            {mode === 'permissions' && (
              <Box className="mt-2 grid grid-cols-2 gap-2">
                <FormControl fullWidth size="small">
                  <Select
                    displayEmpty
                    value={permissionFilters.module}
                    onChange={(event) =>
                      onPermissionFiltersChange({
                        ...permissionFilters,
                        module: event.target.value,
                      })
                    }
                  >
                    <MenuItem value="">{t('rbac.permissions.filter.allModules')}</MenuItem>
                    {modules.map((module) => (
                      <MenuItem key={module} value={module}>
                        {module}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <Select
                    displayEmpty
                    value={permissionFilters.action}
                    onChange={(event) =>
                      onPermissionFiltersChange({
                        ...permissionFilters,
                        action: event.target.value,
                      })
                    }
                  >
                    <MenuItem value="">{t('rbac.permissions.filter.allActions')}</MenuItem>
                    {actions.map((action) => (
                      <MenuItem key={action} value={action}>
                        {action}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>

          <Box className="max-h-[520px] overflow-y-auto">
            {listError ? (
              <Box className="p-6 text-center">
                <Typography variant="body2" className="text-ink-muted">
                  {(mode === 'roles' ? rolesQuery.error : permissionsQuery.error)?.message ||
                    t('rbac.common.loadError')}
                </Typography>
                <Button size="small" className="!mt-2" onClick={() => retry()}>
                  {t('common.retry')}
                </Button>
              </Box>
            ) : listPending ? (
              <Typography variant="body2" className="p-6 text-center text-ink-muted">
                {t('rbac.common.loading')}
              </Typography>
            ) : mode === 'roles' ? (
              roles.map((role) => {
                const selected = role.id === selectedRole?.id
                const meta = getDefaultPermissionMeta(role, permissions.length)

                return (
                  <Box
                    component="button"
                    type="button"
                    key={role.id}
                    aria-current={selected ? 'true' : undefined}
                    className={`min-h-16 w-full border-b border-border px-4 py-3 text-left hover:bg-page focus-visible:outline-2 focus-visible:outline-primary ${
                      selected ? 'bg-primary-light' : 'bg-surface'
                    }`}
                    onClick={() => setSelectedRoleId(role.id)}
                  >
                    <Stack direction="row" className="items-center justify-between gap-3">
                      <Box className="min-w-0">
                        <Typography variant="body2" className="truncate font-semibold text-ink">
                          {role.name || role.code}
                        </Typography>
                        <Typography variant="caption" className="font-mono text-ink-muted">
                          {role.code}
                        </Typography>
                      </Box>
                      <Chip size="small" label={t(meta.key, { count: meta.count })} />
                    </Stack>
                  </Box>
                )
              })
            ) : (
              filteredPermissions.map((permission) => {
                const selected = permission.id === selectedPermission?.id

                return (
                  <Box
                    component="button"
                    type="button"
                    key={permission.id}
                    aria-current={selected ? 'true' : undefined}
                    className={`min-h-16 w-full border-b border-border px-4 py-3 text-left hover:bg-page focus-visible:outline-2 focus-visible:outline-primary ${
                      selected ? 'bg-primary-light' : 'bg-surface'
                    }`}
                    onClick={() => setSelectedPermissionId(permission.id)}
                  >
                    <Typography variant="body2" className="truncate font-semibold text-ink">
                      {permission.name || permission.code}
                    </Typography>
                    <Typography variant="caption" className="font-mono text-ink-muted">
                      {permission.code}
                    </Typography>
                  </Box>
                )
              })
            )}
          </Box>
        </Box>

        <Box className="min-w-0 p-5 md:p-6">
          {mode === 'roles' && selectedRole ? (
            <>
              <Stack direction="row" className="flex-wrap items-start justify-between gap-4">
                <Box>
                  <UserRoleChip role={selectedRole.code || selectedRole.name} />
                  <Typography variant="h5" className="mt-3 font-semibold text-ink">
                    {selectedRole.name || selectedRole.code}
                  </Typography>
                  <Typography variant="body2" className="mt-2 max-w-2xl text-ink-muted">
                    {selectedRole.description || t('rbac.policies.noDescription')}
                  </Typography>
                </Box>
                {canWrite && (
                  <Stack direction="row" className="gap-2">
                    <Button
                      variant="outlined"
                      startIcon={<EditOutlinedIcon />}
                      onClick={() => onEditRole(selectedRole)}
                    >
                      {t('common.edit')}
                    </Button>
                    <Tooltip
                      title={
                        selectedRole.deletable === false
                          ? t('rbac.roles.actions.inUse', { count: selectedRole.userCount ?? 0 })
                          : ''
                      }
                    >
                      <span>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteOutlineIcon />}
                          disabled={selectedRole.deletable === false || deleteRolePending}
                          onClick={() => onDeleteRole(selectedRole)}
                        >
                          {t('common.delete')}
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                )}
              </Stack>

              <Box className="mt-6 grid grid-cols-2 gap-4 border-y border-border py-4 sm:grid-cols-3">
                {[
                  [t('rbac.roles.columns.userCount'), selectedRole.userCount ?? 0],
                  [t('rbac.policies.permissionCount'), permissionMeta.count],
                  [t('rbac.policies.roleCode'), selectedRole.code],
                ].map(([label, value]) => (
                  <Box key={label}>
                    <Typography variant="caption" className="font-semibold text-ink-muted">
                      {label}
                    </Typography>
                    <Typography variant="body1" className="mt-1 font-semibold text-ink">
                      {value ?? '-'}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Typography variant="subtitle1" className="mt-6 font-semibold text-ink">
                {t('rbac.policies.assignedPermissions')}
              </Typography>
              {permissionGroups.length ? (
                <Stack className="mt-4 gap-5">
                  {permissionGroups.map((group) => (
                    <Box key={group.module}>
                      <Typography
                        variant="caption"
                        className="mb-2 block font-semibold text-ink-muted"
                      >
                        {group.module}
                      </Typography>
                      <Box className="flex flex-wrap gap-2">
                        {group.permissions.map((permission) => (
                          <PermissionCodeBadge key={permission.id} code={permission.code} />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" className="mt-3 text-ink-muted">
                  {t('rbac.policies.noPermissions')}
                </Typography>
              )}
            </>
          ) : mode === 'permissions' && selectedPermission ? (
            <>
              <Stack direction="row" className="flex-wrap items-start justify-between gap-4">
                <Box>
                  <PermissionCodeBadge code={selectedPermission.code} />
                  <Typography variant="h5" className="mt-3 font-semibold text-ink">
                    {selectedPermission.name || selectedPermission.code}
                  </Typography>
                  <Typography variant="body2" className="mt-2 max-w-2xl text-ink-muted">
                    {selectedPermission.description || t('rbac.policies.noDescription')}
                  </Typography>
                </Box>
                {canWrite && (
                  <Button
                    variant="outlined"
                    startIcon={<EditOutlinedIcon />}
                    onClick={() => onEditPermission(selectedPermission)}
                  >
                    {t('common.edit')}
                  </Button>
                )}
              </Stack>
              <Box className="mt-6 grid grid-cols-2 gap-4 border-y border-border py-4 sm:grid-cols-3">
                {[
                  [t('rbac.permissions.editModal.metadata.module'), selectedPermission.module],
                  [t('rbac.permissions.editModal.metadata.action'), selectedPermission.action],
                  [t('rbac.permissions.columns.usage'), selectedPermission.usageCount ?? 0],
                ].map(([label, value]) => (
                  <Box key={label}>
                    <Typography variant="caption" className="font-semibold text-ink-muted">
                      {label}
                    </Typography>
                    <Typography variant="body1" className="mt-1 font-semibold text-ink">
                      {value ?? '-'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </>
          ) : (
            <Box className="flex min-h-[420px] items-center justify-center text-center">
              <Typography variant="body2" className="text-ink-muted">
                {t('rbac.common.empty')}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  )
}
