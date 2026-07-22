import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined'
import CloseIcon from '@mui/icons-material/Close'
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import NotificationsIcon from '@mui/icons-material/Notifications'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import ReplayIcon from '@mui/icons-material/Replay'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'
import VerifiedIcon from '@mui/icons-material/Verified'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  MenuItem,
  Popover,
  Select,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'

import AnimatedDialog from '@/components/common/AnimatedDialog'
import CopyableText from '@/components/common/CopyableText'
import ImagePreview from '@/components/common/ImagePreview'
import InlineDetailValue from '@/components/common/InlineDetailValue'
import { OperationsTable } from '@/components/operations'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import {
  useMappingRecheckMutation,
  useMappingSelectMutation,
} from '@/features/mapping/api/mapping.mutations'
import {
  useCreateOrderCaseMutation,
  useCreateOrderItemReplacementMutation,
  useUpdateOrderBuyerMutation,
  useUpdateOrderItemCsNoteMutation,
  useUpdateOrderShippingAddressMutation,
  useUpdateOrderShippingServiceMutation,
} from '@/features/orders/api/orders.mutations'
import {
  useOrderCasesQuery,
  useOrderDetailQuery,
  useOrderItemTimelineQuery,
} from '@/features/orders/api/orders.queries'
import DetailField from '@/features/orders/components/OrderDetailField'
import StatusBadge from '@/features/orders/components/OrderStatusChip'
import TextActionDialog from '@/features/orders/components/OrderTextActionDialog'
import {
  orderWorkbenchColumns,
  orderWorkbenchDetailPaddingClass,
  orderWorkbenchTableMinWidth,
} from '@/features/orders/components/orderWorkbenchColumns'
import { getOrderItemWorkflowScope } from '@/features/orders/utils/ordersItemWorkflow'
import { mapOrderCaseRows, mapTimelineRows } from '@/features/orders/utils/ordersOps'
import { getOrderStatusTone as getOrderStatusColor } from '@/features/orders/utils/orderStatus'
import {
  useVendorCostCentersQuery,
  useVendorProductsQuery,
} from '@/features/vendors/api/vendors.queries'
import { useDebounce } from '@/hooks/useDebounce'

const shippingServiceLevelOptions = ['Standard', 'Second Day', 'Ground', 'Overnight', 'Economy']
const shippingServiceLevelNotes = [
  { label: 'Second Day', values: '2 Day, Second Day, SecondDay, 2 Day, 2 Days' },
  { label: 'Ground', values: 'Ground, Expedited' },
  { label: 'Overnight', values: 'Overnight, Standard Overnight' },
  { label: 'Economy', values: 'Economy, Standard, FreeEconomy, Standard Shipping, Free Shipping' },
]

const customerFieldKeys = [
  ['name', 'email'],
  ['address', 'address2'],
  ['state', 'city'],
  ['country', 'zipCode'],
  ['phoneNumber'],
]

function cleanManualMatchValue(value) {
  const text = String(value || '').trim()
  const normalized = text.toLowerCase()

  return text && text !== '-' && normalized !== 'no data' ? text : undefined
}

function formatManualVendorProduct(product = {}) {
  const vendorName =
    product.vendorName || product.vendorCode || product.vendor?.name || product.vendor?.code
  const productName = product.name || product.code

  return [vendorName, productName].filter(Boolean).join(' - ') || product.id || '-'
}

function formatManualVendorProductMeta(product = {}) {
  const parts = [
    product.code,
    product.vendorName ? `Vendor: ${product.vendorName}` : '',
    product.costCenterCount ? `${product.costCenterCount} variants` : '',
  ].filter(Boolean)

  return parts.join(' Â· ')
}

function getMappingRecheckFeedback(result = {}) {
  if (['READY', 'CONFIRMED'].includes(result.status)) {
    return {
      message: result.blockingReasons?.length
        ? 'Vendor matched. Customization still needs review.'
        : 'Vendor match rechecked.',
      variant: SNACKBAR_VARIANTS.SUCCESS,
    }
  }

  const reason = result.blockingReasons?.[0]

  return {
    message: reason
      ? `Vendor not matched: ${reason}`
      : 'Vendor not matched. Check customization and mapping data.',
    variant: SNACKBAR_VARIANTS.WARNING,
  }
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

function buildShippingServiceForm(order = {}) {
  const service = order.shippingService || order.raw?.shippingService || {}

  return {
    level: service.level || order.shippingType || '',
  }
}

function CustomerTextField({ label, name, onChange, placeholder, value }) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="body1" sx={{ color: 'text.primary' }}>
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
    <AnimatedDialog
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
          <Typography variant="h2" sx={{ color: 'text.primary', marginTop: 2 }}>
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
    </AnimatedDialog>
  )
}

