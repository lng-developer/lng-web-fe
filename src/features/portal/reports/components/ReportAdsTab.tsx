import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AimOutlined, DollarOutlined, FundOutlined, ShoppingOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Alert } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { MetricCard, SectionCard } from '@/shared/ui'

import type { AdsDaily, ChannelPerformance } from '../api/reportApi'
import styles from '../pages/ReportWorkspacePage.module.scss'
import { formatReportMoney } from './reportFormatters'

interface ReportAdsTabProps {
  operationalScope: boolean
  adsDailyData?: AdsDaily[]
  isAdsDailyPending: boolean
  channelsData?: ChannelPerformance[]
  isChannelsPending: boolean
}

export const ReportAdsTab: React.FC<ReportAdsTabProps> = React.memo(
  ({
    operationalScope,
    adsDailyData = [],
    isAdsDailyPending,
    channelsData = [],
    isChannelsPending,
  }) => {
    const { t } = useTranslation()

    const adsKpis = useMemo(() => {
      if (!adsDailyData.length) return null
      const currency = adsDailyData[0]?.currency || 'USD'
      const totalSpend = adsDailyData.reduce((sum, r) => sum + r.spendAmount, 0)
      const totalSales = adsDailyData.reduce((sum, r) => sum + r.attributedSalesAmount, 0)
      const totalOrders = adsDailyData.reduce((sum, r) => sum + r.attributedOrdersCount, 0)
      const roas = totalSpend > 0 ? (totalSales / totalSpend).toFixed(2) : '—'
      const avgCpa = totalOrders > 0 ? totalSpend / totalOrders : null
      return { currency, totalSpend, totalSales, totalOrders, roas, avgCpa }
    }, [adsDailyData])

    const adsDailyColumns = useMemo<TableColumnsType<AdsDaily>>(
      () => [
        { title: t('reports.columns.date'), dataIndex: 'reportDate', width: '10%' },
        {
          title: t('reports.columns.channel'),
          width: '20%',
          ellipsis: true,
          render: (_, row) => `${row.salesChannelCode || '—'} · ${row.marketplaceCode || '—'}`,
        },
        {
          title: t('reports.columns.spend'),
          width: '13%',
          align: 'right',
          render: (_, row) => formatReportMoney(row.spendAmount, row.currency || 'USD'),
        },
        {
          title: t('reports.columns.sales'),
          width: '14%',
          align: 'right',
          render: (_, row) => formatReportMoney(row.attributedSalesAmount, row.currency || 'USD'),
        },
        {
          title: t('reports.columns.impressions'),
          dataIndex: 'impressions',
          width: '13%',
          align: 'right',
        },
        { title: t('reports.columns.clicks'), dataIndex: 'clicks', width: '10%', align: 'right' },
        {
          title: t('reports.columns.orders'),
          dataIndex: 'attributedOrdersCount',
          width: '10%',
          align: 'right',
        },
        {
          title: t('reports.columns.cpa'),
          width: '10%',
          align: 'right',
          render: (_, row) =>
            row.cpaAmount === null ? '—' : formatReportMoney(row.cpaAmount, row.currency || 'USD'),
        },
      ],
      [t],
    )

    const channelColumns = useMemo<TableColumnsType<ChannelPerformance>>(
      () => [
        {
          title: t('reports.columns.channel'),
          width: '34%',
          ellipsis: true,
          render: (_, row) => `${row.salesChannelCode || '—'} · ${row.marketplaceCode || '—'}`,
        },
        {
          title: t('reports.columns.spend'),
          width: '22%',
          align: 'right',
          render: (_, row) => formatReportMoney(row.spendAmount, row.currency || 'USD'),
        },
        {
          title: t('reports.columns.sales'),
          width: '25%',
          align: 'right',
          render: (_, row) => formatReportMoney(row.attributedSalesAmount, row.currency || 'USD'),
        },
        {
          title: t('reports.columns.newBuyers'),
          dataIndex: 'newBuyerCount',
          width: '19%',
          align: 'right',
        },
      ],
      [t],
    )

    if (!operationalScope) {
      return (
        <div className={styles.stack}>
          <Alert type="info" showIcon message={t('reports.scopeLimited')} />
        </div>
      )
    }

    return (
      <div className={styles.stack}>
        {adsKpis && (
          <div className={styles.metrics}>
            <MetricCard
              icon={<DollarOutlined />}
              variant="warning"
              label={t('reports.columns.spend')}
              value={formatReportMoney(adsKpis.totalSpend, adsKpis.currency)}
            />
            <MetricCard
              icon={<ShoppingOutlined />}
              variant="primary"
              label={t('reports.columns.sales')}
              value={formatReportMoney(adsKpis.totalSales, adsKpis.currency)}
            />
            <MetricCard
              icon={<FundOutlined />}
              variant="success"
              label={t('reports.columns.roas')}
              value={adsKpis.roas === '—' ? '—' : `${adsKpis.roas}x`}
            />
            <MetricCard
              icon={<AimOutlined />}
              variant="neutral"
              label={t('reports.columns.cpa')}
              value={
                adsKpis.avgCpa != null ? formatReportMoney(adsKpis.avgCpa, adsKpis.currency) : '—'
              }
            />
          </div>
        )}
        <SectionCard title={t('reports.sales.dailyAds')}>
          <CoreDataTable
            tableLayout="fixed"
            rowKey={(row) =>
              `${row.reportDate}-${row.salesChannelCode}-${row.marketplaceCode}-${row.currency}`
            }
            dataSource={adsDailyData}
            loading={isAdsDailyPending}
            pagination={false}
            columns={adsDailyColumns}
            scroll={{}}
          />
        </SectionCard>
        <SectionCard title={t('reports.sales.acquisition')}>
          <CoreDataTable
            tableLayout="fixed"
            rowKey={(row) => `${row.salesChannelCode}-${row.marketplaceCode}-${row.currency}`}
            dataSource={channelsData}
            loading={isChannelsPending}
            pagination={false}
            columns={channelColumns}
            scroll={{}}
          />
        </SectionCard>
      </div>
    )
  },
)

ReportAdsTab.displayName = 'ReportAdsTab'
