import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'

import {
  useApproveListingMutation,
  useCreateListingMutation,
  useDownloadListingAssetMutation,
  useRejectListingMutation,
  useUpdateListingMutation,
  useUploadListingPsdMutation,
} from '../api/listings.mutations'
import {
  useListingProductTypesQuery,
  useListingShopsQuery,
  useListingsQuery,
  useListingSummaryQuery,
} from '../api/listings.queries'
import { buildListingFormPayload, mapListingStats } from '../utils/listingsApi'

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

const salesChannelOptions = ['AMAZON', 'ETSY', 'SHOPIFY', 'TIKTOK_SHOP', 'WALMART', 'CUSTOM']

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

function ListingDialog({
  mode,
  open,
  values,
  productTypes,
  shops,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
  t,
}) {
  const isEdit = mode === 'edit'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ className: 'rounded-xl' }}
    >
      <DialogTitle className="pr-10 text-xl font-bold text-ink-strong">
        {t(isEdit ? 'listings.form.editTitle' : 'listings.form.addTitle')}
      </DialogTitle>
      <DialogContent className="flex flex-col gap-4 pt-3">
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
          <FormControl size="small">
            <Typography variant="body2" className="mb-1 font-semibold text-ink">
              {t('listings.form.status')}
            </Typography>
            <Select
              value={values.status}
              onChange={(event) => onChange('status', event.target.value)}
              IconComponent={KeyboardArrowDownIcon}
              className="h-10 rounded-lg text-sm"
            >
              <MenuItem value="ACTIVE">{t('listings.values.status.active')}</MenuItem>
              <MenuItem value="INACTIVE">{t('listings.values.status.inactive')}</MenuItem>
            </Select>
          </FormControl>
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
          onClick={onSubmit}
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

