import { useMemo, useState, useTransition } from 'react'
import { useTranslation } from 'react-i18next'
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
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
  Popover,
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
  useCreateOrderCaseMutation,
  useCreateOrderItemReplacementMutation,
  useImportOrdersMutation,
  useRecheckOrderItemMutation,
  useUpdateOrderBuyerMutation,
  useUpdateOrderShippingAddressMutation,
} from '@/features/orders/api/orders.mutations'
import {
  useOrderDetailQuery,
  useOrderItemTimelineQuery,
  useOrderSummaryQuery,
  useOrderWorkbenchQuery,
  useShopsQuery,
} from '@/features/orders/api/orders.queries'
import DetailField from '@/features/orders/components/OrderDetailField'
import StatusBadge from '@/features/orders/components/OrderStatusChip'
import OrderTableGrid from '@/features/orders/components/OrderTableGrid'
import {
  orderTableHeaders,
  orderTablePaddingX,
} from '@/features/orders/components/orderTableLayout'
import TextActionDialog from '@/features/orders/components/OrderTextActionDialog'
import { filterOptions, orderTabs } from '@/features/orders/data/ordersData'
import {
  buildOrderListQuery,
  buildOrderSummaryQuery,
  mapApiTabCounts,
  mapWorkbenchRows,
} from '@/features/orders/utils/ordersApi'
import {
  getDefaultExpandedOrderIds,
  getPaginationPages,
  getSelectedExpandedOrderIds,
} from '@/features/orders/utils/ordersDisplay'
import { buildSellerOptions } from '@/features/orders/utils/ordersFilters'
import { getOrderItemWorkflowScope } from '@/features/orders/utils/ordersItemWorkflow'
import { mapTimelineRows } from '@/features/orders/utils/ordersOps'
import { getOrderStatusTone as getOrderStatusColor } from '@/features/orders/utils/orderStatus'

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

