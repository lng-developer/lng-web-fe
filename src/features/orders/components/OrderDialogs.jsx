import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CloseIcon from '@mui/icons-material/Close'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import NotificationsIcon from '@mui/icons-material/Notifications'
import {
  Box,
  Button,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'

import AnimatedDialog from '@/components/common/AnimatedDialog'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import {
  useCreateOrderCaseMutation,
  useImportOrdersMutation,
  useUpdateOrderBuyerMutation,
  useUpdateOrderShippingAddressMutation,
  useUpdateOrderShippingServiceMutation,
} from '@/features/orders/api/orders.mutations'
import { useOrderDetailQuery } from '@/features/orders/api/orders.queries'

const importSourceOptions = [
  { value: 'MANUAL_EXCEL', labelKey: 'orders.importOrders.sources.amazon' },
  { value: 'ETSY_SOLD_ORDER_ITEMS', labelKey: 'orders.importOrders.sources.etsy' },
]

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

function getDisplayText(t, item) {
  if (!item) return ''
  if (typeof item === 'string' || typeof item === 'number') return item

  return item.labelKey ? t(item.labelKey) : item.label
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

export function ImportOrdersDialog({ onClose, open, shopOptions }) {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const importOrdersMutation = useImportOrdersMutation()
  const [selectedStore, setSelectedStore] = useState('')
  const [selectedSource, setSelectedSource] = useState('MANUAL_EXCEL')
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setSelectedStore('')
        setSelectedSource('MANUAL_EXCEL')
        setSelectedFile(null)
      })
    }
  }, [open])

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
    <AnimatedDialog
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
          <Typography variant="h3" sx={{ color: 'text.primary', marginTop: 2 }}>
            {t('orders.importOrders.title')}
          </Typography>
        </Stack>

        <Stack spacing={1.5} sx={{ px: 3, pt: 2.25, pb: 2.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
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

          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
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

          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, pt: 0.5 }}>
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
            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
              {selectedFile?.name || t('orders.importOrders.uploadTitle')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75 }}>
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
    </AnimatedDialog>
  )
}

export function UpdateCustomerDialog({ onClose, open, order }) {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const updateBuyerMutation = useUpdateOrderBuyerMutation()
  const updateAddressMutation = useUpdateOrderShippingAddressMutation()
  const detailQuery = useOrderDetailQuery(order?.apiId, {
    enabled: open && Boolean(order?.apiId),
  })
  const [draftValues, setDraftValues] = useState({})

  useEffect(() => {
    if (!open) queueMicrotask(() => setDraftValues({}))
  }, [open])

  useEffect(() => {
    queueMicrotask(() => setDraftValues({}))
  }, [order?.apiId])

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

export function UpdateShippingDialog({ onClose, open, order }) {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const updateShippingServiceMutation = useUpdateOrderShippingServiceMutation()
  const detailQuery = useOrderDetailQuery(order?.apiId, {
    enabled: open && Boolean(order?.apiId),
  })
  const [draftValues, setDraftValues] = useState({})

  useEffect(() => {
    if (!open) queueMicrotask(() => setDraftValues({}))
  }, [open])

  useEffect(() => {
    queueMicrotask(() => setDraftValues({}))
  }, [order?.apiId])

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

export function OpenCaseDialog({ onClose, onCreated, open, order }) {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const createCaseMutation = useCreateOrderCaseMutation()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setTitle('')
        setDescription('')
      })
    }
  }, [open])

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
