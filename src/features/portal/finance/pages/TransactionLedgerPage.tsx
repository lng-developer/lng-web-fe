import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Input, Select } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import {
  CopyableOrderId,
  DateRangePicker,
  type DateRangeValue,
  FilterBar,
  FormattedDateTime,
  SectionCard,
  TableTextCell,
} from '@/shared/ui'

import { listImportedFinanceData, type ImportedFinanceData } from '../api/financeApi'
import styles from './FinanceWorkspacePage.module.scss'

type FeeSummary = { totalAmount?: unknown }

function money(value: unknown, currency = 'USD') {
  const amount = Number(value)
  return Number.isFinite(amount) ? `${(amount / 100).toFixed(2)} ${currency}` : '—'
}

export function TransactionLedgerPage() {
  const [page, setPage] = useState(1)
  const [dates, setDates] = useState<DateRangeValue>({})
  const [transactionType, setTransactionType] = useState('')
  const [transactionStatus, setTransactionStatus] = useState('')
  const [externalOrderId, setExternalOrderId] = useState('')
  const [linkStatus, setLinkStatus] = useState<string>()
  const query = {
    page,
    limit: DEFAULT_PAGE_SIZE,
    dateFrom: dates.dateFrom,
    dateTo: dates.dateTo,
    transactionType: transactionType || undefined,
    transactionStatus: transactionStatus || undefined,
    externalOrderId: externalOrderId || undefined,
    linkStatus,
  }
  const data = useQuery({
    queryKey: ['finance', 'imported-data', 'transactions', query],
    queryFn: () => listImportedFinanceData('transactions', query),
  })
  const columns = useMemo<TableColumnsType<ImportedFinanceData>>(
    () => [
      { title: 'Posted', dataIndex: 'postedAt', width: 150, render: (value) => <FormattedDateTime value={String(value || '')} /> },
      { title: 'Type', dataIndex: 'transactionType', width: 150, render: (value) => <TableTextCell value={value} maxWidth={140} /> },
      { title: 'Status', dataIndex: 'transactionStatus', width: 130, render: (value) => <TableTextCell value={value} maxWidth={120} /> },
      { title: 'Order ID', dataIndex: 'externalOrderId', width: 190, render: (value) => <CopyableOrderId value={typeof value === 'string' ? value : null} fallback="—" /> },
      { title: 'Net amount', width: 130, align: 'right', render: (_, row) => money(row.amount, String(row.currency || 'USD')) },
      { title: 'Fees', width: 120, align: 'right', render: (_, row) => money((row.feeSummary as FeeSummary | undefined)?.totalAmount, String(row.currency || 'USD')) },
    ],
    [],
  )

  const resetPage = () => setPage(1)
  return (
    <section className={styles.page}>
      <SectionCard title="Transaction ledger">
        <CoreDataTable
          tableLayout="fixed"
          scroll={{ x: 870 }}
          rowKey="id"
          columns={columns}
          dataSource={data.data?.items ?? []}
          loading={data.isLoading}
          pagination={{ current: page, pageSize: DEFAULT_PAGE_SIZE, total: data.data?.pagination.total, onChange: setPage }}
          toolbar={
            <FilterBar label="Transaction ledger filters" contentClassName={styles.filters}>
              <DateRangePicker aria-label="Posted date" value={dates} onChange={(next) => { setDates(next); resetPage() }} />
              <Input aria-label="Transaction type" placeholder="Transaction type" value={transactionType} onChange={(event) => { setTransactionType(event.target.value); resetPage() }} />
              <Input aria-label="Transaction status" placeholder="Transaction status" value={transactionStatus} onChange={(event) => { setTransactionStatus(event.target.value); resetPage() }} />
              <Input aria-label="Order ID" placeholder="Order ID" value={externalOrderId} onChange={(event) => { setExternalOrderId(event.target.value); resetPage() }} />
              <Select allowClear aria-label="Link status" placeholder="Link status" value={linkStatus} options={[{ value: 'LINKED', label: 'Linked' }, { value: 'UNLINKED', label: 'Unlinked' }]} onChange={(value) => { setLinkStatus(value); resetPage() }} />
            </FilterBar>
          }
        />
      </SectionCard>
    </section>
  )
}
