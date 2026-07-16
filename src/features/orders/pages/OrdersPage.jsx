import { isValidElement, useMemo, useState, useTransition } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import SwapVertIcon from '@mui/icons-material/SwapVert'
import {
  Box,
  Button,
  Chip,
  Dialog,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useSnackbar } from 'notistack'

import DateRangePicker from '@/components/form/DateRangePicker'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import {
  useAddOrderCaseCommentMutation,
  useCancelOrderCaseMutation,
  useCancelOrderItemMutation,
  useCreateOrderCaseMutation,
  useCreateOrderItemReplacementMutation,
  useImportOrdersMutation,
  useMarkFulfillmentReadyMutation,
  useRecheckOrderItemMutation,
  useResolveOrderCaseMutation,
  useRetryImportJobMutation,
  useUpdateOrderBuyerMutation,
  useUpdateOrderCaseMutation,
  useUpdateOrderCaseStatusMutation,
  useUpdateOrderShippingAddressMutation,
  useUpdateOrderShippingServiceMutation,
  useValidateOrderAddressMutation,
} from '@/features/orders/api/orders.mutations'
import {
  useCustomerExceptionsQuery,
  useImportIssuesQuery,
  useImportJobIssuesQuery,
  useImportJobQuery,
  useImportJobRawRecordsQuery,
  useOrderCasesQuery,
  useOrderDetailQuery,
  useOrderWorkbenchQuery,
  useShopsQuery,
} from '@/features/orders/api/orders.queries'
import { filterOptions, orderTabs } from '@/features/orders/data/ordersData'
import {
  buildOrderListQuery,
  mapApiTabCounts,
  mapWorkbenchRows,
} from '@/features/orders/utils/ordersApi'
import {
  getDefaultExpandedOrderIds,
  getPaginationPages,
} from '@/features/orders/utils/ordersDisplay'
import {
  mapCustomerExceptionRows,
  mapImportIssueRows,
  mapOrderCaseRows,
} from '@/features/orders/utils/ordersOps'

const tableColumns =
  '44px minmax(150px, 1.25fr) minmax(120px, 0.9fr) minmax(145px, 1.1fr) minmax(145px, 1.1fr) minmax(120px, 0.95fr) minmax(140px, 1.05fr) minmax(100px, 0.75fr) minmax(110px, 0.8fr) minmax(95px, 0.7fr) 56px'

const caseOptions = [
  { value: 'missing-psd', labelKey: 'orders.openCase.options.missingPsd' },
  { value: 'customer-request', labelKey: 'orders.openCase.options.customerRequest' },
  { value: 'shipping-issue', labelKey: 'orders.openCase.options.shippingIssue' },
  { value: 'production-delay', labelKey: 'orders.openCase.options.productionDelay' },
]

const importSourceOptions = [
  { value: 'MANUAL_EXCEL', labelKey: 'orders.importOrders.sources.amazon' },
  { value: 'ETSY_SOLD_ORDER_ITEMS', labelKey: 'orders.importOrders.sources.etsy' },
]

const pageSizeOptions = [10, 20, 50, 100]

const customerFieldKeys = [
  ['name', 'email'],
  ['address', 'address2'],
  ['state', 'city'],
  ['country', 'zipCode'],
  ['phoneNumber'],
]

function getInitialSelectedOrderId() {
  return new URLSearchParams(window.location.search).get('orderId') || ''
}

function updateOrdersUrl({ orderId }) {
  const params = new URLSearchParams(window.location.search)
  if (orderId) params.set('orderId', orderId)
  else params.delete('orderId')
  const query = params.toString()
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
}

function getDisplayText(t, item) {
  if (!item) return ''
  if (typeof item === 'string' || typeof item === 'number') return item

  return item.labelKey ? t(item.labelKey) : item.label
}

function StatusBadge({ label, color = 'success' }) {
  const variants = {
    success: 'success',
    warning: 'warning',
    danger: 'error',
  }
  const paletteColor = variants[color] || variants.success

  return (
    <Chip
      label={label}
      size="small"
      sx={(theme) => ({
        height: 24,
        bgcolor: theme.palette[paletteColor].light,
        border: `1px solid ${theme.palette[paletteColor].main}`,
        color: theme.palette[paletteColor].main,
        fontWeight: 500,
        '& .MuiChip-label': { px: 1 },
      })}
    />
  )
}

function getOrderStatusColor(status) {
  if (['CANCELLED', 'REFUNDED', 'FAILED'].includes(status)) return 'danger'
  if (['PROCESSING', 'PARTIALLY_SHIPPED', 'ON_HOLD'].includes(status)) return 'warning'
  return 'success'
}

