import { useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'

import { useAccountQuery } from '../api/rbac.queries'
import { getAccountAccessSummary } from '../utils/usersDisplay'
import {
  formatDate,
  PermissionCodeBadge,
  ScopeTypeBadge,
  UserRoleChip,
  UserStatusChip,
} from './shared'

function AccessCodeList({ values, emptyLabel }) {
  if (!values.length) {
    return (
      <Typography variant="body2" className="text-ink-muted">
        {emptyLabel}
      </Typography>
    )
  }

  return (
    <Box className="flex flex-wrap gap-2">
      {values.map((value) => (
        <PermissionCodeBadge key={value} code={value} />
      ))}
    </Box>
  )
}

function DetailField({ label, children }) {
  return (
    <Box>
      <Typography
        variant="caption"
        className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted"
      >
        {label}
      </Typography>
      {children}
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
            className="mt-2"
          />
        </DialogContent>
        <DialogActions className="px-6 pb-5">
          <Button onClick={close} disabled={pending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={pending || password.length < 6}>
            {t('rbac.users.viewModal.resetPassword')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default function AccountInfoDialog({
  accountId,
  summary,
  open,
  onClose,
  onUpdateStatus,
  onResetPassword,
  onRevokeSessions,
  statusPending,
  passwordPending,
  sessionsPending,
  canWrite,
  t,
}) {
  const [resetOpen, setResetOpen] = useState(false)
  const { data, isPending, isError, error, refetch } = useAccountQuery(accountId, {
    enabled: open && Boolean(accountId),
  })
  const account = data?.account
  const access = getAccountAccessSummary(data)
  const displayName = account?.email || summary?.email || '—'
  const department = summary?.department?.name || summary?.department?.code || '—'
  const team = summary?.team?.name || summary?.team?.code || '—'

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { className: 'rounded-xl' } }}
      >
        <DialogTitle className="border-b border-border pb-4 pr-12">
          <Stack direction="row" className="items-center gap-3">
            <Box className="min-w-0 flex-1">
              <Typography variant="h6" className="truncate font-semibold text-ink">
                {t('rbac.users.viewModal.title', { name: displayName })}
              </Typography>
              <Typography variant="body2" className="mt-1 text-ink-muted">
                {t('rbac.users.viewModal.subtitle')}
              </Typography>
            </Box>
            {account && <UserStatusChip status={account.status} t={t} />}
          </Stack>
          <IconButton
            onClick={onClose}
            aria-label={t('common.close')}
            className="!absolute !right-3 !top-3 !text-ink-muted"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent className="flex flex-col gap-5 bg-page px-6 py-5">
          {isPending ? (
            <Typography className="py-10 text-center text-ink-muted">
              {t('rbac.common.loading')}
            </Typography>
          ) : isError ? (
            <Paper elevation={0} className="rounded-lg border border-danger bg-danger-bg p-4">
              <Typography variant="body2" className="text-danger">
                {error?.message || t('rbac.users.viewModal.loadError')}
              </Typography>
              <Button size="small" className="mt-2" onClick={() => refetch()}>
                {t('common.retry')}
              </Button>
            </Paper>
          ) : (
            <>
              <Paper elevation={0} className="rounded-lg border border-border bg-surface p-4">
                <Stack direction={{ xs: 'column', md: 'row' }} className="justify-between gap-4">
                  <Box className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField label={t('rbac.users.viewModal.loginName')}>
                      <Typography variant="body2" className="font-semibold text-ink">
                        {displayName}
                      </Typography>
                    </DetailField>
                    <DetailField label={t('rbac.users.viewModal.department')}>
                      <Typography variant="body2" className="text-ink-secondary">
                        {department}
                      </Typography>
                    </DetailField>
                    <DetailField label={t('rbac.users.viewModal.team')}>
                      <Typography variant="body2" className="text-ink-secondary">
                        {team}
                      </Typography>
                    </DetailField>
                    <DetailField label={t('rbac.users.viewModal.memberType')}>
                      <Typography variant="body2" className="text-ink-secondary">
                        {summary?.memberType || '—'}
                      </Typography>
                    </DetailField>
                    <DetailField label={t('rbac.users.viewModal.lastLogin')}>
                      <Typography variant="body2" className="text-ink-secondary">
                        {formatDate(account?.lastLoginAt)}
                      </Typography>
                    </DetailField>
                    <DetailField label={t('rbac.users.viewModal.lastLoginIp')}>
                      <Typography variant="body2" className="font-mono text-ink-secondary">
                        {account?.lastLoginIp || '—'}
                      </Typography>
                    </DetailField>
                  </Box>
                  <Stack direction="row" className="items-center gap-2 md:self-start">
                    <Switch
                      color="primary"
                      checked={account?.status === 'active'}
                      disabled={!canWrite || statusPending}
                      slotProps={{ input: { 'aria-label': t('rbac.users.viewModal.status') } }}
                      onChange={(event) =>
                        onUpdateStatus({
                          accountId,
                          status: event.target.checked ? 'active' : 'inactive',
                        })
                      }
                    />
                    <Typography variant="body2" className="font-medium text-ink">
                      {t('rbac.users.viewModal.status')}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>

              <Box className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <Paper elevation={0} className="rounded-lg border border-border bg-surface p-4">
                  <Typography variant="subtitle2" className="font-semibold text-ink">
                    {t('rbac.users.viewModal.globalAccess')}
                  </Typography>
                  <DetailField label={t('rbac.users.viewModal.globalRoles')}>
                    <Box className="flex flex-wrap gap-2">
                      {access.globalRoles.length ? (
                        access.globalRoles.map((role) => <UserRoleChip key={role} role={role} />)
                      ) : (
                        <Typography variant="body2" className="text-ink-muted">
                          {t('rbac.users.viewModal.noGlobalRoles')}
                        </Typography>
                      )}
                    </Box>
                  </DetailField>
                  <Box className="mt-4">
                    <DetailField label={t('rbac.users.viewModal.globalPermissions')}>
                      <AccessCodeList
                        values={access.globalPermissions}
                        emptyLabel={t('rbac.users.viewModal.noGlobalPermissions')}
                      />
                    </DetailField>
                  </Box>
                </Paper>

                <Paper elevation={0} className="rounded-lg border border-border bg-surface p-4">
                  <Typography variant="subtitle2" className="font-semibold text-ink">
                    {t('rbac.users.viewModal.effectiveAccess')}
                  </Typography>
                  <Typography variant="caption" className="mt-1 block text-ink-muted">
                    {t('rbac.users.viewModal.effectiveHint')}
                  </Typography>
                  <Box className="mt-4 max-h-56 overflow-y-auto pr-1">
                    <AccessCodeList
                      values={access.effectivePermissions}
                      emptyLabel={t('rbac.users.viewModal.noEffectivePermissions')}
                    />
                  </Box>
                </Paper>
              </Box>

              <Paper elevation={0} className="rounded-lg border border-border bg-surface p-4">
                <Stack direction="row" className="items-center justify-between">
                  <Box>
                    <Typography variant="subtitle2" className="font-semibold text-ink">
                      {t('rbac.users.viewModal.scopedAccess')}
                    </Typography>
                    <Typography variant="caption" className="text-ink-muted">
                      {t('rbac.users.viewModal.assignmentCount', {
                        count: access.scopedAssignments.length,
                      })}
                    </Typography>
                  </Box>
                </Stack>

                {access.scopedAssignments.length ? (
                  <Stack className="mt-3 gap-3">
                    {access.scopedAssignments.map((assignment) => (
                      <Box
                        key={assignment.assignmentId}
                        className="rounded-lg border border-border bg-page p-3"
                      >
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          className="justify-between gap-2"
                        >
                          <Box>
                            <Typography variant="body2" className="font-semibold text-ink">
                              {assignment.scopeName ||
                                assignment.resource?.name ||
                                assignment.scopeId}
                            </Typography>
                            <Box className="mt-1 flex flex-wrap items-center gap-2">
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
                        <Box className="mt-3">
                          <AccessCodeList
                            values={assignment.permissions ?? []}
                            emptyLabel={t('rbac.users.viewModal.noScopedPermissions')}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" className="mt-3 text-ink-muted">
                    {t('rbac.users.viewModal.noScopedAccess')}
                  </Typography>
                )}
              </Paper>

              <Typography variant="caption" className="text-ink-muted">
                {t('rbac.users.viewModal.createdAt')}: {formatDate(account?.createdAt)}
              </Typography>
            </>
          )}
        </DialogContent>

        <DialogActions className="justify-between border-t border-border px-6 py-4">
          <Box className="flex flex-wrap gap-2">
            {canWrite && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<KeyOutlinedIcon />}
                  disabled={passwordPending}
                  onClick={() => setResetOpen(true)}
                >
                  {t('rbac.users.viewModal.resetPassword')}
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<LogoutOutlinedIcon />}
                  disabled={sessionsPending}
                  onClick={() => {
                    if (window.confirm(t('rbac.users.viewModal.revokeSessionsConfirm'))) {
                      onRevokeSessions(accountId)
                    }
                  }}
                >
                  {t('rbac.users.viewModal.revokeSessions')}
                </Button>
              </>
            )}
          </Box>
          <Button variant="contained" onClick={onClose}>
            {t('rbac.users.viewModal.close')}
          </Button>
        </DialogActions>
      </Dialog>

      <ResetPasswordDialog
        open={resetOpen}
        pending={passwordPending}
        onClose={() => setResetOpen(false)}
        onSubmit={(password, done) => onResetPassword({ accountId, password }, done)}
        t={t}
      />
    </>
  )
}
