/* eslint-disable react-refresh/only-export-components */
import CloseIcon from '@mui/icons-material/Close'
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material'
import dayjs from 'dayjs'

import { StatusBadge } from '@/components/operations'

import { buildScopeAssignmentValue } from '../utils/rbacApi'
import { getScopeDepartmentName, getScopeDisplayName } from '../utils/scopesDisplay'
import { getScopeTypeLabel, getScopeTypeMeta } from '../utils/scopesDisplay'
import { getRoleMeta, getStatusMeta } from '../utils/usersDisplay'

export function UserStatusChip({ status, t }) {
  const meta = getStatusMeta(status)
  const tone = meta.key === 'active' ? 'success' : 'warning'

  return <StatusBadge tone={tone}>{t(meta.labelKey)}</StatusBadge>
}

export function UserRoleChip({ role }) {
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

export function UserFieldLabel({ children }) {
  return (
    <Typography
      variant="caption"
      className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted"
    >
      {children}
    </Typography>
  )
}

export function UserHeaderCell({ children, align = 'left', width }) {
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

export function ScopeTypeBadge({ scopeType }) {
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

export function ScopeDialogField({ label, children }) {
  return (
    <Box>
      <Typography variant="body2" className="mb-1 font-medium text-ink">
        {label}
      </Typography>
      {children}
    </Box>
  )
}

export function Section({ children }) {
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

export function EmptyRow({ colSpan, loading }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} align="center" sx={{ py: 6, color: 'text.disabled' }}>
        {loading ? 'Đang tải dữ liệu...' : 'Không có dữ liệu phù hợp'}
      </TableCell>
    </TableRow>
  )
}

export function PermissionCodeBadge({ code }) {
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

export function PermissionMetaCard({ children }) {
  return (
    <Box className="inline-flex min-h-6 items-center rounded border border-border bg-surface px-2 py-0.5">
      <Typography variant="body2" className="text-sm font-semibold text-ink">
        {children || '—'}
      </Typography>
    </Box>
  )
}

export function OverrideFieldLabel({ children, required = false }) {
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

export function PermissionMultiSelect({
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

export function PermissionBulletList({ permissions }) {
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

export function DefaultPermissionsPanel({ section, totalPermissions, t }) {
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

export function GrantedPermissionItem({ permission, onRevoke, t }) {
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

export function GrantedPermissionsPanel({ section, onGrant, onRevoke, t }) {
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

export function RoleOverrideSection({
  section,
  totalPermissions,
  onEditRole,
  onGrant,
  onRevoke,
  t,
}) {
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

// Extracted from UsersRolesPage.jsx
export const TAB_KEYS = {
  USERS: 'users',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  SCOPES: 'scopes',
  OVERRIDES: 'overrides',
}

export const TABS = [
  { id: TAB_KEYS.USERS, labelKey: 'rbac.tabs.users' },
  { id: TAB_KEYS.ROLES, labelKey: 'rbac.tabs.roles' },
  { id: TAB_KEYS.PERMISSIONS, labelKey: 'rbac.tabs.permissions' },
  { id: TAB_KEYS.SCOPES, labelKey: 'rbac.tabs.scopes' },
  { id: TAB_KEYS.OVERRIDES, labelKey: 'rbac.tabs.scopedOverrides' },
]

export const ACCOUNT_STATUSES = [
  { value: '', labelKey: 'rbac.users.status.all' },
  { value: 'active', labelKey: 'rbac.users.status.active' },
  { value: 'inactive', labelKey: 'rbac.users.status.inactive' },
  { value: 'archived', labelKey: 'rbac.users.status.archived' },
]

export const INITIAL_USER_FORM = {
  email: '',
  password: '',
  roleId: '',
  scopeType: '',
  scopeId: '',
  customPermissionIds: [],
}

export const INITIAL_ROLE_FORM = {
  code: '',
  name: '',
  description: '',
  permissionIds: [],
}

export const INITIAL_PERMISSION_FORM = {
  code: '',
  module: 'ACCOUNTS',
  action: 'READ',
  name: '',
  description: '',
}

export const INITIAL_SCOPE_FORM = {
  scopeType: '',
  scopeId: '',
  name: '',
  code: '',
  status: 'active',
}

export function getItems(result) {
  return result?.items ?? []
}

export function getPagination(result) {
  return {
    page: Number(result?.page ?? 1),
    limit: Number(result?.limit ?? 10),
    total: Number(result?.total ?? getItems(result).length),
  }
}

export function formatDate(value) {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—'
}

export function formatShortDate(value) {
  return value ? dayjs(value).format('DD/MM/YYYY') : '—'
}

export function getAccountName(account) {
  return account?.account?.email || account?.email || '—'
}

export function getAccountEmail(account) {
  return account?.account?.email || account?.email || '—'
}

export function getAccountId(account) {
  return account?.account?.id || account?.id
}

export function getPrimaryRole(account) {
  const assignment = account?.roleAssignments?.[0]
  return assignment?.roleCode || account?.roles?.[0] || '—'
}

export function getDepartmentName(account) {
  return account?.department?.name || account?.department?.code || '—'
}

export function getScopeName(scope) {
  return getScopeDisplayName(scope)
}

export function getScopeParent(scope) {
  return getScopeDepartmentName(scope)
}

export function getScopeAssignmentLabel(scope) {
  return scope ? `${getScopeName(scope)} - ${getScopeTypeLabel(scope.scopeType)}` : ''
}

export function getScopeSelectValue(scope) {
  return buildScopeAssignmentValue({
    scopeType: scope?.scopeType,
    scopeId: scope?.scopeId || scope?.resource?.id || scope?.resource?._id,
  })
}

export function getAssignmentRoleId(assignment, roles = []) {
  const explicitRoleId = assignment?.roleId || assignment?.role?.id || assignment?.role?._id
  if (explicitRoleId) return explicitRoleId

  const roleRef = assignment?.roles?.[0] || assignment?.role?.code || assignment?.role?.name
  const matchedRole = roles.find(
    (role) => role.id === roleRef || role.code === roleRef || role.name === roleRef,
  )

  return matchedRole?.id || ''
}

export function getAssignmentScopeValue(assignment) {
  return getScopeSelectValue(assignment)
}

export function getRoleLabel(role) {
  return role?.name || role?.code || '—'
}

export function findById(items, id) {
  return items.find((item) => item.id === id)
}
