import { useState } from 'react'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'

import StatusSwitch from '@/components/common/StatusSwitch'

const salesChannelOptions = ['AMAZON', 'ETSY', 'SHOPIFY', 'TIKTOK_SHOP', 'WALMART', 'CUSTOM']

function ListingDialog({
  mode,
  open,
  values: initialValues,
  productTypes,
  shops,
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
      maxWidth="lg"
      PaperProps={{ className: 'rounded-xl' }}
    >
      <DialogTitle className="pr-10 text-xl font-bold text-ink-strong">
        {t(isEdit ? 'listings.form.editTitle' : 'listings.form.addTitle')}
      </DialogTitle>
      <DialogContent className="flex max-h-[78vh] flex-col gap-4 overflow-y-auto pt-3">
        <FormControl size="small" fullWidth disabled={isEdit}>
          <Typography variant="body2" className="mb-1 font-semibold text-ink">
            {t('listings.form.shop')}
          </Typography>
          <Select
            value={values.shopId}
            onChange={(event) => onChange('shopId', event.target.value)}
            displayEmpty
            IconComponent={KeyboardArrowDownIcon}
            className="h-10 rounded-lg text-sm"
          >
            <MenuItem value="" disabled>
              {t('listings.form.selectShop')}
            </MenuItem>
            {shops.map((shopOption) => (
              <MenuItem key={shopOption.id} value={shopOption.id}>
                {shopOption.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <div className="grid gap-4 md:grid-cols-2">
          <FormControl size="small" disabled={isEdit}>
            <Typography variant="body2" className="mb-1 font-semibold text-ink">
              {t('listings.form.salesChannel')}
            </Typography>
            <Select
              value={values.salesChannelCode}
              onChange={(event) => onChange('salesChannelCode', event.target.value)}
              IconComponent={KeyboardArrowDownIcon}
              className="h-10 rounded-lg text-sm"
            >
              {salesChannelOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {t(`listings.values.salesChannel.${option}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label={t('listings.form.marketplace')}
            value={values.marketplaceCode}
            disabled={isEdit}
            onChange={(event) => onChange('marketplaceCode', event.target.value)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            size="small"
            label={t('listings.form.sku')}
            value={values.sku}
            disabled={isEdit}
            onChange={(event) => onChange('sku', event.target.value)}
          />
          <TextField
            size="small"
            label={t('listings.form.asin')}
            value={values.asin}
            onChange={(event) => onChange('asin', event.target.value)}
          />
        </div>
        <TextField
          size="small"
          label={t('listings.form.title')}
          value={values.title}
          onChange={(event) => onChange('title', event.target.value)}
        />
        <FormControl size="small" fullWidth>
          <Typography variant="body2" className="mb-1 font-semibold text-ink">
            {t('listings.form.productType')}
          </Typography>
          <Select
            value={values.productTypeGroupId}
            onChange={(event) => onChange('productTypeGroupId', event.target.value)}
            displayEmpty
            IconComponent={KeyboardArrowDownIcon}
            className="h-10 rounded-lg text-sm"
          >
            <MenuItem value="" disabled>
              {t('listings.form.selectProductType')}
            </MenuItem>
            {productTypes.map((typeOption) => (
              <MenuItem key={typeOption.id} value={typeOption.id}>
                {typeOption.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            size="small"
            label={t('listings.form.baseCostAmount')}
            value={values.baseCostAmount}
            onChange={(event) => onChange('baseCostAmount', event.target.value)}
          />
          <TextField
            size="small"
            label={t('listings.form.currency')}
            value={values.currency}
            onChange={(event) => onChange('currency', event.target.value)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormControl size="small">
            <Typography variant="body2" className="mb-1 font-semibold text-ink">
              {t('listings.form.costCenterStatus')}
            </Typography>
            <Select
              value={values.costCenterStatus}
              onChange={(event) => onChange('costCenterStatus', event.target.value)}
              IconComponent={KeyboardArrowDownIcon}
              className="h-10 rounded-lg text-sm"
            >
              <MenuItem value="MISSING">{t('listings.values.setupStatus.missing')}</MenuItem>
              <MenuItem value="PRESENT">{t('listings.values.setupStatus.present')}</MenuItem>
            </Select>
          </FormControl>
          <div className="flex min-h-10 flex-col justify-center">
            <Typography variant="body2" className="mb-1 font-semibold text-ink">
              {t('listings.form.status')}
            </Typography>
            <div className="flex items-center gap-2">
              <StatusSwitch
                checked={values.status !== 'INACTIVE'}
                ariaLabel={t('listings.form.status')}
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

export default ListingDialog
