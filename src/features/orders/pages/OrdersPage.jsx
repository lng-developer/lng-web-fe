import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckIcon from '@mui/icons-material/Check'
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
  Dialog,
  FormControl,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'

import DateRangePicker from '@/components/form/DateRangePicker'
import { fakeOrders, filterOptions, orderTabs } from '@/features/orders/data/ordersData'
import dayjs from '@/lib/dayjs'

const tableColumns =
  '44px minmax(150px, 1.25fr) minmax(120px, 0.9fr) minmax(145px, 1.1fr) minmax(145px, 1.1fr) minmax(120px, 0.95fr) minmax(140px, 1.05fr) minmax(100px, 0.75fr) minmax(110px, 0.8fr) minmax(95px, 0.7fr) 56px'

const statusOptions = [
  { key: 'orders.values.status.new', color: 'success' },
  { key: 'orders.values.status.fulfilled', color: 'success' },
  { key: 'orders.values.status.shipped', color: 'success' },
  { key: 'orders.values.status.cancelled', color: 'danger' },
]

const shippingTypeOptions = [
  { key: 'orders.values.shipping.secondDay' },
  { key: 'orders.values.shipping.standard' },
  { key: 'orders.values.shipping.ground' },
  { key: 'orders.values.shipping.overnight' },
  { key: 'orders.values.shipping.economy' },
  { key: 'orders.values.shipping.expedited' },
]

const caseOptions = [
  { value: 'missing-psd', labelKey: 'orders.openCase.options.missingPsd' },
  { value: 'customer-request', labelKey: 'orders.openCase.options.customerRequest' },
  { value: 'shipping-issue', labelKey: 'orders.openCase.options.shippingIssue' },
  { value: 'production-delay', labelKey: 'orders.openCase.options.productionDelay' },
]

const importStoreOptions = filterOptions.shops.filter((shop) => shop.value !== 'all')

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

function OrdersSelect({ options, sx }) {
  const { t } = useTranslation()

  return (
    <FormControl size="small" sx={sx}>
      <Select defaultValue={options[0]?.value ?? ''} IconComponent={KeyboardArrowDownIcon}>
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {getDisplayText(t, option)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

function DetailField({ label, value }) {
  const isTextValue = typeof value === 'string' || typeof value === 'number'

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
          {value}
        </Typography>
      ) : (
        <Box sx={{ justifySelf: 'end' }}>{value}</Box>
      )}
    </Box>
  )
}

