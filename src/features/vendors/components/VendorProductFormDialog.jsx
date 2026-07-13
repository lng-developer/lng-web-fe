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
import { vendorProductDefaultValues, vendorProductSchema } from '@/validations'

import { VENDOR_RECORD_STATUSES } from '../constants/vendorConstants'
import { buildVendorProductPayload } from '../utils/vendorsApi'
import VendorSelectField from './VendorSelectField'

function toProductFormValues(product) {
  if (!product) {
    return vendorProductDefaultValues
  }

  return {
    vendorId: product.vendorId || '',
    productTypeGroupId: product.productTypeGroupId || '',
    code: product.code || '',
    name: product.name || '',
    externalProductId: product.externalProductId || '',
    imageUrl: product.imageUrl || '',
    productUrl: product.productUrl || '',
    designTemplateUrl: product.designTemplateUrl || '',
    minProductionDays: product.minProductionDays ?? '',
    maxProductionDays: product.maxProductionDays ?? '',
    baseCostAmount: product.baseCostAmount ?? '',
    currency: product.currency || 'USD',
    status: product.rawStatus || product.status?.toUpperCase() || 'ACTIVE',
  }
}

export default function VendorProductFormDialog({
  isSubmitting,
  mode,
  onClose,
  onSubmit,
  open,
  product,
  productTypeOptions,
  t,
  vendors,
}) {
  const isEdit = mode === 'edit'
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(vendorProductSchema),
    defaultValues: vendorProductDefaultValues,
  })

  useEffect(() => {
    if (open) {
      reset(toProductFormValues(product))
    }
  }, [open, product, reset])

  function submitForm(values) {
    const payload = buildVendorProductPayload(values, { mode: isEdit ? 'update' : 'create' })

    if (isEdit) {
      delete payload.vendorId
      delete payload.code
    }

    onSubmit(payload)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className="pr-12 text-xl font-bold text-ink-strong">
        {t(isEdit ? 'vendors.products.form.editTitle' : 'vendors.products.form.createTitle')}
        <IconButton
          aria-label={t('common.close')}
          onClick={onClose}
          className="!absolute !right-3 !top-3 !text-ink-muted"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit(submitForm)}>
        <DialogContent className="grid gap-4 pt-2 md:grid-cols-2">
          <VendorSelectField
            name="vendorId"
            control={control}
            disabled={isEdit}
            label={t('vendors.fields.vendor')}
            placeholder={t('vendors.placeholders.vendor')}
          >
            <MenuItem value="">{t('vendors.placeholders.vendor')}</MenuItem>
            {vendors.map((vendor) => (
              <MenuItem key={vendor.id} value={vendor.id}>
                {vendor.name}
              </MenuItem>
            ))}
          </VendorSelectField>
          <VendorSelectField
            name="productTypeGroupId"
            control={control}
            label={t('vendors.fields.productType')}
            placeholder={t('vendors.placeholders.productType')}
          >
            <MenuItem value="">{t('vendors.placeholders.productType')}</MenuItem>
            {productTypeOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </VendorSelectField>
          <FormTextField
            name="code"
            control={control}
            label={t('vendors.fields.code')}
            placeholder={t('vendors.placeholders.productCode')}
            disabled={isEdit}
          />
          <FormTextField
            name="name"
            control={control}
            label={t('vendors.fields.productName')}
            placeholder={t('vendors.placeholders.productName')}
          />
          <FormTextField
            name="externalProductId"
            control={control}
            label={t('vendors.fields.externalProductId')}
            placeholder={t('vendors.placeholders.externalProductId')}
          />
          <FormTextField
            name="imageUrl"
            control={control}
            label={t('vendors.fields.imageUrl')}
            placeholder={t('vendors.placeholders.url')}
          />
          <FormTextField
            name="productUrl"
            control={control}
            label={t('vendors.fields.productUrl')}
            placeholder={t('vendors.placeholders.url')}
          />
          <FormTextField
            name="designTemplateUrl"
            control={control}
            label={t('vendors.fields.designTemplateUrl')}
            placeholder={t('vendors.placeholders.url')}
          />
          <FormTextField
            name="minProductionDays"
            control={control}
            label={t('vendors.fields.minProductionDays')}
            type="number"
          />
          <FormTextField
            name="maxProductionDays"
            control={control}
            label={t('vendors.fields.maxProductionDays')}
            type="number"
          />
          <FormTextField
            name="baseCostAmount"
            control={control}
            label={t('vendors.fields.baseCostAmount')}
            type="number"
          />
          <FormTextField name="currency" control={control} label={t('vendors.fields.currency')} />
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