function OrdersSelect({ disabled = false, onChange, options, sx, value }) {
  const { t } = useTranslation()

  return (
    <FormControl size="small" sx={sx}>
      <Select
        value={value ?? options[0]?.value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        IconComponent={KeyboardArrowDownIcon}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {getDisplayText(t, option)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

function getDetailDisplayValue(value) {
  if (isValidElement(value)) return value
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  if (Array.isArray(value)) return value.map(getDetailDisplayValue).filter(Boolean).join(', ')
  if (typeof value === 'object') {
    const displayKey = ['label', 'name', 'value'].find(
      (key) => value[key] !== null && value[key] !== undefined && value[key] !== '',
    )
    return displayKey ? getDetailDisplayValue(value[displayKey]) : JSON.stringify(value)
  }

  return String(value)
}

function DetailField({ label, value, valueAlign = 'right' }) {
  const displayValue = getDetailDisplayValue(value)
  const isTextValue = typeof displayValue === 'string' || typeof displayValue === 'number'
  const alignStart = valueAlign === 'left'

  return (
    <Box className="grid min-w-0 grid-cols-[minmax(112px,0.85fr)_minmax(0,1fr)] items-start gap-1.5">
      <Typography variant="body2" className="min-w-0 break-words !text-ink-muted">
        {label}
      </Typography>
      {isTextValue ? (
        <Typography
          variant="body2"
          className={`min-w-0 break-words [overflow-wrap:anywhere] !font-medium ${
            alignStart ? '!text-left' : '!text-right'
          }`}
        >
          {displayValue}
        </Typography>
      ) : (
        <Box className={`min-w-0 ${alignStart ? 'justify-self-start' : 'justify-self-end'}`}>
          {displayValue}
        </Box>
      )}
    </Box>
  )
}

function getCollectionCount(data) {
  if (!data) return 0
  if (typeof data.total === 'number') return data.total
  if (typeof data.count === 'number') return data.count
  if (typeof data.pagination?.total === 'number') return data.pagination.total
  if (Array.isArray(data.items)) return data.items.length
  if (Array.isArray(data.rows)) return data.rows.length
  if (Array.isArray(data.results)) return data.results.length
  if (Array.isArray(data.data)) return data.data.length
  return 0
}

function TextActionDialog({
  confirmLabel = 'Save',
  label,
  loading = false,
  onClose,
  onSubmit,
  open,
  required = false,
  title,
}) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    const cleaned = value.trim()
    if (required && !cleaned) return
    onSubmit(cleaned)
    setValue('')
  }

  const handleClose = () => {
    setValue('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <Stack spacing={2} sx={{ p: 2.5 }}>
        <Typography variant="h6">{title}</Typography>
        <TextField
          label={label}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          multiline
          minRows={3}
          fullWidth
        />
        <Stack direction="row" justifyContent="flex-end" spacing={1}>
          <Button variant="outlined" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={loading || (required && !value.trim())}
            onClick={handleSubmit}
          >
            {confirmLabel}
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  )
}

function CreateCaseDialog({ loading = false, onClose, onSubmit, open }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const handleClose = () => {
    setTitle('')
    setDescription('')
    onClose()
  }

  const handleSubmit = () => {
    onSubmit({ title: title.trim(), description: description.trim() })
    setTitle('')
    setDescription('')
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <Stack spacing={2} sx={{ p: 2.5 }}>
        <Typography variant="h6">Create case</Typography>
        <TextField
          label="What happened?"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          fullWidth
        />
        <TextField
          label="Operator note"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          multiline
          minRows={3}
          fullWidth
        />
        <Stack direction="row" justifyContent="flex-end" spacing={1}>
          <Button variant="outlined" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="contained" disabled={loading || !title.trim()} onClick={handleSubmit}>
            Create
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  )
}

function ShippingServiceDialog({ loading = false, onClose, onSubmit, open, service = {} }) {
  const [level, setLevel] = useState(service.level || '')
  const [name, setName] = useState(service.name || '')

  const handleClose = () => {
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <Stack spacing={2} sx={{ p: 2.5 }}>
        <Typography variant="h6">Update shipping service</Typography>
        <TextField
          label="Service level"
          value={level}
          onChange={(event) => setLevel(event.target.value)}
          fullWidth
        />
        <TextField
          label="Service name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          fullWidth
        />
        <Stack direction="row" justifyContent="flex-end" spacing={1}>
          <Button variant="outlined" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={loading || (!level.trim() && !name.trim())}
            onClick={() => onSubmit({ level: level.trim(), name: name.trim() })}
          >
            Save
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  )
}

function OrderTabs({ activeTab, onChange, tabs }) {
  const { t } = useTranslation()

  return (
    <Stack direction="row" spacing={0.5} sx={{ overflowX: 'auto', pb: 0.25, width: '100%' }}>
      {tabs.map((tab) => {
        const active = activeTab === tab.key

        return (
          <Button
            key={tab.key}
            variant="text"
            onClick={() => onChange(tab.key)}
            sx={(theme) => ({
              minWidth: 112,
              height: 38,
              flex: '1 1 0',
              px: 1.5,
              borderRadius: 0,
              borderBottom: active
                ? `2px solid ${theme.palette.primary.main}`
                : '2px solid transparent',
              bgcolor: active ? theme.palette.primary.light : 'transparent',
              color: active ? 'primary.main' : 'text.disabled',
              fontSize: 13,
              fontWeight: active ? 700 : 600,
              whiteSpace: 'nowrap',
              '&:hover': {
                bgcolor: active
                  ? theme.palette.primary.light
                  : alpha(theme.palette.primary.main, 0.06),
              },
            })}
          >
            {t(tab.labelKey)}
            <Box
              component="span"
              sx={(theme) => ({
                ml: 0.75,
                px: 0.7,
                py: 0.1,
                borderRadius: theme.shape.borderRadiusPill,
                bgcolor: active ? theme.palette.primary.main : theme.palette.background.default,
                color: active ? theme.palette.common.white : theme.palette.text.secondary,
                fontSize: 11,
                lineHeight: '16px',
              })}
            >
              {tab.count}
            </Box>
          </Button>
        )
      })}
    </Stack>
  )
}

function ImportOrdersModal({ onClose, open, shopOptions }) {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const importOrdersMutation = useImportOrdersMutation()
  const [selectedStore, setSelectedStore] = useState('')
  const [selectedSource, setSelectedSource] = useState('MANUAL_EXCEL')
  const [selectedFile, setSelectedFile] = useState(null)

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    setSelectedFile(file ?? null)
  }

  const handleImport = async () => {
    if (!selectedStore || !selectedFile) {
      enqueueSnackbar(t('orders.importOrders.validation'), { variant: SNACKBAR_VARIANTS.WARNING })
      return
    }

    try {
      await importOrdersMutation.mutateAsync({
        source: selectedSource,
        shopId: selectedStore,
        marketplaceCode: selectedSource === 'ETSY_SOLD_ORDER_ITEMS' ? 'ETSY_US' : 'AMAZON_US',
        file: selectedFile,
      })
      enqueueSnackbar(t('orders.importOrders.success'), { variant: SNACKBAR_VARIANTS.SUCCESS })
      setSelectedFile(null)
      setSelectedStore('')
      onClose()
    } catch (error) {
      enqueueSnackbar(error?.message || t('errors.api.network'), {
        variant: SNACKBAR_VARIANTS.ERROR,
      })
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            width: 576,
            borderRadius: 3,
            overflow: 'hidden',
          },
        },
      }}
    >
      <Stack sx={{ width: 576 }}>
        <Stack
          sx={{
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
            flexDirection: 'row',
            height: 56,
            justifyContent: 'space-between',
            px: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{ color: 'text.primary', fontSize: 18, fontWeight: 600, marginTop: 2 }}
          >
            {t('orders.importOrders.title')}
          </Typography>
        </Stack>

        <Stack spacing={1.5} sx={{ px: 3, pt: 2.25, pb: 2.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: 11, fontWeight: 500 }}
          >
            {t('orders.importOrders.source')}
          </Typography>
          <FormControl fullWidth size="small">
            <Select
              value={selectedSource}
              IconComponent={KeyboardArrowDownIcon}
              onChange={(event) => setSelectedSource(event.target.value)}
              sx={{
                height: 40,
                borderRadius: 2,
                '& .MuiSelect-select': {
                  py: 1.1,
                },
              }}
            >
              {importSourceOptions.map((source) => (
                <MenuItem key={source.value} value={source.value}>
                  {t(source.labelKey)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: 11, fontWeight: 500 }}
          >
            {t('orders.importOrders.store')}
          </Typography>
          <FormControl fullWidth size="small">
            <Select
              value={selectedStore}
              displayEmpty
              IconComponent={KeyboardArrowDownIcon}
              onChange={(event) => setSelectedStore(event.target.value)}
              renderValue={(value) => {
                const store = shopOptions.find((item) => item.value === value)
                return value ? getDisplayText(t, store) : t('orders.importOrders.storePlaceholder')
              }}
              sx={{
                height: 40,
                borderRadius: 2,
                color: selectedStore ? 'text.primary' : 'text.disabled',
                '& .MuiSelect-select': {
                  py: 1.1,
                },
              }}
            >
              {shopOptions.map((store) => (
                <MenuItem key={store.value} value={store.value}>
                  {getDisplayText(t, store)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: 11, fontWeight: 500, pt: 0.5 }}
          >
            {t('orders.importOrders.file')}
          </Typography>
          <Box
            component="label"
            sx={{
              alignItems: 'center',
              bgcolor: 'info.light',
              border: '1.5px dashed',
              borderColor: 'info.main',
              borderRadius: 2.5,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              height: 152,
              justifyContent: 'center',
              width: '100%',
            }}
          >
            <input
              type="file"
              accept=".txt,.tsv,.csv,text/plain,text/csv,text/tab-separated-values"
              hidden
              onChange={handleFileChange}
            />
            <Box
              sx={{
                alignItems: 'center',
                bgcolor: 'background.paper',
                borderRadius: '50%',
                color: 'info.main',
                display: 'flex',
                height: 48,
                justifyContent: 'center',
                mb: 1.5,
                width: 48,
              }}
            >
              <CloudUploadOutlinedIcon />
            </Box>
            <Typography
              variant="body2"
              sx={{ color: 'text.primary', fontSize: 13, fontWeight: 500 }}
            >
              {selectedFile?.name || t('orders.importOrders.uploadTitle')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12, mt: 0.75 }}>
              {t('orders.importOrders.uploadHint')}
            </Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'grid',
            gridTemplateColumns: '120px 1fr 160px',
            px: 3,
            py: 2,
            width: '100%',
          }}
        >
          <Button variant="outlined" onClick={onClose} sx={{ height: 40, width: 120 }}>
            {t('orders.actions.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={importOrdersMutation.isPending}
            sx={{ gridColumn: 3, height: 40, width: 160 }}
          >
            {importOrdersMutation.isPending
              ? t('orders.importOrders.importing')
              : t('orders.actions.import')}
          </Button>
        </Box>
      </Stack>
    </Dialog>
  )
}

function FilterBar({ filters, onFiltersChange, onRefresh, shopOptions }) {
  const { t } = useTranslation()
  const [importModalOpen, setImportModalOpen] = useState(false)

  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value, page: 1 })
  }

  return (
    <Box
      sx={{
        alignItems: 'center',
        display: 'grid',
        gap: 1.25,
        gridTemplateColumns: {
          xs: '1fr',
          md: 'repeat(2, minmax(0, 1fr))',
          lg: 'minmax(215px, 0.9fr) minmax(220px, 1fr) minmax(220px, 1fr) minmax(250px, 1.1fr) minmax(220px, 1fr) 40px minmax(110px, 0.55fr)',
        },
        width: '100%',
      }}
    >
      <TextField
        value={filters.search}
        onChange={(event) => updateFilter('search', event.target.value)}
        placeholder={t('orders.filters.search')}
        sx={{ width: '100%' }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          },
        }}
      />
      <OrdersSelect
        value={filters.channel}
        onChange={(value) => updateFilter('channel', value)}
        options={filterOptions.channels}
        sx={{ width: '100%' }}
      />
      <OrdersSelect
        value={filters.shopId}
        onChange={(value) => updateFilter('shopId', value)}
        options={[{ value: 'all', labelKey: 'orders.values.shops.all' }, ...shopOptions]}
        sx={{ width: '100%' }}
      />
      <DateRangePicker
        value={filters.dateRange}
        onChange={(value) => updateFilter('dateRange', value)}
        fullWidth
      />
      <OrdersSelect
        value={filters.seller}
        onChange={(value) => updateFilter('seller', value)}
        options={filterOptions.sellers}
        disabled
        sx={{ width: '100%' }}
      />
      <IconButton
        aria-label={t('orders.filters.refresh')}
        onClick={onRefresh}
        sx={(theme) => ({
          width: 40,
          height: 40,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: theme.shape.borderRadius,
          bgcolor: 'background.paper',
          justifySelf: { xs: 'stretch', lg: 'start' },
        })}
      >
        <RefreshIcon fontSize="small" />
      </IconButton>
      <Button
        variant="contained"
        startIcon={<FileDownloadOutlinedIcon />}
        onClick={() => setImportModalOpen(true)}
        sx={{ height: 40, width: '100%' }}
      >
        {t('orders.actions.import')}
      </Button>
      <ImportOrdersModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        shopOptions={shopOptions}
      />
    </Box>
  )
}

