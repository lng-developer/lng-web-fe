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
import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import {
  useCreateInternalTemplateMutation,
  useUpdateInternalTemplateMutation,
} from '../api/listings.mutations'
import {
  useCatalogInternalTemplatesQuery,
  useListingProductTypesQuery,
} from '../api/listings.queries'
import InternalTemplateDialog from '../components/dialogs/InternalTemplateDialog'
import {
  buildInternalTemplatePayload,
  mapInternalTemplateResponse,
  unwrapApiData,
} from '../utils/listingsApi'

const initialValues = {
  id: '',
  code: '',
  name: '',
  description: '',
  productTypeGroupId: '',
  requiresPsd: true,
  status: 'ACTIVE',
  requiredFields: [],
  artworkSlots: [],
  designAssets: [],
}

function DebouncedTextField({ value, onDebouncedChange, delay = 300, ...props }) {
  const [inputValue, setInputValue] = useState(value)
  const timerRef = useRef(null)
  useEffect(() => () => clearTimeout(timerRef.current), [])
  return (
    <TextField
      {...props}
      value={inputValue}
      onChange={(event) => {
        const nextValue = event.target.value
        setInputValue(nextValue)
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => onDebouncedChange(nextValue), delay)
      }}
    />
  )
}

function toFormValues(template = {}) {
  return {
    id: template.id || '',
    code: template.code || '',
    name: template.name || '',
    description: template.description || '',
    productTypeGroupId: template.productTypeGroupId || '',
    requiresPsd: template.requiresPsd !== false,
    status: template.status || 'ACTIVE',
    requiredFields: template.requiredFields || [],
    artworkSlots: template.artworkSlots || [],
    designAssets: template.designAssets || [],
  }
}

