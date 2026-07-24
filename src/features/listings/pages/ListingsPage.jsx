import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined'
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
  Menu,
  MenuItem,
  Select,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useSnackbar } from 'notistack'

import ImagePreview from '@/components/common/ImagePreview'
import { IconActionButton, OperationsPagination, OperationsToolbar } from '@/components/operations'

import {
  useApproveListingMutation,
  useCreateListingMutation,
  useCreateListingPsdTaskMutation,
  useDownloadListingAssetMutation,
  useRejectListingMutation,
  useUpdateListingMutation,
} from '../api/listings.mutations'
import {
  useListingProductTypesQuery,
  useListingShopsQuery,
  useListingsQuery,
  useListingSummaryQuery,
} from '../api/listings.queries'
import ListingDialog from '../components/dialogs/ListingDialog'
import { buildListingFormPayload, mapListingStats } from '../utils/listingsApi'

const DEFAULT_LIMIT = 10

const listingStats = [
  { key: 'totalAsin', icon: Inventory2OutlinedIcon },
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
    <div className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary-light text-primary">
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

export default function ListingsPage() {
  const { i18n, t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
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
  const [rowActionMenu, setRowActionMenu] = useState(null)

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
  const createListingMutation = useCreateListingMutation()
  const updateListingMutation = useUpdateListingMutation()
  const createListingPsdTaskMutation = useCreateListingPsdTaskMutation()
  const downloadListingAssetMutation = useDownloadListingAssetMutation()
  const approveListingMutation = useApproveListingMutation()
  const rejectListingMutation = useRejectListingMutation()

  const stats = mapListingStats(summaryQuery.data)
  const listings = listingsQuery.data?.items || []
  const pagination = listingsQuery.data?.pagination || { page: 1, limit: DEFAULT_LIMIT, total: 0 }
  const isDialogSubmitting = createListingMutation.isPending || updateListingMutation.isPending

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
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
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
    const hasPsdTemplate = listing.psdReadinessStatus === 'PRESENT'
    const hasInternalTemplate = listing.templateStatus === 'available'
    const hasCost = listing.costStatus === 'present'
    const isActive = listing.rawStatus === 'ACTIVE'
    const canDownload = Boolean(listing.psdTemplateAsset?.assetId || listing.psdTemplateAssetId)
    const hasMoreRowActions = canDownload || listing.rawQcStatus === 'DRAFT'

    if (column.key === 'activity') {
      return (
        <div className="whitespace-nowrap">
          <div className="text-sm font-semibold text-ink-secondary">{listing.date}</div>
          <div className="mt-1 text-[13px] text-ink-muted">{listing.salesLabel}</div>
        </div>
      )
    }

    if (column.key === 'listing') {
      return (
        <div className="flex min-w-0 flex-col items-center gap-2">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-neutral-bg shadow-sm">
            {listing.previewUrl ? (
              <ImagePreview
                src={listing.previewUrl}
                alt={listing.title || listing.sku || 'Listing preview'}
                className="h-full w-full"
              >
                <img
                  src={listing.previewUrl}
                  alt={listing.title || listing.sku || 'Listing preview'}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </ImagePreview>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-ink-muted">
                No image
              </div>
            )}
          </div>
          <div className="max-w-32 truncate text-sm font-bold text-primary">
            {listing.asinProductId || listing.sku || '-'}
          </div>
        </div>
      )
    }

    if (column.key === 'total') {
      return <span className="text-sm font-bold text-ink-strong">{listing.total || 1}</span>
    }

    if (column.key === 'style') {
      return <span className="text-sm text-ink-secondary">{listing.style || '-'}</span>
    }

    if (column.key === 'designProduct') {
      return hasInternalTemplate ? (
        <span className="text-sm text-ink-secondary">{listing.designProduct}</span>
      ) : (
        <Badge tone="orange">Template missing</Badge>
      )
    }

    if (column.key === 'variant') {
      return <span className="text-sm text-ink-secondary">{listing.variant || '-'}</span>
    }

    if (column.key === 'psdStatus') {
      return hasPsdTemplate ? (
        <Badge tone="green">Ready</Badge>
      ) : (
        <Badge tone="orange">Missing</Badge>
      )
    }

    if (column.key === 'store') {
      return <span className="text-sm text-ink-secondary">{listing.store || '-'}</span>
    }

    if (column.key === 'seller') {
      return (
        <span className="max-w-44 truncate text-sm text-ink-secondary">
          {listing.seller || '-'}
        </span>
      )
    }

    if (column.key === 'asinType') {
      return <span className="text-sm text-ink-secondary">{listing.asinType || 'Unknown'}</span>
    }

    if (column.key === 'product') {
      return (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-ink-secondary">{listing.style || '-'}</span>
          {hasInternalTemplate ? (
            <span className="text-sm text-ink-secondary">{listing.designProduct}</span>
          ) : (
            <Badge tone="orange">Template missing</Badge>
          )}
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
          {hasPsdTemplate ? (
            <span className="text-sm font-semibold text-success">
              {t(`listings.values.psdStatus.${listing.psdStatus}`)}
            </span>
          ) : (
            <Badge tone="orange">{t(`listings.values.psdStatus.${listing.psdStatus}`)}</Badge>
          )}
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
            {hasCost ? (
              <span className="text-sm text-success">Cost ready</span>
            ) : (
              <Badge tone="orange">Cost missing</Badge>
            )}
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
          {listing.rawQcStatus === 'REJECTED' ? (
            <Badge tone="orange">REJECTED</Badge>
          ) : (
            <span className="text-sm text-ink-secondary">{listing.rawQcStatus || 'UNKNOWN'}</span>
          )}
          <span className="text-sm text-ink-muted">
            {isActive ? 'ACTIVE' : listing.rawStatus || 'UNKNOWN'}
          </span>
        </div>
      )
    }

    if (column.key === 'actions') {
      return (
        <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-1">
          {listing.psdNextAction === 'Create PSD task' ? (
            <IconActionButton
              label={t('listings.actions.createPsdTask', { defaultValue: 'Create PSD task' })}
              onClick={() => handleCreatePsdTask(listing)}
            >
              <CloudUploadOutlinedIcon fontSize="small" />
            </IconActionButton>
          ) : null}
          <IconActionButton
            label={t('listings.actions.edit')}
            onClick={() => openEditDialog(listing)}
          >
            <EditOutlinedIcon fontSize="small" />
          </IconActionButton>
          {hasMoreRowActions ? (
            <IconActionButton
              label="More actions"
              onClick={(event) => setRowActionMenu({ anchorEl: event.currentTarget, listing })}
            >
              <MoreHorizOutlinedIcon fontSize="small" />
            </IconActionButton>
          ) : null}
        </div>
      )
    }

    return null
  }

  return (
    <div className="min-h-full bg-page px-4 pt-0 pb-3">
      <header className="flex flex-wrap items-end justify-between gap-2 py-3">
        <div>
          <Typography component="h1" variant="h5" className="font-bold text-ink-strong">
            {t('listings.title')}
          </Typography>
          <Typography variant="body2" className="mt-0.5 text-ink-muted">
            {t('listings.management.description', {
              defaultValue: 'Manage marketplace listings, templates, and PSD readiness.',
            })}
          </Typography>
        </div>
      </header>
      <section className="grid gap-3 md:grid-cols-3">
        {listingStats.map((stat) => (
          <StatCard
            key={stat.key}
            icon={stat.icon}
            label={t(`listings.stats.${stat.key}`)}
            value={stats[stat.key]}
          />
        ))}
      </section>

      <section className="mt-3 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 pt-2">
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

        <OperationsToolbar className="border-b border-border bg-page/70 px-4 py-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
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
                  className: 'h-9 rounded-lg text-sm',
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
                className="h-9 rounded-lg bg-surface text-sm font-semibold text-ink-secondary"
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
                className="h-9 rounded-lg bg-surface text-sm font-semibold text-ink-secondary"
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
                className="h-9 rounded-lg bg-surface text-sm font-semibold text-ink-secondary"
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
                className="h-9 rounded-lg bg-surface text-sm font-semibold text-ink-secondary"
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
                className="h-9 rounded-lg bg-surface text-sm font-semibold text-ink-secondary"
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
                className="h-9 rounded-lg bg-surface text-sm font-semibold text-ink-secondary"
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
                className="h-9 rounded-lg bg-surface text-sm font-semibold text-ink-secondary"
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
                className="h-9 w-9 rounded-lg border border-border bg-surface text-ink-secondary hover:bg-surface-subtle"
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        </OperationsToolbar>

        <div className="overflow-x-auto bg-surface">
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
            <thead className="bg-neutral-bg text-[13px] font-bold text-ink-secondary shadow-sm">
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
                <th className="border border-border bg-neutral-bg px-3 py-2 text-center">Style</th>
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
                  <tr
                    key={listing.id}
                    className="bg-surface even:bg-neutral-bg/40 hover:bg-surface-subtle/70"
                  >
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
                        className="h-[96px] border-b border-border px-3 py-2 text-center align-middle"
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
      <Menu
        anchorEl={rowActionMenu?.anchorEl}
        open={Boolean(rowActionMenu)}
        onClose={() => setRowActionMenu(null)}
      >
        {rowActionMenu?.listing?.psdTemplateAsset?.assetId ||
        rowActionMenu?.listing?.psdTemplateAssetId ? (
          <MenuItem
            onClick={() => {
              handleDownload(rowActionMenu.listing)
              setRowActionMenu(null)
            }}
          >
            <DownloadOutlinedIcon fontSize="small" className="mr-2" />
            {t('listings.actions.download')}
          </MenuItem>
        ) : null}
        {rowActionMenu?.listing?.rawQcStatus === 'DRAFT' ? (
          <MenuItem
            onClick={() => {
              handleApproveListing(rowActionMenu.listing)
              setRowActionMenu(null)
            }}
          >
            <CheckCircleOutlineOutlinedIcon fontSize="small" className="mr-2 text-success" />
            {t('listings.actions.approve')}
          </MenuItem>
        ) : null}
        {rowActionMenu?.listing?.rawQcStatus === 'DRAFT' ? (
          <MenuItem
            onClick={() => {
              openRejectDialog(rowActionMenu.listing)
              setRowActionMenu(null)
            }}
          >
            <CancelOutlinedIcon fontSize="small" className="mr-2 text-danger" />
            {t('listings.actions.reject')}
          </MenuItem>
        ) : null}
      </Menu>
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
