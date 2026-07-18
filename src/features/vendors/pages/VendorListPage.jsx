import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SearchIcon from '@mui/icons-material/Search'
import {
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  Tooltip,
} from '@mui/material'
import { useSnackbar } from 'notistack'

import {
  OperationsHeader,
  OperationsPageShell,
  OperationsPagination,
  OperationsTable,
  OperationsToolbar,
} from '@/components/operations'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { useDebounce } from '@/hooks/useDebounce'

import { useCreateVendorMutation, useUpdateVendorMutation } from '../api/vendors.mutations'
import { useVendorsQuery } from '../api/vendors.queries'
import VendorFormDialog from '../components/VendorFormDialog'

const fulfillmentTypeClasses = {
  fba: 'bg-info text-white',
  fbm: 'bg-ink-muted text-white',
  pod: 'bg-danger text-white',
  dropship: 'bg-secondary text-white',
  custom: 'bg-warning text-white',
}

const statusClasses = {
  active: 'border-success bg-surface text-success',
  inactive: 'border-border-strong bg-surface text-ink-muted',
}
const columns = [
  { key: 'code', label: 'Code', width: '150px' },
  { key: 'name', label: 'Name', width: '240px' },
  { key: 'fulfillmentType', label: 'Fulfillment', width: '150px' },
  { key: 'providerKey', label: 'Provider', width: '150px' },
  { key: 'status', label: 'Status', width: '120px' },
  { key: 'actions', label: 'Actions', width: '110px', align: 'center' },
]

function Pill({ children, className = '' }) {
  return (
    <span
      className={`inline-flex h-5 min-w-14 items-center justify-center rounded-full border px-2 text-[11px] font-bold ${className}`}
    >
      {children}
    </span>
  )
}

export default function VendorListPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [search, setSearch] = useState('')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('all')
  const [fulfillmentType, setFulfillmentType] = useState('all')
  const [providerKey, setProviderKey] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [dialogState, setDialogState] = useState({ mode: 'create', vendor: null, open: false })
  const debouncedFilters = useDebounce({ search, code, providerKey }, 300)
  const { data, isError, isPending } = useVendorsQuery({
    page,
    limit: pageSize,
    ...debouncedFilters,
    status,
    fulfillmentType,
  })
  const vendors = data?.items || []
  const pagination = data?.pagination || { page, limit: pageSize, total: 0 }
  const createVendorMutation = useCreateVendorMutation()
  const updateVendorMutation = useUpdateVendorMutation()

  function closeDialog() {
    setDialogState((current) => ({ ...current, open: false }))
  }

  function openCreateDialog() {
    setDialogState({ mode: 'create', vendor: null, open: true })
  }

  function openEditDialog(vendor) {
    setDialogState({ mode: 'edit', vendor, open: true })
  }

  function handleSubmitVendor(payload) {
    const isEdit = dialogState.mode === 'edit'
    const mutation = isEdit ? updateVendorMutation : createVendorMutation
    const mutationPayload = isEdit ? { vendorId: dialogState.vendor.id, payload } : payload

    mutation.mutate(mutationPayload, {
      onSuccess: () => {
        enqueueSnackbar(
          t(
            isEdit
              ? 'vendors.messages.updateVendorSuccess'
              : 'vendors.messages.createVendorSuccess',
          ),
          { variant: SNACKBAR_VARIANTS.SUCCESS },
        )
        closeDialog()
      },
      onError: () => {
        enqueueSnackbar(t('vendors.messages.saveError'), { variant: SNACKBAR_VARIANTS.ERROR })
      },
    })
  }

  function resetPage() {
    setPage(1)
  }

  function renderCell(vendor, column) {
    if (column.key === 'fulfillmentType') {
      return (
        <Pill
          className={`border-transparent ${
            fulfillmentTypeClasses[vendor.fulfillmentType] || 'bg-neutral-bg text-ink-secondary'
          }`}
        >
          {t(`vendors.values.fulfillmentType.${vendor.fulfillmentType}`, {
            defaultValue: vendor.rawFulfillmentType || vendor.fulfillmentType,
          })}
        </Pill>
      )
    }
    if (column.key === 'status') {
      return (
        <Pill className={statusClasses[vendor.status]}>
          {t(`vendors.values.status.${vendor.status}`, {
            defaultValue: vendor.rawStatus || vendor.status,
          })}
        </Pill>
      )
    }
    if (column.key === 'actions') {
      return (
        <div className="flex items-center justify-center gap-1">
          <Tooltip title={t('vendors.actions.edit')}>
            <IconButton
              aria-label={t('vendors.actions.edit')}
              size="small"
              className="text-ink-muted"
              onClick={() => openEditDialog(vendor)}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('vendors.actions.deleteUnavailable')}>
            <span>
              <IconButton
                aria-label={t('vendors.actions.deleteUnavailable')}
                size="small"
                className="text-danger"
                disabled
              >
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      )
    }
    return vendor[column.key] || '-'
  }

  return (
    <OperationsPageShell
      header={
        <OperationsHeader
          title={t('vendors.list.title')}
          actions={
            <Button
              variant="contained"
              startIcon={<AddIcon fontSize="small" />}
              onClick={openCreateDialog}
            >
              {t('vendors.list.actions.create')}
            </Button>
          }
        />
      }
      toolbar={
        <OperationsToolbar>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[240px_170px_160px_170px_170px]">
            <TextField
              size="small"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                resetPage()
              }}
              placeholder={t('vendors.searchPlaceholder')}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon className="text-ink-muted" fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              size="small"
              value={code}
              onChange={(event) => {
                setCode(event.target.value)
                resetPage()
              }}
              placeholder="Vendor code"
            />
            <FormControl size="small">
              <Select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  resetPage()
                }}
              >
                <MenuItem value="all">All status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select
                value={fulfillmentType}
                onChange={(event) => {
                  setFulfillmentType(event.target.value)
                  resetPage()
                }}
              >
                <MenuItem value="all">All fulfillment</MenuItem>
                <MenuItem value="pod">POD</MenuItem>
                <MenuItem value="fbm">FBM</MenuItem>
                <MenuItem value="dropship">Dropship</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              value={providerKey}
              onChange={(event) => {
                setProviderKey(event.target.value)
                resetPage()
              }}
              placeholder="Provider key"
            />
          </div>
        </OperationsToolbar>
      }
      pagination={
        <OperationsPagination
          page={pagination.page}
          pageSize={pagination.limit}
          total={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize)
            setPage(1)
          }}
        />
      }
    >
      {isError ? (
        <div className="p-4 text-sm text-danger">{t('vendors.states.loadError')}</div>
      ) : (
        <OperationsTable
          columns={columns}
          rows={vendors}
          loading={isPending}
          getRowKey={(vendor) => vendor.id}
          renderCell={renderCell}
          minWidth="940px"
          emptyTitle={t('vendors.states.empty')}
        />
      )}
      <VendorFormDialog
        open={dialogState.open}
        mode={dialogState.mode}
        vendor={dialogState.vendor}
        t={t}
        isSubmitting={createVendorMutation.isPending || updateVendorMutation.isPending}
        onClose={closeDialog}
        onSubmit={handleSubmitVendor}
      />
    </OperationsPageShell>
  )
}
