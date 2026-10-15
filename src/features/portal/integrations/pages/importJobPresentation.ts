import type { TFunction } from 'i18next'
import type { ImportJob } from '../api/integrationApi'

export function importJobSource(job: ImportJob, t: TFunction) {
  if (job.salesChannelCode === 'ETSY')
    return job.importOrigin === 'EXTENSION'
      ? t('portal.integrations.jobs.etsyExtension', { defaultValue: 'Etsy Extension' })
      : t('portal.integrations.jobs.etsyReport', { defaultValue: 'Etsy report' })
  return `${t(`portal.integrations.sources.${job.source}`, { defaultValue: job.source })} / ${job.marketplaceCode}`
}

export function importJobResults(job: ImportJob, t: TFunction) {
  const counts = job.resultSummary
  const processed =
    counts?.createdOrders != null && counts.updatedOrders != null
      ? t('portal.integrations.jobs.orderOutcomes', {
          created: counts.createdOrders,
          updated: counts.updatedOrders,
          defaultValue: `${counts.createdOrders} orders created / ${counts.updatedOrders} orders updated`,
        })
      : t('portal.integrations.jobs.rowsProcessed', {
          count: job.importedCount,
          defaultValue: `${job.importedCount} rows processed`,
        })
  return `${processed} / ${t('portal.integrations.jobs.rowFailures', { skipped: job.skippedCount, failed: job.failedCount, defaultValue: `${job.skippedCount} rows skipped / ${job.failedCount} rows failed` })}`
}

export function importJobIssues(job: ImportJob, t: TFunction) {
  const counts = job.resultSummary
  if (!counts?.openIssues) return null
  return counts.addressIssues === counts.openIssues
    ? t('portal.integrations.jobs.addressIssues', {
        count: counts.addressIssues,
        defaultValue: `${counts.addressIssues} address validation issues`,
      })
    : t('portal.integrations.jobs.openIssues', {
        count: counts.openIssues,
        defaultValue: `${counts.openIssues} issues need review`,
      })
}
