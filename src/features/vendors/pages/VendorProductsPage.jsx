import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import SearchIcon from '@mui/icons-material/Search'
import {
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'

import OverflowTooltip from '@/components/common/OverflowTooltip'
import StatusSwitch from '@/components/common/StatusSwitch'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { useDebounce } from '@/hooks/useDebounce'

import {
  useCreateVendorCostCenterMutation,
  useCreateVendorProductMutation,
  useUpdateVendorCostCenterMutation,
  useUpdateVendorProductMutation,
} from '../api/vendors.mutations'
import {
  useProductTypeGroupsQuery,
  useVendorCostCentersQuery,
  useVendorProductsQuery,
  useVendorsQuery,
} from '../api/vendors.queries'
import CostCenterDrawer from '../components/CostCenterDrawer'
import CostCenterFormDialog from '../components/CostCenterFormDialog'
import VendorProductFormDialog from '../components/VendorProductFormDialog'
import { getVendorProductPages } from '../utils/vendorsDisplay'

const pageSizeOptions = [10, 20, 50]
const VENDOR_PRODUCT_PAGE_SIZE = 10
const VENDOR_PRODUCT_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
}

const vendorToneClasses = {
  alpha: 'bg-danger text-white',
  beta: 'bg-secondary text-white',
  gamma: 'bg-teal text-white',
  delta: 'bg-warning text-white',
  epsilon: 'bg-success-strong text-white',
}

const imageToneClasses = {
  neutral: 'bg-neutral-bg text-ink-muted',
  navy: 'bg-info-bg text-info-strong',
  dark: 'bg-ink-secondary text-surface',
  linen: 'bg-warning-bg text-warning-deep',
  black: 'bg-ink text-surface',
}

function ProductImage({ alt, src, tone }) {
  if (src) {
    return (
      <img src={src} alt={alt} className="size-16 rounded-lg border border-border object-cover" />
    )
  }

  return (
    <div
      className={`flex size-16 items-center justify-center rounded-lg ${
        imageToneClasses[tone] || imageToneClasses.neutral
      }`}
    >
      <ImageOutlinedIcon fontSize="small" />
    </div>
  )
}

function VendorBadge({ tone, children }) {
  return (
    <span
      className={`inline-flex h-6 min-w-14 items-center justify-center rounded-full px-3 text-xs font-bold ${
        vendorToneClasses[tone] || 'bg-neutral-bg text-ink-secondary'
      }`}
    >
      {children}
    </span>
  )
}

function ProductsPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  t,
}) {
  const pages = getVendorProductPages(page, totalPages)

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Typography variant="body2" className="mr-2 text-xs text-ink-muted">
        {t('vendors.products.pagination.total', { total })}
      </Typography>
      <IconButton
        aria-label={t('vendors.products.pagination.previous')}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="h-9 w-9 rounded-lg border border-border bg-surface"
      >
        <KeyboardArrowLeftIcon fontSize="small" />
      </IconButton>
      {pages.map((pageNumber, index) =>
        pageNumber === '...' ? (
          <span key={`ellipsis-${index}`} className="px-1 text-xs text-ink-muted">
            ...
          </span>
        ) : (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            className={`h-9 min-w-9 rounded-lg border px-2 text-xs font-semibold ${
              page === pageNumber
                ? 'border-primary bg-primary-light text-primary'
                : 'border-border bg-surface text-ink-secondary'
            }`}
          >
            {pageNumber}
          </button>
        ),
      )}
      <IconButton
        aria-label={t('vendors.products.pagination.next')}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="h-9 w-9 rounded-lg border border-border bg-surface"
      >
        <KeyboardArrowRightIcon fontSize="small" />
      </IconButton>
      <FormControl size="small" className="w-28">
        <Select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          IconComponent={KeyboardArrowDownIcon}
          className="h-9 rounded-lg bg-surface text-xs text-ink-secondary"
          inputProps={{ 'aria-label': t('vendors.products.pagination.pageSize') }}
        >
          {pageSizeOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {t('vendors.products.pagination.pageSizeValue', { size: option })}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  )
}

function getProductTypeOptions(product, productTypeOptions) {
  if (!product.productTypeGroupId) {
    return productTypeOptions
  }

  if (productTypeOptions.some((option) => option.id === product.productTypeGroupId)) {
    return productTypeOptions
  }

  return [
    {
      id: product.productTypeGroupId,
      label: product.productType || product.productTypeGroupId,
      status: product.rawStatus,
    },
    ...productTypeOptions,
  ]
}

function isActiveProductTypeOption(option) {
  return !option.status || String(option.status).toLowerCase() === VENDOR_PRODUCT_STATUSES.ACTIVE
}