function UpdateShippingModal({ onClose, open, order }) {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const updateShippingServiceMutation = useUpdateOrderShippingServiceMutation()
  const detailQuery = useOrderDetailQuery(order?.apiId, {
    enabled: open && Boolean(order?.apiId),
  })
  const [draftValues, setDraftValues] = useState({})
  const sourceFormValues = useMemo(
    () => buildShippingServiceForm(detailQuery.data || order),
    [detailQuery.data, order],
  )
  const formValues = { ...sourceFormValues, ...draftValues }
  const levelOptions = [formValues.level, ...shippingServiceLevelOptions].filter(
    (value, index, options) => value && options.indexOf(value) === index,
  )

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
      await updateShippingServiceMutation.mutateAsync({
        orderId: order.apiId,
        level: formValues.level,
      })
      enqueueSnackbar(t('orders.updateShipping.success'), { variant: SNACKBAR_VARIANTS.SUCCESS })
      setDraftValues({})
      onClose()
    } catch (error) {
      enqueueSnackbar(t(error?.message || 'errors.api.network'), {
        variant: SNACKBAR_VARIANTS.ERROR,
      })
    }
  }

  return (
    <AnimatedDialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            width: 292,
          },
        },
      }}
    >
      <Stack spacing={1.5} sx={{ p: 2.5 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {t('orders.updateShipping.title')}
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label={t('orders.actions.cancel')}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
        <FormControl fullWidth>
          <Select
            name="level"
            value={formValues.level}
            onChange={handleChange}
            displayEmpty
            sx={{
              height: 28,
              borderRadius: 1,
              '& .MuiSelect-select': {
                py: 0.5,
              },
            }}
          >
            <MenuItem value="">{t('orders.updateShipping.placeholders.level')}</MenuItem>
            {levelOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 18 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Note
            </Typography>
          </Stack>
          <Stack spacing={0.75}>
            {shippingServiceLevelNotes.map((note) => (
              <Box key={note.label}>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 800 }}>
                  {note.label}:
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.35 }}>
                  {note.values}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1.25} sx={{ justifyContent: 'flex-end', pt: 2 }}>
          <Button variant="outlined" size="small" onClick={onClose}>
            {t('orders.actions.cancel')}
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleSave}
            disabled={
              !formValues.level ||
              formValues.level === sourceFormValues.level ||
              updateShippingServiceMutation.isPending
            }
          >
            {t('orders.actions.update')}
          </Button>
        </Stack>
      </Stack>
    </AnimatedDialog>
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

    try {
      const createdCase = await createCaseMutation.mutateAsync({
        orderId: order.apiId,
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
    <AnimatedDialog
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
          <Typography variant="h2" sx={{ color: 'text.primary' }}>
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
    </AnimatedDialog>
  )
}

function OrderInfoPopover({
  action = null,
  anchorEl,
  children,
  countLabel,
  empty,
  emptyLabel,
  loading,
  onClose,
  open,
  skeletonCount = 3,
  title,
  width = 420,
}) {
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      transformOrigin={{ horizontal: 'left', vertical: 'top' }}
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: 420,
          overflow: 'auto',
          p: 0,
          width,
        },
      }}
    >
      <Stack>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            bgcolor: 'background.default',
            borderBottom: '1px solid',
            borderColor: 'divider',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {countLabel}
            </Typography>
          </Box>
          {action}
        </Stack>
        {loading ? (
          <Stack spacing={1} sx={{ p: 2 }}>
            {Array.from({ length: skeletonCount }, (_, index) => (
              <Skeleton key={index} height={44} />
            ))}
          </Stack>
        ) : empty ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            {emptyLabel}
          </Typography>
        ) : (
          children
        )}
      </Stack>
    </Popover>
  )
}

const alwaysExpanded = () => true

const OrderTimelineButton = memo(function OrderTimelineButton({ orderItemId }) {
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
      <OrderInfoPopover
        open={open}
        anchorEl={timelineAnchor}
        onClose={() => setTimelineAnchor(null)}
        title="Order item timeline"
        countLabel={`${rows.length} events`}
        loading={timelineQuery.isFetching}
        empty={rows.length === 0}
        emptyLabel="No timeline events."
      >
        {rows.map((row, index) => (
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
        ))}
      </OrderInfoPopover>
    </>
  )
})

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

const addressStatusVisuals = {
  VALID: {
    Icon: VerifiedIcon,
    color: 'success.main',
    labelKey: 'orders.addressStatus.valid',
  },
  INVALID: {
    Icon: ErrorOutlineOutlinedIcon,
    color: 'error.main',
    labelKey: 'orders.addressStatus.invalid',
  },
  WARNING: {
    Icon: WarningAmberOutlinedIcon,
    color: 'warning.main',
    labelKey: 'orders.addressStatus.warning',
  },
  NOT_CHECKED: {
    Icon: HelpOutlineOutlinedIcon,
    color: 'text.disabled',
    labelKey: 'orders.addressStatus.notChecked',
  },
}

function getAddressStatusVisual(status) {
  return addressStatusVisuals[status] || addressStatusVisuals.NOT_CHECKED
}

const CustomerCell = memo(function CustomerCell({ order }) {
  const { t } = useTranslation()
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const orderId = order.apiId
  const addressStatus = getAddressStatusVisual(order.addressValidationStatus)
  const AddressStatusIcon = addressStatus.Icon

  return (
    <Stack
      direction="row"
      gap={0.5}
      sx={{ alignItems: 'center', justifyContent: 'flex-start', minWidth: 0, overflow: 'hidden' }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0, maxWidth: 150 }} noWrap>
        {order.customer}
      </Typography>
      <Tooltip title={t(addressStatus.labelKey)}>
        <Box
          component="span"
          sx={{ color: addressStatus.color, display: 'inline-flex', flexShrink: 0 }}
        >
          <AddressStatusIcon fontSize="small" />
        </Box>
      </Tooltip>
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
})

