import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined'
import {
  Avatar,
  Box,
  Button,
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
  useDeletePermissionMutation,
  useResetAccountPasswordMutation,
  useSetScopedRolePermissionsMutation,
  useUpdateAccessAssignmentMutation,
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
import {
  filterPermissionItems,
  PERMISSION_ACTION_OPTIONS,
  PERMISSION_MODULE_OPTIONS,
  PERMISSION_STATUS_OPTIONS,
} from '../utils/permissionsDisplay'
import { getRbacCapabilities } from '../utils/rbacAccess'
import {} from '../utils/rbacApi'
import { getDefaultPermissionMeta } from '../utils/rolesDisplay'
import {
  buildScopedOverrideSections,
  buildScopedRulePayload,
  filterOverrideRoles,
  OVERRIDE_ROLE_FILTER_OPTIONS,
} from '../utils/scopedOverridesDisplay'
import {
  buildAddScopePayload,
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
  })
  const [roleSearch, setRoleSearch] = useState('')
  const [permissionFilters, setPermissionFilters] = useState({
    search: '',
    module: '',
    action: '',
    status: '',
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

  const filteredPermissions = useMemo(
    () => filterPermissionItems(permissions, permissionFilters),
    [permissions, permissionFilters],
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
  const createAccessAssignmentMutation = useCreateAccessAssignmentMutation()
  const updateAccessAssignmentMutation = useUpdateAccessAssignmentMutation()
  const deactivateAccessAssignmentMutation = useDeactivateAccessAssignmentMutation()
  const createRoleMutation = useCreateRoleMutation()
  const updateRoleMutation = useUpdateRoleMutation()
  const createPermissionMutation = useCreatePermissionMutation()
  const updatePermissionMutation = useUpdatePermissionMutation()
  const deletePermissionMutation = useDeletePermissionMutation()
  const createScopeMutation = useCreateScopeMutation()
  const updateScopeMutation = useUpdateScopeMutation()
  const setScopedRolePermissionsMutation = useSetScopedRolePermissionsMutation()

  const notifySuccess = (message) => {
    enqueueSnackbar(message, { variant: SNACKBAR_VARIANTS.SUCCESS })
  }

  const notifyError = (error) => {
    enqueueSnackbar(error?.message || 'Không thể thực hiện yêu cầu.', {
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
      <Box className="flex items-center gap-3 py-4">
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
            {ACCOUNT_STATUSES.filter((item) => item.value !== 'archived').map((item) => (
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
              setUserFilters({ ...userFilters, departmentId: event.target.value, page: 1 })
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
        {canWrite && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            color="primary"
            className="ml-auto h-10 rounded-lg text-sm font-semibold"
            onClick={() => setDialog({ type: 'add-account', payload: null })}
          >
            {t('rbac.users.actions.addUser')}
          </Button>
        )}
      </Box>

      <Paper elevation={0} className="overflow-hidden rounded-lg border border-border">
        <TableContainer>
          <Table>
            <TableHead className="bg-page">
              <TableRow className="h-11">
                <UserHeaderCell>{t('rbac.users.columns.user')}</UserHeaderCell>
                <UserHeaderCell width={120}>{t('rbac.users.columns.status')}</UserHeaderCell>
                <UserHeaderCell width={120}>{t('rbac.users.columns.role')}</UserHeaderCell>
                <UserHeaderCell width={130}>{t('rbac.users.columns.department')}</UserHeaderCell>
                <UserHeaderCell>{t('rbac.users.columns.lastLogin')}</UserHeaderCell>
                <UserHeaderCell>{t('rbac.users.columns.actions')}</UserHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.length === 0 ? (
                <EmptyRow colSpan={6} loading={accountsQuery.isPending} />
              ) : (
                accounts.map((account, index) => {
                  const accountId = getAccountId(account)
                  const name = getAccountName(account)
                  const email = getAccountEmail(account)
                  const primaryRole = getPrimaryRole(account)
                  const roleMeta = getRoleMeta(primaryRole)
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
                        <Stack direction="row" alignItems="center" className="min-w-[260px] gap-2">
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
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <UserStatusChip status={account.status} t={t} />
                      </TableCell>
                      <TableCell>
                        <UserRoleChip role={primaryRole} />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          className={
                            getDepartmentName(account) === '—'
                              ? 'text-ink-muted'
                              : 'text-ink-secondary'
                          }
                        >
                          {getDepartmentName(account)}
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
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="flex-end"
                          className="gap-2"
                        >
                          <Tooltip title={t('rbac.users.actions.viewInfo')} arrow>
                            <IconButton
                              size="small"
                              color="primary"
                              aria-label={t('rbac.users.actions.viewInfo')}
                              onClick={() =>
                                setDialog({ type: 'view-account', payload: accountId })
                              }
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
        <Stack direction="row" justifyContent="space-between" alignItems="center" className="p-4">
          <Typography variant="body2" color="text.secondary">
            Tổng {pagination.total} tài khoản
          </Typography>
          <Stack direction="row" className="gap-2">
            <Button
              size="small"
              disabled={pagination.page <= 1}
              onClick={() => setUserFilters({ ...userFilters, page: pagination.page - 1 })}
            >
              Trước
            </Button>
            <Button
              size="small"
              disabled={pagination.page * pagination.limit >= pagination.total}
              onClick={() => setUserFilters({ ...userFilters, page: pagination.page + 1 })}
            >
              Sau
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
        {canWrite && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            className="h-10 whitespace-nowrap rounded-lg text-sm font-semibold"
            onClick={() => setDialog({ type: 'role', payload: null })}
          >
            {t('rbac.roles.actions.addRole')}
          </Button>
        )}
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
                <EmptyRow colSpan={5} loading={rolesQuery.isPending} />
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
                          <Button
                            variant="text"
                            size="small"
                            color="primary"
                            className="!min-w-0 !px-0 !py-0 !text-sm !font-semibold"
                            onClick={() => setDialog({ type: 'role', payload: role })}
                          >
                            {t('rbac.roles.actions.edit')}
                          </Button>
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
            {PERMISSION_MODULE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
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
            {PERMISSION_ACTION_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" className="w-[180px]">
          <Select
            displayEmpty
            value={permissionFilters.status}
            onChange={(event) =>
              setPermissionFilters({ ...permissionFilters, status: event.target.value })
            }
          >
            <MenuItem value="">{t('rbac.permissions.filter.allStatus')}</MenuItem>
            {PERMISSION_STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {canWrite && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            className="ml-auto h-10 whitespace-nowrap rounded-lg text-sm font-semibold"
            onClick={() => setDialog({ type: 'permission', payload: null })}
          >
            {t('rbac.permissions.actions.addPermission')}
          </Button>
        )}
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
                    {t('rbac.permissions.columns.description')}
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
                <EmptyRow colSpan={4} loading={permissionsQuery.isPending} />
              ) : (
                filteredPermissions.map((permission) => {
                  const isDeprecated = permission.status === 'deprecated'

                  return (
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
                        <Typography
                          variant="body2"
                          className={isDeprecated ? 'text-ink-muted' : 'text-ink-secondary'}
                        >
                          {permission.description || '—'}
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
                  )
                })
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
        {canWrite && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            className="h-10 whitespace-nowrap rounded-lg text-sm font-semibold lg:ml-auto"
            onClick={() => setDialog({ type: 'scope', payload: null })}
          >
            {t('rbac.scopes.actions.addScope')}
          </Button>
        )}
      </Box>
      <Paper elevation={0} className="overflow-hidden rounded-lg border border-border bg-surface">
        <TableContainer>
          <Table className="table-fixed">
            <TableHead className="bg-page">
              <TableRow>
                <UserHeaderCell width={160}>{t('rbac.scopes.columns.type')}</UserHeaderCell>
                <UserHeaderCell>{t('rbac.scopes.columns.name')}</UserHeaderCell>
                <UserHeaderCell width={200}>{t('rbac.scopes.columns.department')}</UserHeaderCell>
                <UserHeaderCell width={160}>{t('rbac.scopes.columns.status')}</UserHeaderCell>
                <UserHeaderCell align="right" width={160}>
                  {t('rbac.scopes.columns.actions')}
                </UserHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredScopes.length === 0 ? (
                <EmptyRow colSpan={5} loading={scopesQuery.isPending} />
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
                      <Switch
                        checked={scope.status === 'active'}
                        color="primary"
                        disabled={!canWrite}
                        onChange={(event) =>
                          runMutation(
                            updateScopeMutation,
                            {
                              scopeRegistryId: scope.id,
                              values: { status: event.target.checked ? 'active' : 'inactive' },
                            },
                            t('rbac.scopes.toggleSuccess'),
                          )
                        }
                      />
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
            {OVERRIDE_ROLE_FILTER_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" className="mt-1 block text-ink-muted">
          {t('rbac.scopedOverrides.filterHint')}
        </Typography>
      </Box>
      {filteredOverrideSections.length === 0 ? (
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
            totalPermissions={permissions.length}
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
    <Stack className="flex flex-col gap-6">
      <Box>
        <Typography variant="h5" className="font-semibold text-ink">
          {t('rbac.title')}
        </Typography>
      </Box>

      <Box className="inline-flex rounded-lg bg-surface p-1 shadow-sm border border-border">
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          TabIndicatorProps={{ style: { display: 'none' } }}
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
            <Tab key={tab.id} value={tab.id} label={t(tab.labelKey)} disableRipple />
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
        accountId={dialog.payload}
        onClose={closeDialog}
        t={t}
        canWrite={canWrite}
        statusPending={updateAccountStatusMutation.isPending}
        passwordPending={resetAccountPasswordMutation.isPending}
        onUpdateStatus={(payload) =>
          runMutation(
            updateAccountStatusMutation,
            payload,
            t('rbac.users.viewModal.updateStatusSuccess'),
          )
        }
        onResetPassword={(payload) =>
          runMutation(
            resetAccountPasswordMutation,
            payload,
            t('rbac.users.viewModal.resetPasswordSuccess'),
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
          updateAccessAssignmentMutation.isPending ||
          deactivateAccessAssignmentMutation.isPending
        }
        onClose={closeDialog}
        t={t}
        onCreateScopedAssignment={(payload) =>
          runMutation(
            createAccessAssignmentMutation,
            payload,
            t('rbac.users.editAccessModal.success'),
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
                values: { name: values.name, status: values.status },
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
