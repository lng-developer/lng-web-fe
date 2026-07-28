import { useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'

import { useAccountQuery } from '../api/rbac.queries'
import { buildAccessAssignmentResetPayload, parseScopeAssignmentValue } from '../utils/rbacApi'
import PermissionOverrideDialog from './PermissionOverrideDialog'
import PermissionPicker from './PermissionPicker'
import { ScopeTypeBadge, Section } from './shared'
import {
  getAssignmentRoleId,
  getAssignmentScopeValue,
  getRoleLabel,
  getScopeAssignmentLabel,
  getScopeName,
  getScopeSelectValue,
} from './shared'

export function AssignmentAccessRow({
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

export default function EditAccessDialog({
  accountId,
  open,
  onClose,
  roles,
  permissions,
  scopes,
  onCreateScopedAssignment,
  onUpdateGlobalAccess,
  onUpdateAssignment,
  onDeleteAssignment,
  pending,
  t,
}) {
  const { data } = useAccountQuery(accountId, { enabled: open && Boolean(accountId) })
  const [permissionAssignment, setPermissionAssignment] = useState(null)
  const [globalAccessDraft, setGlobalAccessDraft] = useState(null)
  const [assignmentForm, setAssignmentForm] = useState({
    roleId: '',
    scopeAssignmentValue: '',
  })
  const account = data?.account
  const globalAccess = globalAccessDraft ?? {
    roleIds: data?.access?.roleIds ?? [],
    customPermissionIds: data?.access?.customPermissionIds ?? [],
  }
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
    onCreateScopedAssignment(
      {
        accountId,
        roleId: assignmentForm.roleId,
        scopeType,
        scopeId,
        customPermissionIds: [],
      },
      () =>
        setAssignmentForm({
          roleId: '',
          scopeAssignmentValue: '',
        }),
    )
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
                    {t('rbac.users.editAccessModal.globalAccess')}
                  </Typography>
                  <Typography variant="body2" className="mt-1 text-ink-muted">
                    {t('rbac.users.editAccessModal.globalAccessHint')}
                  </Typography>
                </Box>

                <FormControl fullWidth size="small">
                  <InputLabel>{t('rbac.users.editAccessModal.globalRoles')}</InputLabel>
                  <Select
                    multiple
                    label={t('rbac.users.editAccessModal.globalRoles')}
                    value={globalAccess.roleIds}
                    disabled={pending}
                    renderValue={(selected) =>
                      selected
                        .map((roleId) => getRoleLabel(roles.find((role) => role.id === roleId)))
                        .join(', ')
                    }
                    onChange={(event) =>
                      setGlobalAccessDraft({ ...globalAccess, roleIds: event.target.value })
                    }
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        <Checkbox checked={globalAccess.roleIds.includes(role.id)} />
                        <ListItemText primary={getRoleLabel(role)} secondary={role.code} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box>
                  <Typography variant="body2" className="mb-2 font-semibold text-ink">
                    {t('rbac.users.editAccessModal.globalPermissions')}
                  </Typography>
                  <Typography variant="caption" className="mb-3 block text-ink-muted">
                    {t('rbac.users.editAccessModal.globalPermissionsHint')}
                  </Typography>
                  <Box className="max-h-64 overflow-y-auto rounded-lg border border-border p-3">
                    <PermissionPicker
                      dense
                      permissions={permissions}
                      selectedIds={globalAccess.customPermissionIds}
                      onChange={(customPermissionIds) =>
                        setGlobalAccessDraft({ ...globalAccess, customPermissionIds })
                      }
                    />
                  </Box>
                </Box>

                <Box>
                  <Button
                    variant="contained"
                    disabled={pending}
                    onClick={() => onUpdateGlobalAccess({ accountId, values: globalAccess })}
                  >
                    {t('rbac.users.editAccessModal.saveGlobalAccess')}
                  </Button>
                </Box>
              </Stack>
            </Section>

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
