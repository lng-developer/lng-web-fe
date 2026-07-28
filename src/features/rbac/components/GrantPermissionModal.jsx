import { useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material'

import {
  buildScopedRulePayload,
  getAvailableOverridePermissions,
  getScopeOptionLabel,
} from '../utils/scopedOverridesDisplay'
import { OverrideFieldLabel, PermissionMultiSelect } from './shared'

export default function GrantPermissionModal({
  open,
  context,
  permissions,
  onClose,
  onSubmit,
  pending,
  t,
}) {
  const section = context?.section
  const group = context?.group
  const [selectedPermissionIds, setSelectedPermissionIds] = useState(
    () => group?.permissionIds ?? group?.permissions?.map((permission) => permission.id) ?? [],
  )
  const [note, setNote] = useState('')
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
        permissionIds: selectedPermissionIds,
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
            disabled={pending}
          >
            {t('rbac.scopedOverrides.grantModal.submit')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
