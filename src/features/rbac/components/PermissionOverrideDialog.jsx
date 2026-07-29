import { useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'

import PermissionPicker from './PermissionPicker'
import { ScopeTypeBadge, UserRoleChip } from './shared'
function getAssignmentPermissionSelection(assignment) {
  if (!assignment) return []
  if (Array.isArray(assignment.overridePermissionIds)) return assignment.overridePermissionIds
  if (Array.isArray(assignment.effectivePermissionIds)) return assignment.effectivePermissionIds
  return assignment.customPermissionIds ?? []
}

export default function PermissionOverrideDialog({
  open,
  assignment,
  permissions,
  pending,
  onClose,
  onSave,
  t,
}) {
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
      slotProps={{ paper: { className: 'rounded-xl' } }}
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
