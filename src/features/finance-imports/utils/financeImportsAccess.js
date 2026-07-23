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

export function getFinanceImportBatchActions(user, status) {
  return hasAllPermissions(user, ['FINANCE:WRITE']) && reprocessableStatuses.has(status)
    ? ['DETAILS', 'REPROCESS']
    : ['DETAILS']
}

export function getFinanceImportBatchSummary(batch = {}) {
  return {
    status: batch.status || 'PROCESSING',
    importedRows: Number(batch.validRows || 0),
    errorCount: Number(batch.errorCount || 0),
  }
}