const OrderCaseAction = memo(function OrderCaseAction({ onRefresh, order }) {
  const [caseModalOpen, setCaseModalOpen] = useState(false)
  const [casesAnchor, setCasesAnchor] = useState(null)
  const [createdCaseTitle, setCreatedCaseTitle] = useState('')
  const orderId = order.apiId
  const casesQuery = useOrderCasesQuery(
    { orderId, limit: 20 },
    { enabled: Boolean(orderId && casesAnchor) },
  )
  const rows = mapOrderCaseRows(casesQuery.data)
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
    casesQuery.refetch?.()
    onRefresh?.()
  }
  const openNewCaseModal = (event) => {
    event?.stopPropagation?.()
    setCasesAnchor(null)
    setCaseModalOpen(true)
  }
  const openCases = (event) => {
    event.stopPropagation()
    if (hasCase) {
      setCasesAnchor(event.currentTarget)
      return
    }
    setCaseModalOpen(true)
  }

  return (
    <Stack direction="row" gap={0.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
      {hasCase ? (
        <Chip
          size="small"
          label={caseTitle || caseStatus}
          color="warning"
          onClick={openCases}
          sx={{ maxWidth: 92 }}
        />
      ) : null}
      <RowActionButton
        color="success"
        disabled={!orderId}
        icon={<AddBoxOutlinedIcon fontSize="small" />}
        label="Case"
        onClick={openNewCaseModal}
      />
      <OrderInfoPopover
        open={Boolean(casesAnchor)}
        anchorEl={casesAnchor}
        onClose={() => setCasesAnchor(null)}
        title="Order cases"
        countLabel={`${rows.length} cases`}
        loading={casesQuery.isFetching}
        empty={rows.length === 0}
        emptyLabel="No cases."
        skeletonCount={2}
        width={380}
        action={
          <Button size="small" onClick={openNewCaseModal}>
            New
          </Button>
        }
      >
        {rows.map((row, index) => (
          <Box
            key={row.id || `${row.primary}-${index}`}
            sx={(theme) => ({
              borderBottom:
                index === rows.length - 1 ? 'none' : `1px solid ${theme.palette.divider}`,
              px: 2,
              py: 1.25,
            })}
          >
            <Stack direction="row" gap={1} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Typography variant="body2" sx={{ flex: 1, fontWeight: 800 }} noWrap>
                {row.primary}
              </Typography>
              <Chip size="small" label={row.status} />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {row.tag} | {row.date}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
              {row.secondary}
            </Typography>
          </Box>
        ))}
      </OrderInfoPopover>
      <OpenCaseModal
        open={caseModalOpen}
        order={order}
        onCreated={handleCaseCreated}
        onClose={() => setCaseModalOpen(false)}
      />
    </Stack>
  )
})

const OrderOtherActions = memo(function OrderOtherActions({ onRefresh, order }) {
  const { enqueueSnackbar } = useSnackbar()
  const [textAction, setTextAction] = useState(null)
  const workbenchItems = order.workbenchItems || []
  const firstWorkbenchItem = workbenchItems[0]?.item || {}
  const orderItemId = workbenchItems.length === 1 ? firstWorkbenchItem.id : ''
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
      <Button
        disabled={!orderItemId}
        size="small"
        startIcon={<SwapHorizOutlinedIcon fontSize="small" />}
        variant="outlined"
        onClick={() => setTextAction('replacement')}
        sx={{
          borderRadius: 999,
          fontWeight: 800,
          height: 28,
          minWidth: 92,
          px: 1.25,
          textTransform: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Replace
      </Button>
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
})

const ShippingTypeCell = memo(function ShippingTypeCell({ order }) {
  const { t } = useTranslation()
  const [shippingModalOpen, setShippingModalOpen] = useState(false)

  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{ alignItems: 'center', justifyContent: 'center', minWidth: 0 }}
    >
      <StatusBadge label={order.shippingType || '-'} />
      <IconButton
        aria-label={t('orders.updateShipping.title')}
        disabled={!order?.apiId}
        size="small"
        title={t('orders.updateShipping.title')}
        onClick={() => setShippingModalOpen(true)}
        sx={(theme) => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1.5,
          height: 24,
          width: 24,
        })}
      >
        <LocalShippingOutlinedIcon sx={{ fontSize: 15 }} />
      </IconButton>
      <UpdateShippingModal
        open={shippingModalOpen}
        order={order}
        onClose={() => setShippingModalOpen(false)}
      />
    </Stack>
  )
})

const DateCell = memo(function DateCell({ agoKey, date }) {
  const { t } = useTranslation()

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="body2">{date}</Typography>
      <Typography variant="caption" color="text.disabled">
        {t(agoKey)}
      </Typography>
    </Box>
  )
})

