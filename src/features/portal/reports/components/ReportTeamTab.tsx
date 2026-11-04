import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DollarOutlined, RiseOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { MetricCard, SectionCard } from '@/shared/ui'

import type { TeamPerformance } from '../api/reportApi'
import styles from '../pages/ReportWorkspacePage.module.scss'
import { formatReportMoney, formatReportPercent } from './reportFormatters'

interface ReportTeamTabProps {
  teamsData?: TeamPerformance[]
  isTeamsPending: boolean
  filterBar?: React.ReactNode
}

export const ReportTeamTab: React.FC<ReportTeamTabProps> = React.memo(
  ({ teamsData = [], isTeamsPending, filterBar }) => {
    const { t } = useTranslation()

    const currency = teamsData[0]?.currency || 'USD'
    const teamCount = teamsData.length
    const activeSellers = useMemo(
      () => teamsData.reduce((sum, r) => sum + r.activeSellerCount, 0),
      [teamsData],
    )
    const revenue = useMemo(
      () => teamsData.reduce((sum, r) => sum + r.revenueAmount, 0),
      [teamsData],
    )
    const spend = useMemo(
      () => teamsData.reduce((sum, r) => sum + (r.adSpendAmount || 0), 0),
      [teamsData],
    )
    const netProfit = useMemo(
      () =>
        teamsData.length > 0 && teamsData.every((r) => r.netProfitAmount !== null)
          ? teamsData.reduce((sum, r) => sum + (r.netProfitAmount || 0), 0)
          : null,
      [teamsData],
    )

    const teamColumns = useMemo<TableColumnsType<TeamPerformance>>(
      () => [
        {
          title: t('reports.columns.team'),
          width: 200,
          ellipsis: true,
          render: (_, row) => row.teamName || row.teamCode || '—',
        },
        {
          title: t('reports.columns.sellers'),
          dataIndex: 'activeSellerCount',
          width: 100,
          align: 'right',
        },
        {
          title: t('reports.columns.items'),
          dataIndex: 'itemCount',
          width: 90,
          align: 'right',
          sorter: (a, b) => a.itemCount - b.itemCount,
        },
        {
          title: t('reports.columns.revenue'),
          width: 130,
          align: 'right',
          sorter: (a, b) => a.revenueAmount - b.revenueAmount,
          render: (_, row) => formatReportMoney(row.revenueAmount, row.currency || 'USD'),
        },
        {
          title: t('reports.columns.spend'),
          width: 120,
          align: 'right',
          sorter: (a, b) => (a.adSpendAmount || 0) - (b.adSpendAmount || 0),
          render: (_, row) => formatReportMoney(row.adSpendAmount || 0, row.currency || 'USD'),
        },
        {
          title: t('reports.columns.netProfit'),
          width: 130,
          align: 'right',
          sorter: (a, b) => (a.netProfitAmount ?? -Infinity) - (b.netProfitAmount ?? -Infinity),
          render: (_, row) => {
            if (row.netProfitAmount === null) return '—'
            const text = formatReportMoney(row.netProfitAmount, row.currency || 'USD')
            if (row.netProfitAmount > 0) {
              return (
                <span style={{ color: 'var(--ant-color-success)', fontWeight: 600 }}>{text}</span>
              )
            }
            if (row.netProfitAmount < 0) {
              return (
                <span style={{ color: 'var(--ant-color-error)', fontWeight: 600 }}>{text}</span>
              )
            }
            return <span>{text}</span>
          },
        },
        {
          title: t('reports.columns.margin'),
          width: 100,
          align: 'right',
          sorter: (a, b) => (a.netMarginBps ?? -Infinity) - (b.netMarginBps ?? -Infinity),
          render: (_, row) => formatReportPercent(row.netMarginBps),
        },
      ],
      [t],
    )

    return (
      <div className={styles.stack}>
        <div className={styles.salesMetrics}>
          <MetricCard
            icon={<TeamOutlined />}
            variant="neutral"
            label={t('reports.sales.byTeam')}
            value={teamCount}
            loading={isTeamsPending}
          />
          <MetricCard
            icon={<UserOutlined />}
            variant="primary"
            label={t('reports.columns.sellers')}
            value={activeSellers}
            loading={isTeamsPending}
          />
          <MetricCard
            icon={<DollarOutlined />}
            variant="info"
            label={t('reports.columns.revenue')}
            value={formatReportMoney(revenue, currency)}
            loading={isTeamsPending}
          />
          <MetricCard
            icon={<DollarOutlined />}
            variant="warning"
            label={t('reports.columns.spend')}
            value={formatReportMoney(spend, currency)}
            loading={isTeamsPending}
          />
          <MetricCard
            icon={<RiseOutlined />}
            variant="success"
            label={t('reports.columns.netProfit')}
            value={netProfit === null ? '—' : formatReportMoney(netProfit, currency)}
            loading={isTeamsPending}
          />
        </div>
        {filterBar}
        <SectionCard title={t('reports.sales.byTeam')}>
          <CoreDataTable
            tableLayout="fixed"
            rowKey={(row) => `${row.teamId}-${row.currency}`}
            columns={teamColumns}
            dataSource={teamsData}
            loading={isTeamsPending}
            pagination={false}
            scroll={{ x: 870 }}
          />
        </SectionCard>
      </div>
    )
  },
)

ReportTeamTab.displayName = 'ReportTeamTab'
