import { useTranslation } from 'react-i18next'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Select } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import type { Shop } from '@/features/portal/shops/api/shopApi'
import { DateRangePicker, FeedbackAlert, FilterBar, MetricCard, SectionCard } from '@/shared/ui'

import type {
  ImportJob,
  ImportJobListParams,
  ImportJobStatus,
  ImportSource,
} from '../api/integrationApi'
import { ImportIssueQueue } from './ImportIssueQueue'
import { ImportJobPanel } from './ImportJobPanel'
import styles from './IntegrationWorkbenchPage.module.scss'

interface IntegrationImportsWorkbenchProps {
  readonly account: CurrentAccount
  readonly columns: TableColumnsType<ImportJob>
  readonly counts: { completed: number; needsReview: number; processing: number }
  readonly error: Error | null
  readonly isLoading: boolean
  readonly jobs: ImportJob[]
  readonly params: ImportJobListParams
  readonly selectedJobId?: string
  readonly shops: Shop[]
  readonly sourceOptions: ImportSource[]
  readonly statusOptions: ImportJobStatus[]
  readonly total?: number
  readonly onChange: (next: Record<string, string | undefined>, resetPage?: boolean) => void
  readonly onRetry: () => void
}

const importSummary = [
  ['needsReview', 'danger', 'Needs review'],
  ['processing', 'info', 'Processing'],
  ['completed', 'success', 'Completed'],
] as const

const summaryIcon = (key: (typeof importSummary)[number][0]) =>
  key === 'needsReview' ? (
    <ExclamationCircleOutlined />
  ) : key === 'processing' ? (
    <ClockCircleOutlined />
  ) : (
    <CheckCircleOutlined />
  )

export function IntegrationImportsWorkbench({
  account,
  columns,
  counts,
  error,
  isLoading,
  jobs,
  onChange,
  onRetry,
  params,
  selectedJobId,
  shops,
  sourceOptions,
  statusOptions,
  total,
}: IntegrationImportsWorkbenchProps) {
  const { t } = useTranslation()

  return (
    <>
      {error ? (
        <FeedbackAlert
          type="error"
          title={t('portal.integrations.jobs.unavailable', {
            defaultValue: 'Import jobs are unavailable',
          })}
          action={
            <Button icon={<ReloadOutlined aria-hidden />} type="link" onClick={onRetry}>
              {t('portal.integrations.retry', { defaultValue: 'Retry' })}
            </Button>
          }
        />
      ) : null}
      <section
        aria-label={t('portal.integrations.importsSummary', { defaultValue: 'Import summary' })}
        className={styles.importSummary}
      >
        {importSummary.map(([key, variant, fallback]) => (
          <MetricCard
            icon={summaryIcon(key)}
            key={key}
            label={t(`portal.integrations.imports.${key}`, { defaultValue: fallback })}
            value={counts[key]}
            variant={variant}
          />
        ))}
      </section>
      <SectionCard>
        <CoreDataTable
          columns={columns}
          dataSource={jobs}
          loading={isLoading}
          rowKey="id"
          onRow={(job) => ({ onClick: () => onChange({ selectedJobId: job.id }, false) })}
          pagination={{
            current: params.page,
            pageSize: params.limit,
            total,
            onChange: (page) => onChange({ page: String(page) }, false),
          }}
          toolbar={
            <FilterBar
              label={t('portal.integrations.filters', { defaultValue: 'Import filters' })}
              contentClassName={styles.filters}
            >
              <Select
                allowClear
                aria-label={t('portal.integrations.shop', { defaultValue: 'Shop' })}
                className={styles.filterControl}
                options={shops.map((shop) => ({ label: shop.name, value: shop.id }))}
                placeholder={t('portal.integrations.allShops', { defaultValue: 'All shops' })}
                showSearch
                optionFilterProp="label"
                value={params.shopId}
                onChange={(shopId) => onChange({ shopId })}
              />
              <Select
                allowClear
                aria-label={t('portal.integrations.jobs.source', { defaultValue: 'Source' })}
                className={styles.filterControl}
                options={sourceOptions.map((source) => ({
                  label: t(`portal.integrations.sources.${source}`, { defaultValue: source }),
                  value: source,
                }))}
                placeholder={t('portal.integrations.allSources', { defaultValue: 'All sources' })}
                value={params.source}
                onChange={(source) => onChange({ source })}
              />
              <Select
                allowClear
                aria-label={t('portal.integrations.jobs.status', { defaultValue: 'Status' })}
                className={styles.filterControl}
                options={statusOptions.map((status) => ({
                  label: t(`portal.integrations.statuses.${status}`, { defaultValue: status }),
                  value: status,
                }))}
                placeholder={t('portal.integrations.allStatuses', { defaultValue: 'All statuses' })}
                value={params.status}
                onChange={(status) => onChange({ status })}
              />
              <DateRangePicker
                aria-label={t('portal.integrations.dateRange', {
                  defaultValue: 'Created date range',
                })}
                value={{ dateFrom: params.dateFrom, dateTo: params.dateTo }}
                onChange={({ dateFrom, dateTo }) => onChange({ dateFrom, dateTo })}
              />
            </FilterBar>
          }
        />
      </SectionCard>
      {selectedJobId ? (
        <ImportJobPanel
          account={account}
          jobId={selectedJobId}
          status={jobs.find((job) => job.id === selectedJobId)?.status}
          open
          onClose={() => onChange({ selectedJobId: undefined }, false)}
        />
      ) : null}
      <ImportIssueQueue account={account} shops={shops} selectedJobId={selectedJobId} />
    </>
  )
}
