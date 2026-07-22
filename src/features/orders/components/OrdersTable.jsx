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
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'
import VerifiedIcon from '@mui/icons-material/Verified'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import {
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
import { OperationsTable } from '@/components/operations'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import {
  useCreateOrderCaseMutation,
  useCreateOrderItemReplacementMutation,
  useUpdateOrderBuyerMutation,
  useUpdateOrderShippingAddressMutation,
  useUpdateOrderShippingServiceMutation,
} from '@/features/orders/api/orders.mutations'
import {
  useOrderCasesQuery,
  useOrderDetailQuery,
  useOrderItemTimelineQuery,
} from '@/features/orders/api/orders.queries'
import OrderExpandedDetail from '@/features/orders/components/OrderExpandedDetail'
import StatusBadge from '@/features/orders/components/OrderStatusChip'
import TextActionDialog from '@/features/orders/components/OrderTextActionDialog'
import {
  orderWorkbenchColumns,
  orderWorkbenchTableMinWidth,
} from '@/features/orders/components/orderWorkbenchColumns'
import { getOrderItemWorkflowScope } from '@/features/orders/utils/ordersItemWorkflow'
import { mapOrderCaseRows, mapTimelineRows } from '@/features/orders/utils/ordersOps'
import { getOrderStatusTone as getOrderStatusColor } from '@/features/orders/utils/orderStatus'

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
    (order) => <OrderExpandedDetail order={order} onRefresh={onRefresh} />,
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
