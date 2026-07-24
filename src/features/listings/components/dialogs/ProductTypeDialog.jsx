import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'

import StatusSwitch from '@/components/common/StatusSwitch'

function ProductTypeDialog({
  mode,
  open,
  values: initialValues,
  isSubmitting,
  onClose,
  onSubmit,
  t,
}) {
  const isEdit = mode === 'edit'
  const [values, setValues] = useState(initialValues)

  function onChange(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ className: 'rounded-xl' }}
    >
      <DialogTitle className="text-xl font-bold text-ink-strong">
        {t(
          isEdit
            ? 'listings.catalogSetup.productTypes.editTitle'
            : 'listings.catalogSetup.productTypes.addTitle',
          { defaultValue: isEdit ? 'Edit product type' : 'Create product type' },
        )}
      </DialogTitle>
      <DialogContent className="flex flex-col gap-4 pt-3">
        <TextField
          size="small"
          label={t('listings.catalogSetup.fields.code', { defaultValue: 'Code' })}
          value={values.code}
          disabled={isEdit}
          helperText={t('listings.catalogSetup.help.code', {
            defaultValue: 'Short stable code used by catalog matching, for example TSHIRT.',
          })}
          onChange={(event) => onChange('code', event.target.value)}
        />
        <TextField
          size="small"
          label={t('listings.catalogSetup.fields.name', { defaultValue: 'Display name' })}
          value={values.name}
          onChange={(event) => onChange('name', event.target.value)}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            size="small"
            label={t('listings.catalogSetup.fields.sortOrder', { defaultValue: 'Sort order' })}
            value={values.sortOrder}
            onChange={(event) => onChange('sortOrder', event.target.value)}
          />
          <div className="flex min-h-10 flex-col justify-center">
            <Typography variant="body2" className="mb-1 font-semibold text-ink">
              {t('listings.catalogSetup.fields.status', { defaultValue: 'Status' })}
            </Typography>
            <div className="flex items-center gap-2">
              <StatusSwitch
                checked={values.status !== 'INACTIVE'}
                ariaLabel={t('listings.catalogSetup.fields.status', { defaultValue: 'Status' })}
                onChange={(_event, checked) => onChange('status', checked ? 'ACTIVE' : 'INACTIVE')}
              />
              <Typography variant="body2" className="text-ink-secondary">
                {t(
                  values.status !== 'INACTIVE'
                    ? 'listings.values.status.active'
                    : 'listings.values.status.inactive',
                )}
              </Typography>
            </div>
          </div>
        </div>
      </DialogContent>
      <DialogActions className="px-6 pb-6 pt-3">
        <Button variant="outlined" onClick={onClose} className="h-10 rounded-lg px-5 font-semibold">
          {t('common.cancel', { defaultValue: 'Cancel' })}
        </Button>
        <Button
          variant="contained"
          onClick={() => onSubmit(values)}
          disabled={isSubmitting}
          className="h-10 rounded-lg px-5 font-semibold"
        >
          {t(isEdit ? 'listings.form.save' : 'listings.form.create')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ProductTypeDialog
