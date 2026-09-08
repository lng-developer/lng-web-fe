import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TableColumnsType } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { SectionCard } from '@/shared/ui'

import type { TeamPerformance } from '../api/reportApi'
import { formatReportMoney, formatReportPercent } from './reportFormatters'

interface ReportTeamTabProps {
  teamsData?: TeamPerformance[]
  isTeamsPending: boolean
}

export const ReportTeamTab: React.FC<ReportTeamTabProps> = React.memo(
  ({ teamsData = [], isTeamsPending }) => {
    const { t } = useTranslation()

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
          render: (_, row) =>
            row.netProfitAmount === null
              ? '—'
              : formatReportMoney(row.netProfitAmount, row.currency || 'USD'),
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
    )
  },
)

ReportTeamTab.displayName = 'ReportTeamTab'