function renderOrderWorkbenchCell({ column, onRefresh, order, t }) {
  const orderItemId = getOrderItemWorkflowScope(order).orderItemId

  if (column.key === 'orderId') {
    return <CopyableText value={order.id} variant="caption" sx={{ pr: 1 }} />
  }

  if (column.key === 'status') {
    return (
      <Stack
        direction="row"
        spacing={0.5}
        sx={{ alignItems: 'center', justifyContent: 'center', minWidth: 0 }}
      >
        <StatusBadge label={t(order.statusKey)} color={getOrderStatusColor(order.status)} />
        <OrderTimelineButton orderItemId={orderItemId} />
      </Stack>
    )
  }

  if (column.key === 'createdAt')
    return <DateCell date={order.createdAt} agoKey={order.createdAgoKey} />
  if (column.key === 'orderDate')
    return <DateCell date={order.orderDate} agoKey={order.orderAgoKey} />

  if (column.key === 'shippingType') {
    return <ShippingTypeCell order={order} />
  }

  if (column.key === 'customer') return <CustomerCell order={order} />

  if (column.key === 'basecost') return <Typography variant="body2">{order.basecost}</Typography>

  if (column.key === 'store') {
    return (
      <StatusBadge label={order.storeKey ? t(order.storeKey) : order.storeName} color="danger" />
    )
  }

  if (column.key === 'handling') {
    return (
      <Typography variant="body2">
        {order.handlingKey ? t(order.handlingKey) : order.handling}
      </Typography>
    )
  }

  if (column.key === 'case') return <OrderCaseAction order={order} onRefresh={onRefresh} />
  if (column.key === 'actions') return <OrderOtherActions order={order} onRefresh={onRefresh} />

  return null
}

const ProductImages = memo(function ProductImages({ images }) {
  return (
    <Stack spacing={3} sx={{ width: '100%', alignItems: 'center' }}>
      {images.map((image, index) => (
        <ImagePreview
          key={`${image}-${index}`}
          src={image}
          alt="Product image"
          className={
            index === 0 ? 'h-[150px] w-[150px] rounded-md' : 'h-[142px] w-[142px] rounded-md'
          }
        >
          <Box
            component="img"
            src={image}
            alt="Product image"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          />
        </ImagePreview>
      ))}
    </Stack>
  )
})

const ProductInfo = memo(function ProductInfo({ product }) {
  const { t } = useTranslation()

  return (
    <Stack className="min-w-0 w-full gap-4">
      <Typography
        variant="caption"
        className="min-w-0 tracking-[0.8px] !font-extrabold !text-ink-muted"
      >
        {t('orders.detail.productInfo')}
      </Typography>
      <DetailField
        label={t('orders.fields.psd')}
        value={<StatusBadge label={t(product.psdKey)} color={product.psdColor || 'danger'} />}
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
      <DetailField
        label={t('orders.fields.sku')}
        value={<CopyableText value={product.sku} />}
        valueAlign="left"
      />
      <DetailField
        label={t('orders.fields.asinType')}
        value={t(product.asinTypeKey)}
        valueAlign="left"
      />
      <DetailField
        label={t('orders.fields.asin')}
        value={<CopyableText value={product.asin} />}
        valueAlign="left"
      />
      <DetailField label={t('orders.fields.seller')} value={product.seller} valueAlign="left" />
      <DetailField label={t('orders.fields.team')} value={product.team} valueAlign="left" />
    </Stack>
  )
})

const CustomizationInfo = memo(function CustomizationInfo({ customization }) {
  const { t } = useTranslation()
  const hasDynamicCustomization =
    Array.isArray(customization.fields) || Array.isArray(customization.images)
  const dynamicFields = customization.fields || []
  const dynamicImages = customization.images || []
  const customizationUrl = customization.customizationUrl
  const hasCustomizationUrl = customizationUrl && customizationUrl !== '-'
  const customizationUrlValue = hasCustomizationUrl ? (
    <Typography
      component="a"
      href={customizationUrl}
      rel="noreferrer"
      target="_blank"
      variant="body2"
      sx={(theme) => ({
        color: theme.palette.primary.main,
        fontWeight: 700,
        textDecoration: 'none',
        '&:hover': {
          textDecoration: 'underline',
        },
      })}
    >
      Link
    </Typography>
  ) : (
    '-'
  )
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
            <InlineDetailValue
              key={`${field.label}-${field.value}-${index}`}
              label={field.label}
              value={field.value}
            />
          ))}
          <InlineDetailValue label={t('orders.fields.customizationUrl')}>
            {customizationUrlValue}
          </InlineDetailValue>
          {dynamicImages.map((image, index) => (
            <Box key={`${image.url}-${index}`}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }}>
                {image.label || t('orders.fields.customerPhoto')}
              </Typography>
              <ImagePreview
                src={image.url}
                alt={image.label || t('orders.fields.customerPhoto')}
                className="h-[58px] w-[58px] rounded"
              >
                <Box
                  component="img"
                  src={image.url}
                  alt={image.label || t('orders.fields.customerPhoto')}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </ImagePreview>
            </Box>
          ))}
        </>
      ) : (
        <>
          {topFields.map(([labelKey, value]) => (
            <InlineDetailValue key={labelKey} label={t(labelKey)} value={value} />
          ))}
          <Typography variant="body2" color="text.disabled">
            {t('orders.fields.customerPhoto')}
          </Typography>
          <Stack direction="row" spacing={2.5}>
            {customization.customerPhoto.map((image, index) => (
              <ImagePreview
                key={`${image}-photo-${index}`}
                src={image}
                alt={t('orders.fields.customerPhoto')}
                className="h-[58px] w-[58px] rounded"
              >
                <Box
                  component="img"
                  src={image}
                  alt={t('orders.fields.customerPhoto')}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </ImagePreview>
            ))}
          </Stack>
          {bottomFields.map(([labelKey, value]) => (
            <InlineDetailValue key={labelKey} label={t(labelKey)} value={value} />
          ))}
        </>
      )}
    </Stack>
  )
})