export default function VendorProductsPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [search, setSearch] = useState('')
  const [productCode, setProductCode] = useState('')
  const [externalProductId, setExternalProductId] = useState('')
  const [vendorFilter, setVendorFilter] = useState('all')
  const [productTypeFilter, setProductTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(VENDOR_PRODUCT_PAGE_SIZE)
  const [productDialogState, setProductDialogState] = useState({
    mode: 'create',
    open: false,
    product: null,
  })
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [costCenterDialogState, setCostCenterDialogState] = useState({
    mode: 'create',
    open: false,
    costCenter: null,
  })
  const debouncedSearch = useDebounce(search, 300)
  const vendorQuery = useVendorsQuery({ page: 1, limit: 100 })
  const productTypesQuery = useProductTypeGroupsQuery({ page: 1, limit: 100 })
  const createProductMutation = useCreateVendorProductMutation()
  const updateProductMutation = useUpdateVendorProductMutation()
  const createCostCenterMutation = useCreateVendorCostCenterMutation(selectedProduct?.id)
  const updateCostCenterMutation = useUpdateVendorCostCenterMutation(selectedProduct?.id)
  const productQuery = useVendorProductsQuery({
    page,
    limit: pageSize,
    search: debouncedSearch,
    code: productCode,
    externalProductId,
    vendorId: vendorFilter === 'all' ? '' : vendorFilter,
    productTypeGroupId: productTypeFilter === 'all' ? '' : productTypeFilter,
    status: statusFilter === 'all' ? '' : statusFilter,
  })
  const costCenterQuery = useVendorCostCentersQuery(selectedProduct?.id, { page: 1, limit: 100 })
  const products = productQuery.data?.items || []
  const pagination = productQuery.data?.pagination || { page, limit: pageSize, total: 0 }
  const totalPages = Math.max(Math.ceil(pagination.total / pagination.limit), 1)
  const vendors = vendorQuery.data?.items || []
  const productTypeOptions = (productTypesQuery.data || []).filter(isActiveProductTypeOption)
  const costCenters = costCenterQuery.data?.items || []

  function resetPage() {
    setPage(1)
  }

  function handlePageSizeChange(nextPageSize) {
    setPageSize(nextPageSize)
    resetPage()
  }

  function handleUpdateProduct(productId, payload) {
    updateProductMutation.mutate(
      { productId, payload },
      {
        onError: () => {
          enqueueSnackbar(t('vendors.messages.saveError'), { variant: SNACKBAR_VARIANTS.ERROR })
        },
      },
    )
  }

  function openCreateProductDialog() {
    setProductDialogState({ mode: 'create', open: true, product: null })
  }

  function openEditProductDialog(product) {
    setProductDialogState({ mode: 'edit', open: true, product })
  }

  function closeProductDialog() {
    setProductDialogState((current) => ({ ...current, open: false }))
  }

  function handleSubmitProduct(payload) {
    const isEdit = productDialogState.mode === 'edit'
    const mutation = isEdit ? updateProductMutation : createProductMutation
    const mutationPayload = isEdit ? { productId: productDialogState.product.id, payload } : payload

    mutation.mutate(mutationPayload, {
      onSuccess: () => {
        enqueueSnackbar(
          t(
            isEdit
              ? 'vendors.messages.updateProductSuccess'
              : 'vendors.messages.createProductSuccess',
          ),
          { variant: SNACKBAR_VARIANTS.SUCCESS },
        )
        closeProductDialog()
      },
      onError: () => {
        enqueueSnackbar(t('vendors.messages.saveError'), { variant: SNACKBAR_VARIANTS.ERROR })
      },
    })
  }

  function openCostCenters(product) {
    setSelectedProduct(product)
  }

  function closeCostCenters() {
    setSelectedProduct(null)
    setCostCenterDialogState((current) => ({ ...current, open: false }))
  }

  function openCreateCostCenterDialog() {
    setCostCenterDialogState({ mode: 'create', open: true, costCenter: null })
  }

  function openEditCostCenterDialog(costCenter) {
    setCostCenterDialogState({ mode: 'edit', open: true, costCenter })
  }

  function closeCostCenterDialog() {
    setCostCenterDialogState((current) => ({ ...current, open: false }))
  }

  function handleSubmitCostCenter(payload) {
    const isEdit = costCenterDialogState.mode === 'edit'
    const mutation = isEdit ? updateCostCenterMutation : createCostCenterMutation
    const mutationPayload = isEdit
      ? { costCenterId: costCenterDialogState.costCenter.id, payload }
      : payload

    mutation.mutate(mutationPayload, {
      onSuccess: () => {
        enqueueSnackbar(
          t(
            isEdit
              ? 'vendors.messages.updateCostCenterSuccess'
              : 'vendors.messages.createCostCenterSuccess',
          ),
          { variant: SNACKBAR_VARIANTS.SUCCESS },
        )
        closeCostCenterDialog()
      },
      onError: () => {
        enqueueSnackbar(t('vendors.messages.saveError'), { variant: SNACKBAR_VARIANTS.ERROR })
      },
    })
  }

  function handleToggleCostCenterStatus(costCenter, status) {
    updateCostCenterMutation.mutate(
      { costCenterId: costCenter.id, payload: { status } },
      {
        onError: () => {
          enqueueSnackbar(t('vendors.messages.saveError'), { variant: SNACKBAR_VARIANTS.ERROR })
        },
      },
    )
  }

  return (
    <div className="flex min-h-full flex-col bg-surface p-2">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <Typography component="h4" variant="h5" className="text-xl font-bold text-ink-strong">
          {t('vendors.products.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon fontSize="small" />}
          onClick={openCreateProductDialog}
          className="h-10 rounded-lg px-4 text-sm font-bold"
        >
          {t('vendors.products.actions.create')}
        </Button>
      </header>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <TextField
            size="small"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              resetPage()
            }}
            placeholder={t('vendors.searchPlaceholder')}
            className="w-full max-w-72 bg-surface"
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
              value={vendorFilter}
              onChange={(event) => {
                setVendorFilter(event.target.value)
                resetPage()
              }}
              displayEmpty
              renderValue={(value) =>
                value === 'all'
                  ? t('vendors.products.filters.vendor')
                  : vendors.find((vendor) => vendor.id === value)?.name
              }
              startAdornment={
                <FilterListOutlinedIcon className="mr-1 text-ink-secondary" fontSize="small" />
              }
              className="h-10 rounded-lg bg-surface text-sm text-ink-secondary"
              inputProps={{ 'aria-label': t('vendors.products.filters.vendor') }}
            >
              <MenuItem value="all">{t('vendors.products.filters.allVendors')}</MenuItem>
              {vendors.map((vendor) => (
                <MenuItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            value={productCode}
            onChange={(event) => {
              setProductCode(event.target.value)
              resetPage()
            }}
            placeholder="Product code"
            className="w-full max-w-40 bg-surface"
          />
          <TextField
            size="small"
            value={externalProductId}
            onChange={(event) => {
              setExternalProductId(event.target.value)
              resetPage()
            }}
            placeholder="External ID"
            className="w-full max-w-40 bg-surface"
          />
          <FormControl size="small" className="w-44">
            <Select
              value={productTypeFilter}
              onChange={(event) => {
                setProductTypeFilter(event.target.value)
                resetPage()
              }}
              displayEmpty
              renderValue={(value) =>
                value === 'all'
                  ? t('vendors.products.columns.productType')
                  : productTypeOptions.find((option) => option.id === value)?.label || value
              }
              className="h-10 rounded-lg bg-surface text-sm text-ink-secondary"
            >
              <MenuItem value="all">{t('vendors.products.columns.productType')}</MenuItem>
              {productTypeOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" className="w-36">
            <Select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                resetPage()
              }}
              displayEmpty
              className="h-10 rounded-lg bg-surface text-sm text-ink-secondary"
            >
              <MenuItem value="all">All status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </div>

        <ProductsPagination
          page={page}
          pageSize={pageSize}
          total={pagination.total}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          t={t}
        />
      </div>

      <section className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="min-w-full border-collapse">
          <thead className="bg-surface-subtle">
            <tr>
              {[
                'index',
                'image',
                'name',
                'productId',
                'costCenter',
                'vendor',
                'productType',
                'status',
              ].map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="h-12 whitespace-nowrap px-4 text-left text-[11px] font-bold uppercase text-ink-muted"
                >
                  {t(`vendors.products.columns.${column}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {productQuery.isPending
              ? Array.from({ length: 5 }, (_item, index) => (
                  <tr key={index} className="border-t border-border bg-surface">
                    {Array.from({ length: 8 }, (_cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-4">
                        <Skeleton variant="text" height={20} />
                      </td>
                    ))}
                  </tr>
                ))
              : null}
            {!productQuery.isPending && productQuery.isError ? (
              <tr className="border-t border-border bg-surface">
                <td colSpan={8} className="px-4 py-4 text-sm text-danger">
                  {t('vendors.states.loadError')}
                </td>
              </tr>
            ) : null}
            {!productQuery.isPending && !productQuery.isError && products.length === 0 ? (
              <tr className="border-t border-border bg-surface">
                <td colSpan={8} className="px-4 py-4 text-sm text-ink-muted">
                  {t('vendors.states.empty')}
                </td>
              </tr>
            ) : null}
            {!productQuery.isPending && !productQuery.isError
              ? products.map((product, index) => {
                  const active = product.status === VENDOR_PRODUCT_STATUSES.ACTIVE
                  const rowProductTypeOptions = getProductTypeOptions(product, productTypeOptions)

                  return (
                    <tr key={product.id} className="border-t border-border bg-surface">
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-ink-secondary">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <ProductImage
                          alt={product.name}
                          src={product.imageUrl}
                          tone={product.imageTone}
                        />
                      </td>
                      <td className="min-w-64 px-4 py-4">
                        <div className="flex min-w-0 items-start gap-2">
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-bold text-ink-strong">
                              {product.name}
                            </span>
                            <span className="truncate text-xs text-ink-muted">
                              {product.vendorName}
                            </span>
                          </div>
                          <Tooltip title={t('vendors.actions.edit')}>
                            <IconButton
                              size="small"
                              aria-label={t('vendors.actions.edit')}
                              onClick={() => openEditProductDialog(product)}
                              className="mt-0.5 !p-1 text-ink-muted"
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-ink-secondary">
                        {product.productId}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => openCostCenters(product)}
                          className="h-7 rounded-md border-border px-3 text-xs font-medium text-ink-secondary"
                        >
                          {t('vendors.products.actions.viewCostCenter')}
                        </Button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <VendorBadge tone={product.vendorTone}>{product.vendorCode}</VendorBadge>
                      </td>
                      <td className="max-w-52 whitespace-nowrap px-4 py-4">
                        <FormControl size="small" className="w-52 max-w-full">
                          <Select
                            value={product.productTypeGroupId || ''}
                            onChange={(event) =>
                              handleUpdateProduct(product.id, {
                                productTypeGroupId: event.target.value,
                              })
                            }
                            IconComponent={KeyboardArrowDownIcon}
                            disabled={
                              productTypesQuery.isError || rowProductTypeOptions.length === 0
                            }
                            className="h-9 rounded-lg bg-surface text-sm text-ink-secondary"
                            displayEmpty
                            renderValue={(value) => {
                              const label =
                                rowProductTypeOptions.find((option) => option.id === value)
                                  ?.label || t('vendors.products.values.noProductType')

                              return <OverflowTooltip text={label} className="w-full" />
                            }}
                            inputProps={{
                              'aria-label': t('vendors.products.columns.productType'),
                            }}
                            sx={{
                              '& .MuiSelect-select': {
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              },
                            }}
                          >
                            {!product.productTypeGroupId ? (
                              <MenuItem value="" disabled>
                                {t('vendors.products.values.noProductType')}
                              </MenuItem>
                            ) : null}
                            {rowProductTypeOptions.map((option) => (
                              <MenuItem key={option.id} value={option.id}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <StatusSwitch
                          checked={active}
                          disabled={updateProductMutation.isPending}
                          ariaLabel={t('vendors.products.actions.toggleStatus')}
                          onChange={() =>
                            handleUpdateProduct(product.id, {
                              status: active ? 'INACTIVE' : 'ACTIVE',
                            })
                          }
                        />
                      </td>
                    </tr>
                  )
                })
              : null}
          </tbody>
        </table>
      </section>
      <VendorProductFormDialog
        open={productDialogState.open}
        mode={productDialogState.mode}
        product={productDialogState.product}
        vendors={vendors}
        productTypeOptions={productTypeOptions}
        t={t}
        isSubmitting={createProductMutation.isPending || updateProductMutation.isPending}
        onClose={closeProductDialog}
        onSubmit={handleSubmitProduct}
      />
      <CostCenterDrawer
        open={Boolean(selectedProduct)}
        product={selectedProduct}
        costCenters={costCenters}
        isLoading={costCenterQuery.isPending}
        isError={costCenterQuery.isError}
        updating={updateCostCenterMutation.isPending}
        t={t}
        onClose={closeCostCenters}
        onAdd={openCreateCostCenterDialog}
        onEdit={openEditCostCenterDialog}
        onToggleStatus={handleToggleCostCenterStatus}
      />
      <CostCenterFormDialog
        open={costCenterDialogState.open}
        mode={costCenterDialogState.mode}
        costCenter={costCenterDialogState.costCenter}
        t={t}
        isSubmitting={createCostCenterMutation.isPending || updateCostCenterMutation.isPending}
        onClose={closeCostCenterDialog}
        onSubmit={handleSubmitCostCenter}
      />
    </div>
  )
}
