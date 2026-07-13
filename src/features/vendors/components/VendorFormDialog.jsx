import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import CloseIcon from '@mui/icons-material/Close'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
} from '@mui/material'

import FormTextField from '@/components/form/FormTextField'
import { vendorDefaultValues, vendorSchema } from '@/validations'

import {
  VENDOR_FULFILLMENT_TYPES,
  VENDOR_PROVIDER_KEYS,
  VENDOR_RECORD_STATUSES,
} from '../constants/vendorConstants'
import { buildVendorPayload } from '../utils/vendorsApi'
import VendorSelectField from './VendorSelectField'

function toVendorFormValues(vendor) {
  if (!vendor) {
    return vendorDefaultValues
  }

  return {
    code: vendor.code || '',
    name: vendor.name || '',
    providerKey: vendor.providerKey || '',
    fulfillmentType: vendor.rawFulfillmentType || vendor.fulfillmentType?.toUpperCase() || 'POD',
    status: vendor.rawStatus || vendor.status?.toUpperCase() || 'ACTIVE',
  }
}

export default function VendorFormDialog({
  isSubmitting,
  mode,
  onClose,
  onSubmit,
  open,
  vendor,
  t,
}) {
  const isEdit = mode === 'edit'
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(vendorSchema),
    defaultValues: vendorDefaultValues,
  })

  useEffect(() => {
    if (open) {
      reset(toVendorFormValues(vendor))
    }
  }, [open, reset, vendor])

  function submitForm(values) {
    const payload = buildVendorPayload(values, { mode: isEdit ? 'update' : 'create' })

    if (isEdit) {
      delete payload.code
    }

    onSubmit(payload)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="pr-12 text-xl font-bold text-ink-strong">
        {t(isEdit ? 'vendors.list.form.editTitle' : 'vendors.list.form.createTitle')}
        <IconButton
          aria-label={t('common.close')}
          onClick={onClose}
          className="!absolute !right-3 !top-3 !text-ink-muted"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit(submitForm)}>
        <DialogContent className="flex flex-col gap-4 pt-2">
          <FormTextField
            name="code"
            control={control}
            label={t('vendors.fields.code')}
            placeholder={t('vendors.placeholders.code')}
            disabled={isEdit}
          />
          <FormTextField
            name="name"
            control={control}
            label={t('vendors.fields.name')}
            placeholder={t('vendors.placeholders.name')}
          />
          <VendorSelectField
            name="providerKey"
            control={control}
            label={t('vendors.fields.providerKey')}
            placeholder={t('vendors.placeholders.providerKey')}
          >
            <MenuItem value="">{t('vendors.values.empty')}</MenuItem>
            {VENDOR_PROVIDER_KEYS.map((providerKey) => (
              <MenuItem key={providerKey} value={providerKey}>
                {providerKey}
              </MenuItem>
            ))}
          </VendorSelectField>
          <VendorSelectField
            name="fulfillmentType"
            control={control}
            label={t('vendors.fields.fulfillmentType')}
          >
            {VENDOR_FULFILLMENT_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {t(`vendors.values.fulfillmentType.${type.toLowerCase()}`, {
                  defaultValue: type,
                })}
              </MenuItem>
            ))}
          </VendorSelectField>
          <VendorSelectField name="status" control={control} label={t('vendors.fields.status')}>
            {VENDOR_RECORD_STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {t(`vendors.values.status.${status.toLowerCase()}`)}
              </MenuItem>
            ))}
          </VendorSelectField>
        </DialogContent>
        <DialogActions className="px-6 pb-6 pt-2">
          <Button variant="outlined" onClick={onClose}>
            {t('vendors.actions.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {t(isEdit ? 'vendors.actions.save' : 'vendors.actions.create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
