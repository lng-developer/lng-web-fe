import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Select,
  Skeleton,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useSnackbar } from 'notistack'

import StatusSwitch from '@/components/common/StatusSwitch'
import {
  IconActionButton,
  OperationsHeader,
  OperationsPagination,
  OperationsToolbar,
} from '@/components/operations'
import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import {
  useApproveListingMutation,
  useCreateInternalTemplateMutation,
  useCreateListingMutation,
  useCreateListingPsdTaskMutation,
  useCreateProductTypeGroupMutation,
  useDownloadListingAssetMutation,
  useRejectListingMutation,
  useUpdateInternalTemplateMutation,
  useUpdateListingMutation,
  useUpdateProductTypeGroupMutation,
} from '../api/listings.mutations'
import {
  useCatalogInternalTemplatesQuery,
  useCatalogProductTypeGroupsQuery,
  useListingProductTypesQuery,
  useListingShopsQuery,
  useListingsQuery,
  useListingSummaryQuery,
} from '../api/listings.queries'
import {
  buildInternalTemplatePayload,
  buildListingFormPayload,
  buildProductTypeGroupPayload,
  mapInternalTemplateResponse,
  mapListingStats,
  unwrapApiData,
} from '../utils/listingsApi'
import { getListingWorkspaceView, LISTING_WORKSPACE_VIEWS } from '../utils/listingView'

const DEFAULT_LIMIT = 10

const listingStats = [
  { key: 'totalAsin', icon: Inventory2OutlinedIcon },
  { key: 'anonymousAsin', icon: PersonOffOutlinedIcon },
  { key: 'psdAvailable', icon: CheckCircleOutlineOutlinedIcon },
  { key: 'noPsd', icon: CancelOutlinedIcon },
]

const listingTabs = [
  { key: 'all', countKey: 'totalAsin' },
  { key: 'amazon', countKey: 'amazon' },
  { key: 'etsy', countKey: 'etsy' },
  { key: 'noPsd', countKey: 'noPsd' },
  { key: 'draft', countKey: 'draft' },
  { key: 'approved', countKey: 'approved' },
  { key: 'rejected', countKey: 'rejected' },
]

function ListingStatusTabs({ items, value, onChange }) {
  return (
    <div className="flex min-w-0 flex-1 overflow-x-auto border-b border-border">
      {items.map((item) => {
        const active = value === item.value

        return (
          <Button
            key={item.value}
            variant="text"
            onClick={() => {
              if (!active) onChange(item.value)
            }}
            sx={(theme) => ({
              borderBottom: active
                ? `2px solid ${theme.palette.primary.main}`
                : '2px solid transparent',
              borderRadius: 0,
              color: active ? 'primary.main' : 'text.disabled',
              flex: '0 0 auto',
              fontWeight: active ? 700 : 600,
              height: 36,
              minWidth: 'max-content',
              px: 1.75,
              whiteSpace: 'nowrap',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.06),
              },
            })}
          >
            <span>{item.label}</span>
            <Box
              component="span"
              sx={(theme) => ({
                bgcolor: active ? theme.palette.primary.main : theme.palette.background.default,
                borderRadius: theme.shape.borderRadiusPill,
                color: active ? theme.palette.common.white : theme.palette.text.secondary,
                lineHeight: '16px',
                ml: 0.75,
                px: 0.7,
                py: 0.1,
              })}
            >
              {Number(item.count || 0)}
            </Box>
          </Button>
        )
      })}
    </div>
  )
}

const salesChannelOptions = ['AMAZON', 'ETSY', 'SHOPIFY', 'TIKTOK_SHOP', 'WALMART', 'CUSTOM']
const fieldTypeOptions = ['TEXT', 'IMAGE', 'OPTION', 'FILE', 'NUMBER', 'DATE', 'UNKNOWN']
const fieldSourceOptions = ['CUSTOMER_INPUT', 'AMAZON_CUSTOMIZATION', 'MANUAL', 'SYSTEM']
const artworkTypeOptions = ['IMAGE', 'TEXT', 'VECTOR', 'PDF', 'MIXED']
const artworkRoleOptions = [
  'FRONT',
  'BACK',
  'LEFT_SLEEVE',
  'RIGHT_SLEEVE',
  'MOCKUP',
  'PREVIEW',
  'OTHER',
]
const assetTypeOptions = [
  'PSD_TEMPLATE',
  'PREVIEW_IMAGE',
  'MASK_FILE',
  'SVG_TEMPLATE',
  'SAMPLE_OUTPUT',
  'OTHER',
]
const listingStatusFilterOptions = ['ACTIVE', 'INACTIVE']
const listingSetupStatusFilterOptions = ['MISSING', 'PRESENT']
const listingQcStatusFilterOptions = ['DRAFT', 'APPROVED', 'REJECTED']
const listingSortOptions = [
  { value: 'createdAtDesc', label: 'Newest listing' },
  { value: 'orderCountDesc', label: 'Most orders' },
  { value: 'quantitySoldDesc', label: 'Most quantity' },
  { value: 'lastSoldAtDesc', label: 'Recently sold' },
]

const initialFormValues = {
  id: '',
  shopId: '',
  salesChannelCode: 'AMAZON',
  marketplaceCode: 'US',
  sku: '',
  asin: '',
  etsyListingId: '',
  title: '',
  productTypeGroupId: '',
  internalTemplateId: '',
  baseCostAmount: '',
  currency: 'USD',
  costCenterStatus: 'MISSING',
  status: 'ACTIVE',
  psdStatus: 'MISSING',
}

const initialProductTypeValues = {
  id: '',
  code: '',
  name: '',
  sortOrder: '',
  status: 'ACTIVE',
}

const initialTemplateValues = {
  id: '',
  code: '',
  name: '',
  description: '',
  productTypeGroupId: '',
  status: 'ACTIVE',
  requiredFields: [],
  artworkSlots: [],
  designAssets: [],
}

const blankRequiredField = {
  key: '',
  label: '',
  type: 'TEXT',
  required: true,
  source: 'CUSTOMER_INPUT',
  sortOrder: '',
}

const blankArtworkSlot = {
  key: '',
  label: '',
  type: 'TEXT',
  required: true,
  acceptedFieldKeys: '',
  outputRole: 'FRONT',
  sortOrder: '',
}

const blankDesignAsset = {
  type: 'PSD_TEMPLATE',
  mediaAssetId: '',
  version: 'v1',
  label: '',
  status: 'ACTIVE',
}

const templateFieldHelp = {
  key: 'Stable code used by API/mapping. Use letters, numbers, underscore. Example: customName.',
  label: 'Readable name shown to operators. Example: Custom Name.',
  acceptedFieldKeys:
    'Customer field keys this artwork uses, comma separated. Example: customName, photo.',
  mediaAssetId: 'Media asset id from uploaded file. Leave empty until the file exists in Media.',
}

const toneClasses = {
  primary: 'border-primary bg-primary-light text-primary',
  blue: 'border-info bg-info-bg text-info-strong',
  green: 'border-success bg-success-bg text-success',
  orange: 'border-warning bg-warning-bg text-warning-deep',
  purple: 'border-secondary bg-secondary-light text-secondary',
  teal: 'border-teal bg-teal-bg text-teal',
  gray: 'border-border bg-neutral-bg text-ink-muted',
}

