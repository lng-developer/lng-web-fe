import { useMemo, useState } from 'react'
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined'
import SearchIcon from '@mui/icons-material/Search'
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'

import { useAccountQuery } from '../api/rbac.queries'
import { groupPermissionsByModule } from '../utils/rolesDisplay'
import { formatLastLoginLabel, getAccountAccessSummary, getAvatarMeta } from '../utils/usersDisplay'
import {
  formatDate,
  getAccountEmail,
  getAccountId,
  getAccountName,
  getDepartmentName,
  getPrimaryRole,
  PermissionCodeBadge,
  ScopeTypeBadge,
  UserRoleChip,
  UserStatusChip,
} from './shared'

const MOBILE_SECTIONS = ['overview', 'global', 'scoped', 'effective']

function PermissionList({ permissions, emptyLabel, limit = 10, t }) {
  const [expanded, setExpanded] = useState(false)
  const codes = permissions
    .map((permission) => (typeof permission === 'string' ? permission : permission?.code))
    .filter(Boolean)
  const visible = expanded ? codes : codes.slice(0, limit)

  if (!codes.length) {
    return (
      <Typography variant="body2" className="text-ink-muted">
        {emptyLabel}
      </Typography>
    )
  }

  return (
    <Box>
      <Box className="flex flex-wrap gap-2">
        {visible.map((code) => (
          <PermissionCodeBadge key={code} code={code} />
        ))}
      </Box>
      {codes.length > limit && (
        <Button
          size="small"
          className="!mt-2 !min-w-0 !px-0"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded
            ? t('rbac.explorer.showLess')
            : t('rbac.explorer.viewAll', { count: codes.length })}
        </Button>
      )}
    </Box>
  )
}

