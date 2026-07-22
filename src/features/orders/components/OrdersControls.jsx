import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useSnackbar } from 'notistack'

import AnimatedDialog from '@/components/common/AnimatedDialog'
import DateRangePicker from '@/components/form/DateRangePicker'
import { OperationsToolbar } from '@/components/operations'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { useImportOrdersMutation } from '@/features/orders/api/orders.mutations'

const importSourceOptions = [
  { value: 'MANUAL_EXCEL', labelKey: 'orders.importOrders.sources.amazon' },
  { value: 'ETSY_SOLD_ORDER_ITEMS', labelKey: 'orders.importOrders.sources.etsy' },
]

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

export function OrdersTabs({ activeTab, onChange, tabs }) {
  const { t } = useTranslation()

  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={(theme) => ({
        borderBottom: `1px solid ${theme.palette.divider}`,
        overflowX: 'auto',
        overflowY: 'hidden',
        width: '100%',
      })}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.key

        return (
          <Button
            key={tab.key}
            variant="text"
            onClick={() => onChange(tab.key)}
            sx={(theme) => ({
              minWidth: 'max-content',
              height: 40,
              flex: '0 0 auto',
              px: 2,
              borderRadius: 0,
              borderBottom: active
                ? `2px solid ${theme.palette.primary.main}`
                : '2px solid transparent',
              bgcolor: 'transparent',
              color: active ? 'primary.main' : 'text.disabled',
              fontWeight: active ? 700 : 600,
              whiteSpace: 'nowrap',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.06),
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
                lineHeight: '18px',
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

export function OrdersToolbar({ filters, onFiltersChange, onRefresh, sellerOptions, shopOptions }) {
  const { t } = useTranslation()
  const [importModalOpen, setImportModalOpen] = useState(false)

  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value, page: 1 })
  }

  return (
    <OperationsToolbar>
      <Box
        sx={{
          alignItems: 'center',
          display: 'grid',
          gap: 1.25,
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, minmax(0, 1fr))',
            lg: 'minmax(240px, 1.35fr) minmax(170px, 0.9fr) minmax(220px, 1fr) minmax(170px, 0.9fr) 40px minmax(112px, 0.55fr)',
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
            justifySelf: { xs: 'stretch', lg: 'end' },
          })}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
        <Button
          variant="contained"
          startIcon={<FileDownloadOutlinedIcon />}
          onClick={() => setImportModalOpen(true)}
          sx={{ height: 40, minWidth: 112, width: '100%' }}
        >
          {t('orders.actions.import')}
        </Button>
        <ImportOrdersModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          shopOptions={shopOptions}
        />
      </Box>
    </OperationsToolbar>
  )
}
