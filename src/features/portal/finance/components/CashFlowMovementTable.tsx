import { Link } from 'react-router-dom'
import type { TableColumnsType } from 'antd'
import { Space } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { CopyableOrderId, FormattedDateTime, StatusTag, TableTextCell } from '@/shared/ui'

import type { CashFlowMovement, CashFlowPage } from '../api/financeApi'
import { formatFinanceMoney } from './financeFormatters'

function tone(status: CashFlowMovement['reconciliationStatus']) {
  if (status === 'LINKED') return 'operational' as const
  if (status === 'UNLINKED') return 'warning' as const
  return 'critical' as const
}

export function CashFlowMovementTable({
  data,
  onPageChange,
}: {
  data?: Pick<CashFlowPage, 'items' | 'pagination'>
  onPageChange: (page: number) => void
}) {
  const columns: TableColumnsType<CashFlowMovement> = [
    { title: 'Occurred', dataIndex: 'occurredAt', width: 150, render: (value) => <FormattedDateTime value={value} /> },
    { title: 'Movement', dataIndex: 'sourceKind', width: 160, render: (value) => <TableTextCell value={value} maxWidth={140} /> },
    { title: 'Order ID', dataIndex: 'externalOrderId', width: 185, render: (value) => <CopyableOrderId value={value} fallback="—" /> },
    { title: 'Amount', width: 125, align: 'right', render: (_, row) => formatFinanceMoney(row.amount, row.currency) },
    { title: 'Status', dataIndex: 'reconciliationStatus', width: 130, render: (value) => <StatusTag status={tone(value)}>{value}</StatusTag> },
    {
      title: 'Details',
      width: 160,
      render: (_, row) => (
        <Space size={4}>
          {row.settlementRecordId ? <Link to={`/portal/finance/settlements?settlementId=${row.settlementRecordId}`}>View settlement</Link> : null}
          {row.orderItemId ? <Link to={`/portal/finance?orderItemId=${row.orderItemId}`}>View P&amp;L</Link> : null}
        </Space>
      ),
    },
  ]
  return (
    <CoreDataTable
      rowKey="id"
      tableLayout="fixed"
      scroll={{ x: 900 }}
      columns={columns}
      dataSource={data?.items ?? []}
      pagination={{ current: data?.pagination.page, pageSize: data?.pagination.limit, total: data?.pagination.total, onChange: onPageChange }}
    />
  )
}