function ResetPasswordDialog({ open, pending, onClose, onSubmit, t }) {
  const [password, setPassword] = useState('')
  const close = () => {
    setPassword('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={pending ? undefined : close} maxWidth="xs" fullWidth>
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(password, close)
        }}
      >
        <DialogTitle>{t('rbac.users.viewModal.resetDialog.title')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="password"
            value={password}
            label={t('rbac.users.viewModal.resetDialog.password')}
            helperText={t('rbac.users.viewModal.resetDialog.hint')}
            onChange={(event) => setPassword(event.target.value)}
            slotProps={{ htmlInput: { minLength: 6 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>{t('common.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={pending || password.length < 6}>
            {t('rbac.users.viewModal.resetPassword')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

function SectionHeading({ title, detail }) {
  return (
    <Box className="mb-4">
      <Typography variant="subtitle1" className="font-semibold text-ink">
        {title}
      </Typography>
      {detail && (
        <Typography variant="body2" className="mt-0.5 text-ink-muted">
          {detail}
        </Typography>
      )}
    </Box>
  )
}

export default function AccessExplorer({
  accounts,
  accountsQuery,
  filters,
  pagination,
  selectedAccountId,
  roles,
  permissions,
  departments,
  teams,
  canWrite,
  statusPending,
  passwordPending,
  sessionsPending,
  onFiltersChange,
  onSelectAccount,
  onEditAccess,
  onUpdateStatus,
  onResetPassword,
  onRevokeSessions,
  t,
  i18n,
}) {
  const [mobileSection, setMobileSection] = useState('overview')
  const [resetOpen, setResetOpen] = useState(false)
  const detailQuery = useAccountQuery(selectedAccountId, { enabled: Boolean(selectedAccountId) })
  const detail = detailQuery.data
  const selectedSummary = accounts.find(
    (account) => String(getAccountId(account)) === String(selectedAccountId),
  )
  const account = detail?.account
  const access = getAccountAccessSummary(detail)
  const effectiveGroups = groupPermissionsByModule(access.effectivePermissions, permissions)
  const identity = account || selectedSummary
  const displayName = getAccountName(identity) || getAccountEmail(identity) || selectedAccountId
  const email = getAccountEmail(identity)
  const avatarMeta = getAvatarMeta(displayName || email)
  const availableTeams = useMemo(
    () =>
      filters.departmentId
        ? teams.filter((team) => String(team.departmentId) === String(filters.departmentId))
        : teams,
    [filters.departmentId, teams],
  )
  const updateFilters = (values) => onFiltersChange({ ...filters, ...values, page: 1 })
  const sectionClass = (section) =>
    mobileSection === section
      ? 'block border-b border-border p-5 md:block'
      : 'hidden border-b border-border p-5 md:block'

  const actions = (
    <Stack className="gap-2">
      <Button
        variant="contained"
        startIcon={<ManageAccountsOutlinedIcon />}
        disabled={!selectedAccountId}
        onClick={onEditAccess}
      >
        {t('rbac.users.actions.editAccess')}
      </Button>
      <Button
        variant="outlined"
        startIcon={<KeyOutlinedIcon />}
        disabled={passwordPending || !selectedAccountId}
        onClick={() => setResetOpen(true)}
      >
        {t('rbac.users.viewModal.resetPassword')}
      </Button>
      <Button
        variant="outlined"
        color="warning"
        startIcon={<LogoutOutlinedIcon />}
        disabled={sessionsPending || !selectedAccountId}
        onClick={() => {
          if (window.confirm(t('rbac.users.viewModal.revokeSessionsConfirm'))) {
            onRevokeSessions(selectedAccountId)
          }
        }}
      >
        {t('rbac.users.viewModal.revokeSessions')}
      </Button>
    </Stack>
  )

  return (
    <>
      <Paper elevation={0} className="overflow-hidden rounded-xl border border-border bg-surface">
        <Box className="border-b border-border p-4 md:hidden">
          <Autocomplete
            options={accounts}
            value={selectedSummary || null}
            getOptionLabel={(option) => getAccountName(option) || getAccountEmail(option)}
            isOptionEqualToValue={(option, value) => getAccountId(option) === getAccountId(value)}
            onChange={(_, value) => value && onSelectAccount(getAccountId(value))}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label={t('rbac.explorer.selectAccount')}
                placeholder={t('rbac.users.searchPlaceholder')}
              />
            )}
          />
        </Box>

        <Box className="grid min-h-[640px] grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)_280px]">
          <Box className="hidden min-h-0 border-r border-border md:flex md:flex-col">
            <Box className="border-b border-border p-4">
              <TextField
                fullWidth
                size="small"
                value={filters.search}
                placeholder={t('rbac.users.searchPlaceholder')}
                onChange={(event) => updateFilters({ search: event.target.value })}
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
              <Box className="mt-3 grid grid-cols-2 gap-2">
                <FormControl size="small" fullWidth>
                  <Select
                    displayEmpty
                    value={filters.status}
                    onChange={(event) => updateFilters({ status: event.target.value })}
                  >
                    <MenuItem value="">{t('rbac.users.filter.allStatus')}</MenuItem>
                    <MenuItem value="active">{t('rbac.users.status.active')}</MenuItem>
                    <MenuItem value="inactive">{t('rbac.users.status.inactive')}</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <Select
                    displayEmpty
                    value={filters.roleId}
                    onChange={(event) => updateFilters({ roleId: event.target.value })}
                  >
                    <MenuItem value="">{t('rbac.users.filter.allRoles')}</MenuItem>
                    {roles.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        {role.name || role.code}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <Select
                    displayEmpty
                    value={filters.departmentId}
                    onChange={(event) =>
                      updateFilters({ departmentId: event.target.value, teamId: '' })
                    }
                  >
                    <MenuItem value="">{t('rbac.users.filter.allDepartments')}</MenuItem>
                    {departments.map((department) => (
                      <MenuItem key={department.id} value={department.id}>
                        {department.name || department.code}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <Select
                    displayEmpty
                    value={filters.teamId}
                    onChange={(event) => updateFilters({ teamId: event.target.value })}
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
            </Box>

            <Box className="min-h-0 flex-1 overflow-y-auto">
              {accountsQuery.isPending ? (
                <Stack className="gap-3 p-4">
                  {[0, 1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} variant="rounded" height={64} />
                  ))}
                </Stack>
              ) : accounts.length ? (
                accounts.map((item, index) => {
                  const accountId = getAccountId(item)
                  const selected = String(accountId) === String(selectedAccountId)
                  const name = getAccountName(item)
                  const itemAvatar = getAvatarMeta(name || getAccountEmail(item), index)

                  return (
                    <Box
                      component="button"
                      type="button"
                      key={accountId}
                      aria-current={selected ? 'true' : undefined}
                      className={`flex min-h-16 w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-page focus-visible:outline-2 focus-visible:outline-primary ${
                        selected ? 'bg-primary-light' : 'bg-surface'
                      }`}
                      onClick={() => onSelectAccount(accountId)}
                    >
                      <Avatar
                        className={`!h-9 !w-9 !text-xs !font-semibold ${itemAvatar.className}`}
                      >
                        {itemAvatar.initials}
                      </Avatar>
                      <Box className="min-w-0 flex-1">
                        <Typography variant="body2" className="truncate font-semibold text-ink">
                          {name || getAccountEmail(item)}
                        </Typography>
                        <Typography variant="caption" className="block truncate text-ink-muted">
                          {getPrimaryRole(item) || getDepartmentName(item)}
                        </Typography>
                      </Box>
                      <UserStatusChip status={item.status} t={t} />
                    </Box>
                  )
                })
              ) : (
                <Box className="p-6 text-center">
                  <Typography variant="body2" className="text-ink-muted">
                    {accountsQuery.isError
                      ? accountsQuery.error?.message || t('rbac.common.loadError')
                      : t(filters.search ? 'rbac.common.noResults' : 'rbac.common.empty')}
                  </Typography>
                  {accountsQuery.isError && (
                    <Button size="small" className="!mt-2" onClick={() => accountsQuery.refetch()}>
                      {t('common.retry')}
                    </Button>
                  )}
                </Box>
              )}
            </Box>

            <Box className="flex items-center justify-between border-t border-border p-3">
              <Button
                size="small"
                disabled={pagination.page <= 1}
                onClick={() => onFiltersChange({ ...filters, page: pagination.page - 1 })}
              >
                {t('common.previous')}
              </Button>
              <Typography variant="caption" className="text-ink-muted">
                {pagination.page}
              </Typography>
              <Button
                size="small"
                disabled={pagination.page * pagination.limit >= pagination.total}
                onClick={() => onFiltersChange({ ...filters, page: pagination.page + 1 })}
              >
                {t('common.next')}
              </Button>
            </Box>
          </Box>

          <Box className="min-w-0 bg-surface">
            <Tabs
              className="border-b border-border md:hidden"
              value={mobileSection}
              variant="scrollable"
              scrollButtons={false}
              onChange={(_, value) => setMobileSection(value)}
            >
              {MOBILE_SECTIONS.map((section) => (
                <Tab
                  key={section}
                  value={section}
                  label={t(`rbac.explorer.sections.${section}`)}
                  className="!min-h-11 !normal-case"
                />
              ))}
            </Tabs>

            {!selectedAccountId ? (
              <Box className="flex min-h-[480px] items-center justify-center p-8 text-center">
                <Typography variant="body2" className="text-ink-muted">
                  {t('rbac.explorer.noAccount')}
                </Typography>
              </Box>
            ) : detailQuery.isError ? (
              <Box className="p-6">
                <Paper elevation={0} className="rounded-lg border border-danger bg-danger-bg p-4">
                  <Typography variant="body2" className="text-danger">
                    {detailQuery.error?.message || t('rbac.users.viewModal.loadError')}
                  </Typography>
                  <Button size="small" className="!mt-2" onClick={() => detailQuery.refetch()}>
                    {t('common.retry')}
                  </Button>
                </Paper>
              </Box>
            ) : (
              <>
                <Box className={sectionClass('overview')}>
                  <Stack direction="row" className="items-start gap-4">
                    <Avatar className={`!h-12 !w-12 !font-semibold ${avatarMeta.className}`}>
                      {avatarMeta.initials}
                    </Avatar>
                    <Box className="min-w-0 flex-1">
                      <Stack direction="row" className="flex-wrap items-center gap-2">
                        <Typography variant="h6" className="font-semibold text-ink">
                          {displayName || '-'}
                        </Typography>
                        {identity && <UserStatusChip status={identity.status} t={t} />}
                      </Stack>
                      <Typography variant="body2" className="truncate text-ink-muted">
                        {email || '-'}
                      </Typography>
                    </Box>
                  </Stack>
                  {detailQuery.isPending ? (
                    <Box className="mt-5 grid grid-cols-2 gap-3">
                      {[0, 1, 2, 3].map((item) => (
                        <Skeleton key={item} variant="rounded" height={52} />
                      ))}
                    </Box>
                  ) : (
                    <Box className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 lg:grid-cols-4">
                      {[
                        [t('rbac.users.viewModal.department'), getDepartmentName(identity)],
                        [
                          t('rbac.users.viewModal.team'),
                          identity?.team?.name || identity?.team?.code,
                        ],
                        [t('rbac.users.viewModal.memberType'), identity?.memberType],
                        [
                          t('rbac.users.viewModal.lastLogin'),
                          formatLastLoginLabel(identity?.lastLoginAt, new Date(), i18n.language),
                        ],
                      ].map(([label, value]) => (
                        <Box key={label}>
                          <Typography
                            variant="caption"
                            className="block font-semibold text-ink-muted"
                          >
                            {label}
                          </Typography>
                          <Typography variant="body2" className="mt-1 text-ink-secondary">
                            {value || '-'}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>

                <Box className={sectionClass('global')}>
                  <SectionHeading
                    title={t('rbac.users.viewModal.globalAccess')}
                    detail={t('rbac.explorer.globalHint')}
                  />
                  <Typography variant="caption" className="mb-2 block font-semibold text-ink-muted">
                    {t('rbac.users.viewModal.globalRoles')}
                  </Typography>
                  <Box className="mb-5 flex flex-wrap gap-2">
                    {access.globalRoles.length ? (
                      access.globalRoles.map((role) => <UserRoleChip key={role} role={role} />)
                    ) : (
                      <Typography variant="body2" className="text-ink-muted">
                        {t('rbac.users.viewModal.noGlobalRoles')}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="caption" className="mb-2 block font-semibold text-ink-muted">
                    {t('rbac.explorer.directPermissions')}
                  </Typography>
                  <PermissionList
                    permissions={access.globalPermissions}
                    emptyLabel={t('rbac.users.viewModal.noGlobalPermissions')}
                    t={t}
                  />
                </Box>

                <Box className={sectionClass('scoped')}>
                  <SectionHeading
                    title={t('rbac.users.viewModal.scopedAccess')}
                    detail={t('rbac.users.viewModal.assignmentCount', {
                      count: access.scopedAssignments.length,
                    })}
                  />
                  {access.scopedAssignments.length ? (
                    <Stack className="gap-3">
                      {access.scopedAssignments.map((assignment) => (
                        <Box
                          key={assignment.assignmentId}
                          className="rounded-lg border border-border bg-page p-4"
                        >
                          <Stack
                            direction="row"
                            className="flex-wrap items-start justify-between gap-3"
                          >
                            <Box>
                              <Typography variant="body2" className="font-semibold text-ink">
                                {assignment.scopeName ||
                                  assignment.resource?.name ||
                                  assignment.scopeId}
                              </Typography>
                              <Box className="mt-2 flex flex-wrap items-center gap-2">
                                <ScopeTypeBadge scopeType={assignment.scopeType} />
                                {(assignment.roles ?? []).map((role) => (
                                  <UserRoleChip key={role} role={role} />
                                ))}
                              </Box>
                            </Box>
                            <Chip
                              size="small"
                              variant="outlined"
                              label={t(
                                assignment.isPermissionOverridden
                                  ? 'rbac.users.viewModal.replacementMode'
                                  : 'rbac.users.viewModal.inheritedMode',
                              )}
                            />
                          </Stack>
                          <Divider className="!my-3" />
                          <PermissionList
                            permissions={assignment.permissions ?? []}
                            emptyLabel={t('rbac.users.viewModal.noScopedPermissions')}
                            limit={6}
                            t={t}
                          />
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" className="text-ink-muted">
                      {t('rbac.users.viewModal.noScopedAccess')}
                    </Typography>
                  )}
                </Box>

                <Box className={`${sectionClass('effective')} border-b-0`}>
                  <SectionHeading
                    title={t('rbac.users.viewModal.effectiveAccess')}
                    detail={t('rbac.explorer.effectiveHint')}
                  />
                  {effectiveGroups.length ? (
                    <Stack className="gap-5">
                      {effectiveGroups.map((group) => (
                        <Box key={group.module}>
                          <Typography
                            variant="caption"
                            className="mb-2 block font-semibold text-ink-muted"
                          >
                            {group.module}
                          </Typography>
                          <PermissionList
                            permissions={group.permissions}
                            emptyLabel=""
                            limit={8}
                            t={t}
                          />
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" className="text-ink-muted">
                      {t('rbac.users.viewModal.noEffectivePermissions')}
                    </Typography>
                  )}
                  {account?.createdAt && (
                    <Typography variant="caption" className="mt-5 block text-ink-muted">
                      {t('rbac.users.viewModal.createdAt')}: {formatDate(account.createdAt)}
                    </Typography>
                  )}
                </Box>
              </>
            )}
          </Box>

          <Box className="hidden border-l border-border bg-page p-4 md:block">
            <Box className="sticky top-4">
              <Typography variant="subtitle2" className="font-semibold text-ink">
                {t('rbac.explorer.actionsTitle')}
              </Typography>
              <Typography variant="body2" className="mb-4 mt-1 text-ink-muted">
                {t('rbac.explorer.actionsHint')}
              </Typography>
              {canWrite ? (
                actions
              ) : (
                <Paper elevation={0} className="rounded-lg border border-info bg-info-bg p-3">
                  <Typography variant="body2" className="text-info-strong">
                    {t('rbac.common.readOnly')}
                  </Typography>
                </Paper>
              )}
              {canWrite && identity && (
                <Box className="mt-4 flex min-h-11 items-center justify-between rounded-lg border border-border bg-surface px-3">
                  <Typography variant="body2" className="font-medium text-ink">
                    {t('rbac.users.viewModal.status')}
                  </Typography>
                  <Switch
                    checked={identity.status === 'active'}
                    disabled={statusPending}
                    slotProps={{ input: { 'aria-label': t('rbac.users.viewModal.status') } }}
                    onChange={(event) =>
                      onUpdateStatus({
                        accountId: selectedAccountId,
                        status: event.target.checked ? 'active' : 'inactive',
                      })
                    }
                  />
                </Box>
              )}
              <Divider className="!my-5" />
              <Typography variant="subtitle2" className="font-semibold text-ink">
                {t('rbac.explorer.contractTitle')}
              </Typography>
              <Typography variant="body2" className="mt-2 text-ink-muted">
                {t('rbac.explorer.contractHint')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {canWrite && selectedAccountId && (
        <Box className="sticky bottom-0 z-10 border-t border-border bg-surface p-3 md:hidden">
          <Button
            fullWidth
            variant="contained"
            startIcon={<ManageAccountsOutlinedIcon />}
            onClick={onEditAccess}
          >
            {t('rbac.users.actions.editAccess')}
          </Button>
        </Box>
      )}

      <ResetPasswordDialog
        open={resetOpen}
        pending={passwordPending}
        onClose={() => setResetOpen(false)}
        onSubmit={(password, done) =>
          onResetPassword({ accountId: selectedAccountId, password }, done)
        }
        t={t}
      />
    </>
  )
}
