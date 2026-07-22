import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  Tooltip,
} from '@mui/material'
import { alpha } from '@mui/material/styles'

import DateRangePicker from '@/components/form/DateRangePicker'
import { OperationsToolbar } from '@/components/operations'
import { ImportOrdersDialog } from '@/features/orders/components/OrderDialogs'

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
        flexWrap: 'wrap',
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
        <Tooltip title={t('orders.filters.refresh')}>
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
              '&.Mui-focusVisible': {
                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.28)}`,
              },
            })}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Button
          variant="contained"
          startIcon={<FileDownloadOutlinedIcon />}
          onClick={() => setImportModalOpen(true)}
          sx={{ height: 40, minWidth: 112, width: '100%' }}
        >
          {t('orders.actions.import')}
        </Button>
        <ImportOrdersDialog
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          shopOptions={shopOptions}
        />
      </Box>
    </OperationsToolbar>
  )
}