function TableHeader() {
  const { t } = useTranslation()
  const headers = [
    '',
    'orderId',
    'status',
    'createdAt',
    'orderDate',
    'shippingType',
    'customer',
    'basecost',
    'store',
    'handling',
    'case',
  ]

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: tableColumns,
        minWidth: 0,
        width: '100%',
        height: 37,
        alignItems: 'center',
        px: 2,
        bgcolor: 'background.default',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      {headers.map((header) => (
        <Typography
          key={header || 'expand'}
          variant="caption"
          sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}
        >
          {header ? t(`orders.table.${header}`) : ''}
        </Typography>
      ))}
    </Box>
  )
}

function buildCustomerForm(order = {}) {
  const buyer = order.buyer || {}
  const address = order.shippingAddress || {}
  const customerInfo = order.customerInfo || {}

  return {
    name: buyer.name || order.customer || address.name || '',
    email: buyer.emailMasked || customerInfo.email || '',
    address: address.addressLine1 || customerInfo.address || '',
    address2: address.addressLine2 || customerInfo.address2 || '',
    state: address.stateOrProvinceCode || address.stateOrProvince || customerInfo.state || '',
    city: address.city || customerInfo.city || '',
    country: address.countryCode || address.country || customerInfo.country || '',
    zipCode: address.postalCode || customerInfo.zipCode || '',
    phoneNumber: address.phoneMasked || buyer.phoneMasked || customerInfo.phoneNumber || '',
  }
}

function CustomerTextField({ label, name, onChange, placeholder, value }) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="body2" sx={{ color: 'text.primary', fontSize: 14 }}>
        {label}
      </Typography>
      <TextField
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        fullWidth
        sx={{
          '& .MuiInputBase-root': {
            height: 40,
            borderRadius: 2,
            boxShadow: '0px 1px 2px rgba(10, 13, 18, 0.05)',
          },
          '& .MuiInputBase-input': {
            fontSize: 16,
            py: 1,
          },
        }}
      />
    </Stack>
  )
}

function UpdateCustomerModal({ onClose, open, order }) {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const updateBuyerMutation = useUpdateOrderBuyerMutation()
  const updateAddressMutation = useUpdateOrderShippingAddressMutation()
  const detailQuery = useOrderDetailQuery(order?.apiId, {
    enabled: open && Boolean(order?.apiId),
  })
  const [draftValues, setDraftValues] = useState({})
  const sourceFormValues = useMemo(
    () => buildCustomerForm(detailQuery.data || order),
    [detailQuery.data, order],
  )
  const formValues = { ...sourceFormValues, ...draftValues }
  const saving = updateBuyerMutation.isPending || updateAddressMutation.isPending

  const handleChange = (event) => {
    const { name, value } = event.target
    setDraftValues((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSave = async () => {
    if (!order?.apiId) return

    try {
      await updateBuyerMutation.mutateAsync({
        orderId: order.apiId,
        name: formValues.name,
        emailMasked: formValues.email,
        phoneMasked: formValues.phoneNumber,
      })
      await updateAddressMutation.mutateAsync({
        orderId: order.apiId,
        name: formValues.name,
        addressLine1: formValues.address,
        addressLine2: formValues.address2,
        stateOrProvinceCode: formValues.state,
        city: formValues.city,
        countryCode: formValues.country,
        postalCode: formValues.zipCode,
        phoneMasked: formValues.phoneNumber,
      })
      enqueueSnackbar(t('orders.updateCustomer.success'), { variant: SNACKBAR_VARIANTS.SUCCESS })
      setDraftValues({})
      onClose()
    } catch (error) {
      enqueueSnackbar(t(error?.message || 'errors.api.network'), {
        variant: SNACKBAR_VARIANTS.ERROR,
      })
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            width: 820,
            borderRadius: 4,
            boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
          },
        },
      }}
    >
      <Stack sx={{ width: 820 }}>
        <Stack
          sx={{
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
            flexDirection: 'row',
            height: 77,
            px: 4,
          }}
        >
          <Typography
            variant="h6"
            sx={{ color: 'text.primary', fontSize: 20, fontWeight: 700, marginTop: 2 }}
          >
            {t('orders.updateCustomer.title')}
          </Typography>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: '26px 32px',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            px: 4,
            py: 3,
          }}
        >
          {customerFieldKeys.flatMap((row) =>
            row.map((fieldKey) => (
              <CustomerTextField
                key={fieldKey}
                name={fieldKey}
                label={t(`orders.updateCustomer.fields.${fieldKey}`)}
                placeholder={t(`orders.updateCustomer.placeholders.${fieldKey}`)}
                value={formValues[fieldKey]}
                onChange={handleChange}
              />
            )),
          )}
        </Box>

        <Box
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'grid',
            gridTemplateColumns: '110px 1fr 150px',
            px: 4,
            py: 3,
            width: '100%',
          }}
        >
          <Button variant="outlined" onClick={onClose} sx={{ height: 44, width: 110 }}>
            {t('orders.actions.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ gridColumn: 3, height: 44, width: 150 }}
          >
            {t('orders.actions.saveChanges')}
          </Button>
        </Box>
      </Stack>
    </Dialog>
  )
}

