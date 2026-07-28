import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined'
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
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
import dayjs from 'dayjs'
import { useSnackbar } from 'notistack'

import { StatusBadge } from '@/components/operations'
import { SNACKBAR_VARIANTS } from '@/constants/app'

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
  useAccountQuery,
  useAccountsQuery,
  useDepartmentsQuery,
  usePermissionsQuery,
  useRolesQuery,
  useScopedRolePermissionsQuery,
  useScopesQuery,
  useTeamsQuery,
} from '../api/rbac.queries'
import {
  filterPermissionItems,
  PERMISSION_ACTION_OPTIONS,
  PERMISSION_MODULE_OPTIONS,
  PERMISSION_STATUS_OPTIONS,
} from '../utils/permissionsDisplay'
import {
  buildAccessAssignmentResetPayload,
  buildScopeAssignmentValue,
  parseScopeAssignmentValue,
} from '../utils/rbacApi'
import {
  filterPermissionsForRole,
  getDefaultPermissionMeta,
  getRolePermissionIds,
  groupPermissionsByModule,
} from '../utils/rolesDisplay'
import {
  buildScopedOverrideSections,
  buildScopedRulePayload,
  filterOverrideRoles,
  getAvailableOverridePermissions,
  getOverrideRoleName,
  getScopeOptionLabel,
  OVERRIDE_ROLE_FILTER_OPTIONS,
} from '../utils/scopedOverridesDisplay'
import {
  buildAddScopePayload,
  filterScopeItems,
  getScopeDepartmentName,
  getScopeDisplayName,
  getScopeResourceOptions,
  getScopeTypeLabel,
  getScopeTypeMeta,
  SCOPE_CREATE_TYPE_OPTIONS,
  SCOPE_DEPARTMENT_FALLBACK,
  SCOPE_STATUS_OPTIONS,
  SCOPE_TYPE_FILTER_OPTIONS,
} from '../utils/scopesDisplay'
import {
  formatLastLoginLabel,
  getAvatarMeta,
  getRoleMeta,
  getStatusMeta,
} from '../utils/usersDisplay'

const TAB_KEYS = {
  USERS: 'users',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  SCOPES: 'scopes',
  OVERRIDES: 'overrides',
}

const TABS = [
  { id: TAB_KEYS.USERS, labelKey: 'rbac.tabs.users' },
  { id: TAB_KEYS.ROLES, labelKey: 'rbac.tabs.roles' },
  { id: TAB_KEYS.PERMISSIONS, labelKey: 'rbac.tabs.permissions' },
  { id: TAB_KEYS.SCOPES, labelKey: 'rbac.tabs.scopes' },
  { id: TAB_KEYS.OVERRIDES, labelKey: 'rbac.tabs.scopedOverrides' },
]

const ACCOUNT_STATUSES = [
  { value: '', labelKey: 'rbac.users.status.all' },
  { value: 'active', labelKey: 'rbac.users.status.active' },
  { value: 'inactive', labelKey: 'rbac.users.status.inactive' },
  { value: 'archived', labelKey: 'rbac.users.status.archived' },
]

const INITIAL_USER_FORM = {
  email: '',
  password: '',
  roleId: '',
  scopeType: '',
  scopeId: '',
  customPermissionIds: [],
}

const INITIAL_ROLE_FORM = {
  code: '',
  name: '',
  description: '',
  permissionIds: [],
}

const INITIAL_PERMISSION_FORM = {
  code: '',
  module: 'ACCOUNTS',
  action: 'READ',
  name: '',
  description: '',
}

const INITIAL_SCOPE_FORM = {
  scopeType: '',
  scopeId: '',
  name: '',
  code: '',
  status: 'active',
}

function getItems(result) {
  return result?.items ?? []
}

function getPagination(result) {
  return {
    page: Number(result?.page ?? 1),
    limit: Number(result?.limit ?? 10),
    total: Number(result?.total ?? getItems(result).length),
  }
}

function formatDate(value) {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—'
}

function formatShortDate(value) {
  return value ? dayjs(value).format('DD/MM/YYYY') : '—'
}

function getAccountName(account) {
  return account?.account?.email || account?.email || '—'
}

function getAccountEmail(account) {
  return account?.account?.email || account?.email || '—'
}

function getAccountId(account) {
  return account?.account?.id || account?.id
}

function getPrimaryRole(account) {
  const assignment = account?.roleAssignments?.[0]
  return assignment?.roleCode || account?.roles?.[0] || '—'
}

function getDepartmentName(account) {
  return account?.department?.name || account?.department?.code || '—'
}

function getScopeName(scope) {
  return getScopeDisplayName(scope)
}

function getScopeParent(scope) {
  return getScopeDepartmentName(scope)
}

function getScopeAssignmentLabel(scope) {
  return scope ? `${getScopeName(scope)} - ${getScopeTypeLabel(scope.scopeType)}` : ''
}

function getScopeSelectValue(scope) {
  return buildScopeAssignmentValue({
    scopeType: scope?.scopeType,
    scopeId: scope?.scopeId || scope?.resource?.id || scope?.resource?._id,
  })
}

function getAssignmentRoleId(assignment, roles = []) {
  const explicitRoleId = assignment?.roleId || assignment?.role?.id || assignment?.role?._id
  if (explicitRoleId) return explicitRoleId

  const roleRef = assignment?.roles?.[0] || assignment?.role?.code || assignment?.role?.name
  const matchedRole = roles.find(
    (role) => role.id === roleRef || role.code === roleRef || role.name === roleRef,
  )

  return matchedRole?.id || ''
}

function getAssignmentScopeValue(assignment) {
  return getScopeSelectValue(assignment)
}

function getRoleLabel(role) {
  return role?.name || role?.code || '—'
}

function findById(items, id) {
  return items.find((item) => item.id === id)
}

function UserStatusChip({ status, t }) {
  const meta = getStatusMeta(status)
  const tone = meta.key === 'active' ? 'success' : 'warning'

  return <StatusBadge tone={tone}>{t(meta.labelKey)}</StatusBadge>
}

function UserRoleChip({ role }) {
  const meta = getRoleMeta(role)

  return (
    <Chip
      size="small"
      variant="outlined"
      label={meta.label}
      className={`!h-6  text-xs font-medium ${meta.className}`}
      sx={{ '& .MuiChip-label': { px: '8px' } }}
    />
  )
}

function UserFieldLabel({ children }) {
  return (
    <Typography
      variant="caption"
      className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted"
    >
      {children}
    </Typography>
  )
}

function UserHeaderCell({ children, align = 'left', width }) {
  return (
    <TableCell align={align} width={width} className="h-11">
      <Typography
        variant="caption"
        className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
      >
        {children}
      </Typography>
    </TableCell>
  )
}

function ScopeTypeBadge({ scopeType }) {
  const meta = getScopeTypeMeta(scopeType)

  return (
    <Chip
      size="small"
      variant="outlined"
      label={getScopeTypeLabel(scopeType)}
      className={`!h-7 !rounded-full text-xs font-semibold ${meta.className}`}
      sx={{ '& .MuiChip-label': { px: '10px' } }}
    />
  )
}

function ScopeDialogField({ label, children }) {
  return (
    <Box>
      <Typography variant="body2" className="mb-1 font-medium text-ink">
        {label}
      </Typography>
      {children}
    </Box>
  )
}

function Section({ children }) {
  return (
    <Paper
      elevation={0}
      sx={(theme) => ({
        bgcolor: 'background.paper',
        borderRadius: 3,
        overflow: 'hidden',
        width: '100%',
        border: `1px solid ${theme.palette.divider}`,
      })}
    >
      {children}
    </Paper>
  )
}

function EmptyRow({ colSpan, loading }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} align="center" sx={{ py: 6, color: 'text.disabled' }}>
        {loading ? 'Đang tải dữ liệu...' : 'Không có dữ liệu phù hợp'}
      </TableCell>
    </TableRow>
  )
}

