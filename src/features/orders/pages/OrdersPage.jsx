import { isValidElement, useMemo, useState, useTransition } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import SwapVertIcon from '@mui/icons-material/SwapVert'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
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
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useSnackbar } from 'notistack'

import DateRangePicker from '@/components/form/DateRangePicker'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import {
  useImportOrdersMutation,
  useUpdateOrderBuyerMutation,
  useUpdateOrderCaseStatusMutation,
  useUpdateOrderShippingAddressMutation,
} from '@/features/orders/api/orders.mutations'
import {
  useExpandedOrderQuery,
  useOrderDetailQuery,
  useOrdersQuery,
  useShopsQuery,
} from '@/features/orders/api/orders.queries'
import { filterOptions, orderTabs } from '@/features/orders/data/ordersData'
import {
  buildOrderListQuery,
  mapApiTabCounts,
  mapOrderDetail,
  mapOrderRows,
} from '@/features/orders/utils/ordersApi'
import { getDefaultExpandedOrderIds } from '@/features/orders/utils/ordersDisplay'

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

function getDisplayText(t, item) {
  if (!item) return ''
  if (typeof item === 'string' || typeof item === 'number') return item

  return item.labelKey ? t(item.labelKey) : item.label
}

function StatusBadge({ label, color = 'success' }) {
  const variants = {
    success: { text: '#00B86B', border: '#58D99A', bg: '#E8FFF4' },
    warning: { text: '#FF6B00', border: '#FFB85A', bg: '#FFF7E6' },
    danger: { text: '#F04438', border: '#F04438', bg: '#FFF1F0' },
  }
  const current = variants[color]

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        height: 24,
        bgcolor: current.bg,
        border: `1px solid ${current.border}`,
        color: current.text,
        fontWeight: 500,
        '& .MuiChip-label': { px: 1 },
      }}
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

function DetailField({ label, value }) {
  const displayValue = getDetailDisplayValue(value)
  const isTextValue = typeof displayValue === 'string' || typeof displayValue === 'number'

  return (
    <Box
      sx={{
        alignItems: 'flex-start',
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: 'minmax(112px, 0.85fr) minmax(0, 1fr)',
      }}
    >
      <Typography variant="body2" sx={{ color: '#8D9CC5' }}>
        {label}
      </Typography>
      {isTextValue ? (
        <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right' }}>
          {displayValue}
        </Typography>
      ) : (
        <Box sx={{ justifySelf: 'end' }}>{displayValue}</Box>
      )}
    </Box>
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
                bgcolor: active ? theme.palette.primary.main : '#E9EEF5',
                color: active ? theme.palette.common.white : '#6B7280',
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
            borderBottom: '1px solid #E5E7EB',
            flexDirection: 'row',
            height: 56,
            justifyContent: 'space-between',
            px: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{ color: '#111827', fontSize: 18, fontWeight: 600, marginTop: 2 }}
          >
            {t('orders.importOrders.title')}
          </Typography>
        </Stack>

        <Stack spacing={1.5} sx={{ px: 3, pt: 2.25, pb: 2.5 }}>
          <Typography variant="caption" sx={{ color: '#6B7280', fontSize: 11, fontWeight: 500 }}>
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

          <Typography variant="caption" sx={{ color: '#6B7280', fontSize: 11, fontWeight: 500 }}>
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
                color: selectedStore ? 'text.primary' : '#9BA2B3',
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
            sx={{ color: '#6B7280', fontSize: 11, fontWeight: 500, pt: 0.5 }}
          >
            {t('orders.importOrders.file')}
          </Typography>
          <Box
            component="label"
            sx={{
              alignItems: 'center',
              bgcolor: '#F1F6FE',
              border: '1.5px dashed #96B7F3',
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
                bgcolor: '#DEEAFE',
                borderRadius: '50%',
                color: '#5B8DEF',
                display: 'flex',
                height: 48,
                justifyContent: 'center',
                mb: 1.5,
                width: 48,
              }}
            >
              <CloudUploadOutlinedIcon />
            </Box>
            <Typography variant="body2" sx={{ color: '#111827', fontSize: 13, fontWeight: 500 }}>
              {selectedFile?.name || t('orders.importOrders.uploadTitle')}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6B7280', fontSize: 12, mt: 0.75 }}>
              {t('orders.importOrders.uploadHint')}
            </Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            borderTop: '1px solid #E5E7EB',
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
        bgcolor: '#FAFBFC',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      {headers.map((header) => (
        <Typography
          key={header || 'expand'}
          variant="caption"
          sx={{ color: '#475467', fontWeight: 600, textTransform: 'uppercase' }}
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
      <Typography variant="body2" sx={{ color: '#181D27', fontSize: 14 }}>
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
            borderBottom: '1px solid #E5E8F0',
            flexDirection: 'row',
            height: 77,
            px: 4,
          }}
        >
          <Typography
            variant="h6"
            sx={{ color: '#181D27', fontSize: 20, fontWeight: 700, marginTop: 2 }}
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
            borderTop: '1px solid #E5E8F0',
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
          <Typography variant="h6" sx={{ color: '#181D27', fontSize: 20, fontWeight: 700 }}>
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
              color: selectedCase ? 'text.primary' : '#97A1C0',
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
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {order.id}
      </Typography>
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
          sx={{ width: 24, height: 24, color: 'text.secondary' }}
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
        <CheckCircleIcon fontSize="small" sx={{ color: '#62D989' }} />
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
          sx={{ width: 28, height: 28, color: '#00B86B' }}
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
    <Stack spacing={2.1} sx={{ width: '100%' }}>
      <Typography variant="caption" sx={{ color: '#9AA7BD', fontWeight: 800, letterSpacing: 0.8 }}>
        {t('orders.detail.productInfo')}
      </Typography>
      <DetailField
        label={t('orders.fields.psd')}
        value={<StatusBadge label={t(product.psdKey)} color="danger" />}
      />
      <DetailField
        label={t('orders.fields.pngStatus')}
        value={<StatusBadge label={t(product.pngStatusKey)} color="warning" />}
      />
      <DetailField label={t('orders.fields.scaleBy')} value={t(product.scaleByKey)} />
      <DetailField label={t('orders.fields.qcBy')} value={product.qcBy} />
      <DetailField label={t('orders.fields.sku')} value={product.sku} />
      <DetailField label={t('orders.fields.asinType')} value={t(product.asinTypeKey)} />
      <DetailField label={t('orders.fields.asin')} value={product.asin} />
      <DetailField label={t('orders.fields.psdId')} value={t(product.psdIdKey)} />
      <DetailField label={t('orders.fields.seller')} value={product.seller} />
      <DetailField label={t('orders.fields.team')} value={product.team} />
    </Stack>
  )
}