function ReadOnlyValue({ maxWidth = 220, multiline = false, rows = 1, value }) {
  return (
    <Box
      sx={(theme) => ({
        alignItems: multiline ? 'flex-start' : 'center',
        bgcolor: theme.palette.action.hover,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1.5,
        display: 'flex',
        maxWidth,
        minHeight: multiline ? rows * 24 + 12 : 34,
        px: 1.25,
        py: multiline ? 0.75 : 0.5,
        width: '100%',
      })}
    >
      <Typography variant="body2" className="!font-medium" sx={{ overflowWrap: 'anywhere' }}>
        {value || '-'}
      </Typography>
    </Box>
  )
}

const InlineVendorMatch = memo(function InlineVendorMatch({ fulfillment, orderItemId }) {
  const { enqueueSnackbar } = useSnackbar()
  const { t } = useTranslation()
  const selectMutation = useMappingSelectMutation()
  const initialVendorProductLabel = cleanManualMatchValue(fulfillment.vendorProduct) || ''
  const [search, setSearch] = useState(initialVendorProductLabel)
  const [vendorProductId, setVendorProductId] = useState(() => fulfillment.vendorProductId || '')
  const [size, setSize] = useState(() =>
    fulfillment.vendorProductId ? cleanManualMatchValue(fulfillment.size) || '' : '',
  )
  const [color, setColor] = useState(() =>
    fulfillment.vendorProductId ? cleanManualMatchValue(fulfillment.color) || '' : '',
  )
  const [savedVendorProductId, setSavedVendorProductId] = useState(
    () => fulfillment.vendorProductId || '',
  )
  const [savedVendorCostCenterId, setSavedVendorCostCenterId] = useState(
    () => fulfillment.vendorCostCenterId || '',
  )
  const [vendorLookupActive, setVendorLookupActive] = useState(false)
  const [vendorOptionsOpen, setVendorOptionsOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 300)
  const hasProductTypeGroup = Boolean(fulfillment.productTypeGroupId)
  const productQuery = useVendorProductsQuery(
    {
      limit: 50,
      productTypeGroupId: fulfillment.productTypeGroupId,
      search: vendorProductId ? '' : debouncedSearch,
      status: 'active',
    },
    { enabled: Boolean(fulfillment.productTypeGroupId && vendorLookupActive) },
  )
  const refetchVendorProducts = productQuery.refetch
  const activateVendorLookup = useCallback(() => {
    setVendorLookupActive(true)
    setVendorOptionsOpen(true)
  }, [])
  const refreshVendorLookup = useCallback(() => {
    setVendorLookupActive(true)
    setVendorOptionsOpen(true)
    if (vendorLookupActive) {
      refetchVendorProducts()
    }
  }, [refetchVendorProducts, vendorLookupActive])
  const costCenterQuery = useVendorCostCentersQuery(
    vendorProductId,
    { limit: 100, status: 'active' },
    { enabled: Boolean(vendorProductId) },
  )
  const vendorProducts = useMemo(
    () =>
      (productQuery.data?.items || []).map((product) => ({
        ...product,
        label: formatManualVendorProduct(product),
      })),
    [productQuery.data?.items],
  )
  const costCenters = useMemo(
    () => costCenterQuery.data?.items || [],
    [costCenterQuery.data?.items],
  )
  const sizeOptions = useMemo(
    () => [...new Set(costCenters.map((costCenter) => costCenter.standardSize).filter(Boolean))],
    [costCenters],
  )
  const selectedSize = sizeOptions.includes(size) ? size : ''
  const colorOptions = useMemo(
    () => [
      ...new Set(
        costCenters
          .filter((costCenter) => !selectedSize || costCenter.standardSize === selectedSize)
          .map((costCenter) => costCenter.standardColor)
          .filter(Boolean),
      ),
    ],
    [costCenters, selectedSize],
  )
  const selectedColor = colorOptions.includes(color) ? color : ''
  const canSelectCandidate =
    Boolean(vendorProductId) &&
    (sizeOptions.length === 0 || Boolean(selectedSize)) &&
    (colorOptions.length === 0 || Boolean(selectedColor))
  const selectedCostCenter = canSelectCandidate
    ? costCenters.find(
        (costCenter) =>
          (!selectedSize || costCenter.standardSize === selectedSize) &&
          (!selectedColor || costCenter.standardColor === selectedColor),
      )
    : null
  const selectedProduct =
    vendorProducts.find((product) => product.id === vendorProductId) ||
    (vendorProductId ? { id: vendorProductId, label: search || fulfillment.vendorProduct } : null)
  const selectedCandidate = selectedCostCenter
    ? { vendorProduct: selectedProduct, vendorCostCenter: selectedCostCenter }
    : null
  const hasUnsavedCandidate =
    Boolean(selectedCandidate) &&
    (selectedCandidate.vendorProduct.id !== savedVendorProductId ||
      selectedCandidate.vendorCostCenter.id !== savedVendorCostCenterId)

  const handleApply = () => {
    if (!hasUnsavedCandidate) return
    selectMutation.mutate(
      {
        orderItemId,
        body: {
          vendorProductId: selectedCandidate.vendorProduct.id,
          vendorCostCenterId: selectedCandidate.vendorCostCenter.id,
        },
      },
      {
        onSuccess: () => {
          enqueueSnackbar(t('orders.manualVendorMatch.success'), {
            variant: SNACKBAR_VARIANTS.SUCCESS,
          })
          setSavedVendorProductId(selectedCandidate.vendorProduct.id)
          setSavedVendorCostCenterId(selectedCandidate.vendorCostCenter.id)
        },
        onError: (error) => {
          enqueueSnackbar(t(error?.message || 'errors.api.network'), {
            variant: SNACKBAR_VARIANTS.ERROR,
          })
        },
      },
    )
  }

  const errorMessage =
    productQuery.error?.message || costCenterQuery.error?.message || selectMutation.error?.message
  const showMissingProductTypeHelp = vendorLookupActive && !hasProductTypeGroup

  return (
    <Stack spacing={1.1} sx={{ maxWidth: 220, width: '100%' }}>
      <Stack spacing={0.45}>
        <Typography variant="body2" className="!font-semibold">
          {t('orders.fields.vendorProduct')}
        </Typography>
        <Autocomplete
          fullWidth
          open={vendorOptionsOpen}
          openOnFocus
          autoHighlight
          size="small"
          freeSolo
          loading={productQuery.isFetching}
          options={vendorProducts}
          value={selectedProduct}
          inputValue={search}
          filterOptions={(options) => options}
          getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
          noOptionsText={
            hasProductTypeGroup
              ? t('orders.manualVendorMatch.noProducts')
              : t('orders.manualVendorMatch.noProductType')
          }
          onOpen={activateVendorLookup}
          onClose={() => setVendorOptionsOpen(false)}
          onInputChange={(_event, value, reason) => {
            setSearch(value)
            if (reason === 'input') {
              setVendorLookupActive(true)
              setVendorOptionsOpen(true)
              setVendorProductId('')
              setSize('')
              setColor('')
            }
          }}
          onChange={(_event, option) => {
            setVendorLookupActive(true)
            setVendorProductId(option?.id || '')
            setSearch(typeof option === 'string' ? option : option?.label || '')
            setSize('')
            setColor('')
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={t('orders.manualVendorMatch.searchPlaceholder')}
              error={Boolean(errorMessage || showMissingProductTypeHelp)}
              helperText={
                errorMessage
                  ? t(errorMessage)
                  : showMissingProductTypeHelp
                    ? t('orders.manualVendorMatch.missingProductTypeHelp')
                    : ''
              }
              onFocus={refreshVendorLookup}
              onClick={refreshVendorLookup}
            />
          )}
          renderOption={(props, option) => (
            <Box
              component="li"
              {...props}
              sx={{ alignItems: 'flex-start', flexDirection: 'column' }}
            >
              <Typography variant="body2" className="!font-semibold">
                {option.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatManualVendorProductMeta(option)}
              </Typography>
            </Box>
          )}
        />
      </Stack>
      <Stack spacing={0.45}>
        <Typography variant="body2" className="!font-semibold">
          {t('orders.fields.size')}
        </Typography>
        <FormControl size="small" fullWidth>
          <Select
            value={selectedSize}
            displayEmpty
            disabled={!vendorProductId || costCenterQuery.isFetching || sizeOptions.length === 0}
            onOpen={() => setVendorLookupActive(true)}
            onChange={(event) => {
              setSize(event.target.value)
              setColor('')
            }}
          >
            <MenuItem value="">
              <Typography variant="body2" color="text.disabled">
                {sizeOptions.length
                  ? t('orders.manualVendorMatch.selectSize')
                  : t('orders.manualVendorMatch.noSize')}
              </Typography>
            </MenuItem>
            {sizeOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      <Stack spacing={0.45}>
        <Typography variant="body2" className="!font-semibold">
          {t('orders.fields.color')}
        </Typography>
        <FormControl size="small" fullWidth>
          <Select
            value={selectedColor}
            displayEmpty
            disabled={
              !vendorProductId ||
              costCenterQuery.isFetching ||
              (sizeOptions.length > 0 && !selectedSize) ||
              colorOptions.length === 0
            }
            onOpen={() => setVendorLookupActive(true)}
            onChange={(event) => setColor(event.target.value)}
          >
            <MenuItem value="">
              <Typography variant="body2" color="text.disabled">
                {colorOptions.length
                  ? t('orders.manualVendorMatch.selectColor')
                  : t('orders.manualVendorMatch.noColor')}
              </Typography>
            </MenuItem>
            {colorOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      {hasUnsavedCandidate ? (
        <Box sx={{ bgcolor: 'action.hover', borderRadius: 1.5, p: 1.5 }}>
          <Typography variant="body2" className="!font-bold" sx={{ mb: 0.75 }}>
            {t('orders.manualVendorMatch.variantDetails')}
          </Typography>
          <Typography variant="body2">
            {t('orders.manualVendorMatch.sku', {
              value:
                selectedCandidate.vendorCostCenter.sku ||
                selectedCandidate.vendorCostCenter.lngCode ||
                '-',
            })}
          </Typography>
          <Typography variant="body2">
            {t('orders.manualVendorMatch.baseCost', {
              value:
                selectedCandidate.vendorCostCenter.baseCostAmount === null ||
                selectedCandidate.vendorCostCenter.baseCostAmount === undefined
                  ? '-'
                  : `${selectedCandidate.vendorCostCenter.currency || '$'}${
                      selectedCandidate.vendorCostCenter.baseCostAmount
                    }`,
            })}
          </Typography>
          <Typography variant="body2">
            {t('orders.manualVendorMatch.standardSize', {
              value: selectedCandidate.vendorCostCenter.standardSize || '-',
            })}
          </Typography>
          <Typography variant="body2">
            {t('orders.manualVendorMatch.standardColor', {
              value: selectedCandidate.vendorCostCenter.standardColor || '-',
            })}
          </Typography>
        </Box>
      ) : null}
      <Stack spacing={0.45}>
        <Typography variant="body2" className="!font-semibold">
          {t('orders.fields.fulfillName')}
        </Typography>
        <ReadOnlyValue value={fulfillment.fulfillName} multiline rows={2} />
      </Stack>
      {hasUnsavedCandidate ? (
        <Button
          variant="contained"
          size="small"
          onClick={handleApply}
          disabled={!hasUnsavedCandidate || selectMutation.isPending}
          sx={{ alignSelf: 'flex-start', minWidth: 78 }}
        >
          {t('orders.manualVendorMatch.apply')}
        </Button>
      ) : null}
    </Stack>
  )
})

const VendorMatchSummary = memo(function VendorMatchSummary({ fulfillment, onEdit }) {
  const { t } = useTranslation()
  const vendorProduct = cleanManualMatchValue(fulfillment.vendorProduct)
  const size = cleanManualMatchValue(fulfillment.size)
  const color = cleanManualMatchValue(fulfillment.color)

  return (
    <Stack spacing={1.1} sx={{ maxWidth: 220, width: '100%' }}>
      <Stack spacing={0.45}>
        <Typography variant="body2" className="!font-semibold">
          {t('orders.fields.vendorProduct')}
        </Typography>
        <Button
          variant="outlined"
          onClick={onEdit}
          sx={(theme) => ({
            bgcolor: theme.palette.action.hover,
            borderColor: theme.palette.divider,
            borderRadius: 1.5,
            color: 'text.primary',
            justifyContent: 'flex-start',
            minHeight: 34,
            px: 1.25,
            py: 0.5,
            textAlign: 'left',
            textTransform: 'none',
            width: '100%',
            '&:hover': {
              bgcolor: theme.palette.action.selected,
              borderColor: theme.palette.primary.main,
            },
          })}
        >
          <Typography variant="body2" className="!font-medium" noWrap>
            {vendorProduct || t('orders.values.common.noData')}
          </Typography>
        </Button>
      </Stack>
      <Stack direction="row" spacing={1}>
        <Stack spacing={0.45} sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" className="!font-semibold">
            {t('orders.fields.size')}
          </Typography>
          <ReadOnlyValue value={size || t('orders.values.common.noData')} maxWidth={96} />
        </Stack>
        <Stack spacing={0.45} sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" className="!font-semibold">
            {t('orders.fields.color')}
          </Typography>
          <ReadOnlyValue value={color || t('orders.values.common.noData')} maxWidth={96} />
        </Stack>
      </Stack>
      <Stack spacing={0.45}>
        <Typography variant="body2" className="!font-semibold">
          {t('orders.fields.fulfillName')}
        </Typography>
        <ReadOnlyValue value={fulfillment.fulfillName} multiline rows={2} />
      </Stack>
    </Stack>
  )
})

const FulfillmentInfo = memo(function FulfillmentInfo({ fulfillment, onRefresh, orderItemId }) {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [editingVendorMatch, setEditingVendorMatch] = useState(false)
  const recheckMutation = useMappingRecheckMutation()

  const recheckVendorMatch = async () => {
    if (!orderItemId) return

    try {
      const result = await recheckMutation.mutateAsync(orderItemId)
      const feedback = getMappingRecheckFeedback(result)
      enqueueSnackbar(feedback.message, { variant: feedback.variant })
      onRefresh?.()
    } catch (error) {
      enqueueSnackbar(error?.message || 'Action failed', { variant: SNACKBAR_VARIANTS.ERROR })
    }
  }

  return (
    <Box
      sx={{
        columnGap: 3,
        display: 'grid',
        gridTemplateColumns: '120px minmax(220px, 1fr)',
        width: '100%',
      }}
    >
      <Stack spacing={1.1}>
        <Typography variant="caption" className="tracking-[0.8px] !font-extrabold !text-ink-muted">
          QTY
        </Typography>
        <Stack spacing={0.45}>
          <Typography variant="body2" className="!font-semibold">
            {t('orders.fields.quantity')}
          </Typography>
          <ReadOnlyValue value={fulfillment.quantity} maxWidth={76} />
        </Stack>
        <Stack spacing={0.45}>
          <Typography variant="body2" className="!font-semibold">
            {t('orders.fields.fulfillQty')}
          </Typography>
          <ReadOnlyValue value={fulfillment.fulfillQty} maxWidth={76} />
        </Stack>
      </Stack>
      <Stack spacing={1.1}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography
            variant="caption"
            className="tracking-[0.8px] !font-extrabold !text-ink-muted"
          >
            Cost Center
          </Typography>
          <RowActionButton
            color="primary"
            disabled={!orderItemId || recheckMutation.isPending}
            icon={<ReplayIcon fontSize="small" />}
            label="Recheck vendor"
            onClick={recheckVendorMatch}
          />
        </Stack>
        {editingVendorMatch ? (
          <InlineVendorMatch
            key={`${orderItemId}-${fulfillment.vendorProductId || ''}-${fulfillment.vendorCostCenterId || ''}`}
            fulfillment={fulfillment}
            orderItemId={orderItemId}
          />
        ) : (
          <VendorMatchSummary
            fulfillment={fulfillment}
            onEdit={() => setEditingVendorMatch(true)}
          />
        )}
      </Stack>
    </Box>
  )
})

const NotePanel = memo(function NotePanel({ fulfillment, orderItemId }) {
  const { t } = useTranslation()
  const updateOrderItemCsNoteMutation = useUpdateOrderItemCsNoteMutation()
  const [csNote, setCsNote] = useState(fulfillment.csNote || '')

  const saveCsNote = () => {
    if (!orderItemId) return
    updateOrderItemCsNoteMutation.mutate({ orderItemId, csNote })
  }

  return (
    <Stack spacing={1.2} sx={{ width: '100%' }}>
      <Typography variant="body2" className="!text-ink-muted">
        {t('orders.fields.status')}
      </Typography>
      <ReadOnlyValue value={t(fulfillment.statusKey)} />
      <Typography variant="body2" className="!text-ink-muted">
        {t('orders.fields.tracking')}
      </Typography>
      <ReadOnlyValue value={t(fulfillment.trackingKey)} />
      <Typography variant="body2" className="!text-ink-muted">
        {t('orders.fields.carrier')}
      </Typography>
      <ReadOnlyValue value={t(fulfillment.carrierKey)} />
      <Typography variant="body2" className="!text-ink-muted">
        {t('orders.fields.note')}
      </Typography>
      <TextField
        aria-label={t('orders.fields.note')}
        disabled={updateOrderItemCsNoteMutation.isPending}
        error={updateOrderItemCsNoteMutation.isError}
        fullWidth
        minRows={2}
        multiline
        onChange={(event) => setCsNote(event.target.value)}
        placeholder={t('orders.fields.note')}
        value={csNote}
        size="small"
      />
      <Button
        disabled={!orderItemId || updateOrderItemCsNoteMutation.isPending}
        onClick={saveCsNote}
        size="small"
        startIcon={<SaveOutlinedIcon fontSize="small" />}
        sx={{ alignSelf: 'flex-start' }}
        variant="outlined"
      >
        {t('common.save')}
      </Button>
    </Stack>
  )
})

const ExpandedOrderDetail = memo(function ExpandedOrderDetail({ onRefresh, order }) {
  const itemDetails = order.itemDetails?.length
    ? order.itemDetails
    : [
        {
          id: order.apiId || order.id,
          productImages: order.productImages,
          product: order.product,
          customization: order.customization,
          fulfillment: order.fulfillment,
        },
      ]

  return (
    <Stack
      className={orderWorkbenchDetailPaddingClass}
      sx={{
        width: '100%',
        minWidth: 1460,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      {itemDetails.map((displayOrder, index) => (
        <Box
          key={displayOrder.id || `${order.apiId || order.id}-${index}`}
          sx={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns:
              'minmax(150px, 0.65fr) minmax(220px, 1fr) minmax(320px, 1.35fr) minmax(360px, 1.45fr) minmax(245px, 1fr)',
            gap: 3.5,
            alignItems: 'flex-start',
            py: 2.5,
            borderTop: index === 0 ? 'none' : '1px solid',
            borderColor: 'divider',
          }}
        >
          <ProductImages images={displayOrder.productImages} />
          <ProductInfo product={displayOrder.product} />
          <CustomizationInfo customization={displayOrder.customization} />
          <FulfillmentInfo
            fulfillment={displayOrder.fulfillment}
            onRefresh={onRefresh}
            orderItemId={displayOrder.id}
          />
          <NotePanel
            key={`${displayOrder.id}-${displayOrder.fulfillment.csNote || ''}`}
            fulfillment={displayOrder.fulfillment}
            orderItemId={displayOrder.id}
          />
        </Box>
      ))}
    </Stack>
  )
})

const OrdersTable = memo(function OrdersTable({ loading, onRefresh, orders, pagination }) {
  const { t } = useTranslation()
  const columns = useMemo(
    () =>
      orderWorkbenchColumns.map((column) => ({
        ...column,
        label: column.labelKey ? t(column.labelKey) : '',
      })),
    [t],
  )
  const getRowKey = useCallback((order) => order.apiId || order.id, [])
  const renderCell = useCallback(
    (order, column) => renderOrderWorkbenchCell({ column, onRefresh, order, t }),
    [onRefresh, t],
  )
  const renderExpandedRow = useCallback(
    (order) => <ExpandedOrderDetail order={order} onRefresh={onRefresh} />,
    [onRefresh],
  )

  return (
    <OperationsTable
      columns={columns}
      rows={orders}
      getRowKey={getRowKey}
      renderCell={renderCell}
      getRowExpanded={alwaysExpanded}
      renderExpandedRow={renderExpandedRow}
      loading={loading}
      loadingRows={pagination?.limit || 10}
      minWidth={orderWorkbenchTableMinWidth}
      emptyTitle={t('orders.values.common.noData')}
    />
  )
})

export default OrdersTable