function OpenCaseModal({ onClose, open, order }) {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const updateCaseStatusMutation = useUpdateOrderCaseStatusMutation()
  const [selectedCase, setSelectedCase] = useState('')

  const handleSave = async () => {
    if (!order?.apiId) return

    try {
      await updateCaseStatusMutation.mutateAsync({
        orderId: order.apiId,
        caseStatus: 'OPEN',
      })
      enqueueSnackbar(t('orders.openCase.success'), { variant: SNACKBAR_VARIANTS.SUCCESS })
      onClose()
    } catch (error) {
      enqueueSnackbar(t(error?.message || 'errors.api.network'), {
        variant: SNACKBAR_VARIANTS.ERROR,
      })
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.4)',
          },
        },
        paper: {
          sx: {
            width: 520,
            borderRadius: 4,
            boxShadow: '0px 12px 16px rgba(0, 0, 0, 0.2)',
          },
        },
      }}
    >
      <Box sx={{ p: 3.5, pt: 3, width: 520 }}>
        <Stack
          sx={{
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
            mb: 2.5,
          }}
        >
          <Typography variant="h6" sx={{ color: 'text.primary', fontSize: 20, fontWeight: 700 }}>
            {t('orders.openCase.title')}
          </Typography>
        </Stack>

        <FormControl fullWidth size="small">
          <Select
            value={selectedCase}
            displayEmpty
            IconComponent={KeyboardArrowDownIcon}
            onChange={(event) => setSelectedCase(event.target.value)}
            renderValue={(value) =>
              value
                ? t(caseOptions.find((item) => item.value === value)?.labelKey)
                : t('orders.openCase.placeholder')
            }
            sx={{
              height: 44,
              borderRadius: 2,
              color: selectedCase ? 'text.primary' : 'text.disabled',
              '& .MuiSelect-select': {
                py: 1.25,
              },
            }}
          >
            {caseOptions.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {t(item.labelKey)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '96px 1fr 96px',
            mt: 2.5,
            width: '100%',
          }}
        >
          <Button variant="outlined" onClick={onClose} sx={{ height: 40, width: 96 }}>
            {t('orders.actions.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={updateCaseStatusMutation.isPending || !selectedCase}
            sx={{ gridColumn: 3, height: 40, width: 96 }}
          >
            {t('orders.actions.save')}
          </Button>
        </Box>
      </Box>
    </Dialog>
  )
}

function OrderRow({ expanded, onToggle, order }) {
  const { t } = useTranslation()
  const [caseModalOpen, setCaseModalOpen] = useState(false)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: tableColumns,
        minWidth: 0,
        width: '100%',
        minHeight: 64,
        alignItems: 'center',
        px: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <IconButton
        size="small"
        onClick={onToggle}
        aria-expanded={expanded}
        sx={{ width: 28, height: 28 }}
      >
        {expanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
      </IconButton>
      <span className="text-xs">{order.id}</span>
      <Stack spacing={1} sx={{ alignItems: 'center', flexDirection: 'row' }}>
        <StatusBadge label={t(order.statusKey)} color={getOrderStatusColor(order.status)} />
      </Stack>
      <Box>
        <Typography variant="body2">{order.createdAt}</Typography>
        <Typography variant="caption" color="text.disabled">
          {t(order.createdAgoKey)}
        </Typography>
      </Box>
      <Box>
        <Typography variant="body2">{order.orderDate}</Typography>
        <Typography variant="caption" color="text.disabled">
          {t(order.orderAgoKey)}
        </Typography>
      </Box>
      <Stack spacing={1} sx={{ alignItems: 'center', flexDirection: 'row' }}>
        <StatusBadge label={order.shippingType || '-'} />
      </Stack>
      <Stack spacing={1} sx={{ alignItems: 'center', flexDirection: 'row' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {order.customer}
        </Typography>
        <IconButton
          aria-label={t('orders.updateCustomer.title')}
          onClick={() => setCustomerModalOpen(true)}
          sx={{ width: 20, height: 20, color: 'text.secondary' }}
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
        <CheckCircleIcon fontSize="small" color="success" />
        <UpdateCustomerModal
          key={`${order.apiId}-${customerModalOpen}`}
          open={customerModalOpen}
          order={order}
          onClose={() => setCustomerModalOpen(false)}
        />
      </Stack>
      <Typography variant="body2">{order.basecost}</Typography>
      <Box>
        <StatusBadge label={order.storeKey ? t(order.storeKey) : order.storeName} color="danger" />
      </Box>
      <Typography variant="body2">
        {order.handlingKey ? t(order.handlingKey) : order.handling}
      </Typography>
      <Box>
        <IconButton
          aria-label={t('orders.openCase.title')}
          onClick={() => setCaseModalOpen(true)}
          sx={{ width: 28, height: 28, color: 'success.main' }}
        >
          <AddBoxOutlinedIcon fontSize="small" />
        </IconButton>
        <OpenCaseModal open={caseModalOpen} order={order} onClose={() => setCaseModalOpen(false)} />
      </Box>
    </Box>
  )
}

function ProductImages({ images }) {
  return (
    <Stack spacing={3} sx={{ width: '100%', alignItems: 'center' }}>
      {images.map((image, index) => (
        <Box
          key={`${image}-${index}`}
          component="img"
          src={image}
          alt=""
          sx={{
            width: index === 0 ? 150 : 142,
            height: index === 0 ? 150 : 142,
            objectFit: 'cover',
            objectPosition: 'center',
            borderRadius: 1,
          }}
        />
      ))}
    </Stack>
  )
}

function ProductInfo({ product }) {
  const { t } = useTranslation()

  return (
    <Stack className="min-w-0 w-full gap-6">
      <Typography
        variant="caption"
        className="min-w-0 tracking-[0.8px] !font-extrabold !text-ink-muted"
      >
        {t('orders.detail.productInfo')}
      </Typography>
      <DetailField
        label={t('orders.fields.psd')}
        value={<StatusBadge label={t(product.psdKey)} color="danger" />}
        valueAlign="left"
      />
      <DetailField
        label={t('orders.fields.pngStatus')}
        value={<StatusBadge label={t(product.pngStatusKey)} color="warning" />}
        valueAlign="left"
      />
      <DetailField
        label={t('orders.fields.scaleBy')}
        value={product.scaleBy || t(product.scaleByKey)}
        valueAlign="left"
      />
      <DetailField label={t('orders.fields.qcBy')} value={product.qcBy} valueAlign="left" />
      <DetailField label={t('orders.fields.sku')} value={product.sku} valueAlign="left" />
      <DetailField
        label={t('orders.fields.asinType')}
        value={t(product.asinTypeKey)}
        valueAlign="left"
      />
      <DetailField label={t('orders.fields.asin')} value={product.asin} valueAlign="left" />
      <DetailField label={t('orders.fields.psdId')} value={t(product.psdIdKey)} valueAlign="left" />
      <DetailField label={t('orders.fields.seller')} value={product.seller} valueAlign="left" />
      <DetailField label={t('orders.fields.team')} value={product.team} valueAlign="left" />
    </Stack>
  )
}

function CustomizationInfo({ customization }) {
  const { t } = useTranslation()
  const hasDynamicCustomization =
    Array.isArray(customization.fields) || Array.isArray(customization.images)
  const dynamicFields = customization.fields || []
  const dynamicImages = customization.images || []
  const topFields = [
    ['orders.fields.productType', customization.productType],
    ['orders.fields.shirtColor', customization.shirtColor],
    ['orders.fields.selectSize', customization.size],
  ]
  const bottomFields = [
    ['orders.fields.customerName', customization.customerName],
    ['orders.fields.year', customization.year],
    ['orders.fields.customSleeve', customization.customSleeve],
    ['orders.fields.rightSleeve', customization.rightSleeve],
    ['orders.fields.leftSleeve', customization.leftSleeve],
    ['orders.fields.priority', t(customization.priorityKey)],
    ['orders.fields.customizationUrl', customization.customizationUrl],
  ]

  return (
    <Stack className="min-w-0 w-full gap-[17px]">
      <Typography
        variant="caption"
        className="min-w-0 tracking-[0.8px] !font-extrabold !text-ink-muted"
      >
        {t('orders.detail.customization')}
      </Typography>
      {hasDynamicCustomization ? (
        <>
          {dynamicFields.length === 0 && dynamicImages.length === 0 ? (
            <Typography variant="body2" color="text.disabled">
              {t('orders.values.common.noData')}
            </Typography>
          ) : null}
          {dynamicFields.map((field, index) => (
            <DetailField
              key={`${field.label}-${field.value}-${index}`}
              label={field.label}
              value={field.value}
              valueAlign="left"
            />
          ))}
          {dynamicImages.map((image, index) => (
            <Box key={`${image.url}-${index}`}>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 1 }}>
                {image.label || t('orders.fields.customerPhoto')}
              </Typography>
              <Box
                component="img"
                src={image.url}
                alt=""
                sx={{ width: 58, height: 58, objectFit: 'cover', borderRadius: 1 }}
              />
            </Box>
          ))}
        </>
      ) : (
        <>
          {topFields.map(([labelKey, value]) => (
            <DetailField key={labelKey} label={t(labelKey)} value={value} valueAlign="left" />
          ))}
          <Typography variant="body2" color="text.disabled">
            {t('orders.fields.customerPhoto')}
          </Typography>
          <Stack direction="row" spacing={2.5}>
            {customization.customerPhoto.map((image, index) => (
              <Box
                key={`${image}-photo-${index}`}
                component="img"
                src={image}
                alt=""
                sx={{ width: 58, height: 58, objectFit: 'cover', borderRadius: 1 }}
              />
            ))}
          </Stack>
          {bottomFields.map(([labelKey, value]) => (
            <DetailField key={labelKey} label={t(labelKey)} value={value} valueAlign="left" />
          ))}
        </>
      )}
    </Stack>
  )
}