export default function InternalTemplatesPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [productType, setProductType] = useState('all')
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState({ mode: 'create', open: false })
  const [values, setValues] = useState(initialValues)
  const [detailLoading, setDetailLoading] = useState(false)
  const productTypesQuery = useListingProductTypesQuery({ limit: 100, status: 'ACTIVE' })
  const templatesQuery = useCatalogInternalTemplatesQuery({
    page,
    limit: 5,
    search,
    status,
    productTypeGroupId: productType,
  })
  const createMutation = useCreateInternalTemplateMutation()
  const updateMutation = useUpdateInternalTemplateMutation()
  const templates = templatesQuery.data?.items || []
  const pagination = templatesQuery.data?.pagination || { page: 1, limit: 5, total: 0 }
  const pageCount = Math.max(Math.ceil(pagination.total / pagination.limit), 1)
  const isSubmitting = createMutation.isPending || updateMutation.isPending || detailLoading
  const closeDialog = () => {
    setDialog((current) => ({ ...current, open: false }))
    setDetailLoading(false)
  }
  const openCreateDialog = () => {
    setDialog({ mode: 'create', open: true })
    setValues(initialValues)
    setDetailLoading(false)
  }
  async function openEditDialog(template) {
    let nextValues = toFormValues(template)
    setDetailLoading(true)
    try {
      const detail = await apiClient
        .get(ENDPOINTS.CATALOG.INTERNAL_TEMPLATE(template.id))
        .then(unwrapApiData)
        .then(mapInternalTemplateResponse)
      nextValues = toFormValues(detail)
    } catch (error) {
      enqueueSnackbar(
        error.message ||
          t('listings.catalogSetup.messages.templateLoadFailed', {
            defaultValue: 'Could not load template detail',
          }),
        { variant: 'error' },
      )
    } finally {
      setValues(nextValues)
      setDialog({ mode: 'edit', open: true })
      setDetailLoading(false)
    }
  }
  async function submit(nextValues = values) {
    if (
      !nextValues.name ||
      !nextValues.productTypeGroupId ||
      (dialog.mode !== 'edit' && !nextValues.code)
    ) {
      enqueueSnackbar(t('listings.messages.required'), { variant: 'warning' })
      return
    }
    try {
      if (dialog.mode === 'edit')
        await updateMutation.mutateAsync({
          templateId: nextValues.id,
          payload: buildInternalTemplatePayload(nextValues, { mode: 'update' }),
        })
      else await createMutation.mutateAsync(buildInternalTemplatePayload(nextValues))
      enqueueSnackbar(
        t('listings.catalogSetup.messages.templateSaved', {
          defaultValue: 'Internal template saved',
        }),
        { variant: 'success' },
      )
      closeDialog()
    } catch (error) {
      enqueueSnackbar(
        error.message ||
          t('listings.catalogSetup.messages.templateSaveFailed', {
            defaultValue: 'Could not save internal template',
          }),
        { variant: 'error' },
      )
    }
  }
  async function toggle(template) {
    try {
      await updateMutation.mutateAsync({
        templateId: template.id,
        payload: { status: template.isActive ? 'INACTIVE' : 'ACTIVE' },
      })
    } catch (error) {
      enqueueSnackbar(error.message || t('listings.messages.saveFailed'), { variant: 'error' })
    }
  }
  return (
    <div className="min-h-full bg-page px-4 pt-0 pb-3">
      <OperationsHeader
        title={t('listings.catalogSetup.templates.title', { defaultValue: 'Internal templates' })}
      />
      <section className="mt-3 grid items-stretch gap-3">
        <div className="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div className="flex min-h-20 flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <Typography component="h2" className="font-bold text-ink-strong">
                {t('listings.catalogSetup.templates.title', { defaultValue: 'Internal templates' })}
              </Typography>
              <Typography variant="caption" className="text-ink-muted">
                {t('listings.catalogSetup.templates.description', {
                  defaultValue:
                    'Attach listings to the internal template that defines customer inputs and artwork slots.',
                })}
              </Typography>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip title={t('listings.actions.refresh')}>
                <IconButton
                  size="small"
                  aria-label={t('listings.actions.refresh')}
                  onClick={() => templatesQuery.refetch()}
                  className="h-8 w-8 rounded-lg border border-border"
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip
                title={t('listings.catalogSetup.templates.add', {
                  defaultValue: 'Create internal template',
                })}
              >
                <IconButton
                  size="small"
                  aria-label={t('listings.catalogSetup.templates.add', {
                    defaultValue: 'Create internal template',
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
              placeholder={t('listings.catalogSetup.templates.search', {
                defaultValue: 'Search template...',
              })}
              className="min-w-52 flex-1 bg-surface"
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
            <FormControl size="small" className="w-44">
              <Select
                value={productType}
                onChange={(event) => {
                  setProductType(event.target.value)
                  setPage(1)
                }}
                IconComponent={KeyboardArrowDownIcon}
                className="h-10 rounded-lg bg-surface text-sm text-ink-secondary"
              >
                <MenuItem value="all">
                  {t('listings.catalogSetup.productTypes.all', {
                    defaultValue: 'All product types',
                  })}
                </MenuItem>
                {(productTypesQuery.data || []).map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
            <table className="min-w-[720px] w-full border-collapse">
              <thead className="bg-surface-subtle">
                <tr>
                  {[
                    'template',
                    'productType',
                    'inputs',
                    'artwork',
                    'assets',
                    'active',
                    'actions',
                  ].map((column) => (
                    <th
                      key={column}
                      scope="col"
                      className="h-10 whitespace-nowrap px-4 text-left text-[11px] font-bold text-ink-muted"
                    >
                      {t(`listings.catalogSetup.columns.${column}`, {
                        defaultValue:
                          {
                            template: 'Template',
                            productType: 'Product type',
                            inputs: 'Inputs',
                            artwork: 'Artwork',
                            assets: 'Assets',
                            active: 'Active',
                            actions: 'Actions',
                          }[column] || column,
                      })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {templatesQuery.isPending ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-ink-muted">
                      {t('listings.catalogSetup.templates.loading', {
                        defaultValue: 'Loading templates...',
                      })}
                    </td>
                  </tr>
                ) : templates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-ink-muted">
                      {t('listings.catalogSetup.templates.empty', {
                        defaultValue: 'No templates found',
                      })}
                    </td>
                  </tr>
                ) : (
                  templates.map((template) => (
                    <tr key={template.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="max-w-56 truncate text-sm font-bold text-ink">
                          {template.name || '-'}
                        </div>
                        <div className="max-w-56 truncate text-xs text-ink-muted">
                          {template.code || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-secondary">
                        {template.productType || t('listings.values.common.noData')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">
                        {template.requiredFieldCount}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">
                        {template.artworkSlotCount}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">
                        {template.designAssetCount}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusSwitch
                          checked={template.isActive}
                          disabled={updateMutation.isPending}
                          ariaLabel={t('listings.catalogSetup.templates.toggle', {
                            defaultValue: 'Toggle internal template status',
                          })}
                          onChange={() => toggle(template)}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Tooltip title={t('listings.actions.edit')}>
                          <IconButton
                            size="small"
                            aria-label={t('listings.actions.edit')}
                            onClick={() => openEditDialog(template)}
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
            <Pagination
              size="small"
              count={pageCount}
              page={page}
              onChange={(_event, value) => setPage(value)}
            />
          </footer>
        </div>
      </section>
      <InternalTemplateDialog
        key={`${dialog.open}-${dialog.mode}-${values.id || 'new'}`}
        mode={dialog.mode}
        open={dialog.open}
        values={values}
        productTypes={productTypesQuery.data || []}
        isSubmitting={isSubmitting}
        onClose={closeDialog}
        onSubmit={submit}
        t={t}
      />
    </div>
  )
}
