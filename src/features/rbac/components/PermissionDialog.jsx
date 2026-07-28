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
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'

import { PERMISSION_ACTION_OPTIONS, PERMISSION_MODULE_OPTIONS } from '../utils/permissionsDisplay'
import { formatDate, formatShortDate, INITIAL_PERMISSION_FORM } from './shared'
import { PermissionMetaCard, UserFieldLabel } from './shared'

export default function PermissionDialog({
  open,
  value,
  onClose,
  onSubmit,
  onDelete,
  pending,
  deletePending,
  t,
}) {
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