function CompactInput({ value, endIcon = false, multiline = false, rows = 1 }) {
  return (
    <TextField
      defaultValue={value}
      multiline={multiline}
      rows={rows}
      slotProps={{
        input: endIcon
          ? {
              endAdornment: (
                <InputAdornment position="end">
                  <SwapVertIcon sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }
          : undefined,
      }}
    />
  )
}

function FulfillmentInfo({ fulfillment }) {
  const { t } = useTranslation()

  return (
    <Stack spacing={1.35} sx={{ width: '100%' }}>
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ fontWeight: 800, letterSpacing: 0.8 }}
      >
        {t('orders.detail.fulfillment')}
      </Typography>
      <Box className="grid grid-cols-2 gap-4">
        <Stack spacing={0.7}>
          <Typography variant="body2">{t('orders.fields.quantity')}</Typography>
          <CompactInput value={fulfillment.quantity} />
        </Stack>
        <Stack spacing={0.7}>
          <Typography variant="body2">{t('orders.fields.fulfillQty')}</Typography>
          <CompactInput value={fulfillment.fulfillQty} />
        </Stack>
        <Stack spacing={0.7}>
          <Typography variant="body2">{t('orders.fields.new')}</Typography>
          <CompactInput value={t(fulfillment.statusKey)} />
        </Stack>
        <Stack spacing={0.7}>
          <Typography variant="body2">{t('orders.fields.vendorProduct')}</Typography>
          <CompactInput value={fulfillment.vendorProduct} endIcon />
        </Stack>
        <Stack spacing={0.7}>
          <Typography variant="body2">{t('orders.fields.size')}</Typography>
          <CompactInput value={fulfillment.size} endIcon />
        </Stack>
        <Stack spacing={0.7}>
          <Typography variant="body2">{t('orders.fields.color')}</Typography>
          <CompactInput value={fulfillment.color} endIcon />
        </Stack>
      </Box>
      <Stack spacing={0.7}>
        <Typography variant="body2">{t('orders.fields.fulfillName')}</Typography>
        <CompactInput value={fulfillment.fulfillName} multiline rows={3} />
      </Stack>
    </Stack>
  )
}

function NotePanel({ fulfillment }) {
  const { t } = useTranslation()

  return (
    <Stack spacing={1.2} sx={{ width: '100%' }}>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {t('orders.fields.status')}
      </Typography>
      <CompactInput value={t(fulfillment.statusKey)} endIcon />
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {t('orders.fields.tracking')}
      </Typography>
      <CompactInput value={t(fulfillment.trackingKey)} endIcon />
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {t('orders.fields.note')}
      </Typography>
      <CompactInput value={t(fulfillment.noteKey)} multiline rows={3} />
      <Button variant="contained" startIcon={<EditOutlinedIcon />} sx={{ height: 38 }}>
        {t('orders.actions.update')}
      </Button>
    </Stack>
  )
}

function ActionIconButton({ color = 'default', disabled = false, icon, label, onClick }) {
  return (
    <Tooltip title={label}>
      <Box
        component="span"
        sx={{
          alignItems: 'center',
          display: 'inline-flex',
          flexDirection: 'column',
          gap: 0.5,
          minWidth: 68,
        }}
      >
        <IconButton
          color={color}
          disabled={disabled}
          onClick={onClick}
          size="small"
          sx={(theme) => ({
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1.5,
            height: 34,
            width: 34,
          })}
        >
          {icon}
        </IconButton>
        <Typography
          variant="caption"
          color={disabled ? 'text.disabled' : 'text.secondary'}
          sx={{ lineHeight: 1.2, maxWidth: 78, textAlign: 'center' }}
        >
          {label}
        </Typography>
      </Box>
    </Tooltip>
  )
}

function ActionsCard({ children, subtitle, title }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.25 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      ) : null}
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
        {children}
      </Stack>
    </Paper>
  )
}