function PermissionPicker({ permissions, selectedIds, onChange, dense = false }) {
  const modules = useMemo(() => {
    const grouped = permissions.reduce((items, permission) => {
      const moduleName = permission.module || 'OTHER'
      return {
        ...items,
        [moduleName]: [...(items[moduleName] ?? []), permission],
      }
    }, {})

    return Object.entries(grouped)
  }, [permissions])

  const togglePermission = (permissionId) => {
    onChange(
      selectedIds.includes(permissionId)
        ? selectedIds.filter((id) => id !== permissionId)
        : [...selectedIds, permissionId],
    )
  }

  return (
    <Stack className={`gap-${dense ? 3 : 5}`}>
      {modules.map(([moduleName, modulePermissions]) => {
        const selectedCount = modulePermissions.filter((permission) =>
          selectedIds.includes(permission.id),
        ).length

        return (
          <Box key={moduleName}>
            <Typography variant="caption" color="text.disabled" fontWeight={700}>
              {moduleName} MODULE · {selectedCount}/{modulePermissions.length}
            </Typography>
            <Box className="mt-1 grid grid-cols-1 gap-1 md:grid-cols-2">
              {modulePermissions.map((permission) => (
                <FormControlLabel
                  key={permission.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={selectedIds.includes(permission.id)}
                      onChange={() => togglePermission(permission.id)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">{permission.name || permission.code}</Typography>
                      <Typography variant="caption" color="text.disabled">
                        {permission.code}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </Box>
          </Box>
        )
      })}
    </Stack>
  )
}

function getAssignmentPermissionSelection(assignment) {
  if (!assignment) return []
  if (Array.isArray(assignment.overridePermissionIds)) return assignment.overridePermissionIds
  if (Array.isArray(assignment.effectivePermissionIds)) return assignment.effectivePermissionIds
  return assignment.customPermissionIds ?? []
}

function PermissionOverrideDialog({ open, assignment, permissions, pending, onClose, onSave, t }) {
  const [selectedIds, setSelectedIds] = useState(() => getAssignmentPermissionSelection(assignment))
  const inheritedIds = assignment?.inheritedPermissionIds ?? []
  const effectiveIds = assignment?.effectivePermissionIds ?? []
  const isOverridden = Boolean(assignment?.isPermissionOverridden)
  const roleLabel = assignment?.roles?.[0] || assignment?.role?.code || 'anonymous'
  const scopeLabel =
    assignment?.scopeName || assignment?.resource?.name || assignment?.scopeId || 'unknown'

  if (!assignment) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ className: 'rounded-xl' }}
    >
      <DialogTitle className="pb-2 pr-10 font-semibold text-ink">
        {t('rbac.users.editAccessModal.permissionOverride.title')}
        <IconButton
          onClick={onClose}
          aria-label={t('common.close')}
          className="!absolute !right-3 !top-3 !text-ink-muted"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent className="flex flex-col gap-4 px-6 pb-4 pt-2">
        <Box className="rounded-lg border border-border bg-page px-4 py-3">
          <Stack className="gap-2">
            <Box className="flex flex-wrap items-center gap-2">
              <UserRoleChip role={roleLabel} />
              <ScopeTypeBadge scopeType={assignment.scopeType} />
              <Typography variant="body2" className="font-medium text-ink-secondary">
                {scopeLabel}
              </Typography>
            </Box>
            <Typography variant="caption" className="text-ink-muted">
              {isOverridden
                ? t('rbac.users.editAccessModal.permissionOverride.overrideMode')
                : t('rbac.users.editAccessModal.permissionOverride.inheritedMode')}
            </Typography>
            <Box className="flex flex-wrap gap-2">
              <Chip
                size="small"
                variant="outlined"
                label={t('rbac.users.editAccessModal.permissionOverride.selectedCount', {
                  count: selectedIds.length,
                })}
                className="!h-6 !rounded-md !border-primary !bg-primary-light text-xs font-medium !text-primary"
              />
              <Chip
                size="small"
                variant="outlined"
                label={t('rbac.users.editAccessModal.permissionOverride.inheritedCount', {
                  count: inheritedIds.length,
                })}
                className="!h-6 !rounded-md !border-border !bg-surface text-xs font-medium !text-ink-secondary"
              />
              <Chip
                size="small"
                variant="outlined"
                label={t('rbac.users.editAccessModal.permissionOverride.effectiveCount', {
                  count: effectiveIds.length,
                })}
                className="!h-6 !rounded-md !border-success !bg-success-bg text-xs font-medium !text-success"
              />
            </Box>
          </Stack>
        </Box>
        <PermissionPicker
          dense
          permissions={permissions}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
        />
      </DialogContent>
      <DialogActions className="justify-between gap-3 border-t border-border px-6 pb-6 pt-4">
        <Button
          variant="outlined"
          color="inherit"
          className="h-10 rounded-lg border-border px-5 text-sm font-semibold text-ink-secondary"
          disabled={pending}
          onClick={() =>
            onSave({
              assignmentId: assignment.assignmentId,
              values: { overridePermissionIds: null },
            })
          }
        >
          {t('rbac.users.editAccessModal.permissionOverride.reset')}
        </Button>
        <Box className="flex items-center gap-3">
          <Button
            variant="outlined"
            className="h-10 rounded-lg px-5 text-sm font-semibold text-ink-secondary"
            onClick={onClose}
          >
            {t('rbac.users.editAccessModal.cancel')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            className="h-10 rounded-lg px-5 text-sm font-semibold"
            disabled={pending}
            onClick={() =>
              onSave({
                assignmentId: assignment.assignmentId,
                values: { overridePermissionIds: selectedIds },
              })
            }
          >
            {t('rbac.users.editAccessModal.permissionOverride.save')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}

function AssignmentAccessRow({
  assignment,
  roles,
  scopeAssignmentOptions,
  pending,
  onChangeAssignment,
  onEditPermission,
  onDeleteAssignment,
  t,
}) {
  const [roleId, setRoleId] = useState(() => getAssignmentRoleId(assignment, roles))
  const [scopeAssignmentValue, setScopeAssignmentValue] = useState(() =>
    getAssignmentScopeValue(assignment),
  )
  const selectedScopeAssignment = scopeAssignmentOptions.find(
    (scope) => getScopeSelectValue(scope) === scopeAssignmentValue,
  )

  const updateAssignment = (nextRoleId, nextScopeAssignmentValue) => {
    const { scopeType, scopeId } = parseScopeAssignmentValue(nextScopeAssignmentValue)

    if (!nextRoleId || !scopeType || !scopeId) return

    onChangeAssignment({
      assignmentId: assignment.assignmentId,
      values: buildAccessAssignmentResetPayload({
        roleId: nextRoleId,
        scopeType,
        scopeId,
      }),
    })
  }

  return (
    <Box className="grid grid-cols-1 items-center gap-3 rounded-lg border border-border bg-surface px-3 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_auto]">
      <FormControl fullWidth size="small">
        <InputLabel>{t('rbac.users.editAccessModal.assignmentRole')}</InputLabel>
        <Select
          label={t('rbac.users.editAccessModal.assignmentRole')}
          value={roleId}
          disabled={pending}
          onChange={(event) => {
            const nextRoleId = event.target.value
            setRoleId(nextRoleId)
            updateAssignment(nextRoleId, scopeAssignmentValue)
          }}
        >
          {roles.map((role) => (
            <MenuItem key={role.id} value={role.id}>
              {getRoleLabel(role)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel shrink>{t('rbac.users.editAccessModal.scopeAssignment')}</InputLabel>
        <Select
          displayEmpty
          label={t('rbac.users.editAccessModal.scopeAssignment')}
          value={scopeAssignmentValue}
          disabled={pending}
          renderValue={(value) =>
            value && selectedScopeAssignment ? (
              getScopeAssignmentLabel(selectedScopeAssignment)
            ) : (
              <Typography component="span" variant="body2" className="text-ink-muted">
                {t('rbac.users.editAccessModal.scopeAssignmentPlaceholder')}
              </Typography>
            )
          }
          onChange={(event) => {
            const nextScopeAssignmentValue = event.target.value
            setScopeAssignmentValue(nextScopeAssignmentValue)
            updateAssignment(roleId, nextScopeAssignmentValue)
          }}
        >
          <MenuItem disabled value="">
            {t('rbac.users.editAccessModal.scopeAssignmentPlaceholder')}
          </MenuItem>
          {scopeAssignmentOptions.map((scope) => {
            const value = getScopeSelectValue(scope)

            return (
              <MenuItem key={value} value={value}>
                <Box className="flex w-full items-center justify-between gap-3">
                  <Typography variant="body2" className="font-medium text-ink">
                    {getScopeName(scope)}
                  </Typography>
                  <ScopeTypeBadge scopeType={scope.scopeType} />
                </Box>
              </MenuItem>
            )
          })}
        </Select>
      </FormControl>

      <Box className="flex items-center justify-end gap-1">
        <Tooltip title={t('rbac.users.editAccessModal.permissionOverride.edit')} arrow>
          <span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ManageAccountsOutlinedIcon sx={{ fontSize: 18 }} />}
              disabled={pending}
              className="h-10 rounded-lg px-3 text-sm font-semibold"
              onClick={() => onEditPermission(assignment)}
            >
              {t('rbac.users.editAccessModal.permissionOverride.edit')}
            </Button>
          </span>
        </Tooltip>
        <Tooltip title={t('common.delete')} arrow>
          <span>
            <IconButton
              size="small"
              className="!text-ink-muted hover:!text-danger"
              disabled={pending}
              onClick={() => onDeleteAssignment(assignment.assignmentId)}
            >
              <DeleteOutlineIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  )
}

function AccountInfoDialog({
  accountId,
  open,
  onClose,
  onUpdateStatus,
  onResetPassword,
  statusPending,
  passwordPending,
  t,
}) {
  const [showPassword, setShowPassword] = useState(false)
  const { data, isPending } = useAccountQuery(accountId, { enabled: open && Boolean(accountId) })
  const account = data?.account
  const displayName = account?.email || '—'
  const role =
    data?.effectiveRoles?.[0] || data?.roles?.[0]?.code || data?.roles?.[0] || 'anonymous'
  const department = data?.scopes?.find((scope) => scope.scopeType === 'department')?.scopeName
  const passwordValue = showPassword ? t('rbac.users.viewModal.passwordUnavailable') : '••••••••'

  const handleResetPassword = () => {
    const password = window.prompt(t('rbac.users.viewModal.resetPasswordPrompt'))
    if (password) {
      onResetPassword({ accountId, password })
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ className: 'rounded-xl' }}
    >
      <DialogTitle className="pb-2 pr-10 font-semibold text-ink">
        {t('rbac.users.viewModal.title', { name: displayName })}
        <IconButton
          onClick={onClose}
          aria-label={t('common.close')}
          className="!absolute !right-3 !top-3 !text-ink-muted"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent className="flex flex-col gap-5 px-6 pb-3 pt-3">
        {isPending ? (
          <Typography color="text.disabled">{t('rbac.common.loading')}</Typography>
        ) : (
          <>
            <Box>
              <UserFieldLabel>{t('rbac.users.viewModal.loginName')}</UserFieldLabel>
              <Typography variant="body1" className="font-medium text-ink">
                {account?.email || '—'}
              </Typography>
            </Box>

            <Box>
              <UserFieldLabel>{t('rbac.users.viewModal.password')}</UserFieldLabel>
              <TextField
                size="small"
                fullWidth
                disabled
                value={passwordValue}
                sx={{
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: 'rgba(26,26,26,0.6)',
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        variant="text"
                        size="small"
                        color="primary"
                        className="!min-w-0 !px-1 !text-xs !font-semibold"
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword
                          ? t('rbac.users.viewModal.hidePassword')
                          : t('rbac.users.viewModal.showPassword')}
                      </Button>
                      <Divider orientation="vertical" flexItem className="mx-1 my-2" />
                      <Button
                        variant="text"
                        size="small"
                        color="primary"
                        disabled={passwordPending}
                        className="!min-w-0 !whitespace-nowrap !px-1 !text-xs !font-semibold"
                        onClick={handleResetPassword}
                      >
                        {t('rbac.users.viewModal.resetPassword')}
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box className="mt-2 grid grid-cols-2 gap-4">
              <Box>
                <UserFieldLabel>{t('rbac.users.viewModal.role')}</UserFieldLabel>
                <UserRoleChip role={role} />
              </Box>
              <Box>
                <UserFieldLabel>{t('rbac.users.viewModal.status')}</UserFieldLabel>
                <Stack direction="row" alignItems="center" className="gap-2">
                  <Switch
                    color="primary"
                    checked={account?.status === 'active'}
                    disabled={statusPending}
                    onChange={(event) =>
                      onUpdateStatus({
                        accountId,
                        status: event.target.checked ? 'active' : 'inactive',
                      })
                    }
                  />
                  <Typography variant="body2" className="font-medium text-ink">
                    {t(getStatusMeta(account?.status).labelKey)}
                  </Typography>
                </Stack>
              </Box>
            </Box>

            <Box>
              <UserFieldLabel>{t('rbac.users.viewModal.department')}</UserFieldLabel>
              <TextField
                size="small"
                fullWidth
                disabled
                value={department || t('rbac.users.viewModal.noDepartment')}
                sx={{
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: 'rgba(26,26,26,0.6)',
                  },
                }}
              />
            </Box>

            <Box className="grid grid-cols-2 gap-4">
              <Box>
                <UserFieldLabel>{t('rbac.users.viewModal.createdAt')}</UserFieldLabel>
                <Typography variant="body1" className="font-semibold text-ink">
                  {formatShortDate(account?.createdAt)}
                </Typography>
              </Box>
              <Box>
                <UserFieldLabel>{t('rbac.users.viewModal.createdBy')}</UserFieldLabel>
                <Typography variant="body1" className="font-semibold text-ink">
                  {account?.createdBy?.fullName || account?.createdBy?.email || '—'}
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions className="justify-end px-6 pb-6 pt-2">
        <Button
          variant="outlined"
          size="medium"
          className="h-10 rounded-lg px-6 text-sm font-semibold text-ink-secondary"
          onClick={onClose}
        >
          {t('rbac.users.viewModal.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function AccountFormDialog({ open, onClose, roles, onSubmit, pending, t }) {
  const [form, setForm] = useState(INITIAL_USER_FORM)

  const handleClose = () => {
    setForm(INITIAL_USER_FORM)
    onClose()
  }

  const submit = (event) => {
    event.preventDefault()
    onSubmit(form, handleClose)
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ className: 'rounded-xl' }}
    >
      <Box component="form" onSubmit={submit}>
        <DialogTitle className="pb-4 pr-10 font-semibold text-ink">
          {t('rbac.users.addModal.title')}
          <IconButton
            onClick={handleClose}
            aria-label={t('common.close')}
            className="!absolute !right-3 !top-3 !text-ink-muted"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent className="flex flex-col gap-5 px-6 pb-3 pt-2">
          <Stack className="gap-8 mt-4">
            <TextField
              label={t('rbac.users.addModal.fields.email')}
              placeholder={t('rbac.users.addModal.fields.emailPlaceholder')}
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              size="small"
              required
              fullWidth
              type="email"
              className="rounded-lg"
            />
            <Box>
              <TextField
                label={t('rbac.users.addModal.fields.password')}
                placeholder={t('rbac.users.addModal.fields.passwordPlaceholder')}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                size="small"
                required
                fullWidth
                type="password"
                className="rounded-lg"
              />
              <Typography variant="caption" className="mt-1 block text-ink-muted">
                {t('rbac.users.addModal.passwordHint')}
              </Typography>
            </Box>
            <FormControl fullWidth required size="small">
              <InputLabel>{t('rbac.users.addModal.fields.role')}</InputLabel>
              <Select
                label={t('rbac.users.addModal.fields.role')}
                value={form.roleId}
                onChange={(event) => setForm({ ...form, roleId: event.target.value })}
                displayEmpty
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {getRoleMeta(role.code || role.name).label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions className="gap-3 px-6 pb-6 pt-2">
          <Button
            onClick={handleClose}
            variant="outlined"
            className="h-10 rounded-lg px-5 text-sm font-semibold text-ink-secondary"
          >
            {t('rbac.users.addModal.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={pending}
            className="h-10 rounded-lg px-5 text-sm font-semibold"
          >
            {t('rbac.users.addModal.submit')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

function EditAccessDialog({
  accountId,
  open,
  onClose,
  roles,
  permissions,
  scopes,
  onCreateScopedAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  pending,
  t,
}) {
  const { data } = useAccountQuery(accountId, { enabled: open && Boolean(accountId) })
  const [permissionAssignment, setPermissionAssignment] = useState(null)
  const [assignmentForm, setAssignmentForm] = useState({
    roleId: '',
    scopeAssignmentValue: '',
  })

  const account = data?.account
  const scopeAssignmentOptions = [...scopes, ...(data?.scopes ?? [])].reduce((options, scope) => {
    const value = getScopeSelectValue(scope)
    if (!value || options.some((option) => getScopeSelectValue(option) === value)) return options

    return [...options, scope]
  }, [])
  const selectedScopeAssignment = scopeAssignmentOptions.find(
    (scope) => getScopeSelectValue(scope) === assignmentForm.scopeAssignmentValue,
  )

  const addScoped = () => {
    const { scopeType, scopeId } = parseScopeAssignmentValue(assignmentForm.scopeAssignmentValue)

    onCreateScopedAssignment({
      accountId,
      roleId: assignmentForm.roleId,
      scopeType,
      scopeId,
      customPermissionIds: [],
    })
    setAssignmentForm({
      roleId: '',
      scopeAssignmentValue: '',
    })
  }

  const savePermissionOverride = (payload) => {
    onUpdateAssignment(payload, () => setPermissionAssignment(null))
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ className: 'rounded-xl' }}
      >
        <DialogTitle className="pb-3 pr-10 font-semibold text-ink">
          {t('rbac.users.editAccessModal.title', {
            name: account?.email || '—',
          })}
          <IconButton
            onClick={onClose}
            aria-label={t('common.close')}
            className="!absolute !right-3 !top-3 !text-ink-muted"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent className="flex flex-col gap-5 px-6 pb-5 pt-0">
          <Stack className="gap-4">
            <Box className="rounded-lg border border-info bg-info-bg px-4 py-3">
              <Typography variant="body2" className="text-sm text-info-strong">
                {t('rbac.users.editAccessModal.banner')}
              </Typography>
            </Box>

            <Section>
              <Stack className="gap-4 p-4">
                <Box>
                  <Typography variant="body1" className="font-semibold text-ink">
                    {t('rbac.users.editAccessModal.scopedAccess')}
                  </Typography>
                  <Typography variant="body2" className="mt-1 text-ink-muted">
                    {t('rbac.users.editAccessModal.scopedAccessHint')}
                  </Typography>
                </Box>

                <Stack className="gap-3">
                  {(data?.scopes ?? []).length === 0 ? (
                    <Box className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
                      <Typography variant="body2" className="text-ink-muted">
                        {t('rbac.users.editAccessModal.noScopedAccess')}
                      </Typography>
                    </Box>
                  ) : (
                    (data?.scopes ?? []).map((assignment) => (
                      <AssignmentAccessRow
                        key={assignment.assignmentId}
                        assignment={assignment}
                        roles={roles}
                        scopeAssignmentOptions={scopeAssignmentOptions}
                        pending={pending}
                        onChangeAssignment={onUpdateAssignment}
                        onEditPermission={setPermissionAssignment}
                        onDeleteAssignment={onDeleteAssignment}
                        t={t}
                      />
                    ))
                  )}
                </Stack>

                <Box className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('rbac.users.editAccessModal.assignmentRole')}</InputLabel>
                    <Select
                      label={t('rbac.users.editAccessModal.assignmentRole')}
                      value={assignmentForm.roleId}
                      onChange={(event) =>
                        setAssignmentForm({ ...assignmentForm, roleId: event.target.value })
                      }
                    >
                      {roles.map((role) => (
                        <MenuItem key={role.id} value={role.id}>
                          {getRoleLabel(role)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel shrink>
                      {t('rbac.users.editAccessModal.scopeAssignment')}
                    </InputLabel>
                    <Select
                      displayEmpty
                      label={t('rbac.users.editAccessModal.scopeAssignment')}
                      value={assignmentForm.scopeAssignmentValue}
                      renderValue={(value) =>
                        value && selectedScopeAssignment ? (
                          getScopeAssignmentLabel(selectedScopeAssignment)
                        ) : (
                          <Typography component="span" variant="body2" className="text-ink-muted">
                            {t('rbac.users.editAccessModal.scopeAssignmentPlaceholder')}
                          </Typography>
                        )
                      }
                      onChange={(event) =>
                        setAssignmentForm({
                          ...assignmentForm,
                          scopeAssignmentValue: event.target.value,
                        })
                      }
                    >
                      <MenuItem disabled value="">
                        {t('rbac.users.editAccessModal.scopeAssignmentPlaceholder')}
                      </MenuItem>
                      {scopeAssignmentOptions.map((scope) => {
                        const value = getScopeSelectValue(scope)

                        return (
                          <MenuItem key={value} value={value}>
                            <Box className="flex w-full items-center justify-between gap-3">
                              <Typography variant="body2" className="font-medium text-ink">
                                {getScopeName(scope)}
                              </Typography>
                              <ScopeTypeBadge scopeType={scope.scopeType} />
                            </Box>
                          </MenuItem>
                        )
                      })}
                    </Select>
                  </FormControl>
                </Box>
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    disabled={
                      !assignmentForm.roleId || !assignmentForm.scopeAssignmentValue || pending
                    }
                    onClick={addScoped}
                  >
                    {t('rbac.users.editAccessModal.addScopedAssignment')}
                  </Button>
                </Box>
              </Stack>
            </Section>
          </Stack>
        </DialogContent>
        <DialogActions className="border-t border-border px-6 pb-6 pt-4">
          <Button
            variant="outlined"
            size="medium"
            className="h-10 rounded-lg px-5 text-sm font-semibold text-ink-secondary"
            onClick={onClose}
          >
            {t('rbac.users.editAccessModal.cancel')}
          </Button>
        </DialogActions>
      </Dialog>
      <PermissionOverrideDialog
        key={permissionAssignment?.assignmentId ?? 'permission-override-closed'}
        open={Boolean(permissionAssignment)}
        assignment={permissionAssignment}
        permissions={permissions}
        pending={pending}
        onClose={() => setPermissionAssignment(null)}
        onSave={savePermissionOverride}
        t={t}
      />
    </>
  )
}

function RoleDialog({
  open,
  mode,
  value,
  permissions,
  permissionsPending,
  onClose,
  onSubmit,
  pending,
  t,
}) {
  const [form, setForm] = useState(() =>
    value
      ? {
          code: value.code || '',
          name: value.name || '',
          description: value.description || '',
          permissionIds: value.permissions || [],
        }
      : INITIAL_ROLE_FORM,
  )
  const [permissionSearch, setPermissionSearch] = useState('')
  const [selectedPermissionIds, setSelectedPermissionIds] = useState(
    () => new Set(getRolePermissionIds(value)),
  )
  const [collapsedModules, setCollapsedModules] = useState(() => new Set())

  const editing = mode === 'edit'
  const filteredRolePermissions = useMemo(
    () => filterPermissionsForRole(permissions, permissionSearch),
    [permissions, permissionSearch],
  )
  const permissionGroups = useMemo(
    () => groupPermissionsByModule(filteredRolePermissions),
    [filteredRolePermissions],
  )
  const allPermissionIds = useMemo(
    () => permissions.map((permission) => permission.id),
    [permissions],
  )
  const allSelected =
    allPermissionIds.length > 0 &&
    allPermissionIds.every((permissionId) => selectedPermissionIds.has(permissionId))

  const submit = (event) => {
    event.preventDefault()
    onSubmit({
      ...form,
      permissionIds: editing ? Array.from(selectedPermissionIds) : [],
    })
  }

  const togglePermission = (permissionId) => {
    setSelectedPermissionIds((current) => {
      const next = new Set(current)
      if (next.has(permissionId)) {
        next.delete(permissionId)
      } else {
        next.add(permissionId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedPermissionIds(allSelected ? new Set() : new Set(allPermissionIds))
  }

  const toggleModule = (moduleName) => {
    setCollapsedModules((current) => {
      const next = new Set(current)
      if (next.has(moduleName)) {
        next.delete(moduleName)
      } else {
        next.add(moduleName)
      }
      return next
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ className: 'rounded-xl' }}
      sx={editing ? { '& .MuiDialog-paper': { maxHeight: '85vh' } } : undefined}
    >
      <Box component="form" onSubmit={submit}>
        <DialogTitle className="pb-4 pr-10 font-semibold text-ink">
          {editing
            ? t('rbac.roles.editModal.title', { code: value?.code })
            : t('rbac.roles.addModal.title')}
          <IconButton
            onClick={onClose}
            aria-label={t('common.close')}
            className="!absolute !right-3 !top-3 !text-ink-muted"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent className="flex flex-col gap-4 px-6 pt-3">
          <Box className="grid grid-cols-2 gap-4">
            <Box>
              <UserFieldLabel>{t('rbac.roles.addModal.fields.codeLabel')}</UserFieldLabel>
              <TextField
                size="small"
                fullWidth
                disabled={editing}
                placeholder={t('rbac.roles.addModal.fields.codePlaceholder')}
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                required
                inputProps={{ style: { textTransform: 'uppercase' } }}
                sx={
                  editing
                    ? {
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: 'rgba(26,26,26,0.7)',
                        },
                      }
                    : undefined
                }
              />
            </Box>
            <Box>
              <UserFieldLabel>{t('rbac.roles.addModal.fields.nameLabel')}</UserFieldLabel>
              <TextField
                size="small"
                fullWidth
                placeholder={t('rbac.roles.addModal.fields.namePlaceholder')}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </Box>
          </Box>

          <Box>
            <UserFieldLabel>{t('rbac.roles.addModal.fields.descriptionLabel')}</UserFieldLabel>
            <TextField
              size="small"
              fullWidth
              multiline
              rows={editing ? 2 : 3}
              placeholder={t('rbac.roles.addModal.fields.descriptionPlaceholder')}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Box>

          {editing && (
            <Box className="flex flex-col gap-3">
              <Box className="flex items-center justify-between">
                <Typography
                  variant="body2"
                  className="text-sm font-semibold uppercase tracking-wide text-ink"
                >
                  {t('rbac.roles.editModal.permissions')}
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  color="primary"
                  className="!min-w-0 !px-0 !py-0 !text-sm !font-semibold"
                  onClick={toggleSelectAll}
                >
                  {t('rbac.roles.editModal.selectAll')}
                </Button>
              </Box>

              <TextField
                size="small"
                fullWidth
                value={permissionSearch}
                placeholder={t('rbac.roles.editModal.permissionSearch')}
                onChange={(event) => setPermissionSearch(event.target.value)}
              />

              <Box className="mt-2 overflow-y-auto" sx={{ maxHeight: 320 }}>
                {permissionsPending ? (
                  <Typography variant="body2" className="py-4 text-center text-ink-muted">
                    {t('rbac.common.loading')}
                  </Typography>
                ) : (
                  permissionGroups.map((group) => {
                    const collapsed = collapsedModules.has(group.module)
                    const checkedCount = group.permissions.filter((permission) =>
                      selectedPermissionIds.has(permission.id),
                    ).length

                    return (
                      <Box key={group.module}>
                        <Box
                          role="button"
                          tabIndex={0}
                          className="flex cursor-pointer items-center justify-between py-2"
                          onClick={() => toggleModule(group.module)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              toggleModule(group.module)
                            }
                          }}
                        >
                          <Box className="flex items-center gap-2">
                            {collapsed ? (
                              <ExpandMoreIcon className="text-ink-muted" sx={{ fontSize: 18 }} />
                            ) : (
                              <ExpandLessIcon className="text-ink-muted" sx={{ fontSize: 18 }} />
                            )}
                            <Typography
                              variant="caption"
                              className="text-[11px] font-semibold uppercase tracking-wide text-ink-secondary"
                            >
                              {group.module}
                            </Typography>
                          </Box>
                          <Typography variant="caption" className="text-[11px] text-ink-muted">
                            {checkedCount}/{group.permissions.length}
                          </Typography>
                        </Box>

                        {!collapsed &&
                          group.permissions.map((permission) => {
                            const checked = selectedPermissionIds.has(permission.id)

                            return (
                              <Box
                                key={permission.id}
                                className={`flex h-11 items-center justify-between border-b border-border last:border-b-0 ${
                                  checked ? 'bg-primary-light' : ''
                                }`}
                              >
                                <Box className="flex items-center gap-3">
                                  <Checkbox
                                    size="small"
                                    color="primary"
                                    checked={checked}
                                    onChange={() => togglePermission(permission.id)}
                                    sx={{ p: '4px' }}
                                  />
                                  <Typography variant="body2" className="text-ink">
                                    {permission.name || permission.code}
                                  </Typography>
                                </Box>
                                <Typography
                                  variant="caption"
                                  className="text-[11px] font-mono text-ink-muted"
                                >
                                  {permission.code}
                                </Typography>
                              </Box>
                            )
                          })}
                      </Box>
                    )
                  })
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions className="gap-3 border-t border-border px-6 pb-6 pt-3">
          <Button
            variant="outlined"
            size="medium"
            className="h-10 rounded-lg px-5 text-sm font-semibold text-ink-secondary"
            onClick={onClose}
          >
            {editing ? t('rbac.roles.editModal.cancel') : t('rbac.roles.addModal.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="medium"
            className="h-10 rounded-lg px-5 text-sm font-semibold"
            disabled={pending}
          >
            {editing ? t('rbac.roles.editModal.submit') : t('rbac.roles.addModal.submit')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

function PermissionCodeBadge({ code }) {
  return (
    <Box className="inline-flex items-center rounded border border-border bg-page px-2 py-0.5">
      <Typography
        variant="caption"
        className="font-mono text-[12px] font-medium tracking-wide text-ink-secondary"
      >
        {code || '—'}
      </Typography>
    </Box>
  )
}

function PermissionMetaCard({ children }) {
  return (
    <Box className="inline-flex min-h-6 items-center rounded border border-border bg-surface px-2 py-0.5">
      <Typography variant="body2" className="text-sm font-semibold text-ink">
        {children || '—'}
      </Typography>
    </Box>
  )
}

function PermissionDialog({ open, value, onClose, onSubmit, onDelete, pending, deletePending, t }) {
  const isEdit = Boolean(value)
  const [form, setForm] = useState(() =>
    value
      ? {
          code: value.code || '',
          module: value.module || 'ACCOUNTS',
          action: value.action || 'READ',
          name: value.name || '',
          description: value.description || '',
        }
      : INITIAL_PERMISSION_FORM,
  )

  const submit = (event) => {
    event.preventDefault()
    onSubmit(form)
  }

  const handleDelete = () => {
    if (window.confirm(t('rbac.permissions.editModal.deleteConfirm'))) {
      onDelete(value.id)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ className: 'rounded-xl' }}
    >
      <Box component="form" onSubmit={submit}>
        <DialogTitle className="pr-10 pb-3 font-semibold text-ink">
          {isEdit ? t('rbac.permissions.editModal.title') : t('rbac.permissions.addModal.title')}
          <IconButton
            aria-label={t('common.close')}
            onClick={onClose}
            className="!absolute !right-3 !top-3 !text-ink-muted"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers className="flex flex-col gap-4 pt-3">
          <Box>
            <UserFieldLabel>
              {isEdit
                ? t('rbac.permissions.editModal.fields.codeLabel')
                : t('rbac.permissions.addModal.fields.codeLabel')}
            </UserFieldLabel>
            <TextField
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              placeholder={t('rbac.permissions.addModal.fields.codePlaceholder')}
              disabled={isEdit}
              size="small"
              required
              fullWidth
              inputProps={{ className: 'font-mono uppercase' }}
            />
            {isEdit && (
              <Typography variant="caption" className="mt-1 block text-[11px] text-ink-muted">
                {t('rbac.permissions.editModal.codeHint')}
              </Typography>
            )}
          </Box>
          {!isEdit && (
            <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Box>
                <UserFieldLabel>{t('rbac.permissions.addModal.fields.moduleLabel')}</UserFieldLabel>
                <FormControl size="small" fullWidth required>
                  <Select
                    value={form.module}
                    onChange={(event) => setForm({ ...form, module: event.target.value })}
                  >
                    {PERMISSION_MODULE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <UserFieldLabel>{t('rbac.permissions.addModal.fields.actionLabel')}</UserFieldLabel>
                <FormControl size="small" fullWidth required>
                  <Select
                    value={form.action}
                    onChange={(event) => setForm({ ...form, action: event.target.value })}
                  >
                    {PERMISSION_ACTION_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          )}
          <Box>
            <UserFieldLabel>
              {isEdit
                ? t('rbac.permissions.editModal.fields.nameLabel')
                : t('rbac.permissions.addModal.fields.nameLabel')}
            </UserFieldLabel>
            <TextField
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder={t('rbac.permissions.addModal.fields.namePlaceholder')}
              size="small"
              required
              fullWidth
            />
          </Box>
          <Box>
            <UserFieldLabel>
              {isEdit
                ? t('rbac.permissions.editModal.fields.descriptionLabel')
                : t('rbac.permissions.addModal.fields.descriptionLabel')}
            </UserFieldLabel>
            <TextField
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder={t('rbac.permissions.addModal.fields.descriptionPlaceholder')}
              multiline
              rows={2}
              size="small"
              fullWidth
            />
          </Box>
          {isEdit && (
            <Box className="mt-1 grid grid-cols-2 gap-3 rounded-lg border border-border bg-page p-3 sm:grid-cols-4">
              <Box>
                <Typography
                  variant="caption"
                  className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted"
                >
                  {t('rbac.permissions.editModal.metadata.module')}
                </Typography>
                <Typography variant="body2" className="text-sm font-semibold text-ink">
                  {value.module || '—'}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted"
                >
                  {t('rbac.permissions.editModal.metadata.action')}
                </Typography>
                <PermissionMetaCard>{value.action}</PermissionMetaCard>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted"
                >
                  {t('rbac.permissions.editModal.metadata.created')}
                </Typography>
                <Typography variant="body2" className="text-sm text-ink">
                  {formatShortDate(value.createdAt)}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted"
                >
                  {t('rbac.permissions.editModal.metadata.updated')}
                </Typography>
                <Typography variant="body2" className="text-sm text-ink">
                  {formatDate(value.updatedAt)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions className="flex items-center !justify-between px-6 pt-3 pb-6">
          <Box className="pl-4">
            {isEdit && (
              <Button
                variant="contained"
                color="error"
                size="medium"
                className="h-10 rounded-lg px-5 text-sm font-semibold"
                disabled={deletePending}
                onClick={handleDelete}
              >
                {t('rbac.permissions.actions.delete')}
              </Button>
            )}
          </Box>
          <Box className="flex items-center gap-3 pr-4">
            <Button
              variant="outlined"
              size="medium"
              className="h-10 rounded-lg border-border px-5 text-sm font-semibold text-ink-secondary"
              onClick={onClose}
            >
              {isEdit
                ? t('rbac.permissions.editModal.cancel')
                : t('rbac.permissions.addModal.cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="medium"
              className="h-10 rounded-lg px-5 text-sm font-semibold"
              disabled={pending}
            >
              {isEdit
                ? t('rbac.permissions.editModal.submit')
                : t('rbac.permissions.addModal.submit')}
            </Button>
          </Box>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

function ScopeDialog({ open, value, departments, teams, onClose, onSubmit, pending, t }) {
  const isEdit = Boolean(value)
  const [form, setForm] = useState(() =>
    value
      ? {
          scopeType: value.scopeType || 'department',
          scopeId: value.scopeId || '',
          name: getScopeDisplayName(value) === '—' ? '' : getScopeDisplayName(value),
          code: value.resource?.code || value.resourceId || '',
          status: value.status || 'active',
        }
      : INITIAL_SCOPE_FORM,
  )

  const selectedDepartment = findById(departments, form.scopeId)
  const getDepartmentCode = (department) => {
    const source = department?.code || department?.name || ''
    const normalized = String(source)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    return normalized ? `DEPT-${normalized}` : ''
  }
  const resources = form.scopeType
    ? getScopeResourceOptions(form.scopeType, departments, teams)
    : []
  const typeOptions =
    isEdit && !SCOPE_CREATE_TYPE_OPTIONS.some((option) => option.value === form.scopeType)
      ? [
          SCOPE_TYPE_FILTER_OPTIONS.find((option) => option.value === form.scopeType) || {
            value: form.scopeType,
            labelKey: 'rbac.scopes.fields.scopeType',
          },
          ...SCOPE_CREATE_TYPE_OPTIONS,
        ]
      : SCOPE_CREATE_TYPE_OPTIONS
  const selectedType = typeOptions.find((option) => option.value === form.scopeType)
  const showResourceSelect = isEdit && form.scopeType !== 'global'
  const fieldControlClassName = 'rounded-lg bg-surface'
  const fieldControlSx = {
    '& .MuiInputBase-input::placeholder': {
      color: 'text.disabled',
      opacity: 1,
    },
    '& .MuiInputBase-input.Mui-disabled': {
      WebkitTextFillColor: 'rgba(26,26,26,0.45)',
    },
  }

  const submit = (event) => {
    event.preventDefault()
    onSubmit(form)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ className: 'rounded-xl bg-surface' }}
    >
      <Box component="form" onSubmit={submit}>
        <DialogTitle className="border-b border-border !px-6 !py-5 !pr-10">
          <Typography variant="h6" component="span" className="font-semibold text-ink">
            {isEdit ? t('rbac.scopes.editModal.title') : t('rbac.scopes.addModal.title')}
          </Typography>
          <IconButton
            onClick={onClose}
            aria-label={t('common.close')}
            className="!absolute !right-3 !top-3 !text-ink-muted"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent className="flex flex-col gap-5 !px-6 !pb-6 !pt-3">
          <ScopeDialogField label={t('rbac.scopes.fields.scopeType')}>
            <TextField
              size="small"
              fullWidth
              value={
                isEdit && selectedType
                  ? t(selectedType.labelKey)
                  : t('rbac.scopes.fields.scopeTypePlaceholder')
              }
              disabled
              InputProps={{ className: fieldControlClassName }}
              sx={fieldControlSx}
            />
          </ScopeDialogField>

          {isEdit && showResourceSelect && (
            <ScopeDialogField
              label={
                form.scopeType === 'team'
                  ? t('rbac.scopes.addModal.fields.team')
                  : t('rbac.scopes.addModal.fields.department')
              }
            >
              <FormControl size="small" fullWidth disabled>
                <Select
                  value={form.scopeId}
                  displayEmpty
                  className={fieldControlClassName}
                  sx={fieldControlSx}
                  renderValue={(selected) => {
                    const resource = findById(resources, selected)
                    if (resource) return `${resource.name} (${resource.code || resource.id})`
                    return value?.resource?.name || value?.resource?.code || selected || ''
                  }}
                >
                  {resources.map((resource) => (
                    <MenuItem key={resource.id} value={resource.id}>
                      {resource.name} ({resource.code || resource.id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </ScopeDialogField>
          )}

          {!isEdit && (
            <ScopeDialogField label={t('rbac.scopes.addModal.fields.department')}>
              <FormControl size="small" fullWidth>
                <Select
                  value={form.scopeId}
                  onChange={(event) => {
                    const department = findById(departments, event.target.value)
                    setForm({
                      ...form,
                      scopeId: event.target.value,
                      code: form.name ? form.code : getDepartmentCode(department),
                    })
                  }}
                  displayEmpty
                  className={fieldControlClassName}
                  sx={fieldControlSx}
                  renderValue={(selected) => {
                    const department = findById(departments, selected)
                    if (department) return department.name || department.code || department.id
                    return (
                      <Typography variant="body2" className="text-ink-muted">
                        {t('rbac.scopes.addModal.fields.departmentPlaceholder')}
                      </Typography>
                    )
                  }}
                >
                  <MenuItem value="" disabled>
                    {t('rbac.scopes.addModal.fields.departmentPlaceholder')}
                  </MenuItem>
                  {departments.map((department) => (
                    <MenuItem key={department.id} value={department.id}>
                      {department.name || department.code || department.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </ScopeDialogField>
          )}

          <ScopeDialogField
            label={
              isEdit ? t('rbac.scopes.fields.name') : t('rbac.scopes.addModal.fields.teamName')
            }
          >
            <TextField
              size="small"
              value={form.name}
              onChange={(event) => {
                const nextName = event.target.value
                setForm({
                  ...form,
                  name: nextName,
                  code: nextName ? form.code : getDepartmentCode(selectedDepartment),
                })
              }}
              fullWidth
              placeholder={
                isEdit
                  ? t('rbac.scopes.fields.namePlaceholder')
                  : t('rbac.scopes.addModal.fields.teamNamePlaceholder')
              }
              InputProps={{ className: fieldControlClassName }}
              sx={fieldControlSx}
            />
          </ScopeDialogField>

          <ScopeDialogField label={t('rbac.scopes.addModal.fields.code')}>
            <TextField
              size="small"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
              fullWidth
              placeholder={t('rbac.scopes.addModal.fields.codePlaceholder')}
              disabled={isEdit || !form.name}
              InputProps={{ className: fieldControlClassName }}
              inputProps={{ className: 'font-mono uppercase' }}
              sx={fieldControlSx}
            />
          </ScopeDialogField>

          {isEdit && (
            <ScopeDialogField label={t('rbac.scopes.fields.status')}>
              <Select
                fullWidth
                displayEmpty
                size="small"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
                className={fieldControlClassName}
                sx={fieldControlSx}
              >
                {SCOPE_STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </MenuItem>
                ))}
              </Select>
            </ScopeDialogField>
          )}
        </DialogContent>
        <DialogActions className="justify-between border-t border-border !px-6 !pb-6 !pt-2">
          <Button
            variant="outlined"
            color="inherit"
            size="medium"
            className="h-10 rounded-lg border-border px-6 text-sm font-semibold text-ink-secondary"
            onClick={onClose}
          >
            {isEdit ? t('rbac.scopes.editModal.cancel') : t('rbac.scopes.addModal.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="medium"
            className="h-10 rounded-lg px-6 text-sm font-semibold"
            disabled={pending || (!isEdit && !form.scopeId)}
          >
            {isEdit ? t('rbac.scopes.editModal.submit') : t('rbac.scopes.addModal.submit')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

function OverrideFieldLabel({ children, required = false }) {
  return (
    <Typography
      variant="caption"
      className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted"
    >
      {children}
      {required && (
        <Typography component="span" className="ml-0.5 text-danger">
          *
        </Typography>
      )}
    </Typography>
  )
}

function PermissionMultiSelect({
  permissions,
  selectedIds,
  onChange,
  placeholder,
  disabled = false,
}) {
  const selectedPermissions = permissions.filter((permission) =>
    selectedIds.includes(permission.id),
  )

  return (
    <Stack className="gap-2">
      <FormControl size="small" fullWidth disabled={disabled}>
        <Select
          multiple
          displayEmpty
          value={selectedIds}
          onChange={(event) => onChange(event.target.value)}
          renderValue={(selected) =>
            selected.length === 0 ? (
              <Typography variant="body2" className="text-ink-muted">
                {placeholder}
              </Typography>
            ) : (
              selected
                .map((permissionId) =>
                  permissions.find((permission) => permission.id === permissionId),
                )
                .filter(Boolean)
                .map((permission) => permission.name || permission.code)
                .join(', ')
            )
          }
        >
          {permissions.map((permission) => (
            <MenuItem key={permission.id} value={permission.id}>
              <Checkbox checked={selectedIds.includes(permission.id)} />
              <Box>
                <Typography variant="body2" className="font-medium text-ink">
                  {permission.name || permission.code}
                </Typography>
                <Typography variant="caption" className="font-mono text-ink-muted">
                  {permission.code}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {selectedPermissions.length > 0 && (
        <Box className="flex flex-wrap gap-2">
          {selectedPermissions.map((permission) => (
            <Chip
              key={permission.id}
              size="small"
              variant="outlined"
              label={permission.name || permission.code}
              onDelete={() =>
                onChange(selectedIds.filter((permissionId) => permissionId !== permission.id))
              }
              deleteIcon={<CloseIcon />}
              className="!h-6 !rounded-md !border-secondary !bg-secondary-light text-xs font-medium !text-secondary"
              sx={{ '& .MuiChip-label': { px: '8px' } }}
            />
          ))}
        </Box>
      )}
    </Stack>
  )
}

function GrantPermissionModal({ open, context, permissions, onClose, onSubmit, pending, t }) {
  const [selectedPermissionIds, setSelectedPermissionIds] = useState([])
  const [note, setNote] = useState('')
  const section = context?.section
  const group = context?.group
  const availablePermissions = getAvailableOverridePermissions({
    permissions,
    role: section?.role,
    rule: group,
  })

  const submit = (event) => {
    event.preventDefault()
    onSubmit({
      ...buildScopedRulePayload({
        role: section?.role,
        scope: group,
        permissionIds: [...(group?.permissionIds ?? []), ...selectedPermissionIds],
      }),
      note,
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ className: 'rounded-xl' }}
    >
      <Box component="form" onSubmit={submit}>
        <DialogTitle className="pr-10 font-semibold text-ink">
          {t('rbac.scopedOverrides.grantModal.title')}
          <IconButton
            onClick={onClose}
            aria-label={t('common.close')}
            className="!absolute !right-3 !top-3 !text-ink-muted"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent className="flex flex-col gap-4 pt-2">
          <Box className="rounded-lg border border-info bg-info-bg px-4 py-2.5">
            <Typography variant="body2" className="text-sm font-medium text-info">
              {t('rbac.scopedOverrides.grantModal.contextPrefix', {
                role: section?.roleName,
                scopeType: group?.scopeType,
                scopeName: getScopeOptionLabel(group?.scope || group),
              })}
            </Typography>
          </Box>
          <Box>
            <OverrideFieldLabel>
              {t('rbac.scopedOverrides.grantModal.permissionsLabel')}
            </OverrideFieldLabel>
            <PermissionMultiSelect
              permissions={availablePermissions}
              selectedIds={selectedPermissionIds}
              onChange={setSelectedPermissionIds}
              placeholder={t('rbac.scopedOverrides.grantModal.permissionsPlaceholder')}
            />
          </Box>
          <Box>
            <OverrideFieldLabel>
              {t('rbac.scopedOverrides.grantModal.noteLabel')}
            </OverrideFieldLabel>
            <TextField
              multiline
              rows={3}
              size="small"
              fullWidth
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('rbac.scopedOverrides.grantModal.notePlaceholder')}
            />
          </Box>
        </DialogContent>
        <DialogActions className="gap-3 px-6 pb-6 pt-2">
          <Button
            variant="outlined"
            className="h-10 rounded-lg border-border px-5 text-sm font-semibold text-ink-secondary"
            onClick={onClose}
          >
            {t('rbac.scopedOverrides.grantModal.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            className="h-10 rounded-lg px-5 text-sm font-semibold"
            disabled={pending || selectedPermissionIds.length === 0}
          >
            {t('rbac.scopedOverrides.grantModal.submit')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

function GrantScopedPermissionModal({
  open,
  role,
  scopes,
  permissions,
  rules,
  onClose,
  onSubmit,
  pending,
  t,
}) {
  const [scopeType, setScopeType] = useState('')
  const [scopeId, setScopeId] = useState('')
  const [selectedPermissionIds, setSelectedPermissionIds] = useState([])
  const [note, setNote] = useState('')
  const selectedScope = scopes.find(
    (scope) => scope.scopeType === scopeType && scope.scopeId === scopeId,
  )
  const existingRule = rules.find(
    (rule) => rule.roleId === role?.id && rule.scopeType === scopeType && rule.scopeId === scopeId,
  )
  const availablePermissions = getAvailableOverridePermissions({
    permissions,
    role,
    rule: existingRule,
  })
  const scopeOptions = scopes.filter((scope) => scope.scopeType === scopeType)
  const scopeHint =
    scopeType === 'department'
      ? t('rbac.scopedOverrides.scopedGrantModal.scopeHintDepartment')
      : scopeType === 'team'
        ? t('rbac.scopedOverrides.scopedGrantModal.scopeHintTeam')
        : t('rbac.scopedOverrides.scopedGrantModal.scopeTypeHint')

  const submit = (event) => {
    event.preventDefault()
    onSubmit({
      ...buildScopedRulePayload({
        role,
        scope: selectedScope,
        permissionIds: [...(existingRule?.permissionIds ?? []), ...selectedPermissionIds],
      }),
      note,
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ className: 'rounded-xl' }}
    >
      <Box component="form" onSubmit={submit}>
        <DialogTitle className="pr-10">
          <Typography variant="h6" className="font-semibold text-ink">
            {t('rbac.scopedOverrides.scopedGrantModal.title', {
              name: getOverrideRoleName(role),
            })}
          </Typography>
          <IconButton
            onClick={onClose}
            aria-label={t('common.close')}
            className="!absolute !right-3 !top-3 !text-ink-muted"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent className="flex flex-col gap-4 pt-3">
          <Box>
            <OverrideFieldLabel required>
              {t('rbac.scopedOverrides.scopedGrantModal.scopeTypeLabel')}
            </OverrideFieldLabel>
            <FormControl size="small" fullWidth>
              <Select
                displayEmpty
                value={scopeType}
                onChange={(event) => {
                  setScopeType(event.target.value)
                  setScopeId('')
                  setSelectedPermissionIds([])
                }}
                renderValue={(value) =>
                  value ? (
                    t(`rbac.scopedOverrides.scopedGrantModal.scopeTypes.${value}`)
                  ) : (
                    <Typography variant="body2" className="text-ink-muted">
                      {t('rbac.scopedOverrides.scopedGrantModal.scopeTypePlaceholder')}
                    </Typography>
                  )
                }
              >
                <MenuItem value="" disabled>
                  {t('rbac.scopedOverrides.scopedGrantModal.scopeTypePlaceholder')}
                </MenuItem>
                <MenuItem value="global" disabled>
                  {t('rbac.scopedOverrides.scopedGrantModal.scopeTypes.global')}
                </MenuItem>
                <MenuItem value="department">
                  {t('rbac.scopedOverrides.scopedGrantModal.scopeTypes.department')}
                </MenuItem>
                <MenuItem value="team">
                  {t('rbac.scopedOverrides.scopedGrantModal.scopeTypes.team')}
                </MenuItem>
              </Select>
            </FormControl>
            <Typography
              variant="caption"
              className="mt-0.5 block text-[11px] italic text-ink-muted"
            >
              {t('rbac.scopedOverrides.scopedGrantModal.scopeTypeHint')}
            </Typography>
          </Box>
          <Box>
            <OverrideFieldLabel required>
              {t('rbac.scopedOverrides.scopedGrantModal.scopeLabel')}
            </OverrideFieldLabel>
            <FormControl size="small" fullWidth disabled={!scopeType || scopeType === 'global'}>
              <Select
                displayEmpty
                value={scopeId}
                onChange={(event) => {
                  setScopeId(event.target.value)
                  setSelectedPermissionIds([])
                }}
                renderValue={(value) => {
                  const scope = scopeOptions.find((item) => item.scopeId === value)
                  return scope ? (
                    getScopeOptionLabel(scope)
                  ) : (
                    <Typography variant="body2" className="text-ink-muted">
                      {t('rbac.scopedOverrides.scopedGrantModal.scopePlaceholder')}
                    </Typography>
                  )
                }}
              >
                <MenuItem value="" disabled>
                  {t('rbac.scopedOverrides.scopedGrantModal.scopePlaceholder')}
                </MenuItem>
                {scopeOptions.map((scope) => (
                  <MenuItem key={scope.id} value={scope.scopeId}>
                    {getScopeOptionLabel(scope)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography
              variant="caption"
              className="mt-0.5 block text-[11px] italic text-ink-muted"
            >
              {scopeHint}
            </Typography>
          </Box>
          <Box>
            <OverrideFieldLabel required>
              {t('rbac.scopedOverrides.scopedGrantModal.permissionsLabel')}
            </OverrideFieldLabel>
            <PermissionMultiSelect
              permissions={availablePermissions}
              selectedIds={selectedPermissionIds}
              onChange={setSelectedPermissionIds}
              placeholder={t('rbac.scopedOverrides.scopedGrantModal.permissionsPlaceholder')}
              disabled={!scopeId}
            />
            <Typography
              variant="caption"
              className="mt-0.5 block text-[11px] italic text-ink-muted"
            >
              {t('rbac.scopedOverrides.scopedGrantModal.permissionsHint')}
            </Typography>
          </Box>
          <Box>
            <OverrideFieldLabel>
              {t('rbac.scopedOverrides.scopedGrantModal.noteLabel')}
            </OverrideFieldLabel>
            <TextField
              multiline
              rows={2}
              size="small"
              fullWidth
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('rbac.scopedOverrides.scopedGrantModal.notePlaceholder')}
            />
          </Box>
        </DialogContent>
        <DialogActions className="justify-between gap-3 px-6 pb-6 pt-2">
          <Button
            variant="outlined"
            className="h-10 rounded-lg border-border px-5 text-sm font-semibold text-ink-secondary"
            onClick={onClose}
          >
            {t('rbac.scopedOverrides.scopedGrantModal.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            className="h-10 rounded-lg px-5 text-sm font-semibold"
            disabled={!scopeType || !scopeId || selectedPermissionIds.length === 0 || pending}
          >
            {t('rbac.scopedOverrides.scopedGrantModal.submit')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

function PermissionBulletList({ permissions }) {
  return (
    <Box className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2 p-4">
      {permissions.map((permission) => (
        <Box key={permission.id} className="flex items-center gap-1.5">
          <Box className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
          <Typography variant="body2" className="text-sm text-ink-secondary">
            {permission.name || permission.code}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

function DefaultPermissionsPanel({ section, totalPermissions, t }) {
  const isAdmin = section.roleCode === 'ADMIN'

  return (
    <Paper elevation={0} className="rounded-lg border border-border ">
      <Box className="mb-3 flex items-center gap-2 p-4 bg-gray-100 rounded-t-lg">
        <Typography variant="body2" className="font-semibold text-ink">
          {t('rbac.scopedOverrides.defaultPermsTitle', { name: section.roleName })}
        </Typography>
        <Box className="inline-flex items-center gap-1 rounded border border-border bg-page px-2 py-0.5">
          <Typography variant="caption" className="text-[10px] font-semibold tracking-wide ">
            {t('rbac.scopedOverrides.defaultBadge')}
          </Typography>
        </Box>
      </Box>
      {isAdmin ? (
        <Typography variant="body2" className="italic text-ink-muted p-4">
          {t('rbac.scopedOverrides.fullAccessNote', { count: totalPermissions })}
        </Typography>
      ) : section.defaultPermissions.length === 0 ? (
        <Typography variant="body2" className="italic text-ink-muted p-4">
          {t('rbac.scopedOverrides.noDefaultNote')}
        </Typography>
      ) : (
        <PermissionBulletList permissions={section.defaultPermissions} />
      )}
    </Paper>
  )
}

function GrantedPermissionItem({ permission, onRevoke, t }) {
  return (
    <Box className="flex items-center justify-between py-1.5">
      <Box className="flex flex-col gap-0">
        <Typography variant="body2" className="text-sm text-ink-secondary">
          {permission.name || permission.permissionName || permission.code}
        </Typography>
        <Typography variant="caption" className="font-mono text-[11px] text-ink-muted">
          {permission.code || permission.permissionCode}
        </Typography>
      </Box>
      <Box className="flex items-center gap-1.5">
        <IconButton
          size="small"
          className="!p-0.5 !text-ink-muted hover:!text-danger"
          onClick={onRevoke}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
        <Chip
          label={t('rbac.scopedOverrides.grantedBadge')}
          size="small"
          variant="outlined"
          className="!h-5 !rounded !border-success !bg-success-bg text-[11px] font-medium !text-success"
          sx={{ '& .MuiChip-label': { px: '6px' } }}
        />
      </Box>
    </Box>
  )
}

function GrantedPermissionsPanel({ section, onGrant, onRevoke, t }) {
  const isAdmin = section.roleCode === 'ADMIN'
  const isAnonymous = section.roleCode === 'ANONYMOUS'

  return (
    <Paper elevation={0} className="rounded-lg border border-border bg-danger-bg">
      <Box className="mb-3 flex items-center gap-2 bg-red-50 p-4 rounded-t-lg">
        <Typography variant="body2" className="font-semibold text-ink">
          {t('rbac.scopedOverrides.grantedTitle', { name: section.roleName })}
        </Typography>
        <Box className="inline-flex items-center gap-1 rounded border border-danger bg-danger-bg px-2 py-0.5">
          <Typography
            variant="caption"
            className="text-[10px] font-semibold tracking-wide text-danger"
          >
            {t('rbac.scopedOverrides.grantBadge')}
          </Typography>
        </Box>
      </Box>
      {isAdmin ? (
        <Typography variant="body2" className="italic text-ink-muted p-4">
          {t('rbac.scopedOverrides.adminGrantNote')}
        </Typography>
      ) : section.overrideGroups.length === 0 ? (
        <Typography variant="body2" className="italic text-ink-muted p-4">
          {isAnonymous
            ? t('rbac.scopedOverrides.noOverrideAnonymousNote')
            : t('rbac.scopedOverrides.noOverrideNote')}
        </Typography>
      ) : (
        section.overrideGroups.map((group) => (
          <Box key={group.id} className="mb-3 last:mb-0 p-4">
            <Box className="mb-1 mt-3 flex items-center justify-between first:mt-0">
              <Typography
                variant="caption"
                className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted"
              >
                {group.scopeLabel}
              </Typography>
              <Button
                variant="text"
                size="small"
                color="primary"
                className="!min-w-0 !px-0 !py-0 !text-sm !font-semibold"
                onClick={() => onGrant(group)}
              >
                {t('rbac.scopedOverrides.addMore')}
              </Button>
            </Box>
            {group.permissions.map((permission) => (
              <GrantedPermissionItem
                key={permission.id}
                permission={permission}
                t={t}
                onRevoke={() => onRevoke(group, permission)}
              />
            ))}
          </Box>
        ))
      )}
    </Paper>
  )
}

function RoleOverrideSection({ section, totalPermissions, onEditRole, onGrant, onRevoke, t }) {
  const isAnonymous = section.roleCode === 'ANONYMOUS'

  return (
    <Box>
      <Box className="mb-3 mt-6 flex items-center justify-between">
        <Box className="flex items-center gap-2">
          <Typography variant="body1" className="font-semibold text-ink">
            {t('rbac.scopedOverrides.roleLabel', { name: section.roleName })}
          </Typography>
          <UserRoleChip role={section.roleCode} />
        </Box>
        <Button
          variant="text"
          size="small"
          color="primary"
          className="!min-w-0 !px-0 !py-0 !text-sm !font-semibold"
          onClick={onEditRole}
        >
          {isAnonymous
            ? t('rbac.scopedOverrides.editAnonymousPerms')
            : t('rbac.scopedOverrides.editRolePerms', { name: section.roleName })}
        </Button>
      </Box>
      <Box className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DefaultPermissionsPanel section={section} totalPermissions={totalPermissions} t={t} />
        <GrantedPermissionsPanel section={section} onGrant={onGrant} onRevoke={onRevoke} t={t} />
      </Box>
    </Box>
  )
}

export default function UsersRolesPage() {
  const { i18n, t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          color="primary"
          className="ml-auto h-10 rounded-lg text-sm font-semibold"
          onClick={() => setDialog({ type: 'add-account', payload: null })}
        >
          {t('rbac.users.actions.addUser')}
        </Button>
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
                          <Tooltip title={t('rbac.users.actions.editAccess')} arrow>
                            <IconButton
                              size="small"
                              color="primary"
                              aria-label={t('rbac.users.actions.editAccess')}
                              onClick={() => setDialog({ type: 'edit-access', payload: accountId })}
                            >
                              <ManageAccountsOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          className="h-10 whitespace-nowrap rounded-lg text-sm font-semibold"
          onClick={() => setDialog({ type: 'role', payload: null })}
        >
          {t('rbac.roles.actions.addRole')}
        </Button>
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
                        <Button
                          variant="text"
                          size="small"
                          color="primary"
                          className="!min-w-0 !px-0 !py-0 !text-sm !font-semibold"
                          onClick={() => setDialog({ type: 'role', payload: role })}
                        >
                          {t('rbac.roles.actions.edit')}
                        </Button>
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
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          className="ml-auto h-10 whitespace-nowrap rounded-lg text-sm font-semibold"
          onClick={() => setDialog({ type: 'permission', payload: null })}
        >
          {t('rbac.permissions.actions.addPermission')}
        </Button>
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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          className="h-10 whitespace-nowrap rounded-lg text-sm font-semibold lg:ml-auto"
          onClick={() => setDialog({ type: 'scope', payload: null })}
        >
          {t('rbac.scopes.actions.addScope')}
        </Button>
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

      <Tabs
        value={activeTab}
        onChange={(_, value) => setActiveTab(value)}
        TabIndicatorProps={{ style: { height: 2 } }}
        className="border-b border-border"
        sx={(theme) => ({
          minHeight: 40,
          '& .MuiTab-root': {
            minHeight: 40,
            textTransform: 'none',
            color: theme.palette.text.secondary,
            fontWeight: 400,
          },
          '& .MuiTab-root.Mui-selected': {
            color: theme.palette.primary.main,
            fontWeight: 600,
          },
        })}
      >
        {TABS.map((tab) => (
          <Tab key={tab.id} value={tab.id} label={t(tab.labelKey)} />
        ))}
      </Tabs>

      {activeTab === TAB_KEYS.USERS && renderUsers()}
      {activeTab === TAB_KEYS.ROLES && renderRoles()}
      {activeTab === TAB_KEYS.PERMISSIONS && renderPermissions()}
      {activeTab === TAB_KEYS.SCOPES && renderScopes()}
      {activeTab === TAB_KEYS.OVERRIDES && renderOverrides()}

      <AccountFormDialog
        open={dialog.type === 'add-account'}
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
        open={dialog.type === 'edit-access'}
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
        open={dialog.type === 'role'}
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
        open={dialog.type === 'permission'}
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
        open={dialog.type === 'grant-permission'}
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
        open={dialog.type === 'scoped-grant'}
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
