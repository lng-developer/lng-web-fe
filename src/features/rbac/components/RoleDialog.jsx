import { useMemo, useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material'

import {
  filterPermissionsForRole,
  getRolePermissionIds,
  groupPermissionsByModule,
} from '../utils/rolesDisplay'
import { INITIAL_ROLE_FORM } from './shared'
import { UserFieldLabel } from './shared'

export default function RoleDialog({
  open,
  mode,
  value,
  permissions,
  permissionsPending,
  onClose,
  onSubmit,
  pending,
  t,
}) {
  const [form, setForm] = useState(() =>
    value
      ? {
          code: value.code || '',
          name: value.name || '',
          description: value.description || '',
          permissionIds: value.permissions || [],
        }
      : INITIAL_ROLE_FORM,
  )
  const [permissionSearch, setPermissionSearch] = useState('')
  const [selectedPermissionIds, setSelectedPermissionIds] = useState(
    () => new Set(getRolePermissionIds(value)),
  )
  const [collapsedModules, setCollapsedModules] = useState(() => new Set())

  const editing = mode === 'edit'
  const filteredRolePermissions = useMemo(
    () => filterPermissionsForRole(permissions, permissionSearch),
    [permissions, permissionSearch],
  )
  const permissionGroups = useMemo(
    () => groupPermissionsByModule(filteredRolePermissions),
    [filteredRolePermissions],
  )
  const allPermissionIds = useMemo(
    () => permissions.map((permission) => permission.id),
    [permissions],
  )
  const allSelected =
    allPermissionIds.length > 0 &&
    allPermissionIds.every((permissionId) => selectedPermissionIds.has(permissionId))

  const submit = (event) => {
    event.preventDefault()
    onSubmit({
      ...form,
      permissionIds: Array.from(selectedPermissionIds),
    })
  }

  const togglePermission = (permissionId) => {
    setSelectedPermissionIds((current) => {
      const next = new Set(current)
      if (next.has(permissionId)) {
        next.delete(permissionId)
      } else {
        next.add(permissionId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedPermissionIds(allSelected ? new Set() : new Set(allPermissionIds))
  }

  const toggleModule = (moduleName) => {
    setCollapsedModules((current) => {
      const next = new Set(current)
      if (next.has(moduleName)) {
        next.delete(moduleName)
      } else {
        next.add(moduleName)
      }
      return next
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { className: 'rounded-xl' } }}
      sx={{ '& .MuiDialog-paper': { maxHeight: '85vh' } }}
    >
      <Box component="form" onSubmit={submit}>
        <DialogTitle className="pb-4 pr-10 font-semibold text-ink">
          {editing
            ? t('rbac.roles.editModal.title', { code: value?.code })
            : t('rbac.roles.addModal.title')}
          <IconButton
            onClick={onClose}
            aria-label={t('common.close')}
            className="!absolute !right-3 !top-3 !text-ink-muted"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent className="flex flex-col gap-4 px-6 pt-3">
          <Box className="grid grid-cols-2 gap-4">
            <Box>
              <UserFieldLabel>{t('rbac.roles.addModal.fields.codeLabel')}</UserFieldLabel>
              <TextField
                size="small"
                fullWidth
                disabled={editing}
                placeholder={t('rbac.roles.addModal.fields.codePlaceholder')}
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                required
                slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
                sx={
                  editing
                    ? {
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: 'rgba(26,26,26,0.7)',
                        },
                      }
                    : undefined
                }
              />
            </Box>
            <Box>
              <UserFieldLabel>{t('rbac.roles.addModal.fields.nameLabel')}</UserFieldLabel>
              <TextField
                size="small"
                fullWidth
                placeholder={t('rbac.roles.addModal.fields.namePlaceholder')}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </Box>
          </Box>

          <Box>
            <UserFieldLabel>{t('rbac.roles.addModal.fields.descriptionLabel')}</UserFieldLabel>
            <TextField
              size="small"
              fullWidth
              multiline
              rows={editing ? 2 : 3}
              placeholder={t('rbac.roles.addModal.fields.descriptionPlaceholder')}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Box>

          <Box className="flex flex-col gap-3">
            <Box className="flex items-center justify-between">
              <Typography
                variant="body2"
                className="text-sm font-semibold uppercase tracking-wide text-ink"
              >
                {t('rbac.roles.editModal.permissions')}
              </Typography>
              <Button
                variant="text"
                size="small"
                color="primary"
                className="!min-w-0 !px-0 !py-0 !text-sm !font-semibold"
                onClick={toggleSelectAll}
              >
                {t('rbac.roles.editModal.selectAll')}
              </Button>
            </Box>

            <TextField
              size="small"
              fullWidth
              value={permissionSearch}
              placeholder={t('rbac.roles.editModal.permissionSearch')}
              onChange={(event) => setPermissionSearch(event.target.value)}
            />

            <Box className="mt-2 overflow-y-auto" sx={{ maxHeight: 320 }}>
              {permissionsPending ? (
                <Typography variant="body2" className="py-4 text-center text-ink-muted">
                  {t('rbac.common.loading')}
                </Typography>
              ) : (
                permissionGroups.map((group) => {
                  const collapsed = collapsedModules.has(group.module)
                  const checkedCount = group.permissions.filter((permission) =>
                    selectedPermissionIds.has(permission.id),
                  ).length

                  return (
                    <Box key={group.module}>
                      <Box
                        role="button"
                        tabIndex={0}
                        className="flex cursor-pointer items-center justify-between py-2"
                        onClick={() => toggleModule(group.module)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            toggleModule(group.module)
                          }
                        }}
                      >
                        <Box className="flex items-center gap-2">
                          {collapsed ? (
                            <ExpandMoreIcon className="text-ink-muted" sx={{ fontSize: 18 }} />
                          ) : (
                            <ExpandLessIcon className="text-ink-muted" sx={{ fontSize: 18 }} />
                          )}
                          <Typography
                            variant="caption"
                            className="text-[11px] font-semibold uppercase tracking-wide text-ink-secondary"
                          >
                            {group.module}
                          </Typography>
                        </Box>
                        <Typography variant="caption" className="text-[11px] text-ink-muted">
                          {checkedCount}/{group.permissions.length}
                        </Typography>
                      </Box>

                      {!collapsed &&
                        group.permissions.map((permission) => {
                          const checked = selectedPermissionIds.has(permission.id)

                          return (
                            <Box
                              key={permission.id}
                              className={`flex h-11 items-center justify-between border-b border-border last:border-b-0 ${
                                checked ? 'bg-primary-light' : ''
                              }`}
                            >
                              <Box className="flex items-center gap-3">
                                <Checkbox
                                  size="small"
                                  color="primary"
                                  checked={checked}
                                  onChange={() => togglePermission(permission.id)}
                                  sx={{ p: '4px' }}
                                />
                                <Typography variant="body2" className="text-ink">
                                  {permission.name || permission.code}
                                </Typography>
                              </Box>
                              <Typography
                                variant="caption"
                                className="text-[11px] font-mono text-ink-muted"
                              >
                                {permission.code}
                              </Typography>
                            </Box>
                          )
                        })}
                    </Box>
                  )
                })
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions className="gap-3 border-t border-border px-6 pb-6 pt-3">
          <Button
            variant="outlined"
            size="medium"
            className="h-10 rounded-lg px-5 text-sm font-semibold text-ink-secondary"
            onClick={onClose}
          >
            {editing ? t('rbac.roles.editModal.cancel') : t('rbac.roles.addModal.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="medium"
            className="h-10 rounded-lg px-5 text-sm font-semibold"
            disabled={pending}
          >
            {editing ? t('rbac.roles.editModal.submit') : t('rbac.roles.addModal.submit')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
