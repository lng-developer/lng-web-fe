import type { ProductTypeGroup } from '../../catalog/api/catalogApi'
import { importVendorCostCenters, importVendorProducts, type RecordStatus } from '../api/vendorApi'

export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024
export const IMPORT_CSV_EXTENSIONS = ['.csv']

export const PRODUCT_IMPORT_TEMPLATE_HEADERS = [
  'code',
  'name',
  'productTypeGroupCode',
  'minProductionDays',
  'maxProductionDays',
  'externalProductId',
  'baseCostAmount',
  'currency',
  'domesticEconomyAmount',
  'domesticAdditionalAmount',
  'internationalEconomyAmount',
  'internationalAdditionalAmount',
  'priorityEconomyAmount',
  'priorityAdditionalAmount',
  'importTaxAmount',
  'embroideryAmount',
  'twoSidedPrintAmount',
  'twoPositionPrintAmount',
  'status',
] as const

export const COST_CENTER_IMPORT_TEMPLATE_HEADERS = [
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

export const PRODUCT_IMPORT_SAMPLE_ROW = [
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

export const COST_CENTER_IMPORT_SAMPLE_ROW = [
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
  '450',
  '150',
  '800',
  '300',
  '1200',
  '400',
  '0',
  '0',
  '150',
  '150',
  'ACTIVE',
] as const

export const IMPORT_PREVIEW_LIMIT = 10

export type CsvRecord = Record<string, string>

export type ImportTarget =
  | { kind: 'product'; vendorId: string }
  | { kind: 'costCenter'; productId: string; vendorId: string; productName: string }

export type ImportSummary = { total: number; created: number; failed: string[] }

export type TranslateFn = (key: string, options?: Record<string, unknown>) => string

export const buildImportTemplate = (target: ImportTarget) => {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`

  if (target.kind === 'product') {
    return `${PRODUCT_IMPORT_TEMPLATE_HEADERS.join(',')}\n${PRODUCT_IMPORT_SAMPLE_ROW.map(quote).join(',')}`
  }

  return `${COST_CENTER_IMPORT_TEMPLATE_HEADERS.join(',')}\n${COST_CENTER_IMPORT_SAMPLE_ROW.map(quote).join(',')}`
}

export const downloadImportTemplate = (target: ImportTarget) => {
  const filename =
    target.kind === 'product'
      ? 'vendor-product-import-template.csv'
      : 'vendor-cost-center-import-template.csv'
  const templateContent = buildImportTemplate(target)
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

export const normalizeHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

export const parseCsvLine = (line: string) => {
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

export const parseCsv = (text: string): CsvRecord[] => {
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

export const getField = (row: CsvRecord, keys: string[]) =>
  keys
    .map((rawKey) => row[normalizeHeader(rawKey)])
    .find((value) => value !== undefined && value.trim() !== '')

export const parseStatus = (value: string | undefined): RecordStatus | undefined => {
  const normalized = (value ?? '').trim().toUpperCase()
  if (normalized === 'ACTIVE' || normalized === 'INACTIVE') return normalized
  return undefined
}

export const parseIntegerField = (value: string | undefined) => {
  if (!value?.trim()) return undefined
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN
}

export const parseDecimalField = (value: string | undefined) => {
  if (!value?.trim()) return undefined
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN
}

export const hasTextValue = (value: string | undefined) => Boolean(value?.trim())

export const appendImportFailure = (
  list: string[],
  rowNumber: number,
  reason: string,
  t: TranslateFn,
) => {
  list.push(t('portal.vendors.import.rowError', { row: rowNumber, reason }))
}

export const validateImportFile = (t: TranslateFn, file: File | undefined) => {
  if (!file) return t('portal.vendors.import.fileRequired')
  if (file.size > MAX_IMPORT_FILE_BYTES) return t('portal.vendors.import.fileTooLarge')
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  return IMPORT_CSV_EXTENSIONS.includes(extension) ? undefined : t('portal.vendors.import.fileType')
}

export const resolveProductTypeGroupId = (row: CsvRecord, groups: ProductTypeGroup[]) => {
  const directId = getField(row, ['producttypegroupid', 'productTypeGroupId'])
  if (directId && directId.length === 24) return directId

  const byCode = getField(row, ['producttypegroupcode', 'producttypegroup', 'groupcode', 'ptgcode'])
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

export async function runProductImport({
  importTarget,
  rows,
  productTypeGroups,
  t,
}: {
  importTarget: { kind: 'product'; vendorId: string }
  rows: CsvRecord[]
  productTypeGroups: ProductTypeGroup[]
  t: TranslateFn
}): Promise<ImportSummary> {
  const importRows: Array<Record<string, string>> = []
  const failed: string[] = []

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2
    const code = getField(row, ['code']) ?? ''
    const name = getField(row, ['name']) ?? ''
    const productTypeGroupId = resolveProductTypeGroupId(row, productTypeGroups)
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
      appendImportFailure(failed, rowNumber, t('portal.vendors.import.productTypeGroupMissing'), t)
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

export async function runCostCenterImport({
  importTarget,
  rows,
  t,
}: {
  importTarget: { kind: 'costCenter'; productId: string; vendorId: string; productName: string }
  rows: CsvRecord[]
  t: TranslateFn
}): Promise<ImportSummary> {
  const importRows: Array<Record<string, unknown>> = []
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
    const feeValues = Object.fromEntries(
      [
        'domesticEconomyAmount',
        'domesticAdditionalAmount',
        'internationalEconomyAmount',
        'internationalAdditionalAmount',
        'priorityEconomyAmount',
        'priorityAdditionalAmount',
        'importTaxAmount',
        'embroideryAmount',
        'twoSidedPrintAmount',
        'twoPositionPrintAmount',
      ].map((key) => [key, getField(row, [key]) || '']),
    )
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
      domesticShipping: {
        economyAmount: feeValues.domesticEconomyAmount,
        additionalAmount: feeValues.domesticAdditionalAmount,
      },
      internationalShipping: {
        economyAmount: feeValues.internationalEconomyAmount,
        additionalAmount: feeValues.internationalAdditionalAmount,
      },
      priorityShipping: {
        economyAmount: feeValues.priorityEconomyAmount,
        additionalAmount: feeValues.priorityAdditionalAmount,
      },
      importTaxAmount: feeValues.importTaxAmount,
      additionalCosts: {
        embroideryAmount: feeValues.embroideryAmount,
        twoSidedPrintAmount: feeValues.twoSidedPrintAmount,
        twoPositionPrintAmount: feeValues.twoPositionPrintAmount,
      },
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
