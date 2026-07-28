import { useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'

import { useAccountQuery } from '../api/rbac.queries'
import { getStatusMeta } from '../utils/usersDisplay'
import { formatShortDate } from './shared'
import { UserFieldLabel, UserRoleChip } from './shared'

export default function AccountInfoDialog({
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
