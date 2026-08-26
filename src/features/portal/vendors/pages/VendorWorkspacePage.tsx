import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ApiOutlined,
  AppstoreOutlined,
  BlockOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { UploadFile } from 'antd'
import { Button, Modal, Space, Typography } from 'antd'

import { getGlobalPermissions } from '@/shared/auth/session'
import {
  FileUpload,
  MetricCard,
  SectionCard,
  UiTabLabel,
  UiTabs,
  useFeedbackToast,
} from '@/shared/ui'

import { listProductTypeGroups } from '../../catalog/api/catalogApi'
import {
  importVendorCostCenters,
  importVendorProducts,
  listVendorCostCenters,
  listVendorProducts,
  listVendors,
  type RecordStatus,
  type Vendor,
  type VendorCostCenter,
  type VendorProduct,
} from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'
import { VendorCostCenterEditorModal } from './VendorCostCenterEditorModal'
import { VendorEditorModal } from './VendorEditorModal'
import { VendorIntegrationModal } from './VendorIntegrationModal'
import { VendorProductEditorModal } from './VendorProductEditorModal'
import { VendorWorkspaceCostCenterDrawer } from './VendorWorkspaceCostCenterDrawer'
import styles from './VendorWorkspacePage.module.scss'
import { VendorWorkspaceProductsTabPage } from './VendorWorkspaceProductsTabPage'
import { VendorWorkspaceVendorsTabPage } from './VendorWorkspaceVendorsTabPage'

const PAGE_SIZE = 20
const ALL_PRODUCTS_VENDOR_ID = '__all'
const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024
const IMPORT_CSV_EXTENSIONS = ['.csv']
const PRODUCT_IMPORT_TEMPLATE_HEADERS = [
  'code',
  'name',
  'productTypeGroupCode',
  'minProductionDays',
  'maxProductionDays',
  'externalProductId',
  'baseCostAmount',
  'currency',
  'status',
] as const
const COST_CENTER_IMPORT_TEMPLATE_HEADERS = [
  'code',
  'name',
  'sku',
  'lngCode',
  'vendorSize',
  'vendorColor',
  'standardSize',
  'standardColor',
  'weight',
  'weightUnit',
  'width',
  'length',
  'height',
  'dimensionUnit',
  'baseCostAmount',
  'currency',
  'status',
] as const
const PRODUCT_IMPORT_SAMPLE_ROW = [
  'TP-SHIRT',
  'T-Shirt',
  'PTG-POD',
  '2',
  '5',
  'EXT-TSHIRT',
  '1200',
  'USD',
  'ACTIVE',
] as const
const COST_CENTER_IMPORT_SAMPLE_ROW = [
  'TC-100',
  'Cost center sample',
  'SKU-SHIRT',
  'LNG-SHIRT',
  'M',
  'White',
  'M',
  'White',
  '0.25',
  'kg',
  '10',
  '12',
  '0.5',
  'cm',
  '800',
  'USD',
  'ACTIVE',
] as const

const IMPORT_PREVIEW_LIMIT = 10

type CsvRecord = Record<string, string>
type ImportTarget =
  | { kind: 'product'; vendorId: string }
  | { kind: 'costCenter'; productId: string; vendorId: string; productName: string }
type ImportSummary = { total: number; created: number; failed: string[] }

type VendorManagementTab = 'vendors' | 'products'

