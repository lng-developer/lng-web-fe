import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
} from '@mui/material'
import { useSnackbar } from 'notistack'

import {
  OperationsHeader,
  OperationsPageShell,
  OperationsPagination,
  OperationsTable,
  OperationsToolbar,
  StatusBadge,
} from '@/components/operations'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import {
  useCreateShopMutation,
  useUpdateShopStatusMutation,
} from '@/features/shops/api/shops.mutations'
import { useShopsQuery } from '@/features/shops/api/shops.queries'
import { useDebounce } from '@/hooks/useDebounce'

const pageSize = 20
const columns = [
  { key: 'id', labelKey: 'shops.table.id', width: '220px' },
  { key: 'name', labelKey: 'shops.table.name', width: '260px' },
  { key: 'currency', labelKey: 'shops.table.currency', width: '120px' },
  { key: 'status', labelKey: 'shops.table.status', width: '140px' },
  { key: 'updatedAt', labelKey: 'shops.table.updatedAt', width: '150px' },
  { key: 'actions', labelKey: 'shops.table.actions', width: '130px', align: 'center' },
]

function formatDate(value, language) {
  if (!value) return '-'
  return new Intl.DateTimeFormat(language, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function statusTone(status) {
  if (status === 'ACTIVE') return 'success'
  if (status === 'SUSPENDED') return 'danger'
  return 'neutral'
}

function CreateShopDialog({ open, loading, onClose, onSubmit, t }) {
  const [values, setValues] = useState({ name: '', currency: 'USD' })

  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('shops.dialog.createTitle')}</DialogTitle>
      <DialogContent className="space-y-3 pt-2">
        <TextField
          fullWidth
          label={t('shops.table.name')}
          value={values.name}
          onChange={(event) => update('name', event.target.value)}
        />
        <TextField
          fullWidth
          label={t('shops.table.currency')}
          value={values.currency}
          onChange={(event) => update('currency', event.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          disabled={loading || !values.name.trim()}
          onClick={() => onSubmit(values)}
        >
          {t('shops.actions.create')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function ShopsPage() {
  const { t, i18n } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [filters, setFilters] = useState({ id: '', search: '', status: 'all' })
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const debouncedFilters = useDebounce({ id: filters.id, search: filters.search }, 300)
  const shopsQuery = useShopsQuery({
    ...debouncedFilters,
    status: filters.status,
    page,
    limit: pageSize,
  })
  const createShopMutation = useCreateShopMutation()
  const updateStatusMutation = useUpdateShopStatusMutation()
  const rows = shopsQuery.data?.items || []
  const pagination = shopsQuery.data?.pagination || { page, limit: pageSize, total: 0 }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  function createShop(values) {
    createShopMutation.mutate(values, {
      onSuccess: () => {
        enqueueSnackbar(t('shops.messages.created'), { variant: SNACKBAR_VARIANTS.SUCCESS })
        setDialogOpen(false)
      },
      onError: (error) =>
        enqueueSnackbar(error?.response?.data?.message || t('shops.messages.createFailed'), {
          variant: SNACKBAR_VARIANTS.ERROR,
        }),
    })
  }

  function toggleStatus(row) {
    updateStatusMutation.mutate(
      { id: row.id, status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
      {
        onSuccess: () =>
          enqueueSnackbar(t('shops.messages.statusUpdated'), {
            variant: SNACKBAR_VARIANTS.SUCCESS,
          }),
        onError: (error) =>
          enqueueSnackbar(error?.response?.data?.message || t('shops.messages.updateFailed'), {
            variant: SNACKBAR_VARIANTS.ERROR,
          }),
      },
    )
  }

  function renderCell(row, column) {
    if (column.key === 'status') {
      return <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
    }
    if (column.key === 'updatedAt') return formatDate(row.updatedAt, i18n.language)
    if (column.key === 'actions') {
      return (
        <Button size="small" variant="outlined" onClick={() => toggleStatus(row)}>
          {row.status === 'ACTIVE' ? t('shops.actions.deactivate') : t('shops.actions.activate')}
        </Button>
      )
    }
    return row[column.key] || '-'
  }

  return (
    <OperationsPageShell
      header={
        <OperationsHeader
          title={t('shops.title')}
          subtitle={t('shops.subtitle')}
          actions={
            <Button
              variant="contained"
              startIcon={<AddIcon fontSize="small" />}
              onClick={() => setDialogOpen(true)}
            >
              {t('shops.actions.create')}
            </Button>
          }
        />
      }
      toolbar={
        <OperationsToolbar>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[240px_240px_160px]">
            <TextField
              size="small"
              value={filters.id}
              onChange={(event) => updateFilter('id', event.target.value)}
              placeholder={t('shops.filters.id')}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              size="small"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder={t('shops.filters.search')}
            />
            <FormControl size="small">
              <Select
                value={filters.status}
                onChange={(event) => updateFilter('status', event.target.value)}
              >
                <MenuItem value="all">{t('shops.filters.allStatus')}</MenuItem>
                <MenuItem value="active">{t('shops.status.active')}</MenuItem>
                <MenuItem value="inactive">{t('shops.status.inactive')}</MenuItem>
                <MenuItem value="suspended">{t('shops.status.suspended')}</MenuItem>
              </Select>
            </FormControl>
          </div>
        </OperationsToolbar>
      }
      pagination={
        <OperationsPagination
          page={pagination.page}
          pageSize={pagination.limit}
          total={pagination.total}
          onPageChange={setPage}
        />
      }
    >
      <OperationsTable
        columns={columns.map((column) => ({ ...column, label: t(column.labelKey) }))}
        rows={rows}
        loading={shopsQuery.isPending}
        getRowKey={(row) => row.id}
        renderCell={renderCell}
        minWidth="1020px"
        emptyTitle={t('shops.empty')}
      />
      <CreateShopDialog
        open={dialogOpen}
        loading={createShopMutation.isPending}
        onClose={() => setDialogOpen(false)}
        onSubmit={createShop}
        t={t}
      />
    </OperationsPageShell>
  )
}
