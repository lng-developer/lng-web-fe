import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import {
  ApiOutlined,
  AppstoreOutlined,
  BlockOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { hasAnyPermission } from '@/shared/auth/permissions'
import {
  MetricCard,
  SectionCard,
  useDebouncedValue,
  useFeedbackToast,
} from '@/shared/ui'

import {
  createProductTypeGroup,
  listProductTypeGroups,
  type ProductTypeGroupInput,
} from '../../catalog/api/catalogApi'
import {
  bulkAssignVendorMigrationProductTypeGroup,
  type RecordStatus,
  type Vendor,
  type VendorCostCenter,
  type VendorProduct,
} from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'
import { VendorCsvImportModal } from '../components/VendorCsvImportModal'
import type { ImportTarget } from '../components/vendorCsvUtils'
import {
  useVendorMetricsQuery,
  useVendorMigrationReviewQuery,
  useVendorProductsQuery,
  useVendorsQuery,
} from '../hooks'
import { VendorEditorModal } from './VendorEditorModal'
import { VendorIntegrationModal } from './VendorIntegrationModal'
import { VendorMigrationTabPage } from './VendorMigrationTabPage'
import { VendorProductEditorModal } from './VendorProductEditorModal'
import styles from './VendorWorkspacePage.module.scss'
import { VendorWorkspaceProductsTabPage } from './VendorWorkspaceProductsTabPage'
import { VendorWorkspaceVendorsTabPage } from './VendorWorkspaceVendorsTabPage'

const PAGE_SIZE = 20
const ALL_PRODUCTS_VENDOR_ID = '__all'

type VendorManagementTab = 'vendors' | 'products' | 'integrations' | 'migration'

export const VendorWorkspacePage = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canWrite = hasAnyPermission(['VENDORS:WRITE'], { globalOnly: true })
  const canCreateProductType = hasAnyPermission(['CATALOG:WRITE'], { globalOnly: true })
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: VendorManagementTab =
    tabParam === 'products' || tabParam === 'integrations' || tabParam === 'migration'
      ? tabParam
      : 'vendors'
  const [editor, setEditor] = useState<
    | { kind: 'vendor'; item?: Vendor }
    | { kind: 'product'; item?: VendorProduct; vendorId: string }
    | {
        kind: 'costCenter'
        item?: VendorCostCenter
        productId: string
        vendorId: string
      }
    | { kind: 'integration'; vendor: Vendor }
  >()
  const [searchVendors, setSearchVendors] = useState('')
  const [searchProducts, setSearchProducts] = useState('')
  const debouncedSearchVendors = useDebouncedValue(searchVendors, 250)
  const debouncedSearchProducts = useDebouncedValue(searchProducts, 250)

  const [migrationFilters, setMigrationFilters] = useState<{ vendorId?: string; q?: string }>({})
  const [vendorsPage, setVendorsPage] = useState(1)
  const [vendorsPageSize, setVendorsPageSize] = useState(PAGE_SIZE)
  const [productsPage, setProductsPage] = useState(1)
  const [productsPageSize, setProductsPageSize] = useState(PAGE_SIZE)
  const [migrationPage, setMigrationPage] = useState(1)
  const [migrationPageSize, setMigrationPageSize] = useState(PAGE_SIZE)
  const [vendorStatus, setVendorStatus] = useState<RecordStatus>()
  const [productStatus, setProductStatus] = useState<RecordStatus>()
  const [productVendorFilter, setProductVendorFilter] = useState<string>()
  const [productTypeGroupFilter, setProductTypeGroupFilter] = useState<string>()
  const [importTarget, setImportTarget] = useState<ImportTarget>()
  const showFeedbackToast = useFeedbackToast()

  const closeEditor = () => {
    setEditor(undefined)
  }
  const closeEditorAndRefresh = () => {
    if (editor?.kind === 'vendor') {
      void queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
    } else if (editor?.kind === 'product') {
      void queryClient.invalidateQueries({
        queryKey: vendorKeys.productsRoot(editor.vendorId || ALL_PRODUCTS_VENDOR_ID),
      })
      if (editor.vendorId && editor.vendorId !== ALL_PRODUCTS_VENDOR_ID) {
        void queryClient.invalidateQueries({
          queryKey: vendorKeys.productsRoot(ALL_PRODUCTS_VENDOR_ID),
        })
      }
    } else if (editor?.kind === 'integration') {
      void queryClient.invalidateQueries({ queryKey: vendorKeys.integration(editor.vendor.id) })
      void queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
    }
    closeEditor()
  }

  const {
    totalCount,
    activeCount,
    integratedCount,
    isLoading: isMetricsLoading,
  } = useVendorMetricsQuery()

  const vendorParams = useMemo(
    () => ({
      limit: vendorsPageSize,
      page: vendorsPage,
      q: debouncedSearchVendors.trim() || undefined,
      status: vendorStatus,
    }),
    [vendorsPage, vendorsPageSize, debouncedSearchVendors, vendorStatus],
  )
  const vendors = useVendorsQuery(vendorParams)

  const productTypeGroups = useQuery({
    queryKey: ['portal', 'catalog', 'product-type-groups', 'all'],
    queryFn: () => listProductTypeGroups({ page: 1, limit: 100 }),
    enabled: importTarget?.kind === 'product' || tab === 'migration' || tab === 'products',
    retry: false,
  })
  const migrationVendorOptions = useVendorsQuery(
    { page: 1, limit: 100 },
    { enabled: tab === 'migration' },
  )
  const migrationReviewParams = useMemo(
    () => ({ page: migrationPage, limit: migrationPageSize, ...migrationFilters }),
    [migrationFilters, migrationPage, migrationPageSize],
  )
  const migrationReview = useVendorMigrationReviewQuery(migrationReviewParams, {
    enabled: tab === 'migration',
  })
  const assignMigrationGroup = useMutation({
    mutationFn: bulkAssignVendorMigrationProductTypeGroup,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: vendorKeys.migrationReview({}) })
      showFeedbackToast(
        'success',
        t('portal.vendors.migration.assigned', { count: result.updated }),
      )
    },
  })
  const createMigrationProductType = useMutation({
    mutationFn: (input: ProductTypeGroupInput) => createProductTypeGroup(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['portal', 'catalog', 'product-type-groups'],
      })
    },
  })

  const productParams = useMemo(
    () => ({
      limit: productsPageSize,
      page: productsPage,
      q: debouncedSearchProducts.trim() || undefined,
      status: productStatus,
      productTypeGroupId: productTypeGroupFilter,
      ...(productVendorFilter ? { vendorId: productVendorFilter } : {}),
    }),
    [
      productsPage,
      productsPageSize,
      debouncedSearchProducts,
      productStatus,
      productTypeGroupFilter,
      productVendorFilter,
    ],
  )
  const products = useVendorProductsQuery(
    productVendorFilter ?? ALL_PRODUCTS_VENDOR_ID,
    productParams,
  )

  const vendorFilterOptions = useMemo(
    () =>
      (vendors.data?.items ?? []).map((vendor) => ({
        value: vendor.id,
        label: `${vendor.code} — ${vendor.name}`,
      })),
    [vendors.data?.items],
  )

  return (
    <section className={styles.page}>
      <div className={styles.metrics}>
        <MetricCard
          icon={<AppstoreOutlined />}
          variant="neutral"
          label={t('portal.vendors.metrics.total', { defaultValue: 'Total Vendors' })}
          value={totalCount}
          loading={isMetricsLoading}
        />
        <MetricCard
          icon={<CheckCircleOutlined />}
          variant="success"
          label={t('portal.vendors.metrics.active', { defaultValue: 'Active Vendors' })}
          value={activeCount}
          loading={isMetricsLoading}
        />
        <MetricCard
          icon={<ApiOutlined />}
          variant="info"
          label={t('portal.vendors.metrics.integrated', { defaultValue: 'API Integrated' })}
          value={integratedCount}
          loading={isMetricsLoading}
        />
        <MetricCard
          icon={<BlockOutlined />}
          variant="warning"
          label={t('portal.vendors.metrics.types', { defaultValue: 'Fulfillment Types' })}
          value="POD, FBM, FBA"
          loading={isMetricsLoading}
        />
      </div>

      <SectionCard>
        {tab === 'vendors' || tab === 'integrations' ? (
          <VendorWorkspaceVendorsTabPage
            canWrite={canWrite}
            integrationOnly={tab === 'integrations'}
            searchVendors={searchVendors}
            vendorStatus={vendorStatus}
            vendorsPage={vendorsPage}
            vendorsPageSize={vendorsPageSize}
            vendors={vendors.data?.items}
            vendorsLoading={vendors.isLoading}
            vendorsTotal={vendors.data?.pagination.total}
            vendorsError={vendors.error}
            onSearchVendorsChange={(value) => {
              setSearchVendors(value)
              setVendorsPage(1)
            }}
            onVendorStatusChange={(value) => {
              setVendorStatus(value)
              setVendorsPage(1)
            }}
            onVendorsPageChange={(page, pageSize) => {
              setVendorsPage(page)
              setVendorsPageSize(pageSize)
            }}
            onAddVendor={() => setEditor({ kind: 'vendor' })}
            onEditVendor={(vendor) => setEditor({ kind: 'vendor', item: vendor })}
            onOpenIntegration={(vendor) => setEditor({ kind: 'integration', vendor })}
          />
        ) : tab === 'products' ? (
          <VendorWorkspaceProductsTabPage
            canWrite={canWrite}
            searchProducts={searchProducts}
            productStatus={productStatus}
            vendorFilter={productVendorFilter}
            productTypeGroupFilter={productTypeGroupFilter}
            productsPage={productsPage}
            productsPageSize={productsPageSize}
            products={products.data?.items}
            productsLoading={products.isLoading}
            productsTotal={products.data?.pagination.total}
            productsError={products.error}
            vendorFilterOptions={vendorFilterOptions}
            productTypeGroupOptions={(productTypeGroups.data?.items ?? []).map((group) => ({
              value: group.id,
              label: `${group.name} · ${group.code}`,
            }))}
            onSearchProductsChange={(value) => {
              setSearchProducts(value)
              setProductsPage(1)
            }}
            onVendorFilterChange={(value) => {
              setProductVendorFilter(value)
              setProductsPage(1)
            }}
            onProductTypeGroupFilterChange={(value) => {
              setProductTypeGroupFilter(value)
              setProductsPage(1)
            }}
            onProductStatusChange={(value) => {
              setProductStatus(value)
              setProductsPage(1)
            }}
            onProductsPageChange={(page, pageSize) => {
              setProductsPage(page)
              setProductsPageSize(pageSize)
            }}
            onAddProduct={(vendorId) => setEditor({ kind: 'product', vendorId })}
            onOpenProductImport={(vendorId) =>
              setImportTarget(vendorId ? { kind: 'product', vendorId } : undefined)
            }
            onEditProduct={(product) =>
              setEditor({ kind: 'product', item: product, vendorId: product.vendor?.id ?? '' })
            }
          />
        ) : (
          <VendorMigrationTabPage
            canWrite={canWrite}
            rows={migrationReview.data?.items ?? []}
            loading={migrationReview.isLoading}
            error={migrationReview.error}
            currentPage={migrationPage}
            currentPageSize={migrationPageSize}
            total={migrationReview.data?.pagination.total ?? 0}
            productTypeGroups={productTypeGroups.data?.items ?? []}
            pending={migrationReview.data?.summary.pending ?? 0}
            orphaned={migrationReview.data?.summary.orphaned ?? 0}
            onPageChange={(page, pageSize) => {
              setMigrationPage(page)
              setMigrationPageSize(pageSize)
            }}
            assigning={assignMigrationGroup.isPending}
            canCreateProductType={canCreateProductType}
            creatingProductType={createMigrationProductType.isPending}
            onCreateProductType={(input) => createMigrationProductType.mutateAsync(input)}
            onAssign={(productIds, productTypeGroupId) =>
              assignMigrationGroup.mutate({ productIds, productTypeGroupId })
            }
            filters={migrationFilters}
            vendorOptions={(migrationVendorOptions.data?.items ?? []).map((vendor) => ({
              value: vendor.id,
              label: `${vendor.code} — ${vendor.name}`,
            }))}
            onFiltersChange={setMigrationFilters}
          />
        )}
      </SectionCard>

      {editor?.kind === 'vendor' ? (
        <VendorEditorModal
          item={editor.item}
          open
          onCancel={closeEditor}
          onSaved={closeEditorAndRefresh}
        />
      ) : null}
      {editor?.kind === 'product' ? (
        <VendorProductEditorModal
          item={editor.item}
          open
          vendorId={editor.vendorId}
          onCancel={closeEditor}
          onSaved={closeEditorAndRefresh}
        />
      ) : null}
      {editor?.kind === 'integration' ? (
        <VendorIntegrationModal
          open
          vendorId={editor.vendor.id}
          onCancel={closeEditor}
          onSaved={closeEditorAndRefresh}
        />
      ) : null}
      <VendorCsvImportModal
        target={importTarget}
        onClose={() => setImportTarget(undefined)}
        productTypeGroups={productTypeGroups.data?.items}
        productTypeGroupsLoading={productTypeGroups.isLoading}
        productTypeGroupsError={productTypeGroups.isError}
      />
    </section>
  )
}

export default VendorWorkspacePage
