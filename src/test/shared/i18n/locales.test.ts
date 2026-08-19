import { describe, expect, it } from 'vitest'

import foundationDashboardSource from '@/features/foundation/OperationsDashboardPage.tsx?raw'
import monitoringDashboardSource from '@/features/monitoring/pages/MonitoringDashboardPage.tsx?raw'
import listingDetailSource from '@/features/portal/catalog/components/ListingDetailPanel.tsx?raw'
import listingQcActionsSource from '@/features/portal/catalog/components/ListingQcActions.tsx?raw'
import listingVariantCardSource from '@/features/portal/catalog/components/ListingVariantCard.tsx?raw'
import catalogListingSource from '@/features/portal/catalog/pages/CatalogListingWorkbenchPage.tsx?raw'
import listingVariantManagerSource from '@/features/portal/catalog/pages/ListingVariantManager.tsx?raw'
import importIssueQueueSource from '@/features/portal/integrations/pages/ImportIssueQueue.tsx?raw'
import importJobPanelSource from '@/features/portal/integrations/pages/ImportJobPanel.tsx?raw'
import integrationWorkbenchSource from '@/features/portal/integrations/pages/IntegrationWorkbenchPage.tsx?raw'
import issueResolutionModalSource from '@/features/portal/integrations/pages/IssueResolutionModal.tsx?raw'
import en from '@/shared/i18n/locales/en/common.json'
import vi from '@/shared/i18n/locales/vi/common.json'

function flatten(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key

    return entry && typeof entry === 'object' && !Array.isArray(entry)
      ? flatten(entry as Record<string, unknown>, path)
      : path
  })
}

