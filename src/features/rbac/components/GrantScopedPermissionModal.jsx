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

import {
  buildScopedRulePayload,
  getAvailableOverridePermissions,
  getOverrideRoleName,
  getScopeOptionLabel,
} from '../utils/scopedOverridesDisplay'
import { OverrideFieldLabel, PermissionMultiSelect } from './shared'

export default function GrantScopedPermissionModal({
  open,
  role,
  initialScope,
  scopes,
  permissions,
  rules,
  onClose,
  onSubmit,
  pending,
  t,
}) {
  const initialRule = rules.find(
    (rule) =>
      rule.roleId === role?.id &&
      rule.scopeType === initialScope?.scopeType &&
      rule.scopeId === initialScope?.scopeId,
  )
  const [scopeType, setScopeType] = useState(initialScope?.scopeType || '')
  const [scopeId, setScopeId] = useState(initialScope?.scopeId || '')
  const [selectedPermissionIds, setSelectedPermissionIds] = useState(
    initialRule?.permissionIds ?? [],
  )
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
      slotProps={{ paper: { className: 'rounded-xl' } }}
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
                  const nextScopeId = event.target.value
                  const nextRule = rules.find(
                    (rule) =>
                      rule.roleId === role?.id &&
                      rule.scopeType === scopeType &&
                      rule.scopeId === nextScopeId,
                  )
                  setScopeId(nextScopeId)
                  setSelectedPermissionIds(nextRule?.permissionIds ?? [])
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
            disabled={!scopeType || !scopeId || pending}
          >
            {t('rbac.scopedOverrides.scopedGrantModal.submit')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