const buildImportTemplate = (target: ImportTarget) => {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`

  if (target.kind === 'product') {
    return `${PRODUCT_IMPORT_TEMPLATE_HEADERS.join(',')}\n${PRODUCT_IMPORT_SAMPLE_ROW.map(quote).join(',')}`
  }

  return `${COST_CENTER_IMPORT_TEMPLATE_HEADERS.join(',')}\n${COST_CENTER_IMPORT_SAMPLE_ROW.map(quote).join(',')}`
}

const normalizeHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
const parseCsvLine = (line: string) => {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
        continue
      }
      inQuotes = !inQuotes
      continue
    }
    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }
    current += char
  }
  values.push(current)
  return values.map((value) => {
    const normalized = value.trim()
    if (normalized.startsWith('"') && normalized.endsWith('"')) {
      return normalized.slice(1, -1).replace(/""/g, '"')
    }
    return normalized
  })
}

const parseCsv = (text: string) => {
  const rows = text
    .replace('\uFEFF', '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(parseCsvLine)
    .map((row) => row.map((value) => value.trim()))
    .filter((row) => row.some((value) => value.length > 0))
  if (rows.length === 0) return []
  const [rawHeader, ...rawRows] = rows
  if (rawHeader.length === 0) return []
  const headers = rawHeader.map(normalizeHeader)
  return rawRows.map(
    (row) =>
      Object.fromEntries(
        headers.map((header, index) => [header, (row[index] ?? '').trim()]),
      ) as CsvRecord,
  )
}

const getField = (row: CsvRecord, keys: string[]) =>
  keys
    .map((rawKey) => row[normalizeHeader(rawKey)])
    .find((value) => value !== undefined && value.trim() !== '')

const parseStatus = (value: string | undefined): RecordStatus | undefined => {
  const normalized = (value ?? '').trim().toUpperCase()
  if (normalized === 'ACTIVE' || normalized === 'INACTIVE') return normalized
  return undefined
}

const parseIntegerField = (value: string | undefined) => {
  if (!value?.trim()) return undefined
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN
}
const parseDecimalField = (value: string | undefined) => {
  if (!value?.trim()) return undefined
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN
}
const hasTextValue = (value: string | undefined) => Boolean(value?.trim())
const appendImportFailure = (
  list: string[],
  rowNumber: number,
  reason: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) => {
  list.push(t('portal.vendors.import.rowError', { row: rowNumber, reason }))
}

const validateImportFile = (
  t: (key: string, options?: Record<string, unknown>) => string,
  file: File | undefined,
) => {
  if (!file) return t('portal.vendors.import.fileRequired')
  if (file.size > MAX_IMPORT_FILE_BYTES) return t('portal.vendors.import.fileTooLarge')
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  return IMPORT_CSV_EXTENSIONS.includes(extension) ? undefined : t('portal.vendors.import.fileType')
}

export const VendorWorkspacePage = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canWrite = getGlobalPermissions().includes('VENDORS:WRITE')
  const [tab, setTab] = useState<VendorManagementTab>('vendors')
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
  const [selectedProductForCostCenters, setSelectedProductForCostCenters] =
    useState<VendorProduct>()
  const [searchVendors, setSearchVendors] = useState('')
  const [searchProducts, setSearchProducts] = useState('')
  const [searchCostCenters, setSearchCostCenters] = useState('')
  const [vendorsPage, setVendorsPage] = useState(1)
  const [productsPage, setProductsPage] = useState(1)
  const [costCentersPage, setCostCentersPage] = useState(1)
  const [vendorStatus, setVendorStatus] = useState<RecordStatus>()
  const [productStatus, setProductStatus] = useState<RecordStatus>()
  const [productVendorFilter, setProductVendorFilter] = useState<string>()
  const [importTarget, setImportTarget] = useState<ImportTarget>()
  const [importFiles, setImportFiles] = useState<UploadFile[]>([])
  const [importPreviewRows, setImportPreviewRows] = useState<CsvRecord[]>([])
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<ImportSummary>()
  const [importError, setImportError] = useState('')
  const showFeedbackToast = useFeedbackToast()

  const closeEditor = () => {
    setEditor(undefined)
  }
  const closeEditorAndRefresh = () => {
    closeEditor()
    void queryClient.invalidateQueries({ queryKey: ['portal', 'vendors'] })
  }
  const closeCostCenterPanel = () => {
    setSelectedProductForCostCenters(undefined)
    setSearchCostCenters('')
    setCostCentersPage(1)
  }

  const closeImport = () => {
    setImportTarget(undefined)
    setImportFiles([])
    setImportPreviewRows([])
    setImportSummary(undefined)
    setImportError('')
    setImporting(false)
  }

  const downloadImportTemplate = () => {
    if (!importTarget) return

    const filename =
      importTarget.kind === 'product'
        ? 'vendor-product-import-template.csv'
        : 'vendor-cost-center-import-template.csv'
    const templateContent = buildImportTemplate(importTarget)
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    try {
      anchor.href = url
      anchor.download = filename
      anchor.target = '_blank'
      anchor.rel = 'noreferrer'
      document.body.appendChild(anchor)
      anchor.click()
    } finally {
      anchor.remove()
      URL.revokeObjectURL(url)
    }
  }

  const summaryVendorsParams = useMemo(() => ({ limit: 100, page: 1 }), [])
  const summaryVendors = useQuery({
    queryKey: vendorKeys.vendors(summaryVendorsParams),
    queryFn: () => listVendors(summaryVendorsParams),
    retry: false,
  })

  const vendorItems = useMemo(() => summaryVendors.data?.items ?? [], [summaryVendors.data?.items])
  const totalCount = summaryVendors.data?.pagination.total ?? vendorItems.length
  const activeCount = useMemo(
    () => vendorItems.filter((vendor) => vendor.status === 'ACTIVE').length,
    [vendorItems],
  )
  const integratedCount = useMemo(
    () =>
      vendorItems.filter((vendor) => vendor.providerKey && vendor.providerKey !== 'CUSTOM').length,
    [vendorItems],
  )

  const vendorParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      page: vendorsPage,
      q: searchVendors.trim() || undefined,
      status: vendorStatus,
    }),
    [vendorsPage, searchVendors, vendorStatus],
  )
  const vendors = useQuery({
    queryKey: vendorKeys.vendors(vendorParams),
    queryFn: () => listVendors(vendorParams),
    retry: false,
  })

  const productTypeGroups = useQuery({
    queryKey: ['portal', 'catalog', 'product-type-groups', 'all'],
    queryFn: () => listProductTypeGroups({ page: 1, limit: 500 }),
    enabled: importTarget?.kind === 'product',
    retry: false,
  })

  const resolveProductTypeGroupId = (row: CsvRecord) => {
    const groups = productTypeGroups.data?.items ?? []
    const directId = getField(row, ['producttypegroupid', 'productTypeGroupId'])
    if (directId && directId.length === 24) return directId

    const byCode = getField(row, [
      'producttypegroupcode',
      'producttypegroup',
      'groupcode',
      'ptgcode',
    ])
    if (byCode) {
      const found = groups.find((group) => group.code?.toLowerCase() === byCode.toLowerCase())
      if (found) return found.id
    }

    const byName = getField(row, ['producttypegroupname', 'groupname'])
    if (byName) {
      const found = groups.find((group) => group.name.toLowerCase() === byName.toLowerCase())
      return found?.id
    }

    return ''
  }

  const runProductImport = async (rows: CsvRecord[]): Promise<ImportSummary> => {
    if (!importTarget || importTarget.kind !== 'product') {
      throw new Error(t('portal.vendors.import.notReady'))
    }

    if (productTypeGroups.isLoading || productTypeGroups.isError) {
      throw new Error(t('portal.vendors.import.needProductTypeGroups'))
    }

    const importRows: Array<Record<string, string>> = []
    const failed: string[] = []

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2
      const code = getField(row, ['code']) ?? ''
      const name = getField(row, ['name']) ?? ''
      const productTypeGroupId = resolveProductTypeGroupId(row)
      const minProductionDaysValue = getField(row, ['minproductiondays'])
      const maxProductionDaysValue = getField(row, ['maxproductiondays'])
      const baseCostAmountValue = getField(row, ['basecostamount'])
      const statusValue = getField(row, ['status']) || ''
      const minProductionDays = parseIntegerField(minProductionDaysValue)
      const maxProductionDays = parseIntegerField(maxProductionDaysValue)
      const baseCostAmount = parseIntegerField(baseCostAmountValue)
      const status = statusValue ? parseStatus(statusValue) : undefined

      if (!code || !name) {
        appendImportFailure(failed, rowNumber, t('portal.vendors.import.requiredMissing'), t)
        continue
      }
      if (!productTypeGroupId) {
        appendImportFailure(
          failed,
          rowNumber,
          t('portal.vendors.import.productTypeGroupMissing'),
          t,
        )
        continue
      }
      if (hasTextValue(minProductionDaysValue) && Number.isNaN(minProductionDays)) {
        appendImportFailure(
          failed,
          rowNumber,
          t('portal.vendors.import.numberInvalid', {
            field: t('portal.vendors.minProductionDays'),
          }),
          t,
        )
        continue
      }
      if (hasTextValue(maxProductionDaysValue) && Number.isNaN(maxProductionDays)) {
        appendImportFailure(
          failed,
          rowNumber,
          t('portal.vendors.import.numberInvalid', {
            field: t('portal.vendors.maxProductionDays'),
          }),
          t,
        )
        continue
      }
      if (
        hasTextValue(minProductionDaysValue) &&
        hasTextValue(maxProductionDaysValue) &&
        minProductionDays != null &&
        maxProductionDays != null &&
        minProductionDays > maxProductionDays
      ) {
        appendImportFailure(failed, rowNumber, t('portal.vendors.productionRangeInvalid'), t)
        continue
      }
      if (hasTextValue(baseCostAmountValue) && Number.isNaN(baseCostAmount)) {
        appendImportFailure(
          failed,
          rowNumber,
          t('portal.vendors.import.numberInvalid', { field: t('portal.vendors.baseCostAmount') }),
          t,
        )
        continue
      }
      if (statusValue && !status) {
        appendImportFailure(failed, rowNumber, t('portal.vendors.import.invalidStatus'), t)
        continue
      }

      importRows.push({
        code,
        name,
        productTypeGroupId,
        externalProductId: getField(row, ['externalproductid']) || '',
        minProductionDays: minProductionDaysValue || '',
        maxProductionDays: maxProductionDaysValue || '',
        baseCostAmount: baseCostAmountValue || '',
        currency: (getField(row, ['currency']) || 'USD').toUpperCase(),
        status: statusValue || '',
      })
    }

    if (failed.length >= rows.length) {
      return { total: rows.length, created: 0, failed }
    }

    try {
      const summary = await importVendorProducts({
        vendorId: importTarget.vendorId,
        rows: importRows,
        dryRun: false,
      })
      return {
        total: rows.length,
        created: summary.created,
        failed: [...failed, ...summary.failed],
      }
    } catch (error) {
      appendImportFailure(
        failed,
        rows.length + 1,
        error instanceof Error ? error.message : t('portal.vendors.import.createFailed'),
        t,
      )
      return { total: rows.length, created: 0, failed }
    }
  }

  const runCostCenterImport = async (rows: CsvRecord[]): Promise<ImportSummary> => {
    if (!importTarget || importTarget.kind !== 'costCenter') {
      throw new Error(t('portal.vendors.import.notReady'))
    }

    const importRows: Array<Record<string, string>> = []
    const failed: string[] = []

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2
      const code = getField(row, ['code']) ?? ''
      const name = getField(row, ['name']) ?? ''
      const baseCostAmountValue = getField(row, ['basecostamount'])
      const weightValue = getField(row, ['weight'])
      const widthValue = getField(row, ['width'])
      const lengthValue = getField(row, ['length'])
      const heightValue = getField(row, ['height'])
      const statusValue = getField(row, ['status']) || ''
      const baseCostAmount = parseIntegerField(baseCostAmountValue)
      const weight = parseDecimalField(weightValue)
      const width = parseDecimalField(widthValue)
      const length = parseDecimalField(lengthValue)
      const height = parseDecimalField(heightValue)
      const status = statusValue ? parseStatus(statusValue) : undefined

      if (!code || !name) {
        appendImportFailure(failed, rowNumber, t('portal.vendors.import.requiredMissing'), t)
        continue
      }
      if (hasTextValue(baseCostAmountValue) && Number.isNaN(baseCostAmount)) {
        appendImportFailure(
          failed,
          rowNumber,
          t('portal.vendors.import.numberInvalid', { field: t('portal.vendors.baseCostAmount') }),
          t,
        )
        continue
      }
      if (hasTextValue(weightValue) && Number.isNaN(weight)) {
        appendImportFailure(
          failed,
          rowNumber,
          t('portal.vendors.import.numberInvalid', { field: t('portal.vendors.weight') }),
          t,
        )
        continue
      }
      if (hasTextValue(widthValue) && Number.isNaN(width)) {
        appendImportFailure(
          failed,
          rowNumber,
          t('portal.vendors.import.numberInvalid', { field: t('portal.vendors.width') }),
          t,
        )
        continue
      }
      if (hasTextValue(lengthValue) && Number.isNaN(length)) {
        appendImportFailure(
          failed,
          rowNumber,
          t('portal.vendors.import.numberInvalid', { field: t('portal.vendors.length') }),
          t,
        )
        continue
      }
      if (hasTextValue(heightValue) && Number.isNaN(height)) {
        appendImportFailure(
          failed,
          rowNumber,
          t('portal.vendors.import.numberInvalid', { field: t('portal.vendors.height') }),
          t,
        )
        continue
      }
      if (statusValue && !status) {
        appendImportFailure(failed, rowNumber, t('portal.vendors.import.invalidStatus'), t)
        continue
      }

      importRows.push({
        code,
        name,
        sku: getField(row, ['sku']) || '',
        lngCode: getField(row, ['lngcode']) || '',
        vendorSize: getField(row, ['vendorsize']) || '',
        vendorColor: getField(row, ['vendorcolor']) || '',
        standardSize: getField(row, ['standardsize']) || '',
        standardColor: getField(row, ['standardcolor']) || '',
        weight: weightValue || '',
        weightUnit: getField(row, ['weightunit']) || '',
        width: widthValue || '',
        length: lengthValue || '',
        height: heightValue || '',
        dimensionUnit: getField(row, ['dimensionunit']) || '',
        baseCostAmount: baseCostAmountValue || '',
        currency: getField(row, ['currency']) || 'USD',
        status: statusValue || '',
      })
    }

    if (importRows.length === 0) {
      return { total: rows.length, created: 0, failed }
    }

    try {
      const summary = await importVendorCostCenters(importTarget.productId, {
        rows: importRows,
        dryRun: false,
      })
      return {
        total: rows.length,
        created: summary.created,
        failed: [...failed, ...summary.failed],
      }
    } catch (error) {
      appendImportFailure(
        failed,
        rows.length + 1,
        error instanceof Error ? error.message : t('portal.vendors.import.createFailed'),
        t,
      )
      return { total: rows.length, created: 0, failed }
    }
  }

  const handleImport = async () => {
    if (!importTarget) return
    const importFile = (importFiles[0]?.originFileObj ?? importFiles[0]) as File | undefined
    const nextFileError = validateImportFile(t, importFile)
    if (nextFileError) {
      setImportError(nextFileError)
      return
    }

    setImportError('')
    setImportSummary(undefined)
    setImporting(true)

    try {
      const rows = parseCsv(await importFile!.text())
      if (rows.length === 0) throw new Error(t('portal.vendors.import.invalidCsv'))

      const summary =
        importTarget.kind === 'product'
          ? await runProductImport(rows)
          : await runCostCenterImport(rows)
      setImportSummary(summary)

      if (summary.created) {
        if (importTarget.kind === 'product') {
          void queryClient.invalidateQueries({
            queryKey: vendorKeys.productsRoot(importTarget.vendorId),
          })
        } else {
          void queryClient.invalidateQueries({
            queryKey: vendorKeys.costCentersRoot(importTarget.productId),
          })
          void queryClient.invalidateQueries({
            queryKey: vendorKeys.productsRoot(importTarget.vendorId),
          })
          if (selectedProductForCostCenters) {
            void queryClient.invalidateQueries({
              queryKey: vendorKeys.productsRoot(selectedProductForCostCenters.vendor?.id ?? ''),
            })
          }
        }
      }

      showFeedbackToast(
        summary.failed.length ? 'warning' : 'success',
        t('portal.vendors.import.result', {
          total: summary.total,
          created: summary.created,
          failed: summary.failed.length,
        }),
      )
      if (summary.failed.length === 0) closeImport()
    } catch (error) {
      const message = error instanceof Error ? error.message : t('portal.vendors.import.failed')
      setImportError(message)
      showFeedbackToast('error', t('portal.vendors.import.failed'), message)
    } finally {
      setImporting(false)
    }
  }

  const productParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      page: productsPage,
      q: searchProducts.trim() || undefined,
      status: productStatus,
      ...(productVendorFilter ? { vendorId: productVendorFilter } : {}),
    }),
    [productsPage, searchProducts, productStatus, productVendorFilter],
  )
  const products = useQuery({
    queryKey: vendorKeys.products(productVendorFilter ?? ALL_PRODUCTS_VENDOR_ID, productParams),
    queryFn: () => listVendorProducts(productParams),
    retry: false,
  })

  const costCenterParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      page: costCentersPage,
      q: searchCostCenters.trim() || undefined,
    }),
    [costCentersPage, searchCostCenters],
  )
  const costCenters = useQuery({
    enabled: Boolean(selectedProductForCostCenters),
    queryKey: selectedProductForCostCenters
      ? vendorKeys.costCenters(selectedProductForCostCenters.id, costCenterParams)
      : ['portal', 'vendors', 'cost-centers', 'disabled'],
    queryFn: () => listVendorCostCenters(selectedProductForCostCenters!.id, costCenterParams),
    retry: false,
  })

  const vendorFilterOptions = useMemo(
    () =>
      (vendors.data?.items ?? []).map((vendor) => ({
        value: vendor.id,
        label: `${vendor.code} � ${vendor.name}`,
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
          loading={summaryVendors.isLoading}
        />
        <MetricCard
          icon={<CheckCircleOutlined />}
          variant="success"
          label={t('portal.vendors.metrics.active', { defaultValue: 'Active Vendors' })}
          value={activeCount}
          loading={summaryVendors.isLoading}
        />
        <MetricCard
          icon={<ApiOutlined />}
          variant="info"
          label={t('portal.vendors.metrics.integrated', { defaultValue: 'API Integrated' })}
          value={integratedCount}
          loading={summaryVendors.isLoading}
        />
        <MetricCard
          icon={<BlockOutlined />}
          variant="warning"
          label={t('portal.vendors.metrics.types', { defaultValue: 'Fulfillment Types' })}
          value="POD, FBM, FBA"
          loading={summaryVendors.isLoading}
        />
      </div>

      <SectionCard>
        <UiTabs
          activeKey={tab}
          onChange={(value) => setTab(value as VendorManagementTab)}
          items={[
            {
              key: 'vendors',
              label: (
                <UiTabLabel count={vendors.data?.pagination.total}>
                  {t('portal.vendors.tabs.vendors')}
                </UiTabLabel>
              ),
            },
            {
              key: 'products',
              label: (
                <UiTabLabel count={products.data?.pagination.total}>
                  {t('portal.vendors.tabs.products')}
                </UiTabLabel>
              ),
            },
          ]}
        />
        {tab === 'vendors' ? (
          <VendorWorkspaceVendorsTabPage
            canWrite={canWrite}
            searchVendors={searchVendors}
            vendorStatus={vendorStatus}
            vendorsPage={vendorsPage}
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
            onVendorsPageChange={setVendorsPage}
            onAddVendor={() => setEditor({ kind: 'vendor' })}
            onAddProduct={(vendorId) => setEditor({ kind: 'product', vendorId })}
            onEditVendor={(vendor) => setEditor({ kind: 'vendor', item: vendor })}
            onOpenIntegration={(vendor) => setEditor({ kind: 'integration', vendor })}
          />
        ) : (
          <VendorWorkspaceProductsTabPage
            canWrite={canWrite}
            searchProducts={searchProducts}
            productStatus={productStatus}
            vendorFilter={productVendorFilter}
            productsPage={productsPage}
            products={products.data?.items}
            productsLoading={products.isLoading}
            productsTotal={products.data?.pagination.total}
            productsError={products.error}
            vendorFilterOptions={vendorFilterOptions}
            onSearchProductsChange={(value) => {
              setSearchProducts(value)
              setProductsPage(1)
            }}
            onVendorFilterChange={(value) => {
              setProductVendorFilter(value)
              setProductsPage(1)
            }}
            onProductStatusChange={(value) => {
              setProductStatus(value)
              setProductsPage(1)
            }}
            onProductsPageChange={setProductsPage}
            onAddProduct={(vendorId) => setEditor({ kind: 'product', vendorId })}
            onOpenProductImport={(vendorId) =>
              setImportTarget(vendorId ? { kind: 'product', vendorId } : undefined)
            }
            onEditProduct={(product) =>
              setEditor({ kind: 'product', item: product, vendorId: product.vendor?.id ?? '' })
            }
            onOpenCostCenters={(product) => {
              setSelectedProductForCostCenters(product)
              setSearchCostCenters('')
              setCostCentersPage(1)
            }}
          />
        )}
      </SectionCard>

      <VendorWorkspaceCostCenterDrawer
        open={Boolean(selectedProductForCostCenters)}
        product={selectedProductForCostCenters}
        canWrite={canWrite}
        searchCostCenters={searchCostCenters}
        costCentersPage={costCentersPage}
        costCenters={costCenters.data?.items}
        costCentersLoading={costCenters.isLoading}
        costCentersTotal={costCenters.data?.pagination.total}
        costCentersError={costCenters.error}
        onSearchCostCentersChange={(value) => {
          setSearchCostCenters(value)
          setCostCentersPage(1)
        }}
        onCostCentersPageChange={setCostCentersPage}
        onClose={closeCostCenterPanel}
        onAddCostCenter={(product) =>
          setEditor({
            kind: 'costCenter',
            productId: product.id,
            vendorId: product.vendor?.id ?? '',
          })
        }
        onOpenCostCenterImport={(product) =>
          setImportTarget({
            kind: 'costCenter',
            productId: product.id,
            vendorId: product.vendor?.id ?? '',
            productName: product.name,
          })
        }
        onEditCostCenter={(product, costCenter) =>
          setEditor({
            kind: 'costCenter',
            item: costCenter,
            productId: product.id,
            vendorId: product.vendor?.id ?? '',
          })
        }
      />

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
      {editor?.kind === 'costCenter' ? (
        <VendorCostCenterEditorModal
          item={editor.item}
          open
          productId={editor.productId}
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
      {importTarget ? (
        <Modal
          centered
          title={
            importTarget.kind === 'product'
              ? t('portal.vendors.importProducts')
              : t('portal.vendors.importCostCenters')
          }
          open
          destroyOnClose
          onCancel={closeImport}
          onOk={handleImport}
          okButtonProps={{
            loading: importing,
            disabled:
              !importFiles.length ||
              importing ||
              (importTarget.kind === 'product' &&
                (productTypeGroups.isLoading || productTypeGroups.isError)),
          }}
          okText={
            importing ? t('portal.vendors.import.importing') : t('portal.vendors.import.submit')
          }
          cancelText={t('portal.vendors.cancel')}
        >
          <Space className={styles.importModalBody} direction="vertical" size={12}>
            <Space size={8} wrap>
              <Button type="default" icon={<DownloadOutlined />} onClick={downloadImportTemplate}>
                {t('portal.vendors.import.downloadTemplate')}
              </Button>
              <FileUpload
                accept=".csv"
                title={t('portal.vendors.import.chooseFile')}
                description={t('portal.vendors.import.description')}
                maxCount={1}
                fileList={importFiles}
                onChange={async (info) => {
                  const nextFiles = info.fileList.slice(-1)
                  const selected = (nextFiles[0]?.originFileObj ?? nextFiles[0]) as File | undefined
                  const nextError = validateImportFile(t, selected)

                  const hydratePreview = async () => {
                    if (!selected) {
                      setImportPreviewRows([])
                      return
                    }

                    const fileRows = parseCsv(await selected.text())
                    setImportPreviewRows(fileRows.slice(0, IMPORT_PREVIEW_LIMIT))
                    if (!fileRows.length) {
                      setImportError(t('portal.vendors.import.invalidCsv'))
                    }
                  }

                  if (nextError) {
                    setImportFiles([])
                    setImportPreviewRows([])
                    setImportError(nextError)
                    return
                  }

                  setImportFiles(nextFiles)
                  setImportError('')
                  setImportSummary(undefined)
                  await hydratePreview()
                }}
              />
            </Space>
            {importTarget.kind === 'product' ? (
              <Typography.Text type="secondary">
                {t('portal.vendors.import.productTip')}
              </Typography.Text>
            ) : (
              <Typography.Text type="secondary">
                {t('portal.vendors.import.costCenterTip')}
              </Typography.Text>
            )}
            {importError ? <Typography.Text type="danger">{importError}</Typography.Text> : null}
            {importFiles.length ? (
              importPreviewRows.length ? (
                <>
                  <Typography.Text strong>
                    {t('portal.vendors.import.previewTitle', { limit: IMPORT_PREVIEW_LIMIT })}
                  </Typography.Text>
                  <ul className={styles.importPreviewList}>
                    {importPreviewRows.map((row, index) => (
                      <li key={row.code || String(index)}>
                        <Typography.Text type="secondary">{JSON.stringify(row)}</Typography.Text>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <Typography.Text type="secondary">
                  {t('portal.vendors.import.previewEmpty')}
                </Typography.Text>
              )
            ) : null}
            {importSummary ? (
              <>
                <Typography.Text strong>
                  {t('portal.vendors.import.summary', {
                    total: importSummary.total,
                    created: importSummary.created,
                    failed: importSummary.failed.length,
                  })}
                </Typography.Text>
                {importSummary.failed.length ? (
                  <ul className={styles.importPreviewList}>
                    {importSummary.failed.map((error) => (
                      <li key={error}>
                        <Typography.Text type="danger">{error}</Typography.Text>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : null}
          </Space>
        </Modal>
      ) : null}
    </section>
  )
}

export default VendorWorkspacePage