describe('foundation locales', () => {
  it('keeps Vietnamese and English keys in parity', () => {
    expect(flatten(vi).sort()).toEqual(flatten(en).sort())
  })

  it('contains every foundation key', () => {
    expect(flatten(vi)).toEqual(
      expect.arrayContaining([
        'app.name',
        'language.vi',
        'language.en',
        'foundation.eyebrow',
        'foundation.title',
        'foundation.description',
        'foundation.sections.controls',
        'foundation.status.operational',
        'foundation.empty.title',
        'foundation.portalDashboard.value',
        'foundation.portalDashboard.share',
        'foundation.portalDashboard.percentValue',
        'foundation.portalDashboard.metricAriaLabel',
        'shell.navigation.primary',
        'theme.light',
        'theme.dark',
        'theme.system',
        'errors.unexpected',
        'notFound.title',
        'notFound.backHome',
        'hrOperations.title',
        'hrOperations.schedule.title',
        'hrOperations.attendance.title',
        'hrOperations.requests.title',
        'hrOperations.payroll.title',
        'hrOperations.overview.title',
      ]),
    )
  })

  it('contains every Portal Integration workbench key in both locales', () => {
    const requiredKeys = [
      'shell.navigation.integrations',
      'shell.groups.portalOperations',
      'portal.integrations.title',
      'portal.integrations.description',
      'portal.integrations.filters',
      'portal.integrations.shop',
      'portal.integrations.allShops',
      'portal.integrations.allSources',
      'portal.integrations.allStatuses',
      'portal.integrations.dateRange',
      'portal.integrations.retry',
      'portal.integrations.cancel',
      'portal.integrations.jobs.createdAt',
      'portal.integrations.jobs.source',
      'portal.integrations.jobs.status',
      'portal.integrations.jobs.counts',
      'portal.integrations.jobs.imported',
      'portal.integrations.jobs.skipped',
      'portal.integrations.jobs.failed',
      'portal.integrations.jobs.unavailable',
      'portal.integrations.statuses.PENDING',
      'portal.integrations.statuses.PARSING',
      'portal.integrations.statuses.IMPORTING',
      'portal.integrations.statuses.COMPLETED',
      'portal.integrations.statuses.PARTIAL_FAILED',
      'portal.integrations.statuses.FAILED',
      'portal.integrations.statuses.CANCELLED',
      'portal.integrations.upload.action',
      'portal.integrations.upload.success',
      'portal.integrations.upload.title',
      'portal.integrations.upload.source',
      'portal.integrations.upload.amazon',
      'portal.integrations.upload.etsy',
      'portal.integrations.upload.marketplace',
      'portal.integrations.upload.marketplaceRequired',
      'portal.integrations.upload.shopRequired',
      'portal.integrations.upload.shopConnection',
      'portal.integrations.upload.externalAccount',
      'portal.integrations.upload.file',
      'portal.integrations.upload.fileTitle',
      'portal.integrations.upload.fileDescription',
      'portal.integrations.upload.fileRequired',
      'portal.integrations.upload.fileTooLarge',
      'portal.integrations.upload.fileType',
      'portal.integrations.upload.failed',
      'portal.integrations.upload.submit',
      'portal.integrations.panel.title',
      'portal.integrations.panel.summary',
      'portal.integrations.panel.imported',
      'portal.integrations.panel.failed',
      'portal.integrations.panel.started',
      'portal.integrations.panel.finished',
      'portal.integrations.panel.issues',
      'portal.integrations.panel.rawRecords',
      'portal.integrations.panel.unavailable',
      'portal.integrations.panel.issuesUnavailable',
      'portal.integrations.panel.rawRecordsUnavailable',
      'portal.integrations.panel.retry',
      'portal.integrations.panel.retryQueued',
      'portal.integrations.panel.retryFailed',
      'portal.integrations.panel.confirmTitle',
      'portal.integrations.panel.confirmRetry',
      'portal.integrations.panel.confirmDescription',
      'portal.integrations.issues.title',
      'portal.integrations.issues.filters',
      'portal.integrations.issues.severity',
      'portal.integrations.issues.type',
      'portal.integrations.issues.reference',
      'portal.integrations.issues.message',
      'portal.integrations.issues.status',
      'portal.integrations.issues.actions',
      'portal.integrations.issues.resolve',
      'portal.integrations.issues.unavailable',
      'portal.integrations.issues.allShops',
      'portal.integrations.issues.allSources',
      'portal.integrations.issues.allSeverities',
      'portal.integrations.issues.allStatuses',
      'portal.integrations.issues.allTypes',
      'portal.integrations.issues.externalOrderId',
      'portal.integrations.issues.externalItemId',
      'portal.integrations.raw.row',
      'portal.integrations.raw.reference',
      'portal.integrations.raw.normalizeStatus',
      'portal.integrations.raw.importStatus',
      'portal.integrations.raw.postImportStatus',
      'portal.integrations.resolution.title',
      'portal.integrations.resolution.outcome',
      'portal.integrations.resolution.note',
      'portal.integrations.resolution.noteRequired',
      'portal.integrations.resolution.save',
      'portal.integrations.resolution.saved',
      'portal.integrations.resolution.discard',
      'portal.integrations.resolution.discardTitle',
      'portal.integrations.resolution.discardDescription',
      'portal.integrations.sources.MANUAL_EXCEL',
      'portal.integrations.sources.AMAZON_EXTENSION_REPORT',
      'portal.integrations.severities.INFO',
      'portal.integrations.severities.WARNING',
      'portal.integrations.severities.ERROR',
      'portal.integrations.severities.CRITICAL',
      'portal.integrations.issueStatuses.OPEN',
      'portal.integrations.issueStatuses.RESOLVED',
      'portal.integrations.issueStatuses.IGNORED',
      'portal.integrations.issueTypes.NORMALIZE_FAILED',
      'portal.integrations.issueTypes.SHOP_RESOLVE_FAILED',
      'portal.integrations.issueTypes.ADDRESS_VALIDATION_FAILED',
      'portal.integrations.issueTypes.ORDER_IMPORT_FAILED',
      'portal.integrations.issueTypes.MAPPING_RECHECK_FAILED',
      'portal.integrations.issueTypes.CUSTOMIZATION_CREATE_FAILED',
      'portal.integrations.issueTypes.CUSTOMIZATION_MISMATCH',
      'portal.integrations.issueTypes.DUPLICATE_RECORD',
      'portal.integrations.issueTypes.MISSING_REQUIRED_FIELD',
      'portal.integrations.issueTypes.INVALID_FILE_FORMAT',
      'portal.integrations.issueTypes.UNSUPPORTED_FILE_TYPE',
      'portal.integrations.recordStatuses.PENDING',
      'portal.integrations.recordStatuses.NORMALIZED',
      'portal.integrations.recordStatuses.IMPORTED',
      'portal.integrations.recordStatuses.FAILED',
      'portal.integrations.recordStatuses.SKIPPED',
      'portal.integrations.recordStatuses.QUEUED',
      'portal.integrations.recordStatuses.PROCESSING',
      'portal.integrations.recordStatuses.COMPLETED',
      'portal.integrations.issues.shopFilter',
      'portal.integrations.issues.sourceFilter',
      'portal.integrations.issues.severityFilter',
      'portal.integrations.issues.statusFilter',
      'portal.integrations.issues.typeFilter',
      'portal.integrations.issues.resolveLabel',
      'portal.integrations.panel.retryIssues',
      'portal.integrations.panel.retryRawRecords',
      'portal.integrations.resolution.outcomes.RESOLVED',
      'portal.integrations.resolution.outcomes.IGNORED',
    ]

    expect(flatten(en)).toEqual(expect.arrayContaining(requiredKeys))
    expect(flatten(vi)).toEqual(expect.arrayContaining(requiredKeys))
  })

  it('contains every Mapping UI key in both locales', () => {
    const requiredKeys = [
      'mapping.actions.edit',
      'mapping.actions.openRuleTab',
      'mapping.age.over24h',
      'mapping.age.over3d',
      'mapping.age.today',
      'mapping.pages.workbenchDesc',
      'mapping.sections.ruleFields',
      'mapping.sections.ruleMetadata',
      'mapping.states.noCandidates',
      'mapping.summary.ambiguous',
      'mapping.summary.blocked',
      'mapping.summary.confirmed',
      'mapping.summary.ready',
    ]

    expect(flatten(en)).toEqual(expect.arrayContaining(requiredKeys))
    expect(flatten(vi)).toEqual(expect.arrayContaining(requiredKeys))
  })

  it('contains every Vendor workspace key in both locales', () => {
    const requiredKeys = [
      'costCenterActions',
      'costCenters',
      'discard',
      'importCostCenters',
      'importProducts',
      'manageCostCenters',
      'productCostCenters',
      'productsTabActions',
      'sectionAuth',
      'sectionConnection',
      'sectionFulfillment',
      'sectionIdentity',
      'sectionStatus',
      'sla',
      'tabs.products',
      'tabs.vendors',
      'vendor',
      'vendorsTabActions',
      'filters.label',
      'filters.status',
      'filters.vendor',
      'metrics.active',
      'metrics.integrated',
      'metrics.total',
      'metrics.types',
      'status.CONNECTED',
      'status.DISCONNECTED',
      'import.chooseFile',
      'import.costCenterTip',
      'import.createFailed',
      'import.description',
      'import.downloadTemplate',
      'import.failed',
      'import.fileRequired',
      'import.fileTooLarge',
      'import.fileType',
      'import.importing',
      'import.invalidCsv',
      'import.invalidStatus',
      'import.needProductTypeGroups',
      'import.notReady',
      'import.numberInvalid',
      'import.previewEmpty',
      'import.previewTitle',
      'import.productTip',
      'import.productTypeGroupMissing',
      'import.requiredMissing',
      'import.result',
      'import.rowError',
      'import.submit',
      'import.summary',
    ].map((key) => `portal.vendors.${key}`)

    expect(flatten(en)).toEqual(expect.arrayContaining(requiredKeys))
    expect(flatten(vi)).toEqual(expect.arrayContaining(requiredKeys))
  })

  it('contains every Orders dashboard status tab key in both locales', () => {
    const orderTabKeys = [
      'ALL',
      'NEW_ORDER',
      'NO_COST_CENTER',
      'NO_PSD',
      'PAYMENT_PENDING',
      'IN_PROGRESS',
      'SHIPPED',
      'CANCELLED',
      'OPEN_CASE',
      'ADDRESS_ISSUE',
      'READY_FOR_PRODUCTION',
    ]
    const requiredKeys = orderTabKeys.map((key) => `orders.tabs.${key}`)

    expect(flatten(en)).toEqual(expect.arrayContaining(requiredKeys))
    expect(flatten(vi)).toEqual(expect.arrayContaining(requiredKeys))

    for (const key of orderTabKeys) {
      expect(vi.orders.tabs[key as keyof typeof vi.orders.tabs]).not.toBe(key.replaceAll('_', ' '))
    }
  })

  it('contains the recent order status labels in both locales', () => {
    const requiredKeys = [
      'orders.statuses.OPEN',
      'orders.statuses.PROCESSING',
      'orders.statuses.IMPORTED',
    ]

    expect(flatten(en)).toEqual(expect.arrayContaining(requiredKeys))
    expect(flatten(vi)).toEqual(expect.arrayContaining(requiredKeys))
  })

  it('keeps Integration accessibility labels out of hardcoded source strings', () => {
    const pages = [
      integrationWorkbenchSource,
      importIssueQueueSource,
      importJobPanelSource,
      issueResolutionModalSource,
    ]

    for (const source of pages) {
      expect(source).not.toMatch(/aria-label=["'][^"']+["']/)
    }
  })

  it('keeps audited UI surfaces free of hardcoded English copy', () => {
    const auditedSources = [
      catalogListingSource,
      foundationDashboardSource,
      listingDetailSource,
      listingQcActionsSource,
      listingVariantCardSource,
      listingVariantManagerSource,
      monitoringDashboardSource,
    ]
    const forbiddenCopy = [
      'No data',
      'Total orders',
      'Approved listings',
      'Select a listing to view details',
      'Listing approved successfully',
      'Mark this listing as ready for production',
      'No variants configured yet',
      'Total listings',
      'Listing table',
      'Health Check Error',
      'System Health',
    ]

    for (const source of auditedSources) {
      for (const copy of forbiddenCopy) {
        expect(source).not.toContain(copy)
      }
    }
  })
})
