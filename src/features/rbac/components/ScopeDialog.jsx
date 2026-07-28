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
  getScopeDisplayName,
  getScopeResourceOptions,
  SCOPE_CREATE_TYPE_OPTIONS,
  SCOPE_TYPE_FILTER_OPTIONS,
} from '../utils/scopesDisplay'
import { findById, INITIAL_SCOPE_FORM } from './shared'
import { ScopeDialogField } from './shared'

export default function ScopeDialog({
  open,
  value,
  departments,
  teams,
  onClose,
  onSubmit,
  pending,
  canWrite,
  t,
}) {
  const isEdit = Boolean(value)
  const [form, setForm] = useState(() =>
    value
      ? {
          scopeType: value.scopeType || 'department',
          scopeId: value.scopeId || '',
          name: getScopeDisplayName(value) === '—' ? '' : getScopeDisplayName(value),
          code: value.resource?.code || value.resourceId || '',
          status: value.status || 'active',
        }
      : INITIAL_SCOPE_FORM,
  )

  const selectedDepartment = findById(departments, form.scopeId)
  const getDepartmentCode = (department) => {
    const source = department?.code || department?.name || ''
    const normalized = String(source)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    return normalized ? `DEPT-${normalized}` : ''
  }
  const resources = form.scopeType
    ? getScopeResourceOptions(form.scopeType, departments, teams)
    : []
  const typeOptions =
    isEdit && !SCOPE_CREATE_TYPE_OPTIONS.some((option) => option.value === form.scopeType)
      ? [
          SCOPE_TYPE_FILTER_OPTIONS.find((option) => option.value === form.scopeType) || {
            value: form.scopeType,
            labelKey: 'rbac.scopes.fields.scopeType',
          },
          ...SCOPE_CREATE_TYPE_OPTIONS,
        ]
      : SCOPE_CREATE_TYPE_OPTIONS
  const selectedType = typeOptions.find((option) => option.value === form.scopeType)
  const showResourceSelect = isEdit && form.scopeType !== 'global'
  const fieldControlClassName = 'rounded-lg bg-surface'
  const fieldControlSx = {
    '& .MuiInputBase-input::placeholder': {
      color: 'text.disabled',
      opacity: 1,
    },
    '& .MuiInputBase-input.Mui-disabled': {
      WebkitTextFillColor: 'rgba(26,26,26,0.45)',
    },
  }

  const submit = (event) => {
    event.preventDefault()
    onSubmit(form)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ className: 'rounded-xl bg-surface' }}
    >
      <Box component="form" onSubmit={submit}>
        <DialogTitle className="border-b border-border !px-6 !py-5 !pr-10">
          <Typography variant="h6" component="span" className="font-semibold text-ink">
            {isEdit ? t('rbac.scopes.editModal.title') : t('rbac.scopes.addModal.title')}
          </Typography>
          <IconButton
            onClick={onClose}
            aria-label={t('common.close')}
            className="!absolute !right-3 !top-3 !text-ink-muted"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent className="flex flex-col gap-5 !px-6 !pb-6 !pt-3">
          <ScopeDialogField label={t('rbac.scopes.fields.scopeType')}>
            <TextField
              size="small"
              fullWidth
              value={
                isEdit && selectedType
                  ? t(selectedType.labelKey)
                  : t('rbac.scopes.fields.scopeTypePlaceholder')
              }
              disabled
              InputProps={{ className: fieldControlClassName }}
              sx={fieldControlSx}
            />
          </ScopeDialogField>

          {isEdit && showResourceSelect && (
            <ScopeDialogField
              label={
                form.scopeType === 'team'
                  ? t('rbac.scopes.addModal.fields.team')
                  : t('rbac.scopes.addModal.fields.department')
              }
            >
              <FormControl size="small" fullWidth disabled>
                <Select
                  value={form.scopeId}
                  displayEmpty
                  className={fieldControlClassName}
                  sx={fieldControlSx}
                  renderValue={(selected) => {
                    const resource = findById(resources, selected)
                    if (resource) return `${resource.name} (${resource.code || resource.id})`
                    return value?.resource?.name || value?.resource?.code || selected || ''
                  }}
                >
                  {resources.map((resource) => (
                    <MenuItem key={resource.id} value={resource.id}>
                      {resource.name} ({resource.code || resource.id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </ScopeDialogField>
          )}

          {!isEdit && (
            <ScopeDialogField label={t('rbac.scopes.addModal.fields.department')}>
              <FormControl size="small" fullWidth>
                <Select
                  value={form.scopeId}
                  onChange={(event) => {
                    const department = findById(departments, event.target.value)
                    setForm({
                      ...form,
                      scopeId: event.target.value,
                      code: form.name ? form.code : getDepartmentCode(department),
                    })
                  }}
                  displayEmpty
                  className={fieldControlClassName}
                  sx={fieldControlSx}
                  renderValue={(selected) => {
                    const department = findById(departments, selected)
                    if (department) return department.name || department.code || department.id
                    return (
                      <Typography variant="body2" className="text-ink-muted">
                        {t('rbac.scopes.addModal.fields.departmentPlaceholder')}
                      </Typography>
                    )
                  }}
                >
                  <MenuItem value="" disabled>
                    {t('rbac.scopes.addModal.fields.departmentPlaceholder')}
                  </MenuItem>
                  {departments.map((department) => (
                    <MenuItem key={department.id} value={department.id}>
                      {department.name || department.code || department.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </ScopeDialogField>
          )}

          <ScopeDialogField
            label={
              isEdit ? t('rbac.scopes.fields.name') : t('rbac.scopes.addModal.fields.teamName')
            }
          >
            <TextField
              size="small"
              value={form.name}
              disabled={!canWrite}
              onChange={(event) => {
                const nextName = event.target.value
                setForm({
                  ...form,
                  name: nextName,
                  code: nextName ? form.code : getDepartmentCode(selectedDepartment),
                })
              }}
              fullWidth
              placeholder={
                isEdit
                  ? t('rbac.scopes.fields.namePlaceholder')
                  : t('rbac.scopes.addModal.fields.teamNamePlaceholder')
              }
              InputProps={{ className: fieldControlClassName }}
              sx={fieldControlSx}
            />
          </ScopeDialogField>

          <ScopeDialogField label={t('rbac.scopes.addModal.fields.code')}>
            <TextField
              size="small"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
              fullWidth
              placeholder={t('rbac.scopes.addModal.fields.codePlaceholder')}
              disabled={isEdit || !form.name}
              InputProps={{ className: fieldControlClassName }}
              inputProps={{ className: 'font-mono uppercase' }}
              sx={fieldControlSx}
            />
          </ScopeDialogField>
        </DialogContent>
        <DialogActions className="justify-between border-t border-border !px-6 !pb-6 !pt-2">
          <Button
            variant="outlined"
            color="inherit"
            size="medium"
            className="h-10 rounded-lg border-border px-6 text-sm font-semibold text-ink-secondary"
            onClick={onClose}
          >
            {isEdit ? t('rbac.scopes.editModal.cancel') : t('rbac.scopes.addModal.cancel')}
          </Button>
          {canWrite && (
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="medium"
              className="h-10 rounded-lg px-6 text-sm font-semibold"
              disabled={pending || (!isEdit && !form.scopeId)}
            >
              {isEdit ? t('rbac.scopes.editModal.submit') : t('rbac.scopes.addModal.submit')}
            </Button>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  )
}
