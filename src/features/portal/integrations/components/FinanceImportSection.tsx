import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TableColumnsType } from 'antd'
import { Alert, Select } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { ImportBatch } from '@/features/portal/finance/api/financeApi'
import type { Shop } from '@/features/portal/shops/api/shopApi'
import { DateRangePicker, FilterBar, SectionCard, StatusTag } from '@/shared/ui'

import {
  ADS_IMPORT_STATUSES,
  type FinanceImportSourceType,
  useFinanceImportBatches,
} from '../hooks/useFinanceImports'
import styles from '../pages/IntegrationWorkbenchPage.module.scss'

const PAGE_SIZE = 20

function statusTone(status: string) {
  if (status === 'COMPLETED') return 'operational'
  if (status === 'FAILED') return 'critical'
  if (status === 'PARTIAL_FAILED') return 'warning'
  if (status === 'CANCELLED') return 'cancelled'
  return 'pending'
}

export interface FinanceImportSectionProps {
  readonly title: string
  readonly permissionHint: string
  readonly sourceType: FinanceImportSourceType
  readonly canRead: boolean
  readonly shops: Shop[]
  readonly isShopsLoading: boolean
  readonly shopNames: Map<string, string>
  readonly isActiveTab: boolean
}

export function FinanceImportSection({
  title,
  permissionHint,
  sourceType,
  canRead,
  shops,
  isShopsLoading,
  shopNames,
  isActiveTab,
}: FinanceImportSectionProps) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [shopId, setShopId] = useState<string>()
  const [status, setStatus] = useState<string>()
  const [dates, setDates] = useState<{ dateFrom?: string; dateTo?: string }>({})

  const imports = useFinanceImportBatches({
    sourceType,
    page,
    pageSize: PAGE_SIZE,
    shopId,
    status,
    dateFrom: dates.dateFrom,
    dateTo: dates.dateTo,
    enabled: isActiveTab && canRead,
  })

  const resetPage = () => setPage(1)

  const columns: TableColumnsType<ImportBatch> = useMemo(
    () => [
      {
        title: t('portal.integrations.ads.createdAt', { defaultValue: 'Created' }),
        dataIndex: 'createdAt',
        render: (value: string) => new Date(value).toLocaleString(),
      },
      {
        title: t('portal.integrations.shop', { defaultValue: 'Shop' }),
        dataIndex: 'shopId',
        render: (id: string | null) => (id ? (shopNames.get(id) ?? id) : '-'),
      },
      {
        title: t('portal.integrations.ads.status', { defaultValue: 'Status' }),
        dataIndex: 'status',
        render: (itemStatus: string) => (
          <StatusTag status={statusTone(itemStatus)}>
            {t(`portal.integrations.ads.statuses.${itemStatus}`, { defaultValue: itemStatus })}
          </StatusTag>
        ),
      },
      {
        title: t('portal.integrations.ads.rows', { defaultValue: 'Rows' }),
        render: (_, batch) =>
          `${batch.processedRows} ${t('portal.integrations.ads.processed', { defaultValue: 'processed' })} / ${batch.validRows} ${t('portal.integrations.ads.valid', { defaultValue: 'valid' })}`,
      },
      {
        title: t('portal.integrations.ads.errors', { defaultValue: 'Errors' }),
        dataIndex: 'errorCount',
      },
      {
        title: t('portal.integrations.ads.file', { defaultValue: 'File' }),
        dataIndex: 'originalFilename',
        render: (value: string) => value || '-',
      },
    ],
    [shopNames, t],
  )

  return (
    <SectionCard title={title}>
      {canRead ? (
        <CoreDataTable
          columns={columns}
          dataSource={imports.data?.items ?? []}
          loading={imports.isLoading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: imports.data?.pagination.total,
            onChange: setPage,
          }}
          toolbar={
            <FilterBar
              label={t('portal.integrations.financeImports.filters', {
                defaultValue: `${sourceType} import filters`,
              })}
              contentClassName={styles.filters}
            >
              <Select
                allowClear
                aria-label={t('portal.integrations.shop', { defaultValue: 'Shop' })}
                className={styles.filterControl}
                loading={isShopsLoading}
                options={shops.map((shop) => ({
                  label: shop.name,
                  value: shop.id,
                }))}
                placeholder={t('portal.integrations.allShops', { defaultValue: 'All shops' })}
                showSearch
                optionFilterProp="label"
                value={shopId}
                onChange={(nextShopId) => {
                  setShopId(nextShopId)
                  resetPage()
                }}
              />
              <Select
                allowClear
                aria-label={t('portal.integrations.ads.status', { defaultValue: 'Status' })}
                className={styles.filterControl}
                options={ADS_IMPORT_STATUSES.map((s) => ({ label: s, value: s }))}
                placeholder={t('portal.integrations.allStatuses', {
                  defaultValue: 'All statuses',
                })}
                value={status}
                onChange={(nextStatus) => {
                  setStatus(nextStatus)
                  resetPage()
                }}
              />
              <DateRangePicker
                aria-label={t('portal.integrations.ads.dateRange', {
                  defaultValue: 'Created date range',
                })}
                value={dates}
                onChange={(nextDates) => {
                  setDates(nextDates)
                  resetPage()
                }}
              />
            </FilterBar>
          }
        />
      ) : (
        <Alert type="info" showIcon message={permissionHint} />
      )}
    </SectionCard>
  )
}