function OrderTabs({ activeTab, onChange }) {
  const { t } = useTranslation()

  return (
    <Stack direction="row" spacing={0.5} sx={{ overflowX: 'auto', pb: 0.25, width: '100%' }}>
      {orderTabs.map((tab) => {
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

function ImportOrdersModal({ onClose, open }) {
  const { t } = useTranslation()
  const [selectedStore, setSelectedStore] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    setSelectedFileName(file?.name ?? '')
  }

  const handleImport = () => {
    onClose()
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
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            height: 56,
            px: 3,
            borderBottom: '1px solid #E5E7EB',
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
            {t('orders.importOrders.store')}
          </Typography>
          <FormControl fullWidth size="small">
            <Select
              value={selectedStore}
              displayEmpty
              IconComponent={KeyboardArrowDownIcon}
              onChange={(event) => setSelectedStore(event.target.value)}
              renderValue={(value) => {
                const store = importStoreOptions.find((item) => item.value === value)
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
              {importStoreOptions.map((store) => (
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
            <input type="file" accept=".txt,text/plain" hidden onChange={handleFileChange} />
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
              {selectedFileName || t('orders.importOrders.uploadTitle')}
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
            sx={{ gridColumn: 3, height: 40, width: 160 }}
          >
            {t('orders.actions.import')}
          </Button>
        </Box>
      </Stack>
    </Dialog>
  )
}

function FilterBar() {
  const { t } = useTranslation()
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: dayjs('2026-06-11'),
    end: dayjs('2026-06-20'),
  })

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
      <OrdersSelect options={filterOptions.channels} sx={{ width: '100%' }} />
      <OrdersSelect options={filterOptions.shops} sx={{ width: '100%' }} />
      <DateRangePicker value={dateRange} onChange={setDateRange} fullWidth />
      <OrdersSelect options={filterOptions.sellers} sx={{ width: '100%' }} />
      <IconButton
        aria-label={t('orders.filters.refresh')}
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
      <ImportOrdersModal open={importModalOpen} onClose={() => setImportModalOpen(false)} />
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

function buildCustomerForm(order) {
  return {
    name: order.customer,
    email: order.customerInfo?.email ?? 'lc9sgxl3dzvvdxk@marketplace.amazon.com',
    address: order.customerInfo?.address ?? '125 DANABLU DR',
    address2: order.customerInfo?.address2 ?? '',
    state: order.customerInfo?.state ?? 'TX',
    city: order.customerInfo?.city ?? 'HUTTO',
    country: order.customerInfo?.country ?? 'US',
    zipCode: order.customerInfo?.zipCode ?? '78634-5781',
    phoneNumber: order.customerInfo?.phoneNumber ?? '+1 602-671-6610 ext. 39989',
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
  const [formValues, setFormValues] = useState(() => buildCustomerForm(order))

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSave = () => {
    onClose()
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
          direction="row"
          alignItems="center"
          sx={{
            height: 77,
            px: 4,
            borderBottom: '1px solid #E5E8F0',
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
            sx={{ gridColumn: 3, height: 44, width: 150 }}
          >
            {t('orders.actions.saveChanges')}
          </Button>
        </Box>
      </Stack>
    </Dialog>
  )
}

function OpenCaseModal({ onClose, open }) {
  const { t } = useTranslation()
  const [selectedCase, setSelectedCase] = useState('')

  const handleSave = () => {
    onClose()
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
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
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
  const [statusAnchorEl, setStatusAnchorEl] = useState(null)
  const [selectedStatusKey, setSelectedStatusKey] = useState(order.statusKey)
  const [shippingAnchorEl, setShippingAnchorEl] = useState(null)
  const [selectedShippingTypeKey, setSelectedShippingTypeKey] = useState(order.shippingTypeKey)
  const [caseModalOpen, setCaseModalOpen] = useState(false)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const selectedStatus =
    statusOptions.find((status) => status.key === selectedStatusKey) ?? statusOptions[0]
  const statusMenuOpen = Boolean(statusAnchorEl)
  const shippingMenuOpen = Boolean(shippingAnchorEl)

  const handleOpenStatusMenu = (event) => {
    setStatusAnchorEl(event.currentTarget)
  }

  const handleCloseStatusMenu = () => {
    setStatusAnchorEl(null)
  }

  const handleChangeStatus = (statusKey) => {
    setSelectedStatusKey(statusKey)
    handleCloseStatusMenu()
  }

  const handleOpenShippingMenu = (event) => {
    setShippingAnchorEl(event.currentTarget)
  }

  const handleCloseShippingMenu = () => {
    setShippingAnchorEl(null)
  }

  const handleChangeShippingType = (shippingTypeKey) => {
    setSelectedShippingTypeKey(shippingTypeKey)
    handleCloseShippingMenu()
  }

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
      <Stack direction="row" spacing={1} alignItems="center">
        <StatusBadge label={t(selectedStatusKey)} color={selectedStatus.color} />
        <IconButton
          size="small"
          aria-haspopup="menu"
          aria-expanded={statusMenuOpen}
          onClick={handleOpenStatusMenu}
          sx={{ width: 24, height: 24, color: 'text.secondary' }}
        >
          <KeyboardArrowDownIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={statusAnchorEl}
          open={statusMenuOpen}
          onClose={handleCloseStatusMenu}
          slotProps={{
            paper: {
              sx: {
                mt: 0.75,
                width: 168,
              },
            },
          }}
        >
          {statusOptions.map((status) => {
            const selected = status.key === selectedStatusKey

            return (
              <MenuItem
                key={status.key}
                onClick={() => handleChangeStatus(status.key)}
                sx={{
                  alignItems: 'center',
                  display: 'flex',
                  height: 40,
                  justifyContent: 'space-between',
                }}
              >
                <StatusBadge label={t(status.key)} color={status.color} />
                {selected && <CheckIcon fontSize="small" sx={{ color: 'text.primary' }} />}
              </MenuItem>
            )
          })}
        </Menu>
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
      <Stack direction="row" spacing={1} alignItems="center">
        <StatusBadge label={t(selectedShippingTypeKey)} />
        <IconButton
          size="small"
          aria-haspopup="menu"
          aria-expanded={shippingMenuOpen}
          onClick={handleOpenShippingMenu}
          sx={{ width: 24, height: 24, color: 'text.secondary' }}
        >
          <KeyboardArrowDownIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={shippingAnchorEl}
          open={shippingMenuOpen}
          onClose={handleCloseShippingMenu}
          slotProps={{
            paper: {
              sx: {
                mt: 0.75,
                width: 200,
              },
            },
          }}
        >
          {shippingTypeOptions.map((shippingType) => {
            const selected = shippingType.key === selectedShippingTypeKey

            return (
              <MenuItem
                key={shippingType.key}
                onClick={() => handleChangeShippingType(shippingType.key)}
                sx={{
                  alignItems: 'center',
                  display: 'flex',
                  height: 38,
                  justifyContent: 'space-between',
                }}
              >
                <Typography variant="body2">{t(shippingType.key)}</Typography>
                {selected && <CheckIcon fontSize="small" sx={{ color: 'text.primary' }} />}
              </MenuItem>
            )
          })}
        </Menu>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
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
          open={customerModalOpen}
          order={order}
          onClose={() => setCustomerModalOpen(false)}
        />
      </Stack>
      <Typography variant="body2">{order.basecost}</Typography>
      <Box>
        <StatusBadge label={t(order.storeKey)} color="danger" />
      </Box>
      <Typography variant="body2">{t(order.handlingKey)}</Typography>
      <Box>
        <IconButton
          aria-label={t('orders.openCase.title')}
          onClick={() => setCaseModalOpen(true)}
          sx={{ width: 28, height: 28, color: '#00B86B' }}
        >
          <AddBoxOutlinedIcon fontSize="small" />
        </IconButton>
        <OpenCaseModal open={caseModalOpen} onClose={() => setCaseModalOpen(false)} />
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
      <ProductImages images={order.productImages} />
      <ProductInfo product={order.product} />
      <CustomizationInfo customization={order.customization} />
      <FulfillmentInfo fulfillment={order.fulfillment} />
      <NotePanel fulfillment={order.fulfillment} />
    </Box>
  )
}

function PaginationBar() {
  const { t } = useTranslation()
  const pages = ['1', '2', '3', '...', '8', '9', '10']

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
        disabled
        sx={{ justifySelf: 'start' }}
      >
        {t('orders.pagination.before')}
      </Button>
      <Stack direction="row" spacing={1}>
        {pages.map((page) => (
          <Button
            key={page}
            variant={page === '1' ? 'contained' : 'text'}
            sx={{
              minWidth: 36,
              width: 36,
              height: 36,
              p: 0,
              color: page === '1' ? 'common.white' : 'text.secondary',
            }}
          >
            {page}
          </Button>
        ))}
      </Stack>
      <Button variant="outlined" endIcon={<ArrowForwardIcon />} sx={{ justifySelf: 'end' }}>
        {t('orders.pagination.after')}
      </Button>
    </Box>
  )
}

function OrdersTable({ expandedOrderIds, onToggleOrder, orders }) {
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
      {orders.map((order) => {
        const expanded = expandedOrderIds.includes(order.id)

        return (
          <Box key={order.id}>
            <OrderRow expanded={expanded} onToggle={() => onToggleOrder(order.id)} order={order} />
            {expanded && <ExpandedOrderDetail order={order} />}
          </Box>
        )
      })}
      <PaginationBar />
    </Paper>
  )
}

export default function OrdersPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('all')
  const orders = useMemo(() => fakeOrders, [])
  const [expandedOrderIds, setExpandedOrderIds] = useState(() =>
    [fakeOrders[0]?.id].filter(Boolean),
  )

  const handleToggleOrder = (orderId) => {
    setExpandedOrderIds((currentIds) =>
      currentIds.includes(orderId)
        ? currentIds.filter((currentId) => currentId !== orderId)
        : [...currentIds, orderId],
    )
  }

  return (
    <Box sx={{ minHeight: 'calc(100vh - 112px)', bgcolor: 'background.default' }}>
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            {t('orders.title')}
          </Typography>
        </Stack>

        <Stack spacing={2.75}>
          <OrderTabs activeTab={activeTab} onChange={setActiveTab} />
          <FilterBar />
          <OrdersTable
            expandedOrderIds={expandedOrderIds}
            onToggleOrder={handleToggleOrder}
            orders={orders}
          />
        </Stack>
      </Stack>
    </Box>
  )
}