function ExpandedOrderDetail({ onRefresh, order }) {
  const { enqueueSnackbar } = useSnackbar()
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [serviceModalOpen, setServiceModalOpen] = useState(false)
  const [textAction, setTextAction] = useState(null)
  const displayOrder = order
  const orderId = order.apiId
  const firstWorkbenchItem = order.workbenchItems?.[0]?.item || {}
  const orderItemId = firstWorkbenchItem.id
  const validateAddressMutation = useValidateOrderAddressMutation()
  const shippingServiceMutation = useUpdateOrderShippingServiceMutation()
  const recheckItemMutation = useRecheckOrderItemMutation()
  const markReadyMutation = useMarkFulfillmentReadyMutation()
  const replacementMutation = useCreateOrderItemReplacementMutation()
  const cancelItemMutation = useCancelOrderItemMutation()
  const currentShippingService = order.raw?.shippingService || {}

  const refreshRow = () => {
    onRefresh?.()
  }
  const runMutation = async (mutation, payload, successMessage) => {
    try {
      await mutation.mutateAsync(payload)
      enqueueSnackbar(successMessage, { variant: SNACKBAR_VARIANTS.SUCCESS })
      refreshRow()
    } catch (error) {
      enqueueSnackbar(error?.message || 'Action failed', { variant: SNACKBAR_VARIANTS.ERROR })
    }
  }
  const submitTextAction = (value) => {
    if (textAction === 'replacement') {
      runMutation(
        replacementMutation,
        { orderItemId, reason: value, quantity: 1 },
        'Replacement created.',
      )
    }
    if (textAction === 'cancelItem') {
      runMutation(cancelItemMutation, { orderItemId, reason: value }, 'Item cancelled.')
    }
    setTextAction(null)
  }

  return (
    <>
      <Box
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns:
            'minmax(150px, 0.65fr) minmax(220px, 1fr) minmax(320px, 1.35fr) minmax(360px, 1.45fr) minmax(245px, 1fr)',
          gap: 3.5,
          alignItems: 'flex-start',
          minWidth: 1460,
          px: 3,
          py: 2.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <ProductImages images={displayOrder.productImages} />
        <ProductInfo product={displayOrder.product} />
        <CustomizationInfo customization={displayOrder.customization} />
        <FulfillmentInfo fulfillment={displayOrder.fulfillment} />
        <Stack spacing={1.25}>
          <NotePanel fulfillment={displayOrder.fulfillment} />
          <ActionsCard subtitle={order.id} title="Order actions">
            <ActionIconButton
              disabled={!orderId || validateAddressMutation.isPending}
              icon={<FactCheckOutlinedIcon fontSize="small" />}
              label="Validate"
              onClick={() =>
                runMutation(validateAddressMutation, { orderId }, 'Address validation requested.')
              }
            />
            <ActionIconButton
              disabled={!orderId}
              icon={<PersonOutlineOutlinedIcon fontSize="small" />}
              label="Buyer"
              onClick={() => setCustomerModalOpen(true)}
            />
            <ActionIconButton
              disabled={!orderId}
              icon={<LocalShippingOutlinedIcon fontSize="small" />}
              label="Service"
              onClick={() => setServiceModalOpen(true)}
            />
          </ActionsCard>
          <ActionsCard
            subtitle={firstWorkbenchItem.sku || order.product?.sku}
            title="Order item actions"
          >
            <ActionIconButton
              disabled={!orderItemId || recheckItemMutation.isPending}
              icon={<RefreshIcon fontSize="small" />}
              label="Recheck"
              onClick={() =>
                runMutation(recheckItemMutation, { orderItemId }, 'Item recheck requested.')
              }
            />
            <ActionIconButton
              color="success"
              disabled={!orderItemId || markReadyMutation.isPending}
              icon={<CheckCircleIcon fontSize="small" />}
              label="Ready"
              onClick={() =>
                runMutation(markReadyMutation, { orderItemId }, 'Item marked fulfillment-ready.')
              }
            />
            <ActionIconButton
              disabled={!orderItemId}
              icon={<AddBoxOutlinedIcon fontSize="small" />}
              label="Replace"
              onClick={() => setTextAction('replacement')}
            />
            <ActionIconButton
              color="error"
              disabled={!orderItemId}
              icon={<CancelOutlinedIcon fontSize="small" />}
              label="Cancel"
              onClick={() => setTextAction('cancelItem')}
            />
          </ActionsCard>
        </Stack>
      </Box>
      <UpdateCustomerModal
        open={customerModalOpen}
        order={order}
        onClose={() => setCustomerModalOpen(false)}
      />
      <ShippingServiceDialog
        open={serviceModalOpen}
        service={currentShippingService}
        loading={shippingServiceMutation.isPending}
        onClose={() => setServiceModalOpen(false)}
        onSubmit={(payload) =>
          runMutation(
            shippingServiceMutation,
            { orderId, ...payload },
            'Shipping service updated.',
          ).then(() => setServiceModalOpen(false))
        }
      />
      <TextActionDialog
        open={Boolean(textAction)}
        title={textAction === 'replacement' ? 'Create replacement item' : 'Cancel item'}
        label={textAction === 'replacement' ? 'Replacement reason' : 'Cancel reason'}
        confirmLabel={textAction === 'replacement' ? 'Create' : 'Cancel item'}
        required={textAction === 'cancelItem'}
        loading={replacementMutation.isPending || cancelItemMutation.isPending}
        onClose={() => setTextAction(null)}
        onSubmit={submitTextAction}
      />
    </>
  )
}