function CustomizationInfo({ customization }) {
  const { t } = useTranslation()
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
    <Stack spacing={2.1} sx={{ width: '100%' }}>
      <Typography variant="caption" sx={{ color: '#9AA7BD', fontWeight: 800, letterSpacing: 0.8 }}>
        {t('orders.detail.customization')}
      </Typography>
      {topFields.map(([labelKey, value]) => (
        <DetailField key={labelKey} label={t(labelKey)} value={value} />
      ))}
      <Typography variant="body2" sx={{ color: '#8D9CC5' }}>
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
        <DetailField key={labelKey} label={t(labelKey)} value={value} />
      ))}
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
                  <SwapVertIcon sx={{ color: '#8D9CC5' }} />
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
      <Typography variant="caption" sx={{ color: '#9AA7BD', fontWeight: 800, letterSpacing: 0.8 }}>
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

function ExpandedOrderDetail({ order }) {
  const { t } = useTranslation()
  const expandedOrderQuery = useExpandedOrderQuery(order.apiId, {
    enabled: Boolean(order.apiId),
  })
  const expandedOrder = expandedOrderQuery.data || {}
  const expandedItems = expandedOrder.items || []
  const items = expandedItems.map(({ item = {}, pricing = {} }) => ({
    ...item,
    price: {
      currency: pricing.currency,
      itemPriceAmount: pricing.customerPaidAmount,
    },
  }))
  const customizationsByItemId = new Map()
  expandedItems.forEach(({ item = {}, customization }) => {
    if (item.id && customization) customizationsByItemId.set(item.id, customization)
  })
  const rawOrder = {
    ...order.raw,
    ...(expandedOrder.order || {}),
    buyer: expandedOrder.buyer || order.raw?.buyer,
    shippingAddress: expandedOrder.shipping?.address || order.raw?.shippingAddress,
    shippingService: expandedOrder.shipping?.service || order.raw?.shippingService,
  }
  const detail = mapOrderDetail({
    order: rawOrder,
    items,
    customizationsByItemId,
  })
  const displayOrder = {
    ...order,
    ...detail,
    basecost: detail.basecost,
  }

  if (expandedOrderQuery.isLoading) {
    return (
      <Box
        sx={{
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          gap: 1.5,
          px: 3,
          py: 3,
        }}
      >
        <CircularProgress size={18} />
        <Typography variant="body2" color="text.secondary">
          {t('orders.loadingDetails')}
        </Typography>
      </Box>
    )
  }

  return (
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
      <NotePanel fulfillment={displayOrder.fulfillment} />
    </Box>
  )
}

function PaginationBar({ limit = 10, onLimitChange, onPageChange, page = 1, total = 0 }) {
  const { t } = useTranslation()
  const totalPages = Math.max(Math.ceil(total / limit), 1)
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1)
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
        {pages.map((pageNumber) => (
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
        ))}
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
          const expanded = expandedOrderIds.includes(order.id)

          return (
            <Box key={order.id}>
              <OrderRow
                expanded={expanded}
                onToggle={() => onToggleOrder(order.id)}
                order={order}
              />
              {expanded && <ExpandedOrderDetail order={order} />}
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
  const shopNameById = useMemo(
    () => new Map(shopOptions.map((shop) => [shop.value, shop.label])),
    [shopOptions],
  )
  const orderQuery = useMemo(
    () => buildOrderListQuery({ ...filters, tab: queryTab }),
    [filters, queryTab],
  )
  const ordersQuery = useOrdersQuery(orderQuery)
  const orders = useMemo(
    () =>
      mapOrderRows(ordersQuery.data?.items || [], {
        shopNameById,
        locale: i18n.language,
      }),
    [i18n.language, ordersQuery.data, shopNameById],
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
            onToggleOrder={handleToggleOrder}
            orders={orders}
            pagination={pagination}
          />
        </Stack>
      </Stack>
    </Box>
  )
}
