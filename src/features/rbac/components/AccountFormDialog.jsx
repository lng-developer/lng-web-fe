import { useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import { getRoleMeta } from '../utils/usersDisplay'
import { INITIAL_USER_FORM } from './shared'

export default function AccountFormDialog({ open, onClose, roles, onSubmit, pending, t }) {
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
      slotProps={{ paper: { className: 'rounded-xl' } }}
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
              autoComplete="off"
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
                autoComplete="new-password"
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