function FilterBar({ filters, onFiltersChange, onRefresh, sellerOptions, shopOptions }) {
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
        options={sellerOptions}
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

  return (
    <OrderTableGrid
      sx={{
        height: 37,
        bgcolor: 'background.default',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      {orderTableHeaders.map((header) => (
        <Typography
          key={header.key || 'expand'}
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontWeight: 600,
            justifySelf: header.align,
            minWidth: 0,
            textAlign: header.align,
            textTransform: 'uppercase',
          }}
        >
          {header.key ? t(`orders.table.${header.key}`) : ''}
        </Typography>
      ))}
    </OrderTableGrid>
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

function OpenCaseModal({ onClose, onCreated, open, order }) {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const createCaseMutation = useCreateOrderCaseMutation()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const handleSave = async () => {
    const cleanTitle = title.trim()
    if (!order?.apiId || !cleanTitle) return

    const firstWorkbenchItem = order.workbenchItems?.[0]?.item || {}

    try {
      const createdCase = await createCaseMutation.mutateAsync({
        orderId: order.apiId,
        orderItemId: firstWorkbenchItem.id || undefined,
        caseType: 'OTHER',
        severity: 'MEDIUM',
        title: cleanTitle,
        description: description.trim(),
      })
      enqueueSnackbar(t('orders.openCase.success'), { variant: SNACKBAR_VARIANTS.SUCCESS })
      setTitle('')
      setDescription('')
      onCreated?.(createdCase)
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

        <TextField
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          label="Title"
          fullWidth
        />

        <TextField
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          label="Description"
          multiline
          minRows={3}
          fullWidth
          sx={{ mt: 2 }}
        />

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
            disabled={createCaseMutation.isPending || !title.trim()}
            sx={{ gridColumn: 3, height: 40, width: 96 }}
          >
            {t('orders.actions.save')}
          </Button>
        </Box>
      </Box>
    </Dialog>
  )
}

function OrderTimelineButton({ orderItemId }) {
  const [timelineAnchor, setTimelineAnchor] = useState(null)
  const timelineQuery = useOrderItemTimelineQuery(orderItemId, {
    enabled: Boolean(orderItemId && timelineAnchor),
  })
  const rows = mapTimelineRows(timelineQuery.data)
  const open = Boolean(timelineAnchor)

  return (
    <>
      <IconButton
        aria-label="Open order item timeline"
        disabled={!orderItemId}
        size="small"
        onClick={(event) => {
          event.stopPropagation()
          setTimelineAnchor(event.currentTarget)
        }}
        sx={{ color: 'text.secondary', height: 24, width: 24 }}
      >
        <HistoryOutlinedIcon sx={{ fontSize: 16 }} />
      </IconButton>
      <Popover
        open={open}
        anchorEl={timelineAnchor}
        onClose={() => setTimelineAnchor(null)}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: 420,
            overflow: 'auto',
            p: 0,
            width: 420,
          },
        }}
      >
        <Stack>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Order item timeline
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {rows.length} events
            </Typography>
          </Box>
          {timelineQuery.isFetching ? (
            <Stack spacing={1} sx={{ p: 2 }}>
              <Skeleton height={44} />
              <Skeleton height={44} />
              <Skeleton height={44} />
            </Stack>
          ) : rows.length > 0 ? (
            rows.map((row, index) => (
              <Box
                key={row.id}
                sx={(theme) => ({
                  display: 'grid',
                  gridTemplateColumns: '18px minmax(0, 1fr)',
                  columnGap: 1.25,
                  px: 2,
                  py: 1.4,
                  borderBottom:
                    index === rows.length - 1 ? 'none' : `1px solid ${theme.palette.divider}`,
                })}
              >
                <Box sx={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                  <Box
                    sx={(theme) => ({
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: theme.palette.success.main,
                      mt: 0.75,
                    })}
                  />
                </Box>
                <Stack spacing={0.6} sx={{ minWidth: 0 }}>
                  <Stack
                    direction="row"
                    gap={1}
                    sx={{ alignItems: 'baseline', justifyContent: 'space-between', minWidth: 0 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>
                      {row.event}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                      {row.date}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {row.actorLabel} | {row.source}
                  </Typography>
                  {row.statusChange && row.statusChange !== '-' ? (
                    <Chip
                      size="small"
                      label={row.statusChange}
                      sx={{ alignSelf: 'flex-start', maxWidth: '100%' }}
                    />
                  ) : null}
                  {row.message ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ overflowWrap: 'anywhere' }}
                    >
                      {row.message}
                    </Typography>
                  ) : null}
                </Stack>
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              No timeline events.
            </Typography>
          )}
        </Stack>
      </Popover>
    </>
  )
}

function RowActionButton({ color = 'default', disabled = false, icon, label, onClick }) {
  return (
    <IconButton
      aria-label={label}
      color={color}
      disabled={disabled}
      onClick={onClick}
      size="small"
      title={label}
      sx={(theme) => ({
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1.5,
        flexShrink: 0,
        height: 28,
        width: 28,
      })}
    >
      {icon}
    </IconButton>
  )
}

function CustomerCell({ order }) {
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const orderId = order.apiId

  return (
    <Stack
      direction="row"
      gap={0.5}
      sx={{ alignItems: 'center', justifyContent: 'flex-start', minWidth: 0, overflow: 'hidden' }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0, maxWidth: 150 }} noWrap>
        {order.customer}
      </Typography>
      <CheckCircleIcon fontSize="small" color="success" sx={{ flexShrink: 0 }} />
      <RowActionButton
        disabled={!orderId}
        icon={<PersonOutlineOutlinedIcon fontSize="small" />}
        label="Buyer"
        onClick={() => setCustomerModalOpen(true)}
      />
      <UpdateCustomerModal
        key={`${order.apiId}-${customerModalOpen}`}
        open={customerModalOpen}
        order={order}
        onClose={() => setCustomerModalOpen(false)}
      />
    </Stack>
  )
}

function OrderCaseAction({ onRefresh, order }) {
  const [caseModalOpen, setCaseModalOpen] = useState(false)
  const [createdCaseTitle, setCreatedCaseTitle] = useState('')
  const orderId = order.apiId
  const caseStatus = order.caseStatus || order.raw?.caseStatus || 'NONE'
  const caseTitle =
    createdCaseTitle ||
    order.caseTitle ||
    order.raw?.caseTitle ||
    order.raw?.latestCase?.title ||
    order.raw?.case?.title ||
    ''
  const hasCase = Boolean(caseTitle) || (caseStatus && caseStatus !== 'NONE')
  const handleCaseCreated = (createdCase) => {
    setCreatedCaseTitle(createdCase?.title || '')
    onRefresh?.()
  }

  return (
    <Stack direction="row" gap={0.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
      {hasCase ? <Chip size="small" label={caseTitle || caseStatus} color="warning" /> : null}
      <RowActionButton
        color="success"
        disabled={!orderId}
        icon={<AddBoxOutlinedIcon fontSize="small" />}
        label="Case"
        onClick={() => setCaseModalOpen(true)}
      />
      <OpenCaseModal
        open={caseModalOpen}
        order={order}
        onCreated={handleCaseCreated}
        onClose={() => setCaseModalOpen(false)}
      />
    </Stack>
  )
}

function OrderOtherActions({ onRefresh, order }) {
  const { enqueueSnackbar } = useSnackbar()
  const [textAction, setTextAction] = useState(null)
  const firstWorkbenchItem = order.workbenchItems?.[0]?.item || {}
  const orderItemId = firstWorkbenchItem.id
  const recheckItemMutation = useRecheckOrderItemMutation()
  const replacementMutation = useCreateOrderItemReplacementMutation()

  const runMutation = async (mutation, payload, successMessage) => {
    try {
      await mutation.mutateAsync(payload)
      enqueueSnackbar(successMessage, { variant: SNACKBAR_VARIANTS.SUCCESS })
      onRefresh?.()
      return true
    } catch (error) {
      enqueueSnackbar(error?.message || 'Action failed', { variant: SNACKBAR_VARIANTS.ERROR })
      return false
    }
  }

  const submitTextAction = async (value) => {
    const success = await runMutation(
      replacementMutation,
      { orderItemId, reason: value, quantity: 1 },
      'Replacement created.',
    )
    if (success) setTextAction(null)
  }

  return (
    <Stack
      direction="row"
      gap={0.5}
      sx={{ alignItems: 'center', flexWrap: 'nowrap', justifyContent: 'center', minWidth: 0 }}
    >
      <RowActionButton
        disabled={!orderItemId || recheckItemMutation.isPending}
        icon={<RefreshIcon fontSize="small" />}
        label="Retest"
        onClick={() => runMutation(recheckItemMutation, { orderItemId }, 'Item retest requested.')}
      />
      <RowActionButton
        disabled={!orderItemId}
        icon={<AddBoxOutlinedIcon fontSize="small" />}
        label="Replace"
        onClick={() => setTextAction('replacement')}
      />
      <TextActionDialog
        open={Boolean(textAction)}
        title="Create replacement item"
        label="Replacement reason"
        confirmLabel="Create"
        required
        loading={replacementMutation.isPending}
        onClose={() => setTextAction(null)}
        onSubmit={submitTextAction}
      />
    </Stack>
  )
}

function OrderRow({ expanded, onRefresh, onToggle, order }) {
  const { t } = useTranslation()
  const orderItemId = getOrderItemWorkflowScope(order).orderItemId

  return (
    <OrderTableGrid
      minHeight={64}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <IconButton
        size="small"
        onClick={onToggle}
        aria-expanded={expanded}
        sx={{ height: 28, justifySelf: 'center', width: 28 }}
      >
        {expanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
      </IconButton>
      <Box
        component="span"
        className="text-xs"
        sx={{ minWidth: 0, overflowWrap: 'anywhere', pr: 1 }}
      >
        {order.id}
      </Box>
      <Stack
        spacing={0.5}
        sx={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center', minWidth: 0 }}
      >
        <StatusBadge label={t(order.statusKey)} color={getOrderStatusColor(order.status)} />
        <OrderTimelineButton orderItemId={orderItemId} />
      </Stack>
      <Box sx={{ justifySelf: 'center', textAlign: 'center' }}>
        <Typography variant="body2">{order.createdAt}</Typography>
        <Typography variant="caption" color="text.disabled">
          {t(order.createdAgoKey)}
        </Typography>
      </Box>
      <Box sx={{ justifySelf: 'center', textAlign: 'center' }}>
        <Typography variant="body2">{order.orderDate}</Typography>
        <Typography variant="caption" color="text.disabled">
          {t(order.orderAgoKey)}
        </Typography>
      </Box>
      <Stack sx={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
        <StatusBadge label={order.shippingType || '-'} />
      </Stack>
      <CustomerCell order={order} />
      <Typography variant="body2" sx={{ justifySelf: 'end' }}>
        {order.basecost}
      </Typography>
      <Box sx={{ justifySelf: 'center', minWidth: 0, maxWidth: '100%' }}>
        <StatusBadge label={order.storeKey ? t(order.storeKey) : order.storeName} color="danger" />
      </Box>
      <Typography variant="body2" sx={{ justifySelf: 'center' }}>
        {order.handlingKey ? t(order.handlingKey) : order.handling}
      </Typography>
      <OrderCaseAction order={order} onRefresh={onRefresh} />
      <OrderOtherActions order={order} onRefresh={onRefresh} />
    </OrderTableGrid>
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

function ReadOnlyValue({ multiline = false, rows = 1, value }) {
  return (
    <Box
      sx={(theme) => ({
        alignItems: multiline ? 'flex-start' : 'center',
        bgcolor: theme.palette.action.hover,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1.5,
        display: 'flex',
        minHeight: multiline ? rows * 30 + 18 : 40,
        px: 1.25,
        py: multiline ? 1 : 0.75,
      })}
    >
      <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
        {value || '-'}
      </Typography>
    </Box>
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
          <ReadOnlyValue value={fulfillment.quantity} />
        </Stack>
        <Stack spacing={0.7}>
          <Typography variant="body2">{t('orders.fields.fulfillQty')}</Typography>
          <ReadOnlyValue value={fulfillment.fulfillQty} />
        </Stack>
        <Stack spacing={0.7}>
          <Typography variant="body2">{t('orders.fields.new')}</Typography>
          <ReadOnlyValue value={t(fulfillment.statusKey)} />
        </Stack>
        <Stack spacing={0.7}>
          <Typography variant="body2">{t('orders.fields.vendorProduct')}</Typography>
          <ReadOnlyValue value={fulfillment.vendorProduct} />
        </Stack>
        <Stack spacing={0.7}>
          <Typography variant="body2">{t('orders.fields.size')}</Typography>
          <ReadOnlyValue value={fulfillment.size} />
        </Stack>
        <Stack spacing={0.7}>
          <Typography variant="body2">{t('orders.fields.color')}</Typography>
          <ReadOnlyValue value={fulfillment.color} />
        </Stack>
      </Box>
      <Stack spacing={0.7}>
        <Typography variant="body2">{t('orders.fields.fulfillName')}</Typography>
        <ReadOnlyValue value={fulfillment.fulfillName} multiline rows={3} />
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
      <ReadOnlyValue value={t(fulfillment.statusKey)} />
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {t('orders.fields.tracking')}
      </Typography>
      <ReadOnlyValue value={t(fulfillment.trackingKey)} />
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {t('orders.fields.note')}
      </Typography>
      <ReadOnlyValue value={t(fulfillment.noteKey)} multiline rows={3} />
    </Stack>
  )
}

function ExpandedOrderDetail({ order }) {
  const displayOrder = order

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
        px: orderTablePaddingX,
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
    <OrderTableGrid
      key={index}
      minHeight={64}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
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
      <Skeleton variant="rounded" width={72} height={28} />
    </OrderTableGrid>
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
  return (
    <Paper
      variant="outlined"
      sx={{
        width: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        // borderRadius: theme.shape.borderRadiusCard,
        boxShadow: '0px 1px 3px rgba(16, 24, 40, 0.08)',
      }}
    >
      <TableHeader />
      <OrdersTableBody
        expandedOrderIds={expandedOrderIds}
        loading={loading}
        onRefresh={onRefresh}
        onSelectOrder={onSelectOrder}
        onToggleOrder={onToggleOrder}
        orders={orders}
      />
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

function OrdersTableBody({
  expandedOrderIds,
  loading,
  onRefresh,
  onSelectOrder,
  onToggleOrder,
  orders,
}) {
  const { t } = useTranslation()

  return (
    <Box sx={{ maxHeight: 'calc(100vh - 360px)', overflowY: 'auto', overflowX: 'visible' }}>
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
                onRefresh={onRefresh}
                onToggle={() => {
                  if (!expanded) onSelectOrder?.(order)
                  onToggleOrder(order)
                }}
                order={order}
              />
              {expanded && <ExpandedOrderDetail order={order} />}
            </Box>
          )
        })
      )}
    </Box>
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
  const orderSummaryParams = useMemo(() => buildOrderSummaryQuery(filters), [filters])
  const ordersQuery = useOrderWorkbenchQuery(orderQuery)
  const orderSummaryQuery = useOrderSummaryQuery(orderSummaryParams)
  const orders = useMemo(
    () =>
      mapWorkbenchRows(ordersQuery.data?.items || [], {
        locale: i18n.language,
      }),
    [i18n.language, ordersQuery.data],
  )
  const sellerOptions = useMemo(() => buildSellerOptions(orders), [orders])
  const pagination = ordersQuery.data?.pagination || {
    total: 0,
    page: filters.page,
    limit: filters.limit,
  }
  const tabs = useMemo(() => {
    const counts = mapApiTabCounts(orderSummaryQuery.data?.tabCounts || {})

    return orderTabs.map((tab) => ({
      ...tab,
      count: counts[tab.key] || 0,
    }))
  }, [orderSummaryQuery.data])
  const expandedOrderIds = useMemo(() => {
    const selectedIds = getSelectedExpandedOrderIds(selectedOrderId)
    return selectedIds.length > 0 ? selectedIds : getDefaultExpandedOrderIds(orders)
  }, [orders, selectedOrderId])
  const isTabLoading = activeTab !== queryTab || isTabPending || ordersQuery.isLoading

  const handleSelectOrder = (order) => {
    if (!order?.apiId) return
    setSelectedOrderId(order.apiId)
    updateOrdersUrl({ orderId: order.apiId })
  }

  const handleToggleOrder = (order) => {
    const orderId = order?.apiId || order?.id
    if (!orderId) return

    const nextOrderId = selectedOrderId === orderId ? '' : orderId
    setSelectedOrderId(nextOrderId)
    updateOrdersUrl({ orderId: nextOrderId })
  }
  const handleChangeTab = (tab) => {
    if (tab === activeTab) {
      return
    }

    setActiveTab(tab)
    startTabTransition(() => {
      setQueryTab(tab)
      setFilters((current) => ({ ...current, page: 1 }))
      setSelectedOrderId('')
      updateOrdersUrl({ orderId: '' })
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
            sellerOptions={sellerOptions}
            shopOptions={shopOptions}
          />
          <OrdersTable
            expandedOrderIds={expandedOrderIds}
            loading={isTabLoading}
            onLimitChange={(limit) => {
              setFilters((current) => ({ ...current, limit, page: 1 }))
              setSelectedOrderId('')
              updateOrdersUrl({ orderId: '' })
            }}
            onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
            onRefresh={() => ordersQuery.refetch()}
            onSelectOrder={handleSelectOrder}
            onToggleOrder={handleToggleOrder}
            orders={orders}
            pagination={pagination}
          />
        </Stack>
      </Stack>
    </Box>
  )
}