function Badge({ children, tone = 'gray' }) {
  return (
    <span
      className={`inline-flex h-5 max-w-44 items-center justify-center truncate rounded-full border px-2 text-[11px] font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="flex min-h-20 items-center gap-4 rounded-xl border border-border bg-surface px-5 py-4 shadow-sm">
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary-light text-primary">
        <Icon fontSize="small" />
      </div>
      <div className="min-w-0">
        <Typography
          variant="caption"
          className="block text-[11px] font-bold uppercase text-ink-muted"
        >
          {label}
        </Typography>
        <Typography component="p" variant="h5" className="font-bold leading-none text-ink-strong">
          {value}
        </Typography>
      </div>
    </div>
  )
}

function DebouncedTextField({ value, onDebouncedChange, delay = 300, ...props }) {
  const [inputValue, setInputValue] = useState(value)
  const timerRef = useRef(null)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  function handleChange(event) {
    const nextValue = event.target.value

    setInputValue(nextValue)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onDebouncedChange(nextValue), delay)
  }

  return <TextField {...props} value={inputValue} onChange={handleChange} />
}

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
        <div className="grid gap-4 md:grid-cols-3">
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
          <FormControl size="small">
            <Typography variant="body2" className="mb-1 font-semibold text-ink">
              {t('listings.form.psdStatus')}
            </Typography>
            <Select
              value={values.psdStatus}
              onChange={(event) => onChange('psdStatus', event.target.value)}
              IconComponent={KeyboardArrowDownIcon}
              className="h-10 rounded-lg text-sm"
            >
              <MenuItem value="MISSING">{t('listings.values.setupStatus.missing')}</MenuItem>
              <MenuItem value="PRESENT">{t('listings.values.setupStatus.present')}</MenuItem>
            </Select>
          </FormControl>
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

function updateRow(rows, index, field, value) {
  return rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row))
}

function removeRow(rows, index) {
  return rows.filter((_row, rowIndex) => rowIndex !== index)
}

function RequiredFieldsEditor({ rows, onChange, t }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <Typography className="font-bold text-ink-strong">
            {t('listings.catalogSetup.fields.requiredFields', { defaultValue: 'Customer fields' })}
          </Typography>
          <Typography variant="caption" className="text-ink-muted">
            {t('listings.catalogSetup.help.requiredFields', {
              defaultValue: 'Fields the customer/order must provide, such as name, size, or photo.',
            })}
          </Typography>
        </div>
        <IconButton
          size="small"
          aria-label="Add customer field"
          onClick={() => onChange([...rows, { ...blankRequiredField }])}
          className="h-8 w-8 rounded-lg border border-border text-primary"
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </div>
      <div className="grid gap-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-lg bg-surface-subtle p-3 xl:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_120px_190px_90px_104px]"
          >
            <TextField
              size="small"
              label="Field key"
              placeholder="customName"
              helperText={templateFieldHelp.key}
              value={row.key || ''}
              onChange={(event) => onChange(updateRow(rows, index, 'key', event.target.value))}
            />
            <TextField
              size="small"
              label="Display label"
              placeholder="Custom Name"
              helperText={templateFieldHelp.label}
              value={row.label || ''}
              onChange={(event) => onChange(updateRow(rows, index, 'label', event.target.value))}
            />
            <TextField
              select
              size="small"
              label="Field type"
              value={row.type || 'TEXT'}
              onChange={(event) => onChange(updateRow(rows, index, 'type', event.target.value))}
            >
              {fieldTypeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Source"
              value={row.source || 'CUSTOMER_INPUT'}
              onChange={(event) => onChange(updateRow(rows, index, 'source', event.target.value))}
            >
              {fieldSourceOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Sort"
              value={row.sortOrder || ''}
              onChange={(event) =>
                onChange(updateRow(rows, index, 'sortOrder', event.target.value))
              }
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Switch
                  checked={Boolean(row.required)}
                  onChange={(event) =>
                    onChange(updateRow(rows, index, 'required', event.target.checked))
                  }
                  slotProps={{ input: { 'aria-label': 'Required field' } }}
                />
                <Typography variant="caption" className="text-ink-muted">
                  Required
                </Typography>
              </div>
              <IconButton
                size="small"
                aria-label="Remove customer field"
                onClick={() => onChange(removeRow(rows, index))}
                className="h-8 w-8 rounded-lg border border-border text-danger"
              >
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ArtworkSlotsEditor({ rows, onChange, t }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <Typography className="font-bold text-ink-strong">
            {t('listings.catalogSetup.fields.artworkSlots', { defaultValue: 'Artwork slots' })}
          </Typography>
          <Typography variant="caption" className="text-ink-muted">
            {t('listings.catalogSetup.help.artworkSlots', {
              defaultValue:
                'Outputs the design system must generate, such as front text or mockup image.',
            })}
          </Typography>
        </div>
        <IconButton
          size="small"
          aria-label="Add artwork slot"
          onClick={() => onChange([...rows, { ...blankArtworkSlot }])}
          className="h-8 w-8 rounded-lg border border-border text-primary"
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </div>
      <div className="grid gap-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-lg bg-surface-subtle p-3 xl:grid-cols-[minmax(170px,1fr)_minmax(170px,1fr)_120px_150px_minmax(220px,1.2fr)_90px_104px]"
          >
            <TextField
              size="small"
              label="Slot key"
              placeholder="frontText"
              helperText="Stable output slot code. Example: frontText."
              value={row.key || ''}
              onChange={(event) => onChange(updateRow(rows, index, 'key', event.target.value))}
            />
            <TextField
              size="small"
              label="Display label"
              placeholder="Front Text"
              helperText={templateFieldHelp.label}
              value={row.label || ''}
              onChange={(event) => onChange(updateRow(rows, index, 'label', event.target.value))}
            />
            <TextField
              select
              size="small"
              label="Output type"
              value={row.type || 'TEXT'}
              onChange={(event) => onChange(updateRow(rows, index, 'type', event.target.value))}
            >
              {artworkTypeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Output role"
              value={row.outputRole || 'FRONT'}
              onChange={(event) =>
                onChange(updateRow(rows, index, 'outputRole', event.target.value))
              }
            >
              {artworkRoleOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Accept keys"
              placeholder="customName, photo"
              helperText={templateFieldHelp.acceptedFieldKeys}
              value={
                Array.isArray(row.acceptedFieldKeys)
                  ? row.acceptedFieldKeys.join(', ')
                  : row.acceptedFieldKeys || ''
              }
              onChange={(event) =>
                onChange(updateRow(rows, index, 'acceptedFieldKeys', event.target.value))
              }
            />
            <TextField
              size="small"
              label="Sort"
              value={row.sortOrder || ''}
              onChange={(event) =>
                onChange(updateRow(rows, index, 'sortOrder', event.target.value))
              }
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Switch
                  checked={Boolean(row.required)}
                  onChange={(event) =>
                    onChange(updateRow(rows, index, 'required', event.target.checked))
                  }
                  slotProps={{ input: { 'aria-label': 'Required artwork slot' } }}
                />
                <Typography variant="caption" className="text-ink-muted">
                  Required
                </Typography>
              </div>
              <IconButton
                size="small"
                aria-label="Remove artwork slot"
                onClick={() => onChange(removeRow(rows, index))}
                className="h-8 w-8 rounded-lg border border-border text-danger"
              >
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DesignAssetsEditor({ rows, onChange, t }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <Typography className="font-bold text-ink-strong">
            {t('listings.catalogSetup.fields.designAssets', { defaultValue: 'Design assets' })}
          </Typography>
          <Typography variant="caption" className="text-ink-muted">
            {t('listings.catalogSetup.help.designAssets', {
              defaultValue: 'Template files already stored in media, such as PSD or preview asset.',
            })}
          </Typography>
        </div>
        <IconButton
          size="small"
          aria-label="Add design asset"
          onClick={() => onChange([...rows, { ...blankDesignAsset }])}
          className="h-8 w-8 rounded-lg border border-border text-primary"
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </div>
      <div className="grid gap-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-lg bg-surface-subtle p-3 xl:grid-cols-[150px_minmax(260px,1.4fr)_100px_minmax(180px,1fr)_170px]"
          >
            <TextField
              select
              size="small"
              label="Asset type"
              value={row.type || 'PSD_TEMPLATE'}
              onChange={(event) => onChange(updateRow(rows, index, 'type', event.target.value))}
            >
              {assetTypeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Media asset"
              placeholder="660000000000000000000901"
              helperText={templateFieldHelp.mediaAssetId}
              value={row.mediaAssetId || ''}
              onChange={(event) =>
                onChange(updateRow(rows, index, 'mediaAssetId', event.target.value))
              }
            />
            <TextField
              size="small"
              label="Version"
              placeholder="v1"
              value={row.version || ''}
              onChange={(event) => onChange(updateRow(rows, index, 'version', event.target.value))}
            />
            <TextField
              size="small"
              label="Display label"
              placeholder="Main PSD"
              helperText={templateFieldHelp.label}
              value={row.label || ''}
              onChange={(event) => onChange(updateRow(rows, index, 'label', event.target.value))}
            />
            <div className="flex items-center gap-2">
              <div className="min-w-28">
                <Typography variant="caption" className="block text-ink-muted">
                  Status
                </Typography>
                <div className="flex items-center gap-1">
                  <StatusSwitch
                    checked={(row.status || 'ACTIVE') !== 'INACTIVE'}
                    ariaLabel="Asset status"
                    onChange={(_event, checked) =>
                      onChange(updateRow(rows, index, 'status', checked ? 'ACTIVE' : 'INACTIVE'))
                    }
                  />
                  <Typography variant="caption" className="text-ink-muted">
                    {(row.status || 'ACTIVE') !== 'INACTIVE' ? 'Active' : 'Inactive'}
                  </Typography>
                </div>
              </div>
              <IconButton
                size="small"
                aria-label="Remove design asset"
                onClick={() => onChange(removeRow(rows, index))}
                className="h-8 w-8 rounded-lg border border-border text-danger"
              >
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InternalTemplateDialog({
  mode,
  open,
  values: initialValues,
  productTypes,
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
      <DialogTitle className="text-xl font-bold text-ink-strong">
        {t(
          isEdit
            ? 'listings.catalogSetup.templates.editTitle'
            : 'listings.catalogSetup.templates.addTitle',
          { defaultValue: isEdit ? 'Edit internal template' : 'Create internal template' },
        )}
      </DialogTitle>
      <DialogContent className="flex max-h-[78vh] flex-col gap-4 overflow-y-auto pt-3">
        <div className="rounded-lg border border-info/30 bg-info-bg px-4 py-3">
          <Typography className="text-sm font-semibold text-info-strong">
            {t('listings.catalogSetup.help.templateModalTitle', {
              defaultValue: 'How to fill template fields',
            })}
          </Typography>
          <Typography variant="body2" className="mt-1 text-ink-secondary">
            {t('listings.catalogSetup.help.templateModalBody', {
              defaultValue:
                'Key is the stable system code used by mapping and production. Label is the readable name operators see on orders and design tasks.',
            })}
          </Typography>
        </div>
        <TextField
          size="small"
          label={t('listings.catalogSetup.fields.code', { defaultValue: 'Code' })}
          value={values.code}
          disabled={isEdit}
          helperText={t('listings.catalogSetup.help.templateCode', {
            defaultValue: 'Template code used by listing and mapping, for example TSHIRT_MAIN.',
          })}
          onChange={(event) => onChange('code', event.target.value)}
        />
        <TextField
          size="small"
          label={t('listings.catalogSetup.fields.name', { defaultValue: 'Display name' })}
          value={values.name}
          onChange={(event) => onChange('name', event.target.value)}
        />
        <TextField
          size="small"
          multiline
          minRows={2}
          label={t('listings.catalogSetup.fields.description', { defaultValue: 'Description' })}
          value={values.description}
          onChange={(event) => onChange('description', event.target.value)}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <FormControl size="small">
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
        <Typography variant="caption" className="text-ink-muted">
          {t('listings.catalogSetup.help.templateFields', {
            defaultValue:
              'Configure the template fields used by mapping, design, and production without editing raw JSON.',
          })}
        </Typography>
        <RequiredFieldsEditor
          rows={values.requiredFields || []}
          onChange={(rows) => onChange('requiredFields', rows)}
          t={t}
        />
        <ArtworkSlotsEditor
          rows={values.artworkSlots || []}
          onChange={(rows) => onChange('artworkSlots', rows)}
          t={t}
        />
        <DesignAssetsEditor
          rows={values.designAssets || []}
          onChange={(rows) => onChange('designAssets', rows)}
          t={t}
        />
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

function canSubmitListing(values, mode) {
  if (!values.title || !values.productTypeGroupId) return false
  if (mode === 'edit') return true

  return Boolean(
    values.shopId &&
    values.salesChannelCode &&
    values.marketplaceCode &&
    values.sku &&
    values.productTypeGroupId,
  )
}

function canSubmitProductType(values, mode) {
  if (!values.name) return false
  return mode === 'edit' ? true : Boolean(values.code)
}

function canSubmitInternalTemplate(values, mode) {
  if (!values.name || !values.productTypeGroupId) return false
  return mode === 'edit' ? true : Boolean(values.code)
}

function toTemplateFormValues(template = {}) {
  return {
    id: template.id || '',
    code: template.code || '',
    name: template.name || '',
    description: template.description || '',
    productTypeGroupId: template.productTypeGroupId || '',
    status: template.status || 'ACTIVE',
    requiredFields: template.requiredFields || [],
    artworkSlots: template.artworkSlots || [],
    designAssets: template.designAssets || [],
  }
}

export default function ListingPage() {
  const { i18n, t } = useTranslation()
  const location = useLocation()
  const { enqueueSnackbar } = useSnackbar()
  const workspaceView = getListingWorkspaceView(location.search)
  const showListingManagement = workspaceView === LISTING_WORKSPACE_VIEWS.LISTINGS
  const showProductTypes = workspaceView === LISTING_WORKSPACE_VIEWS.PRODUCT_TYPES
  const showInternalTemplates = workspaceView === LISTING_WORKSPACE_VIEWS.INTERNAL_TEMPLATES
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [shop, setShop] = useState('all')
  const [listingProductType, setListingProductType] = useState('all')
  const [listingPsdStatus, setListingPsdStatus] = useState('all')
  const [listingCostStatus, setListingCostStatus] = useState('all')
  const [listingQcStatus, setListingQcStatus] = useState('all')
  const [listingStatus, setListingStatus] = useState('all')
  const [listingSort, setListingSort] = useState('createdAtDesc')
  const [page, setPage] = useState(1)
  const [dialogMode, setDialogMode] = useState('create')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formValues, setFormValues] = useState(initialFormValues)
  const [rejectListing, setRejectListing] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [productTypeSearch, setProductTypeSearch] = useState('')
  const [productTypeStatus, setProductTypeStatus] = useState('all')
  const [productTypePage, setProductTypePage] = useState(1)
  const [templateSearch, setTemplateSearch] = useState('')
  const [templateStatus, setTemplateStatus] = useState('all')
  const [templateProductType, setTemplateProductType] = useState('all')
  const [templatePage, setTemplatePage] = useState(1)
  const [productTypeDialog, setProductTypeDialog] = useState({ mode: 'create', open: false })
  const [productTypeValues, setProductTypeValues] = useState(initialProductTypeValues)
  const [templateDialog, setTemplateDialog] = useState({ mode: 'create', open: false })
  const [templateValues, setTemplateValues] = useState(initialTemplateValues)
  const [templateDetailLoading, setTemplateDetailLoading] = useState(false)

  const shopsQuery = useListingShopsQuery({ limit: 100 })
  const productTypesQuery = useListingProductTypesQuery({ limit: 100, status: 'ACTIVE' })
  const shopNameById = useMemo(
    () => new Map((shopsQuery.data || []).map((shopOption) => [shopOption.id, shopOption.label])),
    [shopsQuery.data],
  )
  const queryFilters = {
    page,
    limit: DEFAULT_LIMIT,
    tab: activeTab,
    search,
    shopId: shop,
    productTypeGroupId: listingProductType === 'all' ? undefined : listingProductType,
    psdStatus: listingPsdStatus === 'all' ? undefined : listingPsdStatus,
    costCenterStatus: listingCostStatus === 'all' ? undefined : listingCostStatus,
    qcStatus: listingQcStatus === 'all' ? undefined : listingQcStatus,
    status: listingStatus === 'all' ? undefined : listingStatus,
    sort: listingSort,
  }
  const summaryQuery = useListingSummaryQuery({ shopId: shop })
  const listingsQuery = useListingsQuery(queryFilters, {
    mapperOptions: { locale: i18n.language, shopNameById },
  })
  const productTypeGroupsQuery = useCatalogProductTypeGroupsQuery({
    page: productTypePage,
    limit: 5,
    search: productTypeSearch,
    status: productTypeStatus,
  })
  const internalTemplatesQuery = useCatalogInternalTemplatesQuery({
    page: templatePage,
    limit: 5,
    search: templateSearch,
    status: templateStatus,
    productTypeGroupId: templateProductType,
  })
  const createListingMutation = useCreateListingMutation()
  const updateListingMutation = useUpdateListingMutation()
  const createProductTypeGroupMutation = useCreateProductTypeGroupMutation()
  const updateProductTypeGroupMutation = useUpdateProductTypeGroupMutation()
  const createInternalTemplateMutation = useCreateInternalTemplateMutation()
  const updateInternalTemplateMutation = useUpdateInternalTemplateMutation()
  const createListingPsdTaskMutation = useCreateListingPsdTaskMutation()
  const downloadListingAssetMutation = useDownloadListingAssetMutation()
  const approveListingMutation = useApproveListingMutation()
  const rejectListingMutation = useRejectListingMutation()

  const stats = mapListingStats(summaryQuery.data)
  const listings = listingsQuery.data?.items || []
  const pagination = listingsQuery.data?.pagination || { page: 1, limit: DEFAULT_LIMIT, total: 0 }
  const productTypeGroups = productTypeGroupsQuery.data?.items || []
  const productTypePagination = productTypeGroupsQuery.data?.pagination || {
    page: 1,
    limit: 5,
    total: 0,
  }
  const productTypePageCount = Math.max(
    Math.ceil(productTypePagination.total / productTypePagination.limit),
    1,
  )
  const internalTemplates = internalTemplatesQuery.data?.items || []
  const templatePagination = internalTemplatesQuery.data?.pagination || {
    page: 1,
    limit: 5,
    total: 0,
  }
  const templatePageCount = Math.max(
    Math.ceil(templatePagination.total / templatePagination.limit),
    1,
  )
  const isDialogSubmitting = createListingMutation.isPending || updateListingMutation.isPending
  const isProductTypeSubmitting =
    createProductTypeGroupMutation.isPending || updateProductTypeGroupMutation.isPending
  const isTemplateSubmitting =
    createInternalTemplateMutation.isPending ||
    updateInternalTemplateMutation.isPending ||
    templateDetailLoading

  function openCreateDialog() {
    setDialogMode('create')
    setFormValues(initialFormValues)
    setDialogOpen(true)
  }

  function openEditDialog(listing) {
    setDialogMode('edit')
    setFormValues({
      ...initialFormValues,
      id: listing.id,
      shopId: listing.shopId,
      salesChannelCode: listing.raw.salesChannelCode || 'AMAZON',
      marketplaceCode: listing.raw.marketplaceCode || 'US',
      sku: listing.sku,
      asin: listing.raw.asin || '',
      etsyListingId: listing.raw.etsyListingId || '',
      title: listing.title,
      productTypeGroupId: listing.productTypeGroupId,
      internalTemplateId: listing.internalTemplateId,
      baseCostAmount: listing.raw.baseCostAmount ?? '',
      currency: listing.raw.currency || 'USD',
      costCenterStatus: listing.raw.costCenterStatus || 'MISSING',
      status: listing.rawStatus || 'ACTIVE',
      psdStatus: listing.rawPsdStatus || 'MISSING',
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
  }

  function openCreateProductTypeDialog() {
    setProductTypeDialog({ mode: 'create', open: true })
    setProductTypeValues(initialProductTypeValues)
  }

  function openEditProductTypeDialog(group) {
    setProductTypeDialog({ mode: 'edit', open: true })
    setProductTypeValues({
      id: group.id,
      code: group.code,
      name: group.name,
      sortOrder: group.sortOrder || '',
      status: group.status || 'ACTIVE',
    })
  }

  function closeProductTypeDialog() {
    setProductTypeDialog((current) => ({ ...current, open: false }))
  }

  function openCreateTemplateDialog() {
    setTemplateDialog({ mode: 'create', open: true })
    setTemplateValues(initialTemplateValues)
    setTemplateDetailLoading(false)
  }

  async function openEditTemplateDialog(template) {
    let nextValues = toTemplateFormValues(template)
    setTemplateDetailLoading(true)

    try {
      const detail = await apiClient
        .get(ENDPOINTS.CATALOG.INTERNAL_TEMPLATE(template.id))
        .then(unwrapApiData)
        .then(mapInternalTemplateResponse)
      nextValues = toTemplateFormValues(detail)
    } catch (error) {
      enqueueSnackbar(
        error.message ||
          t('listings.catalogSetup.messages.templateLoadFailed', {
            defaultValue: 'Could not load template detail',
          }),
        { variant: 'error' },
      )
    } finally {
      setTemplateValues(nextValues)
      setTemplateDialog({ mode: 'edit', open: true })
      setTemplateDetailLoading(false)
    }
  }

  function closeTemplateDialog() {
    setTemplateDialog((current) => ({ ...current, open: false }))
    setTemplateDetailLoading(false)
  }

  async function handleSubmitListing(nextValues = formValues) {
    if (!canSubmitListing(nextValues, dialogMode)) {
      enqueueSnackbar(t('listings.messages.required'), { variant: 'warning' })
      return
    }

    try {
      if (dialogMode === 'edit') {
        await updateListingMutation.mutateAsync({
          listingId: nextValues.id,
          payload: buildListingFormPayload(nextValues, { mode: 'update' }),
        })
      } else {
        await createListingMutation.mutateAsync(buildListingFormPayload(nextValues))
      }
      enqueueSnackbar(t('listings.messages.saved'), { variant: 'success' })
      closeDialog()
    } catch (error) {
      enqueueSnackbar(error.message || t('listings.messages.saveFailed'), { variant: 'error' })
    }
  }

  async function handleSubmitProductType(nextValues = productTypeValues) {
    if (!canSubmitProductType(nextValues, productTypeDialog.mode)) {
      enqueueSnackbar(t('listings.messages.required'), { variant: 'warning' })
      return
    }

    try {
      if (productTypeDialog.mode === 'edit') {
        await updateProductTypeGroupMutation.mutateAsync({
          groupId: nextValues.id,
          payload: buildProductTypeGroupPayload(nextValues, { mode: 'update' }),
        })
      } else {
        await createProductTypeGroupMutation.mutateAsync(buildProductTypeGroupPayload(nextValues))
      }
      enqueueSnackbar(
        t('listings.catalogSetup.messages.productTypeSaved', {
          defaultValue: 'Product type saved',
        }),
        { variant: 'success' },
      )
      closeProductTypeDialog()
    } catch (error) {
      enqueueSnackbar(
        error.message ||
          t('listings.catalogSetup.messages.productTypeSaveFailed', {
            defaultValue: 'Could not save product type',
          }),
        { variant: 'error' },
      )
    }
  }

  async function handleToggleProductType(group) {
    try {
      await updateProductTypeGroupMutation.mutateAsync({
        groupId: group.id,
        payload: { status: group.isActive ? 'INACTIVE' : 'ACTIVE' },
      })
    } catch (error) {
      enqueueSnackbar(error.message || t('listings.messages.saveFailed'), { variant: 'error' })
    }
  }

  async function handleSubmitTemplate(nextValues = templateValues) {
    if (!canSubmitInternalTemplate(nextValues, templateDialog.mode)) {
      enqueueSnackbar(t('listings.messages.required'), { variant: 'warning' })
      return
    }

    try {
      if (templateDialog.mode === 'edit') {
        await updateInternalTemplateMutation.mutateAsync({
          templateId: nextValues.id,
          payload: buildInternalTemplatePayload(nextValues, { mode: 'update' }),
        })
      } else {
        await createInternalTemplateMutation.mutateAsync(buildInternalTemplatePayload(nextValues))
      }
      enqueueSnackbar(
        t('listings.catalogSetup.messages.templateSaved', {
          defaultValue: 'Internal template saved',
        }),
        { variant: 'success' },
      )
      closeTemplateDialog()
    } catch (error) {
      enqueueSnackbar(
        error.message ||
          t('listings.catalogSetup.messages.templateSaveFailed', {
            defaultValue: 'Could not save internal template',
          }),
        { variant: 'error' },
      )
    }
  }

  async function handleToggleTemplate(template) {
    try {
      await updateInternalTemplateMutation.mutateAsync({
        templateId: template.id,
        payload: { status: template.isActive ? 'INACTIVE' : 'ACTIVE' },
      })
    } catch (error) {
      enqueueSnackbar(error.message || t('listings.messages.saveFailed'), { variant: 'error' })
    }
  }

  async function handleDownload(listing) {
    const assetId = listing.psdTemplateAsset?.assetId || listing.psdTemplateAssetId
    if (!assetId) return

    try {
      const blob = await downloadListingAssetMutation.mutateAsync(assetId)
      const href = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = href
      link.download =
        listing.psdTemplateAsset?.originalFilename ||
        `${listing.asinProductId || listing.sku || 'listing'}-psd`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(href)
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.error?.message ||
          error.message ||
          t('listings.messages.downloadFailed'),
        { variant: 'error' },
      )
    }
  }

  async function handleCreatePsdTask(listing) {
    try {
      await createListingPsdTaskMutation.mutateAsync(listing.id)
      enqueueSnackbar(
        t('listings.messages.psdTaskCreated', {
          defaultValue: 'PSD task created or reused',
        }),
        { variant: 'success' },
      )
    } catch (error) {
      enqueueSnackbar(
        error.message ||
          t('listings.messages.psdTaskCreateFailed', {
            defaultValue: 'Could not create PSD task',
          }),
        { variant: 'error' },
      )
    }
  }

  async function handleApproveListing(listing) {
    try {
      await approveListingMutation.mutateAsync(listing.id)
      enqueueSnackbar(t('listings.messages.approved'), { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(error.message || t('listings.messages.approveFailed'), { variant: 'error' })
    }
  }

  function openRejectDialog(listing) {
    setRejectListing(listing)
    setRejectReason('')
  }

  function closeRejectDialog() {
    setRejectListing(null)
    setRejectReason('')
  }

  async function handleRejectListing() {
    if (!rejectListing || !rejectReason.trim()) {
      enqueueSnackbar(t('listings.messages.rejectReasonRequired'), { variant: 'warning' })
      return
    }

    try {
      await rejectListingMutation.mutateAsync({
        listingId: rejectListing.id,
        rejectionReason: rejectReason.trim(),
      })
      enqueueSnackbar(t('listings.messages.rejected'), { variant: 'success' })
      closeRejectDialog()
    } catch (error) {
      enqueueSnackbar(error.message || t('listings.messages.rejectFailed'), { variant: 'error' })
    }
  }

  function renderListingCell(listing, column) {
    const hasPsdTemplate = listing.psdStatus === 'available'
    const hasInternalTemplate = listing.templateStatus === 'available'
    const hasCost = listing.costStatus === 'present'
    const isApproved = listing.rawQcStatus === 'APPROVED'
    const isActive = listing.rawStatus === 'ACTIVE'

    if (column.key === 'activity') {
      return (
        <div className="whitespace-nowrap">
          <div className="text-sm font-semibold text-ink-secondary">{listing.date}</div>
          <div className="mt-1 text-xs text-ink-muted">{listing.salesLabel}</div>
        </div>
      )
    }

    if (column.key === 'listing') {
      return (
        <div className="flex min-w-0 flex-col items-center gap-2">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-neutral-bg shadow-sm">
            {listing.previewUrl ? (
              <img
                src={listing.previewUrl}
                alt={listing.title || listing.sku || 'Listing preview'}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-ink-muted">
                No image
              </div>
            )}
          </div>
          <div className="max-w-32 truncate text-xs font-bold text-primary">
            {listing.asinProductId || listing.sku || '-'}
          </div>
        </div>
      )
    }

    if (column.key === 'total') {
      return <span className="text-sm font-bold text-ink-strong">{listing.total || 1}</span>
    }

    if (column.key === 'style') {
      return <Badge tone="gray">{listing.style}</Badge>
    }

    if (column.key === 'designProduct') {
      return (
        <Badge tone={hasInternalTemplate ? 'teal' : 'orange'}>
          {listing.designProduct || 'Template missing'}
        </Badge>
      )
    }

    if (column.key === 'variant') {
      return <Badge tone={listing.variant ? 'orange' : 'gray'}>{listing.variant || '-'}</Badge>
    }

    if (column.key === 'psdStatus') {
      return (
        <Badge tone={hasPsdTemplate ? 'green' : 'orange'}>
          {t(`listings.values.psdStatus.${listing.psdStatus}`)}
        </Badge>
      )
    }

    if (column.key === 'store') {
      return <Badge tone="primary">{listing.store}</Badge>
    }

    if (column.key === 'seller') {
      return <Badge tone={listing.seller === '-' ? 'gray' : 'orange'}>{listing.seller}</Badge>
    }

    if (column.key === 'asinType') {
      return <Badge tone="teal">{listing.asinType || 'unknown'}</Badge>
    }

    if (column.key === 'product') {
      return (
        <div className="flex flex-col gap-2">
          <Badge tone="blue">{listing.style}</Badge>
          <Badge tone={hasInternalTemplate ? 'green' : 'orange'}>
            {listing.designProduct || 'Template missing'}
          </Badge>
        </div>
      )
    }

    if (column.key === 'readiness') {
      return (
        <div
          className={`rounded-lg border px-3 py-2 ${
            hasPsdTemplate ? 'border-success bg-success-bg' : 'border-warning bg-warning-bg'
          }`}
        >
          <Badge tone={hasPsdTemplate ? 'green' : 'orange'}>
            {t(`listings.values.psdStatus.${listing.psdStatus}`)}
          </Badge>
          <div
            className={`mt-1 truncate text-xs font-medium ${
              hasPsdTemplate ? 'text-success' : 'text-warning-deep'
            }`}
          >
            {listing.psdTemplateLabel || listing.psdId}
          </div>
          {listing.psdTemplateSize ? (
            <div className="mt-0.5 text-xs text-ink-muted">{listing.psdTemplateSize}</div>
          ) : null}
          <div className="mt-2">
            <Badge tone={hasCost ? 'green' : 'orange'}>
              {hasCost ? 'Cost ready' : 'Cost missing'}
            </Badge>
          </div>
        </div>
      )
    }

    if (column.key === 'ownership') {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink-secondary">{listing.store}</span>
          <span className="text-xs text-ink-muted">{listing.channelLabel}</span>
        </div>
      )
    }

    if (column.key === 'type') {
      return (
        <div className="flex flex-col items-center gap-2">
          <Badge tone={isApproved ? 'green' : 'orange'}>{listing.rawQcStatus || 'UNKNOWN'}</Badge>
          <Badge tone={isActive ? 'teal' : 'gray'}>{listing.rawStatus || 'UNKNOWN'}</Badge>
        </div>
      )
    }

    if (column.key === 'actions') {
      return (
        <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-1">
          <IconActionButton
            label={t('listings.actions.download')}
            disabled={!listing.psdTemplateAsset?.assetId && !listing.psdTemplateAssetId}
            onClick={() => handleDownload(listing)}
          >
            <DownloadOutlinedIcon fontSize="small" />
          </IconActionButton>
          <IconActionButton
            label={t('listings.actions.createPsdTask', { defaultValue: 'Create PSD task' })}
            disabled={listing.rawPsdStatus === 'PRESENT'}
            onClick={() => handleCreatePsdTask(listing)}
          >
            <CloudUploadOutlinedIcon fontSize="small" />
          </IconActionButton>
          <IconActionButton
            label={t('listings.actions.edit')}
            onClick={() => openEditDialog(listing)}
          >
            <EditOutlinedIcon fontSize="small" />
          </IconActionButton>
          <IconActionButton
            label={t('listings.actions.approve')}
            disabled={listing.rawQcStatus !== 'DRAFT'}
            tone="success"
            onClick={() => handleApproveListing(listing)}
          >
            <CheckCircleOutlineOutlinedIcon fontSize="small" />
          </IconActionButton>
          <IconActionButton
            label={t('listings.actions.reject')}
            disabled={listing.rawQcStatus !== 'DRAFT'}
            tone="danger"
            onClick={() => openRejectDialog(listing)}
          >
            <CancelOutlinedIcon fontSize="small" />
          </IconActionButton>
          <IconActionButton label={t('listings.messages.deleteMissing')} disabled tone="danger">
            <DeleteOutlineOutlinedIcon fontSize="small" />
          </IconActionButton>
        </div>
      )
    }

    return null
  }

  return (
    <div className="min-h-full bg-page px-4 pt-0 pb-3">
      {showProductTypes || showInternalTemplates ? (
        <OperationsHeader
          title={
            showProductTypes
              ? t('listings.catalogSetup.productTypes.title', { defaultValue: 'Product types' })
              : t('listings.catalogSetup.templates.title', { defaultValue: 'Internal templates' })
          }
        />
      ) : null}

      {showListingManagement ? (
        <section className="mt-0 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {listingStats.map((stat) => (
            <StatCard
              key={stat.key}
              icon={stat.icon}
              label={t(`listings.stats.${stat.key}`)}
              value={stats[stat.key]}
            />
          ))}
        </section>
      ) : null}

      {showProductTypes || showInternalTemplates ? (
        <section
          className={`mt-3 grid items-stretch gap-3 ${
            showProductTypes && showInternalTemplates ? 'xl:grid-cols-2' : ''
          }`}
        >
          {showProductTypes ? (
            <div className="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
              <div className="flex min-h-20 flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <Typography component="h2" className="font-bold text-ink-strong">
                    {t('listings.catalogSetup.productTypes.title', {
                      defaultValue: 'Product types',
                    })}
                  </Typography>
                  <Typography variant="caption" className="text-ink-muted">
                    {t('listings.catalogSetup.productTypes.description', {
                      defaultValue:
                        'Define the internal product family used by mapping, listings, and vendor matching.',
                    })}
                  </Typography>
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip title={t('listings.actions.refresh')}>
                    <IconButton
                      size="small"
                      aria-label={t('listings.actions.refresh')}
                      onClick={() => productTypeGroupsQuery.refetch()}
                      className="h-8 w-8 rounded-lg border border-border"
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip
                    title={t('listings.catalogSetup.productTypes.add', {
                      defaultValue: 'Create product type',
                    })}
                  >
                    <IconButton
                      size="small"
                      aria-label={t('listings.catalogSetup.productTypes.add', {
                        defaultValue: 'Create product type',
                      })}
                      onClick={openCreateProductTypeDialog}
                      className="h-8 w-8 rounded-lg border border-border text-primary"
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <DebouncedTextField
                  size="small"
                  value={productTypeSearch}
                  onDebouncedChange={(nextValue) => {
                    setProductTypeSearch(nextValue)
                    setProductTypePage(1)
                  }}
                  placeholder={t('listings.catalogSetup.productTypes.search', {
                    defaultValue: 'Search code or name...',
                  })}
                  className="min-w-56 flex-1 bg-surface"
                  slotProps={{
                    input: {
                      className: 'h-10 rounded-lg text-sm',
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon className="text-ink-muted" fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <FormControl size="small" className="w-36">
                  <Select
                    value={productTypeStatus}
                    onChange={(event) => {
                      setProductTypeStatus(event.target.value)
                      setProductTypePage(1)
                    }}
                    IconComponent={KeyboardArrowDownIcon}
                    className="h-10 rounded-lg bg-surface text-sm text-ink-secondary"
                  >
                    <MenuItem value="all">
                      {t('listings.catalogSetup.status.all', { defaultValue: 'All status' })}
                    </MenuItem>
                    <MenuItem value="ACTIVE">{t('listings.values.status.active')}</MenuItem>
                    <MenuItem value="INACTIVE">{t('listings.values.status.inactive')}</MenuItem>
                  </Select>
                </FormControl>
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="min-w-[560px] w-full border-collapse">
                  <thead className="bg-surface-subtle">
                    <tr>
                      {['code', 'name', 'sort', 'active', 'actions'].map((column) => (
                        <th
                          key={column}
                          scope="col"
                          className="h-10 whitespace-nowrap px-4 text-left text-[11px] font-bold text-ink-muted"
                        >
                          {t(`listings.catalogSetup.columns.${column}`, {
                            defaultValue:
                              {
                                code: 'Code',
                                name: 'Name',
                                sort: 'Sort',
                                active: 'Active',
                                actions: 'Actions',
                              }[column] || column,
                          })}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {productTypeGroupsQuery.isPending ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-ink-muted">
                          {t('listings.catalogSetup.productTypes.loading', {
                            defaultValue: 'Loading product types...',
                          })}
                        </td>
                      </tr>
                    ) : productTypeGroups.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-ink-muted">
                          {t('listings.catalogSetup.productTypes.empty', {
                            defaultValue: 'No product types found',
                          })}
                        </td>
                      </tr>
                    ) : (
                      productTypeGroups.map((group) => (
                        <tr key={group.id} className="border-t border-border">
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-ink">
                            {group.code || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-ink-secondary">
                            {group.name || '-'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">
                            {group.sortOrder}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <StatusSwitch
                              checked={group.isActive}
                              disabled={updateProductTypeGroupMutation.isPending}
                              ariaLabel={t('listings.catalogSetup.productTypes.toggle', {
                                defaultValue: 'Toggle product type status',
                              })}
                              onChange={() => handleToggleProductType(group)}
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <Tooltip title={t('listings.actions.edit')}>
                              <IconButton
                                size="small"
                                aria-label={t('listings.actions.edit')}
                                onClick={() => openEditProductTypeDialog(group)}
                                className="h-8 w-8 rounded-lg border border-border text-ink-secondary"
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <footer className="flex justify-center border-t border-border px-4 py-3">
                <Pagination
                  size="small"
                  count={productTypePageCount}
                  page={productTypePage}
                  onChange={(_event, value) => setProductTypePage(value)}
                />
              </footer>
            </div>
          ) : null}

          {showInternalTemplates ? (
            <div className="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
              <div className="flex min-h-20 flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <Typography component="h2" className="font-bold text-ink-strong">
                    {t('listings.catalogSetup.templates.title', {
                      defaultValue: 'Internal templates',
                    })}
                  </Typography>
                  <Typography variant="caption" className="text-ink-muted">
                    {t('listings.catalogSetup.templates.description', {
                      defaultValue:
                        'Attach listings to the internal template that defines customer inputs and artwork slots.',
                    })}
                  </Typography>
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip title={t('listings.actions.refresh')}>
                    <IconButton
                      size="small"
                      aria-label={t('listings.actions.refresh')}
                      onClick={() => internalTemplatesQuery.refetch()}
                      className="h-8 w-8 rounded-lg border border-border"
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip
                    title={t('listings.catalogSetup.templates.add', {
                      defaultValue: 'Create internal template',
                    })}
                  >
                    <IconButton
                      size="small"
                      aria-label={t('listings.catalogSetup.templates.add', {
                        defaultValue: 'Create internal template',
                      })}
                      onClick={openCreateTemplateDialog}
                      className="h-8 w-8 rounded-lg border border-border text-primary"
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <DebouncedTextField
                  size="small"
                  value={templateSearch}
                  onDebouncedChange={(nextValue) => {
                    setTemplateSearch(nextValue)
                    setTemplatePage(1)
                  }}
                  placeholder={t('listings.catalogSetup.templates.search', {
                    defaultValue: 'Search template...',
                  })}
                  className="min-w-52 flex-1 bg-surface"
                  slotProps={{
                    input: {
                      className: 'h-10 rounded-lg text-sm',
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon className="text-ink-muted" fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <FormControl size="small" className="w-44">
                  <Select
                    value={templateProductType}
                    onChange={(event) => {
                      setTemplateProductType(event.target.value)
                      setTemplatePage(1)
                    }}
                    IconComponent={KeyboardArrowDownIcon}
                    className="h-10 rounded-lg bg-surface text-sm text-ink-secondary"
                  >
                    <MenuItem value="all">
                      {t('listings.catalogSetup.productTypes.all', {
                        defaultValue: 'All product types',
                      })}
                    </MenuItem>
                    {(productTypesQuery.data || []).map((typeOption) => (
                      <MenuItem key={typeOption.id} value={typeOption.id}>
                        {typeOption.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" className="w-36">
                  <Select
                    value={templateStatus}
                    onChange={(event) => {
                      setTemplateStatus(event.target.value)
                      setTemplatePage(1)
                    }}
                    IconComponent={KeyboardArrowDownIcon}
                    className="h-10 rounded-lg bg-surface text-sm text-ink-secondary"
                  >
                    <MenuItem value="all">
                      {t('listings.catalogSetup.status.all', { defaultValue: 'All status' })}
                    </MenuItem>
                    <MenuItem value="ACTIVE">{t('listings.values.status.active')}</MenuItem>
                    <MenuItem value="INACTIVE">{t('listings.values.status.inactive')}</MenuItem>
                  </Select>
                </FormControl>
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="min-w-[720px] w-full border-collapse">
                  <thead className="bg-surface-subtle">
                    <tr>
                      {[
                        'template',
                        'productType',
                        'inputs',
                        'artwork',
                        'assets',
                        'active',
                        'actions',
                      ].map((column) => (
                        <th
                          key={column}
                          scope="col"
                          className="h-10 whitespace-nowrap px-4 text-left text-[11px] font-bold text-ink-muted"
                        >
                          {t(`listings.catalogSetup.columns.${column}`, {
                            defaultValue:
                              {
                                template: 'Template',
                                productType: 'Product type',
                                inputs: 'Inputs',
                                artwork: 'Artwork',
                                assets: 'Assets',
                                active: 'Active',
                                actions: 'Actions',
                              }[column] || column,
                          })}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {internalTemplatesQuery.isPending ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-sm text-ink-muted">
                          {t('listings.catalogSetup.templates.loading', {
                            defaultValue: 'Loading templates...',
                          })}
                        </td>
                      </tr>
                    ) : internalTemplates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-sm text-ink-muted">
                          {t('listings.catalogSetup.templates.empty', {
                            defaultValue: 'No templates found',
                          })}
                        </td>
                      </tr>
                    ) : (
                      internalTemplates.map((template) => (
                        <tr key={template.id} className="border-t border-border">
                          <td className="px-4 py-3">
                            <div className="max-w-56 truncate text-sm font-bold text-ink">
                              {template.name || '-'}
                            </div>
                            <div className="max-w-56 truncate text-xs text-ink-muted">
                              {template.code || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-ink-secondary">
                            {template.productType || t('listings.values.common.noData')}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">
                            {template.requiredFieldCount}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">
                            {template.artworkSlotCount}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">
                            {template.designAssetCount}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <StatusSwitch
                              checked={template.isActive}
                              disabled={updateInternalTemplateMutation.isPending}
                              ariaLabel={t('listings.catalogSetup.templates.toggle', {
                                defaultValue: 'Toggle internal template status',
                              })}
                              onChange={() => handleToggleTemplate(template)}
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <Tooltip title={t('listings.actions.edit')}>
                              <IconButton
                                size="small"
                                aria-label={t('listings.actions.edit')}
                                onClick={() => openEditTemplateDialog(template)}
                                className="h-8 w-8 rounded-lg border border-border text-ink-secondary"
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <footer className="flex justify-center border-t border-border px-4 py-3">
                <Pagination
                  size="small"
                  count={templatePageCount}
                  page={templatePage}
                  onChange={(_event, value) => setTemplatePage(value)}
                />
              </footer>
            </div>
          ) : null}
        </section>
      ) : null}

      {showListingManagement ? (
        <section className="mt-3 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 pt-3">
            <ListingStatusTabs
              items={listingTabs.map((tab) => ({
                value: tab.key,
                label: t(`listings.tabs.${tab.key}`),
                count: stats[tab.countKey] || 0,
              }))}
              value={activeTab}
              onChange={(nextTab) => {
                setActiveTab(nextTab)
                setPage(1)
              }}
            />
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Typography
                variant="body2"
                className="flex h-9 items-center rounded-lg bg-neutral-bg px-3 font-bold text-ink-muted"
              >
                {pagination.total} {t('listings.management.records', { defaultValue: 'records' })}
              </Typography>
              <Tooltip title={t('listings.messages.importMissing')}>
                <span>
                  <Button
                    variant="outlined"
                    disabled
                    className="h-9 rounded-lg border-border px-4 text-sm font-bold text-primary"
                  >
                    {t('listings.actions.import')}
                  </Button>
                </span>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon fontSize="small" />}
                onClick={openCreateDialog}
                className="h-9 rounded-lg px-4 text-sm font-bold"
              >
                {t('listings.actions.add')}
              </Button>
            </div>
          </div>

          <OperationsToolbar className="border-b border-border bg-page/70 p-4">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <DebouncedTextField
                size="small"
                value={search}
                onDebouncedChange={(nextValue) => {
                  setSearch(nextValue)
                  setPage(1)
                }}
                placeholder={t('listings.filters.search')}
                className="min-w-0 flex-[1_1_220px] bg-surface"
                slotProps={{
                  input: {
                    className: 'h-10 rounded-lg text-sm',
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon className="text-ink-muted" fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <FormControl size="small" className="w-full sm:w-36">
                <Select
                  value={shop}
                  onChange={(event) => {
                    setShop(event.target.value)
                    setPage(1)
                  }}
                  IconComponent={KeyboardArrowDownIcon}
                  className="h-10 rounded-lg bg-surface text-sm font-semibold text-ink-secondary"
                >
                  <MenuItem value="all">{t('listings.filters.shops.all')}</MenuItem>
                  {(shopsQuery.data || []).map((shopOption) => (
                    <MenuItem key={shopOption.id} value={shopOption.id}>
                      {shopOption.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" className="w-full sm:w-40">
                <Select
                  value={listingProductType}
                  onChange={(event) => {
                    setListingProductType(event.target.value)
                    setPage(1)
                  }}
                  IconComponent={KeyboardArrowDownIcon}
                  className="h-10 rounded-lg bg-surface text-sm font-semibold text-ink-secondary"
                >
                  <MenuItem value="all">All product types</MenuItem>
                  {(productTypesQuery.data || []).map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" className="w-full sm:w-32">
                <Select
                  value={listingPsdStatus}
                  onChange={(event) => {
                    setListingPsdStatus(event.target.value)
                    setPage(1)
                  }}
                  IconComponent={KeyboardArrowDownIcon}
                  className="h-10 rounded-lg bg-surface text-sm font-semibold text-ink-secondary"
                >
                  <MenuItem value="all">All PSD</MenuItem>
                  {listingSetupStatusFilterOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      PSD {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" className="w-full sm:w-32">
                <Select
                  value={listingCostStatus}
                  onChange={(event) => {
                    setListingCostStatus(event.target.value)
                    setPage(1)
                  }}
                  IconComponent={KeyboardArrowDownIcon}
                  className="h-10 rounded-lg bg-surface text-sm font-semibold text-ink-secondary"
                >
                  <MenuItem value="all">All cost</MenuItem>
                  {listingSetupStatusFilterOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      Cost {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" className="w-full sm:w-32">
                <Select
                  value={listingQcStatus}
                  onChange={(event) => {
                    setListingQcStatus(event.target.value)
                    setPage(1)
                  }}
                  IconComponent={KeyboardArrowDownIcon}
                  className="h-10 rounded-lg bg-surface text-sm font-semibold text-ink-secondary"
                >
                  <MenuItem value="all">All QC</MenuItem>
                  {listingQcStatusFilterOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      QC {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" className="w-full sm:w-32">
                <Select
                  value={listingStatus}
                  onChange={(event) => {
                    setListingStatus(event.target.value)
                    setPage(1)
                  }}
                  IconComponent={KeyboardArrowDownIcon}
                  className="h-10 rounded-lg bg-surface text-sm font-semibold text-ink-secondary"
                >
                  <MenuItem value="all">All status</MenuItem>
                  {listingStatusFilterOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" className="w-full sm:w-40">
                <Select
                  value={listingSort}
                  onChange={(event) => {
                    setListingSort(event.target.value)
                    setPage(1)
                  }}
                  IconComponent={KeyboardArrowDownIcon}
                  className="h-10 rounded-lg bg-surface text-sm font-semibold text-ink-secondary"
                >
                  {listingSortOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Tooltip title={t('listings.actions.refresh')}>
                <IconButton
                  aria-label={t('listings.actions.refresh')}
                  onClick={() => {
                    listingsQuery.refetch()
                    summaryQuery.refetch()
                  }}
                  className="h-10 w-10 rounded-lg border border-border bg-surface text-ink-secondary hover:bg-surface-subtle"
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </div>
          </OperationsToolbar>

          <div className="h-[620px] overflow-auto bg-surface">
            <table className="min-w-[1360px] w-full border-collapse text-sm">
              <colgroup>
                <col className="w-[118px]" />
                <col className="w-[150px]" />
                <col className="w-[52px]" />
                <col className="w-[124px]" />
                <col className="w-[128px]" />
                <col className="w-[80px]" />
                <col className="w-[118px]" />
                <col className="w-[140px]" />
                <col className="w-[178px]" />
                <col className="w-[108px]" />
                <col className="w-[178px]" />
              </colgroup>
              <thead className="sticky top-0 z-20 bg-neutral-bg text-xs font-extrabold uppercase tracking-wide text-ink-strong shadow-sm">
                <tr>
                  <th
                    rowSpan={2}
                    className="border border-border bg-neutral-bg px-3 py-3 text-center"
                  >
                    Date
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-border bg-neutral-bg px-3 py-3 text-center"
                  >
                    Asin / Product ID
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-border bg-neutral-bg px-3 py-3 text-center"
                  >
                    Total
                  </th>
                  <th
                    colSpan={3}
                    className="border border-border bg-neutral-bg px-3 py-2 text-center"
                  >
                    Template
                  </th>
                  <th
                    colSpan={1}
                    className="border border-border bg-neutral-bg px-3 py-2 text-center"
                  >
                    PSD
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-border bg-neutral-bg px-3 py-3 text-center"
                  >
                    Store
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-border bg-neutral-bg px-3 py-3 text-center"
                  >
                    Seller
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-border bg-neutral-bg px-3 py-3 text-center"
                  >
                    Asin Type
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-border bg-neutral-bg px-3 py-3 text-center"
                  >
                    Actions
                  </th>
                </tr>
                <tr>
                  <th className="border border-border bg-neutral-bg px-3 py-2 text-center">
                    Style
                  </th>
                  <th className="border border-border bg-neutral-bg px-3 py-2 text-center">
                    Design Product
                  </th>
                  <th className="border border-border bg-neutral-bg px-3 py-2 text-center">
                    Variant
                  </th>
                  <th className="border border-border bg-neutral-bg px-3 py-2 text-center">
                    PSD Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {listingsQuery.isPending ? (
                  Array.from({ length: 5 }, (_, index) => (
                    <tr key={index}>
                      <td colSpan={11} className="border border-border px-4 py-3">
                        <Skeleton height={72} />
                      </td>
                    </tr>
                  ))
                ) : listings.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="border border-border px-4 py-12 text-center">
                      <Typography className="font-semibold text-ink-strong">
                        {t('listings.messages.empty')}
                      </Typography>
                    </td>
                  </tr>
                ) : (
                  listings.map((listing) => (
                    <tr key={listing.id} className="bg-surface hover:bg-surface-subtle/60">
                      {[
                        'activity',
                        'listing',
                        'total',
                        'style',
                        'designProduct',
                        'variant',
                        'psdStatus',
                        'store',
                        'seller',
                        'asinType',
                        'actions',
                      ].map((key) => (
                        <td
                          key={key}
                          className="h-[104px] border border-border px-3 py-2 text-center align-middle"
                        >
                          <div className="flex min-w-0 justify-center">
                            {renderListingCell(listing, { key })}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <footer className="border-t border-border px-5 py-4">
            <OperationsPagination
              page={page}
              pageSize={pagination.limit}
              total={pagination.total}
              onPageChange={setPage}
            />
          </footer>
        </section>
      ) : null}
      <ListingDialog
        key={`${dialogOpen}-${dialogMode}-${formValues.id || 'new'}`}
        mode={dialogMode}
        open={dialogOpen}
        values={formValues}
        shops={shopsQuery.data || []}
        productTypes={productTypesQuery.data || []}
        isSubmitting={isDialogSubmitting}
        onClose={closeDialog}
        onSubmit={handleSubmitListing}
        t={t}
      />
      <ProductTypeDialog
        key={`${productTypeDialog.open}-${productTypeDialog.mode}-${productTypeValues.id || 'new'}`}
        mode={productTypeDialog.mode}
        open={productTypeDialog.open}
        values={productTypeValues}
        isSubmitting={isProductTypeSubmitting}
        onClose={closeProductTypeDialog}
        onSubmit={handleSubmitProductType}
        t={t}
      />
      <InternalTemplateDialog
        key={`${templateDialog.open}-${templateDialog.mode}-${templateValues.id || 'new'}`}
        mode={templateDialog.mode}
        open={templateDialog.open}
        values={templateValues}
        productTypes={productTypesQuery.data || []}
        isSubmitting={isTemplateSubmitting}
        onClose={closeTemplateDialog}
        onSubmit={handleSubmitTemplate}
        t={t}
      />
      <Dialog
        open={Boolean(rejectListing)}
        onClose={closeRejectDialog}
        fullWidth
        maxWidth="xs"
        PaperProps={{ className: 'rounded-xl' }}
      >
        <DialogTitle className="text-xl font-bold text-ink-strong">
          {t('listings.reject.title')}
        </DialogTitle>
        <DialogContent className="pt-3">
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={3}
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder={t('listings.reject.reasonPlaceholder')}
          />
        </DialogContent>
        <DialogActions className="px-6 pb-6 pt-3">
          <Button
            variant="outlined"
            onClick={closeRejectDialog}
            className="h-10 rounded-lg px-5 font-semibold"
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRejectListing}
            disabled={rejectListingMutation.isPending}
            className="h-10 rounded-lg px-5 font-semibold"
          >
            {t('listings.reject.submit')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
