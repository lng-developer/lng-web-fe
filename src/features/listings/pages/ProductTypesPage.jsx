import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import {
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'

import StatusSwitch from '@/components/common/StatusSwitch'
import { OperationsHeader } from '@/components/operations'

import {
  useCreateProductTypeGroupMutation,
  useUpdateProductTypeGroupMutation,
} from '../api/listings.mutations'
import { useCatalogProductTypeGroupsQuery } from '../api/listings.queries'
import ProductTypeDialog from '../components/dialogs/ProductTypeDialog'
import { buildProductTypeGroupPayload } from '../utils/listingsApi'

const initialProductTypeValues = {
  id: '',
  code: '',
  name: '',
  sortOrder: '',
  status: 'ACTIVE',
}

function DebouncedTextField({ value, onDebouncedChange, delay = 300, ...props }) {
  const [inputValue, setInputValue] = useState(value)
  const timerRef = useRef(null)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  function handleChange(event) {
    const nextValue = event.target.value

    setInputValue(nextValue)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onDebouncedChange(nextValue), delay)
  }

  return <TextField {...props} value={inputValue} onChange={handleChange} />
}

function canSubmitProductType(values, mode) {
  if (!values.name) return false
  return mode === 'edit' ? true : Boolean(values.code)
}

export default function ProductTypesPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState({ mode: 'create', open: false })
  const [values, setValues] = useState(initialProductTypeValues)
  const productTypeGroupsQuery = useCatalogProductTypeGroupsQuery({
    page,
    limit: 5,
    search,
    status,
  })
  const createProductTypeGroupMutation = useCreateProductTypeGroupMutation()
  const updateProductTypeGroupMutation = useUpdateProductTypeGroupMutation()
  const groups = productTypeGroupsQuery.data?.items || []
  const pagination = productTypeGroupsQuery.data?.pagination || { page: 1, limit: 5, total: 0 }
  const pageCount = Math.max(Math.ceil(pagination.total / pagination.limit), 1)
  const isSubmitting =
    createProductTypeGroupMutation.isPending || updateProductTypeGroupMutation.isPending

  function openCreateDialog() {
    setDialog({ mode: 'create', open: true })
    setValues(initialProductTypeValues)
  }

  function openEditDialog(group) {
    setDialog({ mode: 'edit', open: true })
    setValues({
      id: group.id,
      code: group.code,
      name: group.name,
      sortOrder: group.sortOrder || '',
      status: group.status || 'ACTIVE',
    })
  }

  function closeDialog() {
    setDialog((current) => ({ ...current, open: false }))
  }

  async function handleSubmit(nextValues = values) {
    if (!canSubmitProductType(nextValues, dialog.mode)) {
      enqueueSnackbar(t('listings.messages.required'), { variant: 'warning' })
      return
    }

    try {
      if (dialog.mode === 'edit') {
        await updateProductTypeGroupMutation.mutateAsync({
          groupId: nextValues.id,
          payload: buildProductTypeGroupPayload(nextValues, { mode: 'update' }),
        })
      } else {
        await createProductTypeGroupMutation.mutateAsync(buildProductTypeGroupPayload(nextValues))
      }
      enqueueSnackbar(
        t('listings.catalogSetup.messages.productTypeSaved', { defaultValue: 'Product type saved' }),
        { variant: 'success' },
      )
      closeDialog()
    } catch (error) {
      enqueueSnackbar(
        error.message ||
          t('listings.catalogSetup.messages.productTypeSaveFailed', {
            defaultValue: 'Could not save product type',
          }),
        { variant: 'error' },
      )
    }
  }

  async function handleToggle(group) {
    try {
      await updateProductTypeGroupMutation.mutateAsync({
        groupId: group.id,
        payload: { status: group.isActive ? 'INACTIVE' : 'ACTIVE' },
      })
    } catch (error) {
      enqueueSnackbar(error.message || t('listings.messages.saveFailed'), { variant: 'error' })
    }
  }

  return (
    <div className="min-h-full bg-page px-4 pt-0 pb-3">
      <OperationsHeader
        title={t('listings.catalogSetup.productTypes.title', { defaultValue: 'Product types' })}
      />
      <section className="mt-3 grid items-stretch gap-3">
        <div className="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div className="flex min-h-20 flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <Typography component="h2" className="font-bold text-ink-strong">
                {t('listings.catalogSetup.productTypes.title', { defaultValue: 'Product types' })}
              </Typography>
              <Typography variant="caption" className="text-ink-muted">
                {t('listings.catalogSetup.productTypes.description', {
                  defaultValue:
                    'Define the internal product family used by mapping, listings, and vendor matching.',
                })}
              </Typography>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip title={t('listings.actions.refresh')}>
                <IconButton
                  size="small"
                  aria-label={t('listings.actions.refresh')}
                  onClick={() => productTypeGroupsQuery.refetch()}
                  className="h-8 w-8 rounded-lg border border-border"
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip
                title={t('listings.catalogSetup.productTypes.add', {
                  defaultValue: 'Create product type',
                })}
              >
                <IconButton
                  size="small"
                  aria-label={t('listings.catalogSetup.productTypes.add', {
                    defaultValue: 'Create product type',
                  })}
                  onClick={openCreateDialog}
                  className="h-8 w-8 rounded-lg border border-border text-primary"
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <DebouncedTextField
              size="small"
              value={search}
              onDebouncedChange={(nextValue) => {
                setSearch(nextValue)
                setPage(1)
              }}
              placeholder={t('listings.catalogSetup.productTypes.search', {
                defaultValue: 'Search code or name...',
              })}
              className="min-w-56 flex-1 bg-surface"
              slotProps={{
                input: {
                  className: 'h-10 rounded-lg text-sm',
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon className="text-ink-muted" fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <FormControl size="small" className="w-36">
              <Select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  setPage(1)
                }}
                IconComponent={KeyboardArrowDownIcon}
                className="h-10 rounded-lg bg-surface text-sm text-ink-secondary"
              >
                <MenuItem value="all">
                  {t('listings.catalogSetup.status.all', { defaultValue: 'All status' })}
                </MenuItem>
                <MenuItem value="ACTIVE">{t('listings.values.status.active')}</MenuItem>
                <MenuItem value="INACTIVE">{t('listings.values.status.inactive')}</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="min-w-[560px] w-full border-collapse">
              <thead className="bg-surface-subtle">
                <tr>
                  {['code', 'name', 'sort', 'active', 'actions'].map((column) => (
                    <th
                      key={column}
                      scope="col"
                      className="h-10 whitespace-nowrap px-4 text-left text-[11px] font-bold text-ink-muted"
                    >
                      {t(`listings.catalogSetup.columns.${column}`, {
                        defaultValue:
                          {
                            code: 'Code',
                            name: 'Name',
                            sort: 'Sort',
                            active: 'Active',
                            actions: 'Actions',
                          }[column] || column,
                      })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productTypeGroupsQuery.isPending ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-ink-muted">
                      {t('listings.catalogSetup.productTypes.loading', {
                        defaultValue: 'Loading product types...',
                      })}
                    </td>
                  </tr>
                ) : groups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-ink-muted">
                      {t('listings.catalogSetup.productTypes.empty', {
                        defaultValue: 'No product types found',
                      })}
                    </td>
                  </tr>
                ) : (
                  groups.map((group) => (
                    <tr key={group.id} className="border-t border-border">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-ink">
                        {group.code || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-secondary">{group.name || '-'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">
                        {group.sortOrder}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusSwitch
                          checked={group.isActive}
                          disabled={updateProductTypeGroupMutation.isPending}
                          ariaLabel={t('listings.catalogSetup.productTypes.toggle', {
                            defaultValue: 'Toggle product type status',
                          })}
                          onChange={() => handleToggle(group)}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Tooltip title={t('listings.actions.edit')}>
                          <IconButton
                            size="small"
                            aria-label={t('listings.actions.edit')}
                            onClick={() => openEditDialog(group)}
                            className="h-8 w-8 rounded-lg border border-border text-ink-secondary"
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <footer className="flex justify-center border-t border-border px-4 py-3">
            <Pagination size="small" count={pageCount} page={page} onChange={(_event, value) => setPage(value)} />
          </footer>
        </div>
      </section>
      <ProductTypeDialog
        key={`${dialog.open}-${dialog.mode}-${values.id || 'new'}`}
        mode={dialog.mode}
        open={dialog.open}
        values={values}
        isSubmitting={isSubmitting}
        onClose={closeDialog}
        onSubmit={handleSubmit}
        t={t}
      />
    </div>
  )
}
