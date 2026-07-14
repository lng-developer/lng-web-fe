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
  Typography,
} from '@mui/material'

import FormTextField from '@/components/form/FormTextField'
import { vendorCostCenterDefaultValues, vendorCostCenterSchema } from '@/validations'

import { VENDOR_RECORD_STATUSES } from '../constants/vendorConstants'
import { buildVendorCostCenterPayload } from '../utils/vendorsApi'
import VendorSelectField from './VendorSelectField'

function shippingValue(costCenter, key, field) {
  return costCenter?.[key]?.[field] ?? ''
}

function toCostCenterFormValues(costCenter) {
  if (!costCenter) {
    return vendorCostCenterDefaultValues
  }

  return {
    code: costCenter.code || '',
    name: costCenter.name || '',
    sku: costCenter.sku || '',
    lngCode: costCenter.lngCode || '',
    vendorSize: costCenter.vendorSize || '',
    vendorColor: costCenter.vendorColor || '',
    standardSize: costCenter.standardSize || '',
    standardColor: costCenter.standardColor || '',
    baseCostAmount: costCenter.baseCostAmount ?? '',
    currency: costCenter.currency || 'USD',
    domesticEconomyAmount: shippingValue(costCenter, 'domesticShipping', 'economyAmount'),
    domesticAdditionalAmount: shippingValue(costCenter, 'domesticShipping', 'additionalAmount'),
    internationalEconomyAmount: shippingValue(costCenter, 'internationalShipping', 'economyAmount'),
    internationalAdditionalAmount: shippingValue(
      costCenter,
      'internationalShipping',
      'additionalAmount',
    ),
    priorityEconomyAmount: shippingValue(costCenter, 'priorityShipping', 'economyAmount'),
    priorityAdditionalAmount: shippingValue(costCenter, 'priorityShipping', 'additionalAmount'),
    importTaxAmount: costCenter.importTaxAmount ?? '',
    status: costCenter.rawStatus || costCenter.status?.toUpperCase() || 'ACTIVE',
  }
}

export default function CostCenterFormDialog({
  costCenter,
  isSubmitting,
  mode,
  onClose,
  onSubmit,
  open,
  t,
}) {
  const isEdit = mode === 'edit'
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(vendorCostCenterSchema),
    defaultValues: vendorCostCenterDefaultValues,
  })

  useEffect(() => {
    if (open) {
      reset(toCostCenterFormValues(costCenter))
    }
  }, [costCenter, open, reset])

  function submitForm(values) {
    const payload = buildVendorCostCenterPayload(values, { mode: isEdit ? 'update' : 'create' })

    if (isEdit) {
      delete payload.code
    }

    onSubmit(payload)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className="pr-12 text-xl font-bold text-ink-strong">
        {t(isEdit ? 'vendors.costCenters.form.editTitle' : 'vendors.costCenters.form.createTitle')}
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
          <FormTextField
            name="code"
            control={control}
            label={t('vendors.fields.code')}
            placeholder={t('vendors.placeholders.costCenterCode')}
            disabled={isEdit}
          />
          <FormTextField
            name="name"
            control={control}
            label={t('vendors.fields.name')}
            placeholder={t('vendors.placeholders.costCenterName')}
          />
          <FormTextField name="sku" control={control} label={t('vendors.fields.sku')} />
          <FormTextField name="lngCode" control={control} label={t('vendors.fields.lngCode')} />
          <FormTextField
            name="vendorSize"
            control={control}
            label={t('vendors.fields.vendorSize')}
          />
          <FormTextField
            name="vendorColor"
            control={control}
            label={t('vendors.fields.vendorColor')}
          />
          <FormTextField
            name="standardSize"
            control={control}
            label={t('vendors.fields.standardSize')}
          />
          <FormTextField
            name="standardColor"
            control={control}
            label={t('vendors.fields.standardColor')}
          />
          <FormTextField
            name="baseCostAmount"
            control={control}
            label={t('vendors.fields.baseCostAmount')}
            type="number"
          />
          <FormTextField name="currency" control={control} label={t('vendors.fields.currency')} />
          <div className="md:col-span-2">
            <Typography variant="body2" className="mb-2 font-semibold text-ink-strong">
              {t('vendors.costCenters.form.shipping')}
            </Typography>
            <div className="grid gap-4 md:grid-cols-3">
              <FormTextField
                name="domesticEconomyAmount"
                control={control}
                label={t('vendors.fields.domesticEconomyAmount')}
                type="number"
              />
              <FormTextField
                name="internationalEconomyAmount"
                control={control}
                label={t('vendors.fields.internationalEconomyAmount')}
                type="number"
              />
              <FormTextField
                name="priorityEconomyAmount"
                control={control}
                label={t('vendors.fields.priorityEconomyAmount')}
                type="number"
              />
              <FormTextField
                name="domesticAdditionalAmount"
                control={control}
                label={t('vendors.fields.domesticAdditionalAmount')}
                type="number"
              />
              <FormTextField
                name="internationalAdditionalAmount"
                control={control}
                label={t('vendors.fields.internationalAdditionalAmount')}
                type="number"
              />
              <FormTextField
                name="priorityAdditionalAmount"
                control={control}
                label={t('vendors.fields.priorityAdditionalAmount')}
                type="number"
              />
            </div>
          </div>
          <FormTextField
            name="importTaxAmount"
            control={control}
            label={t('vendors.fields.importTaxAmount')}
            type="number"
          />
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
