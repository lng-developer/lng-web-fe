import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined'
import {
  Avatar,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'

import { SNACKBAR_VARIANTS } from '@/constants/app'
import { useAuthStore } from '@/store/useAuthStore'

import {
  useCreateAccessAssignmentMutation,
  useCreateAccountMutation,
  useCreatePermissionMutation,
  useCreateRoleMutation,
  useCreateScopeMutation,
  useDeactivateAccessAssignmentMutation,
  useDeactivateScopeMutation,
  useDeletePermissionMutation,
  useDeleteRoleMutation,
  useResetAccountPasswordMutation,
  useRevokeAccountSessionsMutation,
  useSetScopedRolePermissionsMutation,
  useUpdateAccessAssignmentMutation,
  useUpdateAccountAccessMutation,
  useUpdateAccountStatusMutation,
  useUpdatePermissionMutation,
  useUpdateRoleMutation,
  useUpdateScopeMutation,
} from '../api/rbac.mutations'
import {
  useAccountsQuery,
  useDepartmentsQuery,
  usePermissionsQuery,
  useRolesQuery,
  useScopedRolePermissionsQuery,
  useScopesQuery,
  useTeamsQuery,
} from '../api/rbac.queries'
import {
  AccountFormDialog,
  AccountInfoDialog,
  EditAccessDialog,
  EmptyRow,
  GrantPermissionModal,
  GrantScopedPermissionModal,
  PermissionCodeBadge,
  PermissionDialog,
  RoleDialog,
  RoleOverrideSection,
  ScopeDialog,
  ScopeTypeBadge,
  UserHeaderCell,
  UserRoleChip,
  UserStatusChip,
} from '../components'
import {
  ACCOUNT_STATUSES,
  getAccountEmail,
  getAccountId,
  getAccountName,
  getDepartmentName,
  getItems,
  getPagination,
  getPrimaryRole,
  getScopeParent,
  TAB_KEYS,
  TABS,
} from '../components/shared'
import { filterPermissionItems } from '../utils/permissionsDisplay'
import { getRbacCapabilities } from '../utils/rbacAccess'
import { getDefaultPermissionMeta } from '../utils/rolesDisplay'
import {
  buildScopedOverrideSections,
  buildScopedRulePayload,
  filterOverrideRoles,
} from '../utils/scopedOverridesDisplay'
import {
  buildAddScopePayload,
  canDeactivateScope,
  filterScopeItems,
  getScopeDisplayName,
  SCOPE_DEPARTMENT_FALLBACK,
  SCOPE_STATUS_OPTIONS,
  SCOPE_TYPE_FILTER_OPTIONS,
} from '../utils/scopesDisplay'
import { formatLastLoginLabel, getAvatarMeta, getRoleMeta } from '../utils/usersDisplay'

export default function UsersRolesPage() {
  const { i18n, t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const currentUser = useAuthStore((state) => state.currentUser)
  const { canWrite } = getRbacCapabilities(currentUser)
  const [activeTab, setActiveTab] = useState(TAB_KEYS.USERS)
  const [userFilters, setUserFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    roleId: '',
    departmentId: '',
    teamId: '',
  })
  const [roleSearch, setRoleSearch] = useState('')
  const [permissionFilters, setPermissionFilters] = useState({
    search: '',
    module: '',
    action: '',
  })
  const [scopeFilters, setScopeFilters] = useState({
    search: '',
    scopeType: '',
    status: '',
  })
  const [overrideRoleFilter, setOverrideRoleFilter] = useState('')
  const [dialog, setDialog] = useState({ type: null, payload: null })

  const accountsQuery = useAccountsQuery(userFilters)
  const rolesQuery = useRolesQuery({ search: roleSearch })
  const permissionsQuery = usePermissionsQuery({ search: permissionFilters.search })
  const rolePermissionsQuery = usePermissionsQuery({ limit: 100 })
  const scopesQuery = useScopesQuery(scopeFilters)
  const scopedRulesQuery = useScopedRolePermissionsQuery()
  const departmentsQuery = useDepartmentsQuery()
  const teamsQuery = useTeamsQuery()

  const accounts = getItems(accountsQuery.data)
  const roles = getItems(rolesQuery.data)
  const permissions = getItems(permissionsQuery.data)
  const rolePermissions = getItems(rolePermissionsQuery.data)
  const scopes = getItems(scopesQuery.data)
  const scopedRules = getItems(scopedRulesQuery.data)
  const departments = getItems(departmentsQuery.data)
  const teams = getItems(teamsQuery.data)
  const pagination = getPagination(accountsQuery.data)
  const tabTotals = {
    [TAB_KEYS.USERS]: pagination.total,
    [TAB_KEYS.ROLES]: rolesQuery.data?.total ?? roles.length,
    [TAB_KEYS.PERMISSIONS]: permissionsQuery.data?.total ?? permissions.length,
    [TAB_KEYS.SCOPES]: scopesQuery.data?.total ?? scopes.length,
    [TAB_KEYS.OVERRIDES]: scopedRulesQuery.data?.total ?? scopedRules.length,
  }
  const primaryActions = {
    [TAB_KEYS.USERS]: {
      label: t('rbac.users.actions.addUser'),
      open: () => setDialog({ type: 'add-account', payload: null }),
    },
    [TAB_KEYS.ROLES]: {
      label: t('rbac.roles.actions.addRole'),
      open: () => setDialog({ type: 'role', payload: null }),
    },
    [TAB_KEYS.PERMISSIONS]: {
      label: t('rbac.permissions.actions.addPermission'),
      open: () => setDialog({ type: 'permission', payload: null }),
    },
    [TAB_KEYS.SCOPES]: {
      label: t('rbac.scopes.actions.addScope'),
      open: () => setDialog({ type: 'scope', payload: null }),
    },
  }
  const primaryAction = primaryActions[activeTab]
  const hasUserFilters = Boolean(
    userFilters.search ||
    userFilters.status ||
    userFilters.roleId ||
    userFilters.departmentId ||
    userFilters.teamId,
  )
  const hasPermissionFilters = Boolean(
    permissionFilters.search || permissionFilters.module || permissionFilters.action,
  )
  const hasScopeFilters = Boolean(
    scopeFilters.search || scopeFilters.scopeType || scopeFilters.status,
  )
  const availableTeams = useMemo(
    () =>
      userFilters.departmentId
        ? teams.filter((team) => String(team.departmentId) === String(userFilters.departmentId))
        : teams,
    [teams, userFilters.departmentId],
  )

  const filteredPermissions = useMemo(
    () => filterPermissionItems(permissions, permissionFilters),
    [permissions, permissionFilters],
  )
  const permissionModules = useMemo(
    () => [...new Set(permissions.map((permission) => permission.module).filter(Boolean))].sort(),
    [permissions],
  )
  const permissionActions = useMemo(
    () => [...new Set(permissions.map((permission) => permission.action).filter(Boolean))].sort(),
    [permissions],
  )
  const filteredScopes = useMemo(
    () => filterScopeItems(scopes, scopeFilters),
    [scopes, scopeFilters],
  )
  const overrideSections = useMemo(
    () =>
      buildScopedOverrideSections({
        roles,
        permissions,
        rules: scopedRules,
      }),
    [roles, permissions, scopedRules],
  )
  const filteredOverrideSections = useMemo(() => {
    const filteredRoles = filterOverrideRoles(
      overrideSections.map((section) => section.role),
      overrideRoleFilter,
    )
    const filteredRoleIds = new Set(filteredRoles.map((role) => role.id))

    return overrideSections.filter((section) => filteredRoleIds.has(section.roleId))
  }, [overrideSections, overrideRoleFilter])

  const createAccountMutation = useCreateAccountMutation()
  const updateAccountStatusMutation = useUpdateAccountStatusMutation()
  const resetAccountPasswordMutation = useResetAccountPasswordMutation()
  const revokeAccountSessionsMutation = useRevokeAccountSessionsMutation()
  const createAccessAssignmentMutation = useCreateAccessAssignmentMutation()
  const updateAccessAssignmentMutation = useUpdateAccessAssignmentMutation()
  const updateAccountAccessMutation = useUpdateAccountAccessMutation()
  const deactivateAccessAssignmentMutation = useDeactivateAccessAssignmentMutation()
  const createRoleMutation = useCreateRoleMutation()
  const updateRoleMutation = useUpdateRoleMutation()
  const deleteRoleMutation = useDeleteRoleMutation()
  const createPermissionMutation = useCreatePermissionMutation()
  const updatePermissionMutation = useUpdatePermissionMutation()
  const deletePermissionMutation = useDeletePermissionMutation()
  const createScopeMutation = useCreateScopeMutation()
  const updateScopeMutation = useUpdateScopeMutation()
  const deactivateScopeMutation = useDeactivateScopeMutation()
  const setScopedRolePermissionsMutation = useSetScopedRolePermissionsMutation()

  const notifySuccess = (message) => {
    enqueueSnackbar(message, { variant: SNACKBAR_VARIANTS.SUCCESS })
  }

  const notifyError = (error) => {
    enqueueSnackbar(error?.message || t('rbac.common.requestFailed'), {
      variant: SNACKBAR_VARIANTS.ERROR,
    })
  }

  const closeDialog = () => setDialog({ type: null, payload: null })

  const runMutation = (mutation, payload, successMessage, onSuccess) => {
    if (!canWrite) {
      notifyError({ message: t('rbac.common.readOnly') })
      return
    }

    mutation.mutate(payload, {
      onSuccess: () => {
        notifySuccess(successMessage)
        onSuccess?.()
      },
      onError: notifyError,
    })
  }

  const renderUsers = () => (
    <Stack className="gap-0">
      <Box className="flex flex-wrap items-center gap-3 py-4">
        <TextField
          size="small"
          placeholder={t('rbac.users.searchPlaceholder')}
          value={userFilters.search}
          onChange={(event) =>
            setUserFilters({ ...userFilters, search: event.target.value, page: 1 })
          }
          className="w-[300px]"
        />
        <FormControl size="small" className="w-[180px]">
          <Select
            displayEmpty
            value={userFilters.status}
            onChange={(event) =>
              setUserFilters({ ...userFilters, status: event.target.value, page: 1 })
            }
          >
            {ACCOUNT_STATUSES.map((item) => (
              <MenuItem key={item.value || 'all'} value={item.value}>
                {t(item.labelKey)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" className="w-[160px]">
          <Select
            displayEmpty
            value={userFilters.roleId}
            onChange={(event) =>
              setUserFilters({ ...userFilters, roleId: event.target.value, page: 1 })
            }
          >
            <MenuItem value="">{t('rbac.users.filter.allRoles')}</MenuItem>
            {roles.map((role) => (
              <MenuItem key={role.id} value={role.id}>
                {getRoleMeta(role.code || role.name).label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" className="w-[180px]">
          <Select
            displayEmpty
            value={userFilters.departmentId}
            onChange={(event) =>
              setUserFilters({
                ...userFilters,
                departmentId: event.target.value,
                teamId: '',
                page: 1,
              })
            }
          >
            <MenuItem value="">{t('rbac.users.filter.allDepartments')}</MenuItem>
            {departments.map((department) => (
              <MenuItem key={department.id} value={department.id}>
                {department.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" className="w-[180px]">
          <Select
            displayEmpty
            value={userFilters.teamId}
            onChange={(event) =>
              setUserFilters({ ...userFilters, teamId: event.target.value, page: 1 })
            }
          >
            <MenuItem value="">{t('rbac.users.filter.allTeams')}</MenuItem>
            {availableTeams.map((team) => (
              <MenuItem key={team.id} value={team.id}>
                {team.name || team.code}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Paper elevation={0} className="overflow-hidden rounded-lg border border-border">
        <TableContainer>
          <Table>
            <TableHead className="bg-page">
              <TableRow className="h-11">
                <UserHeaderCell>{t('rbac.users.columns.user')}</UserHeaderCell>
                <UserHeaderCell width={120}>{t('rbac.users.columns.status')}</UserHeaderCell>
                <UserHeaderCell width={180}>{t('rbac.users.columns.organization')}</UserHeaderCell>
                <UserHeaderCell width={190}>{t('rbac.users.columns.globalAccess')}</UserHeaderCell>
                <UserHeaderCell width={140}>{t('rbac.users.columns.scopedAccess')}</UserHeaderCell>
                <UserHeaderCell>{t('rbac.users.columns.lastLogin')}</UserHeaderCell>
                <UserHeaderCell align="right">{t('rbac.users.columns.actions')}</UserHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.length === 0 ? (
                <EmptyRow
                  colSpan={7}
                  loading={accountsQuery.isPending}
                  message={
                    accountsQuery.isError
                      ? accountsQuery.error?.message || t('rbac.common.loadError')
                      : t(hasUserFilters ? 'rbac.common.noResults' : 'rbac.common.empty')
                  }
                  onRetry={accountsQuery.isError ? () => accountsQuery.refetch() : undefined}
                  t={t}
                />
              ) : (
                accounts.map((account, index) => {
                  const accountId = getAccountId(account)
                  const name = getAccountName(account)
                  const email = getAccountEmail(account)
                  const primaryRole = getPrimaryRole(account)
                  const roleMeta = getRoleMeta(primaryRole)
                  const globalRoles =
                    account.roles?.length > 0
                      ? account.roles
                      : (account.roleAssignments ?? [])
                          .filter((assignment) => assignment.scopeType === 'global')
                          .map((assignment) => assignment.roleCode)
                          .filter(Boolean)
                  const scopedAssignmentCount = (account.roleAssignments ?? []).filter(
                    (assignment) => assignment.scopeType !== 'global',
                  ).length
                  const avatarMeta = getAvatarMeta(
                    name || email,
                    index,
                    roleMeta.key === 'anonymous',
                  )

                  return (
                    <TableRow
                      key={accountId}
                      hover
                      className="h-14 border-b border-border last:border-b-0 hover:bg-page"
                    >
                      <TableCell>
                        <Stack direction="row" className="min-w-[260px] items-center gap-2">
                          <Avatar
                            className={`!h-9 !w-9 !text-sm !font-semibold ${avatarMeta.className}`}
                          >
                            {avatarMeta.initials}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" className="font-medium text-ink">
                              {name}
                            </Typography>
                            <Typography variant="caption" className="text-ink-muted">
                              {email}
                            </Typography>
                            {account.memberType && (
                              <Typography variant="caption" className="block text-ink-muted">
                                {account.memberType}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <UserStatusChip status={account.status} t={t} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="font-medium text-ink-secondary">
                          {getDepartmentName(account)}
                        </Typography>
                        <Typography variant="caption" className="text-ink-muted">
                          {account.team?.name || account.team?.code || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box className="flex min-w-[170px] flex-wrap gap-1.5">
                          {globalRoles.length ? (
                            globalRoles.map((role) => <UserRoleChip key={role} role={role} />)
                          ) : (
                            <Typography variant="body2" className="text-ink-muted">
                              —
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="font-semibold text-ink-secondary">
                          {t('rbac.users.scopedAssignmentCount', { count: scopedAssignmentCount })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          className={account.lastLoginAt ? 'text-ink-secondary' : 'text-ink-muted'}
                        >
                          {formatLastLoginLabel(account.lastLoginAt, new Date(), i18n.language)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" className="items-center justify-end gap-2">
                          <Tooltip title={t('rbac.users.actions.viewInfo')} arrow>
                            <IconButton
                              size="small"
                              color="primary"
                              aria-label={t('rbac.users.actions.viewInfo')}
                              onClick={() => setDialog({ type: 'view-account', payload: account })}
                            >
                              <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {canWrite && (
                            <Tooltip title={t('rbac.users.actions.editAccess')} arrow>
                              <IconButton
                                size="small"
                                color="primary"
                                aria-label={t('rbac.users.actions.editAccess')}
                                onClick={() =>
                                  setDialog({ type: 'edit-access', payload: accountId })
                                }
                              >
                                <ManageAccountsOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Stack direction="row" className="items-center justify-between p-4">
          <Typography variant="body2" color="text.secondary">
            {t('rbac.users.pagination.total', { count: pagination.total })}
          </Typography>
          <Stack direction="row" className="gap-2">
            <Button
              size="small"
              disabled={pagination.page <= 1}
              onClick={() => setUserFilters({ ...userFilters, page: pagination.page - 1 })}
            >
              {t('common.previous')}
            </Button>
            <Button
              size="small"
              disabled={pagination.page * pagination.limit >= pagination.total}
              onClick={() => setUserFilters({ ...userFilters, page: pagination.page + 1 })}
            >
              {t('common.next')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )

  const renderRoles = () => (
    <Box className="flex flex-col gap-0">
      <Box className="mb-4 flex items-center gap-4">
        <TextField
          size="small"
          className="flex-1"
          placeholder={t('rbac.roles.searchPlaceholder')}
          value={roleSearch}
          onChange={(event) => setRoleSearch(event.target.value)}
        />
      </Box>
      <Paper elevation={0} className="overflow-hidden rounded-lg border border-border">
        <TableContainer>
          <Table>
            <TableHead className="bg-page">
              <TableRow className="h-11">
                <UserHeaderCell width={200}>{t('rbac.roles.columns.role')}</UserHeaderCell>
                <UserHeaderCell>{t('rbac.roles.columns.description')}</UserHeaderCell>
                <UserHeaderCell>{t('rbac.roles.columns.userCount')}</UserHeaderCell>
                <UserHeaderCell>{t('rbac.roles.columns.defaultPermissions')}</UserHeaderCell>
                <UserHeaderCell align="right" width={150}>
                  {t('rbac.roles.columns.actions')}
                </UserHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.length === 0 ? (
                <EmptyRow
                  colSpan={5}
                  loading={rolesQuery.isPending}
                  message={
                    rolesQuery.isError
                      ? rolesQuery.error?.message || t('rbac.common.loadError')
                      : t(roleSearch ? 'rbac.common.noResults' : 'rbac.common.empty')
                  }
                  onRetry={rolesQuery.isError ? () => rolesQuery.refetch() : undefined}
                  t={t}
                />
              ) : (
                roles.map((role) => {
                  const permissionMeta = getDefaultPermissionMeta(role, rolePermissions.length)

                  return (
                    <TableRow
                      key={role.id}
                      hover
                      className="h-14 border-b border-border last:border-b-0 hover:bg-page"
                    >
                      <TableCell>
                        <UserRoleChip role={role.code} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="text-ink-secondary">
                          {role.description || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="text-ink-secondary">
                          {t('rbac.roles.userCount', { count: role.userCount ?? 0 })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="text-ink-secondary">
                          {t(permissionMeta.key, { count: permissionMeta.count })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {canWrite && (
                          <Box className="flex items-center justify-end gap-3">
                            <Button
                              variant="text"
                              size="small"
                              color="primary"
                              className="!min-w-0 !px-0 !py-0 !text-sm !font-semibold"
                              onClick={() => setDialog({ type: 'role', payload: role })}
                            >
                              {t('rbac.roles.actions.edit')}
                            </Button>
                            <Tooltip
                              title={
                                role.deletable === false
                                  ? t('rbac.roles.actions.inUse', { count: role.userCount ?? 0 })
                                  : ''
                              }
                              arrow
                            >
                              <span>
                                <Button
                                  variant="text"
                                  size="small"
                                  disabled={
                                    role.deletable === false || deleteRoleMutation.isPending
                                  }
                                  className="!min-w-0 !px-0 !py-0 !text-sm !font-semibold !text-danger"
                                  onClick={() => {
                                    if (window.confirm(t('rbac.roles.actions.deleteConfirm'))) {
                                      runMutation(
                                        deleteRoleMutation,
                                        role.id,
                                        t('rbac.roles.actions.deleteSuccess'),
                                      )
                                    }
                                  }}
                                >
                                  {t('common.delete')}
                                </Button>
                              </span>
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )

  const renderPermissions = () => (
    <Stack className="gap-4">
      <Box className="mb-4 flex items-center gap-3">
        <TextField
          size="small"
          placeholder={t('rbac.permissions.searchPlaceholder')}
          value={permissionFilters.search}
          onChange={(event) =>
            setPermissionFilters({ ...permissionFilters, search: event.target.value })
          }
          className="w-[280px]"
        />
        <FormControl size="small" className="w-[180px]">
          <Select
            displayEmpty
            value={permissionFilters.module}
            onChange={(event) =>
              setPermissionFilters({ ...permissionFilters, module: event.target.value })
            }
          >
            <MenuItem value="">{t('rbac.permissions.filter.allModules')}</MenuItem>
            {permissionModules.map((module) => (
              <MenuItem key={module} value={module}>
                {module}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" className="w-[160px]">
          <Select
            displayEmpty
            value={permissionFilters.action}
            onChange={(event) =>
              setPermissionFilters({ ...permissionFilters, action: event.target.value })
            }
          >
            <MenuItem value="">{t('rbac.permissions.filter.allActions')}</MenuItem>
            {permissionActions.map((action) => (
              <MenuItem key={action} value={action}>
                {action}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Paper elevation={0} className="overflow-hidden rounded-lg border border-border">
        <TableContainer>
          <Table>
            <TableHead className="bg-page">
              <TableRow className="h-11">
                <TableCell width={240} className="py-3">
                  <Typography
                    variant="caption"
                    className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
                  >
                    {t('rbac.permissions.columns.code')}
                  </Typography>
                </TableCell>
                <TableCell width={220} className="py-3">
                  <Typography
                    variant="caption"
                    className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
                  >
                    {t('rbac.permissions.columns.name')}
                  </Typography>
                </TableCell>
                <TableCell className="py-3">
                  <Typography
                    variant="caption"
                    className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
                  >
                    {t('rbac.permissions.columns.moduleAction')}
                  </Typography>
                </TableCell>
                <TableCell width={260} className="py-3">
                  <Typography
                    variant="caption"
                    className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
                  >
                    {t('rbac.permissions.columns.usage')}
                  </Typography>
                </TableCell>
                <TableCell width={120} className="py-3">
                  <Typography
                    variant="caption"
                    className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
                  >
                    {t('rbac.permissions.columns.actions')}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPermissions.length === 0 ? (
                <EmptyRow
                  colSpan={5}
                  loading={permissionsQuery.isPending}
                  message={
                    permissionsQuery.isError
                      ? permissionsQuery.error?.message || t('rbac.common.loadError')
                      : t(hasPermissionFilters ? 'rbac.common.noResults' : 'rbac.common.empty')
                  }
                  onRetry={permissionsQuery.isError ? () => permissionsQuery.refetch() : undefined}
                  t={t}
                />
              ) : (
                filteredPermissions.map((permission) => (
                  <TableRow
                    key={permission.id}
                    className="h-[52px] border-b border-border last:border-b-0 hover:bg-page"
                  >
                    <TableCell>
                      <PermissionCodeBadge code={permission.code} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" className="font-medium text-ink">
                        {permission.name || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" className="font-medium text-ink-secondary">
                        {permission.module || '—'}
                      </Typography>
                      <Typography variant="caption" className="text-ink-muted">
                        {permission.action || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" className="font-semibold text-ink-secondary">
                        {t('rbac.permissions.usage.total', { count: permission.usageCount ?? 0 })}
                      </Typography>
                      <Typography variant="caption" className="block text-ink-muted">
                        {t('rbac.permissions.usage.breakdown', {
                          roles: permission.roleCount ?? 0,
                          scoped: permission.scopedRoleCount ?? 0,
                          direct: permission.directAssignmentCount ?? 0,
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {canWrite && (
                        <Box className="flex items-center gap-3">
                          <Button
                            variant="text"
                            size="small"
                            color="primary"
                            className="!min-w-0 !px-0 !py-0 !text-sm !font-semibold"
                            onClick={() => setDialog({ type: 'permission', payload: permission })}
                          >
                            {t('rbac.permissions.actions.edit')}
                          </Button>
                          <Button
                            variant="text"
                            size="small"
                            disabled={
                              permission.deletable === false || deletePermissionMutation.isPending
                            }
                            className="!min-w-0 !px-0 !py-0 !text-sm !font-semibold !text-danger"
                            onClick={() => {
                              if (
                                window.confirm(t('rbac.permissions.actions.deleteConfirmSimple'))
                              ) {
                                runMutation(
                                  deletePermissionMutation,
                                  permission.id,
                                  t('rbac.permissions.editModal.deleteSuccess'),
                                )
                              }
                            }}
                          >
                            {t('rbac.permissions.actions.delete')}
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  )

  const renderScopes = () => (
    <Stack className="gap-4">
      <Box className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <TextField
          size="small"
          placeholder={t('rbac.scopes.searchPlaceholder')}
          value={scopeFilters.search}
          onChange={(event) => setScopeFilters({ ...scopeFilters, search: event.target.value })}
          className="w-full md:w-[280px]"
        />
        <FormControl size="small" className="w-full md:w-[180px]">
          <Select
            displayEmpty
            value={scopeFilters.scopeType}
            onChange={(event) =>
              setScopeFilters({ ...scopeFilters, scopeType: event.target.value })
            }
          >
            <MenuItem value="">{t('rbac.scopes.filter.allTypes')}</MenuItem>
            {SCOPE_TYPE_FILTER_OPTIONS.map((scope) => (
              <MenuItem key={scope.value} value={scope.value}>
                {t(scope.labelKey)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" className="w-full md:w-[180px]">
          <Select
            displayEmpty
            value={scopeFilters.status}
            onChange={(event) => setScopeFilters({ ...scopeFilters, status: event.target.value })}
          >
            <MenuItem value="">{t('rbac.scopes.filter.allStatus')}</MenuItem>
            {SCOPE_STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Paper elevation={0} className="overflow-hidden rounded-lg border border-border bg-surface">
        <TableContainer>
          <Table className="table-fixed">
            <TableHead className="bg-page">
              <TableRow>
                <UserHeaderCell width={160}>{t('rbac.scopes.columns.type')}</UserHeaderCell>
                <UserHeaderCell>{t('rbac.scopes.columns.name')}</UserHeaderCell>
                <UserHeaderCell width={200}>{t('rbac.scopes.columns.department')}</UserHeaderCell>
                <UserHeaderCell width={130}>{t('rbac.scopes.columns.assignments')}</UserHeaderCell>
                <UserHeaderCell width={160}>{t('rbac.scopes.columns.status')}</UserHeaderCell>
                <UserHeaderCell align="right" width={160}>
                  {t('rbac.scopes.columns.actions')}
                </UserHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredScopes.length === 0 ? (
                <EmptyRow
                  colSpan={6}
                  loading={scopesQuery.isPending}
                  message={
                    scopesQuery.isError
                      ? scopesQuery.error?.message || t('rbac.common.loadError')
                      : t(hasScopeFilters ? 'rbac.common.noResults' : 'rbac.common.empty')
                  }
                  onRetry={scopesQuery.isError ? () => scopesQuery.refetch() : undefined}
                  t={t}
                />
              ) : (
                filteredScopes.map((scope) => (
                  <TableRow
                    key={scope.id}
                    hover
                    className="h-14 border-b border-border last:border-b-0"
                  >
                    <TableCell>
                      <ScopeTypeBadge scopeType={scope.scopeType} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" className="font-semibold text-ink">
                        {getScopeDisplayName(scope)}
                      </Typography>
                      <Typography variant="caption" className="font-mono text-ink-muted">
                        {scope.resource?.code || scope.scopeId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        className={
                          getScopeParent(scope) === SCOPE_DEPARTMENT_FALLBACK
                            ? 'text-ink-muted'
                            : 'text-ink-secondary'
                        }
                      >
                        {getScopeParent(scope)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" className="font-semibold text-ink-secondary">
                        {t('rbac.scopes.assignmentCount', { count: scope.assignmentCount ?? 0 })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip
                        title={
                          scope.status === 'active' && !canDeactivateScope(scope)
                            ? t('rbac.scopes.deactivateBlocked', {
                                count: scope.assignmentCount ?? 0,
                              })
                            : ''
                        }
                        arrow
                      >
                        <span>
                          <Switch
                            checked={scope.status === 'active'}
                            color="primary"
                            disabled={
                              !canWrite ||
                              updateScopeMutation.isPending ||
                              deactivateScopeMutation.isPending ||
                              (scope.status === 'active' && !canDeactivateScope(scope))
                            }
                            onChange={(event) => {
                              if (event.target.checked) {
                                runMutation(
                                  updateScopeMutation,
                                  { scopeRegistryId: scope.id, values: { status: 'active' } },
                                  t('rbac.scopes.toggleSuccess'),
                                )
                                return
                              }

                              runMutation(
                                deactivateScopeMutation,
                                scope.id,
                                t('rbac.scopes.toggleSuccess'),
                              )
                            }}
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Box className="flex items-center justify-end gap-2">
                        <Button
                          size="small"
                          className="!min-w-0 px-1 text-sm font-semibold"
                          onClick={() => setDialog({ type: 'scope', payload: scope })}
                        >
                          {t('rbac.scopes.actions.view')}
                        </Button>
                        {canWrite && (
                          <>
                            <Typography variant="body2" className="text-ink-muted">
                              ·
                            </Typography>
                            <Button
                              size="small"
                              className="!min-w-0 px-1 text-sm font-semibold"
                              onClick={() => setDialog({ type: 'scope', payload: scope })}
                            >
                              {t('rbac.scopes.actions.edit')}
                            </Button>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  )

  const renderOverrides = () => (
    <Stack className="gap-0">
      <Box className="mb-6">
        <Typography
          variant="caption"
          className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted"
        >
          {t('rbac.scopedOverrides.filterLabel')}
        </Typography>
        <FormControl size="small" className="w-[280px]">
          <Select
            displayEmpty
            value={overrideRoleFilter}
            onChange={(event) => setOverrideRoleFilter(event.target.value)}
          >
            <MenuItem value="">{t('rbac.scopedOverrides.allRoles')}</MenuItem>
            {roles.map((role) => (
              <MenuItem key={role.id} value={role.code}>
                {role.name || role.code}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" className="mt-1 block text-ink-muted">
          {t('rbac.scopedOverrides.filterHint')}
        </Typography>
      </Box>
      {scopedRulesQuery.isError ? (
        <Paper elevation={0} className="rounded-lg border border-border p-8 text-center">
          <Stack className="items-center gap-3">
            <Typography variant="body2" className="text-ink-muted">
              {scopedRulesQuery.error?.message || t('rbac.common.loadError')}
            </Typography>
            <Button size="small" onClick={() => scopedRulesQuery.refetch()}>
              {t('common.retry')}
            </Button>
          </Stack>
        </Paper>
      ) : filteredOverrideSections.length === 0 ? (
        <Paper elevation={0} className="rounded-lg border border-border p-8 text-center">
          <Typography variant="body2" className="text-ink-muted">
            {t('rbac.scopedOverrides.noRoles')}
          </Typography>
        </Paper>
      ) : (
        filteredOverrideSections.map((section) => (
          <RoleOverrideSection
            key={section.roleId}
            section={section}
            canWrite={canWrite}
            t={t}
            onEditRole={() => setDialog({ type: 'scoped-grant', payload: { role: section.role } })}
            onGrant={(group) =>
              setDialog({ type: 'grant-permission', payload: { section, group } })
            }
            onRevoke={(group, permission) => {
              const permissionId = permission.id || permission.permissionId
              const remainingPermissionIds = (
                group.permissionIds ?? group.permissions.map((item) => item.id)
              ).filter((id) => id !== permissionId)

              runMutation(
                setScopedRolePermissionsMutation,
                buildScopedRulePayload({
                  role: section.role,
                  scope: group,
                  permissionIds: remainingPermissionIds,
                }),
                t('rbac.scopedOverrides.revokeSuccess'),
              )
            }}
          />
        ))
      )}
    </Stack>
  )

  return (
    <Stack className="flex flex-col gap-5">
      <Paper elevation={0} className="rounded-xl border border-border bg-surface p-5">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          className="items-stretch justify-between gap-4 md:items-center"
        >
          <Box>
            <Typography variant="h5" className="font-semibold text-ink">
              {t('rbac.title')}
            </Typography>
            <Typography variant="body2" className="mt-1 max-w-3xl text-ink-muted">
              {t('rbac.description')}
            </Typography>
          </Box>
          <Stack direction="row" className="items-center gap-3">
            <Chip
              size="small"
              variant="outlined"
              label={t('rbac.recordCount', { count: tabTotals[activeTab] ?? 0 })}
            />
            {canWrite && primaryAction && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={primaryAction.open}>
                {primaryAction.label}
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Box className="overflow-x-auto rounded-lg border border-border bg-surface p-1 shadow-sm">
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          slotProps={{ indicator: { style: { display: 'none' } } }}
          sx={(theme) => ({
            minHeight: 32,
            '& .MuiTab-root': {
              minHeight: 32,
              px: 3,
              py: 0.5,
              textTransform: 'none',
              color: theme.palette.text.secondary,
              fontWeight: 500,
              borderRadius: '6px',
              transition: 'all 0.2s',
            },
            '& .MuiTab-root.Mui-selected': {
              color: theme.palette.text.primary,
              backgroundColor: theme.palette.background.paper,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              fontWeight: 600,
            },
          })}
        >
          {TABS.map((tab) => (
            <Tab
              key={tab.id}
              value={tab.id}
              label={
                <Box className="flex items-center gap-2">
                  <span>{t(tab.labelKey)}</span>
                  <Chip size="small" label={tabTotals[tab.id] ?? 0} className="!h-5" />
                </Box>
              }
              disableRipple
            />
          ))}
        </Tabs>
      </Box>

      {activeTab === TAB_KEYS.USERS && renderUsers()}
      {activeTab === TAB_KEYS.ROLES && renderRoles()}
      {activeTab === TAB_KEYS.PERMISSIONS && renderPermissions()}
      {activeTab === TAB_KEYS.SCOPES && renderScopes()}
      {activeTab === TAB_KEYS.OVERRIDES && renderOverrides()}

      <AccountFormDialog
        open={canWrite && dialog.type === 'add-account'}
        onClose={closeDialog}
        roles={roles}
        t={t}
        pending={createAccountMutation.isPending}
        onSubmit={(values, done) =>
          runMutation(createAccountMutation, values, t('rbac.users.addModal.success'), done)
        }
      />
      <AccountInfoDialog
        open={dialog.type === 'view-account'}
        accountId={getAccountId(dialog.payload)}
        summary={dialog.payload}
        onClose={closeDialog}
        t={t}
        canWrite={canWrite}
        statusPending={updateAccountStatusMutation.isPending}
        passwordPending={resetAccountPasswordMutation.isPending}
        sessionsPending={revokeAccountSessionsMutation.isPending}
        onUpdateStatus={(payload) =>
          runMutation(
            updateAccountStatusMutation,
            payload,
            t('rbac.users.viewModal.updateStatusSuccess'),
          )
        }
        onResetPassword={(payload, done) =>
          runMutation(
            resetAccountPasswordMutation,
            payload,
            t('rbac.users.viewModal.resetPasswordSuccess'),
            done,
          )
        }
        onRevokeSessions={(accountId) =>
          runMutation(
            revokeAccountSessionsMutation,
            accountId,
            t('rbac.users.viewModal.revokeSessionsSuccess'),
          )
        }
      />
      <EditAccessDialog
        key={dialog.type === 'edit-access' ? dialog.payload : 'edit-access-closed'}
        open={canWrite && dialog.type === 'edit-access'}
        accountId={dialog.payload}
        roles={roles}
        permissions={permissions}
        scopes={scopes}
        pending={
          createAccessAssignmentMutation.isPending ||
          updateAccountAccessMutation.isPending ||
          updateAccessAssignmentMutation.isPending ||
          deactivateAccessAssignmentMutation.isPending
        }
        onClose={closeDialog}
        t={t}
        onUpdateGlobalAccess={(payload, done) =>
          runMutation(
            updateAccountAccessMutation,
            payload,
            t('rbac.users.editAccessModal.globalAccessSuccess'),
            done,
          )
        }
        onCreateScopedAssignment={(payload, done) =>
          runMutation(
            createAccessAssignmentMutation,
            payload,
            t('rbac.users.editAccessModal.success'),
            done,
          )
        }
        onUpdateAssignment={(payload, done) =>
          runMutation(
            updateAccessAssignmentMutation,
            payload,
            t('rbac.users.editAccessModal.success'),
            done,
          )
        }
        onDeleteAssignment={(assignmentId) =>
          runMutation(
            deactivateAccessAssignmentMutation,
            assignmentId,
            t('rbac.users.editAccessModal.success'),
          )
        }
      />
      <RoleDialog
        key={dialog.type === 'role' ? (dialog.payload?.id ?? 'role-new') : 'role-closed'}
        open={canWrite && dialog.type === 'role'}
        mode={dialog.payload ? 'edit' : 'create'}
        value={dialog.payload}
        permissions={rolePermissions}
        permissionsPending={rolePermissionsQuery.isPending}
        pending={createRoleMutation.isPending || updateRoleMutation.isPending}
        onClose={closeDialog}
        t={t}
        onSubmit={(values) =>
          dialog.payload
            ? runMutation(
                updateRoleMutation,
                { roleId: dialog.payload.id, values },
                t('rbac.roles.editModal.success'),
                closeDialog,
              )
            : runMutation(createRoleMutation, values, t('rbac.roles.addModal.success'), closeDialog)
        }
      />
      <PermissionDialog
        key={
          dialog.type === 'permission'
            ? (dialog.payload?.id ?? 'permission-new')
            : 'permission-closed'
        }
        open={canWrite && dialog.type === 'permission'}
        value={dialog.payload}
        pending={createPermissionMutation.isPending || updatePermissionMutation.isPending}
        deletePending={deletePermissionMutation.isPending}
        onClose={closeDialog}
        t={t}
        onDelete={(permissionId) =>
          runMutation(
            deletePermissionMutation,
            permissionId,
            t('rbac.permissions.editModal.deleteSuccess'),
            closeDialog,
          )
        }
        onSubmit={(values) =>
          dialog.payload
            ? runMutation(
                updatePermissionMutation,
                { permissionId: dialog.payload.id, values },
                t('rbac.permissions.editModal.success'),
                closeDialog,
              )
            : runMutation(
                createPermissionMutation,
                values,
                t('rbac.permissions.addModal.success'),
                closeDialog,
              )
        }
      />
      <ScopeDialog
        key={dialog.type === 'scope' ? (dialog.payload?.id ?? 'scope-new') : 'scope-closed'}
        open={dialog.type === 'scope'}
        value={dialog.payload}
        departments={departments}
        teams={teams}
        pending={createScopeMutation.isPending || updateScopeMutation.isPending}
        canWrite={canWrite}
        onClose={closeDialog}
        t={t}
        onSubmit={(values) => {
          if (dialog.payload) {
            runMutation(
              updateScopeMutation,
              {
                scopeRegistryId: dialog.payload.id,
                values: { name: values.name },
              },
              t('rbac.scopes.editModal.success'),
              closeDialog,
            )
            return
          }

          const { payload, errorKey } = buildAddScopePayload(values, departments, teams)

          if (errorKey) {
            notifyError({ message: t(errorKey) })
            return
          }

          runMutation(createScopeMutation, payload, t('rbac.scopes.addModal.success'), closeDialog)
        }}
      />
      <GrantPermissionModal
        key={
          dialog.type === 'grant-permission'
            ? `${dialog.payload?.section?.roleId}-${dialog.payload?.group?.id}`
            : 'grant-permission-closed'
        }
        open={canWrite && dialog.type === 'grant-permission'}
        context={dialog.payload}
        permissions={permissions}
        pending={setScopedRolePermissionsMutation.isPending}
        onClose={closeDialog}
        t={t}
        onSubmit={(values) =>
          runMutation(
            setScopedRolePermissionsMutation,
            values,
            t('rbac.scopedOverrides.grantModal.success'),
            closeDialog,
          )
        }
      />
      <GrantScopedPermissionModal
        key={
          dialog.type === 'scoped-grant'
            ? (dialog.payload?.role?.id ?? 'scoped-grant-new')
            : 'scoped-grant-closed'
        }
        open={canWrite && dialog.type === 'scoped-grant'}
        role={dialog.payload?.role}
        scopes={scopes}
        permissions={permissions}
        rules={scopedRules}
        pending={setScopedRolePermissionsMutation.isPending}
        onClose={closeDialog}
        t={t}
        onSubmit={(values) =>
          runMutation(
            setScopedRolePermissionsMutation,
            values,
            t('rbac.scopedOverrides.scopedGrantModal.success'),
            closeDialog,
          )
        }
      />
    </Stack>
  )
}