export default function ListingPage() {
  const { i18n, t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const uploadInputRef = useRef(null)
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('asin')
  const [seller, setSeller] = useState('all')
  const [shop, setShop] = useState('all')
  const [page, setPage] = useState(1)
  const [dialogMode, setDialogMode] = useState('create')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formValues, setFormValues] = useState(initialFormValues)
  const [uploadListingId, setUploadListingId] = useState(null)
  const [rejectListing, setRejectListing] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

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
    searchField,
    shopId: shop,
  }
  const summaryQuery = useListingSummaryQuery({ shopId: shop })
  const listingsQuery = useListingsQuery(queryFilters, {
    mapperOptions: { locale: i18n.language, shopNameById },
  })
  const createListingMutation = useCreateListingMutation()
  const updateListingMutation = useUpdateListingMutation()
  const uploadListingPsdMutation = useUploadListingPsdMutation()
  const downloadListingAssetMutation = useDownloadListingAssetMutation()
  const approveListingMutation = useApproveListingMutation()
  const rejectListingMutation = useRejectListingMutation()

  const stats = mapListingStats(summaryQuery.data)
  const listings = listingsQuery.data?.items || []
  const pagination = listingsQuery.data?.pagination || { page: 1, limit: DEFAULT_LIMIT, total: 0 }
  const pageCount = Math.max(Math.ceil(pagination.total / pagination.limit), 1)
  const isDialogSubmitting = createListingMutation.isPending || updateListingMutation.isPending

  function updateFormValue(field, value) {
    setFormValues((current) => ({ ...current, [field]: value }))
  }

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

  async function handleSubmitListing() {
    if (!canSubmitListing(formValues, dialogMode)) {
      enqueueSnackbar(t('listings.messages.required'), { variant: 'warning' })
      return
    }

    try {
      if (dialogMode === 'edit') {
        await updateListingMutation.mutateAsync({
          listingId: formValues.id,
          payload: buildListingFormPayload(formValues, { mode: 'update' }),
        })
      } else {
        await createListingMutation.mutateAsync(buildListingFormPayload(formValues))
      }
      enqueueSnackbar(t('listings.messages.saved'), { variant: 'success' })
      closeDialog()
    } catch (error) {
      enqueueSnackbar(error.message || t('listings.messages.saveFailed'), { variant: 'error' })
    }
  }

  async function handleDownload(listing) {
    if (!listing.psdTemplateAssetId) return

    try {
      const blob = await downloadListingAssetMutation.mutateAsync(listing.psdTemplateAssetId)
      const href = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = href
      link.download = `${listing.asinProductId || listing.sku || 'listing'}-psd`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(href)
    } catch (error) {
      enqueueSnackbar(error.message || t('listings.messages.downloadFailed'), { variant: 'error' })
    }
  }

  function handleUploadClick(listing) {
    setUploadListingId(listing.id)
    uploadInputRef.current?.click()
  }

  async function handleUploadChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !uploadListingId) return

    try {
      await uploadListingPsdMutation.mutateAsync({ listingId: uploadListingId, file })
      enqueueSnackbar(t('listings.messages.uploaded'), { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(error.message || t('listings.messages.uploadFailed'), { variant: 'error' })
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

  return (
    <div className="min-h-full bg-page px-6 py-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Typography component="h1" variant="h4" className="font-bold text-ink-strong">
          {t('listings.title')}
        </Typography>
        <div className="flex items-center gap-3">
          <Tooltip title={t('listings.messages.importMissing')}>
            <span>
              <Button
                variant="outlined"
                disabled
                className="h-10 rounded-lg border-border px-4 text-sm font-bold text-primary"
              >
                {t('listings.actions.import')}
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            onClick={openCreateDialog}
            className="h-10 rounded-lg px-5 text-sm font-bold"
          >
            {t('listings.actions.add')}
          </Button>
        </div>
      </header>

      <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {listingStats.map((stat) => (
          <StatCard
            key={stat.key}
            icon={stat.icon}
            label={t(`listings.stats.${stat.key}`)}
            value={stats[stat.key]}
          />
        ))}
      </section>

      <section className="mt-6 border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          {listingTabs.map((tab) => {
            const active = activeTab === tab.key
            const count = stats[tab.countKey] || 0

            return (
              <Tooltip key={tab.key} title="">
                <span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.key)
                      setPage(1)
                    }}
                    className={`flex h-10 items-center gap-2 border-0 border-b-2 bg-page px-3 text-sm font-semibold ${
                      active
                        ? 'border-primary text-primary'
                        : 'border-transparent text-ink-muted hover:text-ink-secondary'
                    } cursor-pointer`}
                  >
                    {t(`listings.tabs.${tab.key}`)}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        active ? 'bg-primary text-white' : 'bg-neutral-bg text-ink-muted'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                </span>
              </Tooltip>
            )
          })}
        </div>
      </section>

      <section className="mt-6 inline-flex max-w-full flex-wrap items-center gap-3 rounded-xl bg-surface p-4 shadow-sm">
        <FormControl size="small" className="w-28">
          <Select
            value={searchField}
            onChange={(event) => {
              setSearchField(event.target.value)
              setPage(1)
            }}
            IconComponent={KeyboardArrowDownIcon}
            className="h-10 rounded-lg bg-surface text-sm text-ink-secondary"
          >
            <MenuItem value="asin">{t('listings.filters.searchFields.asin')}</MenuItem>
            <MenuItem value="sku">{t('listings.filters.searchFields.sku')}</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder={t('listings.filters.search')}
          className="w-92 max-w-full bg-surface"
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
        <Tooltip title={t('listings.messages.sellerMissing')}>
          <FormControl size="small" className="w-56 max-w-full">
            <Select
              value={seller}
              disabled
              onChange={(event) => setSeller(event.target.value)}
              IconComponent={KeyboardArrowDownIcon}
              className="h-10 rounded-lg bg-surface text-sm text-ink-secondary"
            >
              <MenuItem value="all">{t('listings.filters.sellers.all')}</MenuItem>
            </Select>
          </FormControl>
        </Tooltip>
        <FormControl size="small" className="w-56 max-w-full">
          <Select
            value={shop}
            onChange={(event) => {
              setShop(event.target.value)
              setPage(1)
            }}
            IconComponent={KeyboardArrowDownIcon}
            className="h-10 rounded-lg bg-surface text-sm text-ink-secondary"
          >
            <MenuItem value="all">{t('listings.filters.shops.all')}</MenuItem>
            {(shopsQuery.data || []).map((shopOption) => (
              <MenuItem key={shopOption.id} value={shopOption.id}>
                {shopOption.label}
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
            className="h-10 w-10 rounded-lg border border-border"
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-surface-subtle">
              <tr>
                {[
                  'date',
                  'asin',
                  'total',
                  'style',
                  'designProduct',
                  'variant',
                  'psdId',
                  'psdStatus',
                  'store',
                  'seller',
                  'asinType',
                  'actions',
                ].map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="h-12 whitespace-nowrap px-4 text-left text-[11px] font-bold text-ink-muted"
                  >
                    {t(`listings.table.${column}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listingsQuery.isPending ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-sm text-ink-muted">
                    {t('listings.messages.loading')}
                  </td>
                </tr>
              ) : listings.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-sm text-ink-muted">
                    {t('listings.messages.empty')}
                  </td>
                </tr>
              ) : (
                listings.map((listing) => (
                  <tr key={listing.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="text-sm font-bold text-ink-secondary">{listing.date}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-40 truncate text-sm font-bold text-primary underline">
                        {listing.asinProductId}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm font-bold text-ink">
                      {listing.total}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <Badge tone="blue">{listing.style}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <Badge tone="green">
                        {listing.designProduct || t('listings.values.common.noData')}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <Badge tone="orange">
                        {listing.variant || t('listings.values.common.noData')}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <Badge tone="purple">{listing.psdId}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <Badge tone={listing.psdStatus === 'available' ? 'green' : 'gray'}>
                        {t(`listings.values.psdStatus.${listing.psdStatus}`)}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <Badge tone="blue">{listing.store}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <Badge tone="gray">
                        {listing.seller || t('listings.values.common.noData')}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <Badge tone="teal">{t(`listings.values.asinType.${listing.asinType}`)}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-1">
                        <Tooltip title={t('listings.actions.download')}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={!listing.psdTemplateAssetId}
                              aria-label={t('listings.actions.download')}
                              onClick={() => handleDownload(listing)}
                              className="h-8 w-8 rounded-lg border border-border text-ink-secondary"
                            >
                              <DownloadOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={t('listings.actions.upload')}>
                          <IconButton
                            size="small"
                            aria-label={t('listings.actions.upload')}
                            onClick={() => handleUploadClick(listing)}
                            className="h-8 w-8 rounded-lg border border-border text-ink-secondary"
                          >
                            <CloudUploadOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('listings.actions.edit')}>
                          <IconButton
                            size="small"
                            aria-label={t('listings.actions.edit')}
                            onClick={() => openEditDialog(listing)}
                            className="h-8 w-8 rounded-lg border border-border text-ink-secondary"
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('listings.actions.approve')}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={listing.rawQcStatus !== 'DRAFT'}
                              aria-label={t('listings.actions.approve')}
                              onClick={() => handleApproveListing(listing)}
                              className="h-8 w-8 rounded-lg border border-border text-success"
                            >
                              <CheckCircleOutlineOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={t('listings.actions.reject')}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={listing.rawQcStatus !== 'DRAFT'}
                              aria-label={t('listings.actions.reject')}
                              onClick={() => openRejectDialog(listing)}
                              className="h-8 w-8 rounded-lg border border-border text-danger"
                            >
                              <CancelOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={t('listings.messages.deleteMissing')}>
                          <span>
                            <IconButton
                              size="small"
                              disabled
                              aria-label={t('listings.actions.delete')}
                              className="h-8 w-8 rounded-lg border border-border text-danger"
                            >
                              <DeleteOutlineOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex justify-center border-t border-border px-5 py-4">
          <Pagination count={pageCount} page={page} onChange={(_event, value) => setPage(value)} />
        </footer>
      </section>

      <input
        ref={uploadInputRef}
        type="file"
        accept=".psd,.zip,.rar"
        className="hidden"
        onChange={handleUploadChange}
      />
      <ListingDialog
        mode={dialogMode}
        open={dialogOpen}
        values={formValues}
        shops={shopsQuery.data || []}
        productTypes={productTypesQuery.data || []}
        isSubmitting={isDialogSubmitting}
        onChange={updateFormValue}
        onClose={closeDialog}
        onSubmit={handleSubmitListing}
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
