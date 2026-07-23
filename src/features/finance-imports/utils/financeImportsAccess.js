import { hasAllPermissions } from '../../auth/utils/authz.js'

const reprocessableStatuses = new Set(['FAILED', 'PARTIAL_FAILED'])

export function getFinanceImportDefaults(sourceType) {
  return {
    sourceType,
    shopId: '',
    salesChannelCode: '',
    marketplaceCode: '',
    sourceRef: '',
    dryRun: false,
    file: null,
  }
}

export function getFinanceImportFileValues(values, file) {
  return {
    ...values,
    file,
    sourceRef: values.sourceRef || file?.name || '',
  }
}

export function getFinanceImportBatchActions(user, status) {
  return hasAllPermissions(user, ['FINANCE:WRITE']) && reprocessableStatuses.has(status)
    ? ['DETAILS', 'REPROCESS']
    : ['DETAILS']
}

export function getFinanceImportBatchSummary(batch) {
  return {
    hasBatch: Boolean(batch),
    status: batch?.status || null,
    importedRows: Number(batch?.validRows || 0),
    errorCount: Number(batch?.errorCount || 0),
  }
}

export function getFinanceImportedDataQuery(filters, page, limit) {
  return Object.fromEntries(
    Object.entries({ ...filters, page, limit }).filter(([, value]) => value !== '' && value !== undefined),
  )
}

export function getFinanceImportedDataActions() {
  return ['DETAILS']
}