function QueueRows({ actions, emptyLabel, loading, rows }) {
  if (loading) {
    return (
      <Stack spacing={1}>
        <Skeleton variant="rounded" height={58} />
        <Skeleton variant="rounded" height={58} />
      </Stack>
    )
  }

  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyLabel}
      </Typography>
    )
  }

  return (
    <Stack spacing={1}>
      {rows.map((row) => (
        <Paper key={row.id} variant="outlined" sx={{ p: 1.25 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {row.primary}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {row.secondary}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {row.message}
              </Typography>
            </Box>
            <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
              <Chip size="small" label={row.tag} />
              <Chip size="small" label={row.status} />
              <Typography variant="caption" color="text.secondary">
                {row.date}
              </Typography>
              {actions?.(row)}
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}

function CasesTab({ onRefresh, query, selectedOrderId }) {
  const { enqueueSnackbar } = useSnackbar()
  const [action, setAction] = useState(null)
  const rows = mapOrderCaseRows(query.data)
  const createMutation = useCreateOrderCaseMutation()
  const updateMutation = useUpdateOrderCaseMutation()
  const resolveMutation = useResolveOrderCaseMutation()
  const cancelMutation = useCancelOrderCaseMutation()
  const commentMutation = useAddOrderCaseCommentMutation()
  const activeMutation =
    createMutation.isPending ||
    updateMutation.isPending ||
    resolveMutation.isPending ||
    cancelMutation.isPending ||
    commentMutation.isPending

  const runCaseAction = async (mutation, payload, message) => {
    try {
      await mutation.mutateAsync(payload)
      enqueueSnackbar(message, { variant: SNACKBAR_VARIANTS.SUCCESS })
      query.refetch()
      onRefresh?.()
    } catch (error) {
      enqueueSnackbar(error?.message || 'Case action failed', { variant: SNACKBAR_VARIANTS.ERROR })
    }
  }

  const submitTextAction = (value) => {
    if (!action) return
    if (action.type === 'edit') {
      runCaseAction(updateMutation, { caseId: action.row.id, title: value }, 'Case updated.')
    }
    if (action.type === 'resolve') {
      runCaseAction(
        resolveMutation,
        { caseId: action.row.id, resolutionNote: value },
        'Case resolved.',
      )
    }
    if (action.type === 'cancel') {
      runCaseAction(
        cancelMutation,
        { caseId: action.row.id, cancelReason: value },
        'Case cancelled.',
      )
    }
    if (action.type === 'comment') {
      runCaseAction(commentMutation, { caseId: action.row.id, body: value }, 'Comment added.')
    }
    setAction(null)
  }

  return (
    <Stack spacing={1.5}>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="h6">Cases</Typography>
            <Typography variant="body2" color="text.secondary">
              Create and close customer-service cases for selected orders.
            </Typography>
          </Box>
          <Button
            variant="contained"
            disabled={!selectedOrderId}
            onClick={() => setAction({ type: 'create' })}
          >
            Create case
          </Button>
        </Stack>
      </Paper>
      <QueueRows
        rows={rows}
        loading={query.isFetching}
        emptyLabel="No cases found."
        actions={(row) => (
          <>
            <Button size="small" onClick={() => setAction({ type: 'edit', row })}>
              Edit
            </Button>
            <Button size="small" onClick={() => setAction({ type: 'comment', row })}>
              Comment
            </Button>
            <Button size="small" onClick={() => setAction({ type: 'resolve', row })}>
              Resolve
            </Button>
            <Button color="error" size="small" onClick={() => setAction({ type: 'cancel', row })}>
              Cancel
            </Button>
          </>
        )}
      />
      <CreateCaseDialog
        open={action?.type === 'create'}
        loading={activeMutation}
        onClose={() => setAction(null)}
        onSubmit={(payload) => {
          runCaseAction(
            createMutation,
            { orderId: selectedOrderId, caseType: 'OTHER', severity: 'MEDIUM', ...payload },
            'Case created.',
          )
          setAction(null)
        }}
      />
      <TextActionDialog
        open={Boolean(action && action.type !== 'create')}
        title={
          action?.type === 'edit'
            ? 'Edit case'
            : action?.type === 'comment'
              ? 'Add case comment'
              : action?.type === 'resolve'
                ? 'Resolve case'
                : 'Cancel case'
        }
        label={
          action?.type === 'edit'
            ? 'Case title'
            : action?.type === 'comment'
              ? 'Comment'
              : action?.type === 'resolve'
                ? 'Resolution note'
                : 'Cancel reason'
        }
        required={action?.type === 'edit' || action?.type === 'comment'}
        loading={activeMutation}
        onClose={() => setAction(null)}
        onSubmit={submitTextAction}
      />
    </Stack>
  )
}

function ExceptionsTab({ onOpenOrder, query }) {
  const rows = mapCustomerExceptionRows(query.data)

  return (
    <Stack spacing={1.5}>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography variant="h6">Customer Exceptions</Typography>
        <Typography variant="body2" color="text.secondary">
          Read-only queue from order, item, case, customization, and shipment state.
        </Typography>
      </Paper>
      <QueueRows
        rows={rows}
        loading={query.isFetching}
        emptyLabel="No customer exceptions found."
        actions={(row) => (
          <Button size="small" disabled={!row.orderId} onClick={() => onOpenOrder(row.orderId)}>
            Open detail
          </Button>
        )}
      />
    </Stack>
  )
}

function ImportIssuesTab({ query }) {
  const { enqueueSnackbar } = useSnackbar()
  const rows = mapImportIssueRows(query.data)
  const [selectedJobId, setSelectedJobId] = useState('')
  const jobQuery = useImportJobQuery(selectedJobId, { enabled: Boolean(selectedJobId) })
  const jobIssuesQuery = useImportJobIssuesQuery(
    selectedJobId,
    { page: 1, limit: 10 },
    { enabled: Boolean(selectedJobId) },
  )
  const rawRecordsQuery = useImportJobRawRecordsQuery(
    selectedJobId,
    { page: 1, limit: 10 },
    { enabled: Boolean(selectedJobId) },
  )
  const retryMutation = useRetryImportJobMutation()
  const retryJob = async () => {
    if (!selectedJobId) return
    try {
      await retryMutation.mutateAsync({ jobId: selectedJobId })
      enqueueSnackbar('Import job retry requested.', { variant: SNACKBAR_VARIANTS.SUCCESS })
      query.refetch()
      jobQuery.refetch()
      jobIssuesQuery.refetch()
      rawRecordsQuery.refetch()
    } catch (error) {
      enqueueSnackbar(error?.message || 'Retry failed', { variant: SNACKBAR_VARIANTS.ERROR })
    }
  }

  return (
    <Stack spacing={1.5}>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography variant="h6">Import Issues</Typography>
        <Typography variant="body2" color="text.secondary">
          Review import failures and inspect job-level issues without raw JSON.
        </Typography>
      </Paper>
      <QueueRows
        rows={rows}
        loading={query.isFetching}
        emptyLabel="No import issues found."
        actions={(row) => (
          <Button
            size="small"
            disabled={!row.importJobId}
            onClick={() => setSelectedJobId(row.importJobId)}
          >
            Open job
          </Button>
        )}
      />
      {selectedJobId ? (
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {jobQuery.data?.source || jobQuery.data?.status || 'Import job'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Issues: {getCollectionCount(jobIssuesQuery.data)} | Raw records:{' '}
                {getCollectionCount(rawRecordsQuery.data)}
              </Typography>
            </Box>
            <Button variant="outlined" disabled={retryMutation.isPending} onClick={retryJob}>
              Retry job
            </Button>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  )
}

function PaginationBar({ limit = 10, onLimitChange, onPageChange, page = 1, total = 0 }) {
  const { t } = useTranslation()
  const totalPages = Math.max(Math.ceil(total / limit), 1)
  const pages = getPaginationPages(page, totalPages)
  const canGoBack = page > 1
  const canGoForward = page < totalPages

  return (
    <Box
      sx={{
        minWidth: 0,
        width: '100%',
        height: 68,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        px: 2.5,
      }}
    >
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        disabled={!canGoBack}
        onClick={() => onPageChange?.(page - 1)}
        sx={{ justifySelf: 'start' }}
      >
        {t('orders.pagination.before')}
      </Button>
      <Stack direction="row" spacing={1}>
        {pages.map((pageNumber, index) =>
          pageNumber === '...' ? (
            <Button
              key={`ellipsis-${index}`}
              variant="text"
              disabled
              sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
            >
              ...
            </Button>
          ) : (
            <Button
              key={pageNumber}
              variant={pageNumber === page ? 'contained' : 'text'}
              onClick={() => onPageChange?.(pageNumber)}
              sx={{
                minWidth: 36,
                width: 36,
                height: 36,
                p: 0,
                color: pageNumber === page ? 'common.white' : 'text.secondary',
              }}
            >
              {pageNumber}
            </Button>
          ),
        )}
      </Stack>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifySelf: 'end' }}>
        <Typography variant="body2" color="text.secondary">
          {t('orders.pagination.perPage')}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 82 }}>
          <Select
            value={limit}
            IconComponent={KeyboardArrowDownIcon}
            onChange={(event) => onLimitChange?.(Number(event.target.value))}
            sx={{ height: 36 }}
          >
            {pageSizeOptions.map((pageSize) => (
              <MenuItem key={pageSize} value={pageSize}>
                {pageSize}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          endIcon={<ArrowForwardIcon />}
          disabled={!canGoForward}
          onClick={() => onPageChange?.(page + 1)}
        >
          {t('orders.pagination.after')}
        </Button>
      </Stack>
    </Box>
  )
}

function OrdersTableSkeleton({ rows = 6 }) {
  return Array.from({ length: rows }, (_, index) => (
    <Box
      key={index}
      sx={{
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'grid',
        gridTemplateColumns: tableColumns,
        minHeight: 64,
        px: 2,
        width: '100%',
      }}
    >
      <Skeleton variant="circular" width={24} height={24} />
      <Skeleton variant="text" width={126} height={24} />
      <Skeleton variant="rounded" width={84} height={24} />
      <Skeleton variant="text" width={104} height={24} />
      <Skeleton variant="text" width={104} height={24} />
      <Skeleton variant="rounded" width={96} height={24} />
      <Skeleton variant="text" width={118} height={24} />
      <Skeleton variant="text" width={68} height={24} />
      <Skeleton variant="rounded" width={84} height={24} />
      <Skeleton variant="text" width={72} height={24} />
      <Skeleton variant="circular" width={28} height={28} />
    </Box>
  ))
}

function OrdersTable({
  expandedOrderIds,
  loading,
  onLimitChange,
  onPageChange,
  onRefresh,
  onSelectOrder,
  onToggleOrder,
  orders,
  pagination,
}) {
  const { t } = useTranslation()

  return (
    <Paper
      variant="outlined"
      sx={{
        width: '100%',
        overflowX: 'auto',
        // borderRadius: theme.shape.borderRadiusCard,
        boxShadow: '0px 1px 3px rgba(16, 24, 40, 0.08)',
      }}
    >
      <TableHeader />
      {loading ? (
        <OrdersTableSkeleton />
      ) : orders.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2.5, py: 3 }}>
          {t('orders.empty')}
        </Typography>
      ) : (
        orders.map((order) => {
          const orderKey = order.apiId || order.id
          const expanded = expandedOrderIds.includes(orderKey)

          return (
            <Box key={orderKey}>
              <OrderRow
                expanded={expanded}
                onToggle={() => {
                  onSelectOrder?.(order)
                  onToggleOrder(orderKey)
                }}
                order={order}
              />
              {expanded && <ExpandedOrderDetail order={order} onRefresh={onRefresh} />}
            </Box>
          )
        })
      )}
      <PaginationBar
        limit={pagination?.limit}
        onLimitChange={onLimitChange}
        page={pagination?.page}
        total={pagination?.total}
        onPageChange={onPageChange}
      />
    </Paper>
  )
}

export default function OrdersPage() {
  const { i18n, t } = useTranslation()
  const [selectedOrderId, setSelectedOrderId] = useState(getInitialSelectedOrderId)
  const [activeTab, setActiveTab] = useState('all')
  const [queryTab, setQueryTab] = useState('all')
  const [isTabPending, startTabTransition] = useTransition()
  const [filters, setFilters] = useState({
    search: '',
    channel: 'all',
    shopId: 'all',
    seller: 'all',
    dateRange: { start: null, end: null },
    page: 1,
    limit: 10,
  })
  const [collapsedOrderIds, setCollapsedOrderIds] = useState([])
  const shopsQuery = useShopsQuery({ page: 1, limit: 100 })
  const shopOptions = useMemo(
    () =>
      (shopsQuery.data?.items || []).map((shop) => ({
        value: shop.id,
        label: shop.name,
      })),
    [shopsQuery.data],
  )
  const orderQuery = useMemo(
    () => buildOrderListQuery({ ...filters, tab: queryTab }),
    [filters, queryTab],
  )
  const ordersQuery = useOrderWorkbenchQuery(orderQuery)
  const operationsQuery = useMemo(() => ({ page: 1, limit: 5 }), [])
  const customerExceptionsQuery = useCustomerExceptionsQuery(operationsQuery)
  const orderCasesQuery = useOrderCasesQuery(operationsQuery)
  const importIssuesQuery = useImportIssuesQuery(operationsQuery)
  const orders = useMemo(
    () =>
      mapWorkbenchRows(ordersQuery.data?.items || [], {
        locale: i18n.language,
      }),
    [i18n.language, ordersQuery.data],
  )
  const pagination = ordersQuery.data?.pagination || {
    total: 0,
    page: filters.page,
    limit: filters.limit,
  }
  const tabs = useMemo(() => {
    const counts = mapApiTabCounts(ordersQuery.data?.tabCounts || {})

    return orderTabs.map((tab) => ({
      ...tab,
      count: counts[tab.key] || 0,
    }))
  }, [ordersQuery.data])
  const expandedOrderIds = useMemo(() => {
    const collapsedIds = new Set(collapsedOrderIds)
    return getDefaultExpandedOrderIds(orders).filter((orderId) => !collapsedIds.has(orderId))
  }, [collapsedOrderIds, orders])
  const isTabLoading = activeTab !== queryTab || isTabPending || ordersQuery.isLoading

  const handleSelectOrder = (order) => {
    if (!order?.apiId) return
    setSelectedOrderId(order.apiId)
    updateOrdersUrl({ orderId: order.apiId })
  }

  const handleToggleOrder = (orderId) => {
    setCollapsedOrderIds((currentIds) =>
      currentIds.includes(orderId)
        ? currentIds.filter((currentId) => currentId !== orderId)
        : [...currentIds, orderId],
    )
  }
  const handleChangeTab = (tab) => {
    if (tab === activeTab) {
      return
    }

    flushSync(() => {
      setActiveTab(tab)
    })
    startTabTransition(() => {
      setQueryTab(tab)
      setFilters((current) => ({ ...current, page: 1 }))
      setCollapsedOrderIds([])
    })
  }

  return (
    <Box sx={{ minHeight: 'calc(100vh - 112px)', bgcolor: 'background.default' }}>
      <Stack spacing={3}>
        <Stack sx={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            {t('orders.title')}
          </Typography>
        </Stack>

        <Stack spacing={2.75}>
          <OrderTabs activeTab={activeTab} onChange={handleChangeTab} tabs={tabs} />
          <FilterBar
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={() => ordersQuery.refetch()}
            shopOptions={shopOptions}
          />
          <OrdersTable
            expandedOrderIds={expandedOrderIds}
            loading={isTabLoading}
            onLimitChange={(limit) => {
              setFilters((current) => ({ ...current, limit, page: 1 }))
              setCollapsedOrderIds([])
            }}
            onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
            onRefresh={() => ordersQuery.refetch()}
            onSelectOrder={handleSelectOrder}
            onToggleOrder={handleToggleOrder}
            orders={orders}
            pagination={pagination}
          />
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', xl: 'repeat(3, minmax(0, 1fr))' },
            }}
          >
            <CasesTab
              query={orderCasesQuery}
              selectedOrderId={selectedOrderId}
              onRefresh={() => ordersQuery.refetch()}
            />
            <ExceptionsTab
              query={customerExceptionsQuery}
              onOpenOrder={(orderId) => {
                setSelectedOrderId(orderId)
                updateOrdersUrl({ orderId })
              }}
            />
            <ImportIssuesTab query={importIssuesQuery} />
          </Box>
        </Stack>
      </Stack>
    </Box>
  )
}
