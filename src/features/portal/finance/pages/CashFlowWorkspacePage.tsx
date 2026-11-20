import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Select, Typography } from 'antd'

import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import {
  DateRangePicker,
  type DateRangeValue,
  FilterBar,
  getDefaultDateRange,
  SectionCard,
} from '@/shared/ui'

import type { CashFlowStatus } from '../api/financeApi'
import { CashFlowMovementTable } from '../components/CashFlowMovementTable'
import { CashFlowSummary } from '../components/CashFlowSummary'
import { useCashFlow } from '../hooks/useCashFlow'
import styles from './FinanceWorkspacePage.module.scss'

export function CashFlowWorkspacePage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [dates, setDates] = useState<DateRangeValue>(getDefaultDateRange)
  const [status, setStatus] = useState<CashFlowStatus>()
  const query = useMemo(
    () => ({
      page,
      limit: DEFAULT_PAGE_SIZE,
      dateFrom: dates.dateFrom,
      dateTo: dates.dateTo,
      status,
    }),
    [dates.dateFrom, dates.dateTo, page, status],
  )
  const cashFlow = useCashFlow(query)
  const selectStatus = (next: CashFlowStatus) => {
    setStatus(next)
    setPage(1)
  }

  return (
    <section className={styles.page}>
      <Alert
        type="info"
        showIcon
        closable
        message={<Typography.Text strong>{t('finance.banners.cashFlowTitle')}</Typography.Text>}
        description={t('finance.banners.cashFlowDesc')}
      />
      <SectionCard title={t('finance.cashFlow')}>
        <CashFlowSummary
          summaries={cashFlow.data?.summaryByCurrency ?? []}
          importErrorCount={cashFlow.data?.importErrorCount ?? 0}
          onStatusSelect={selectStatus}
        />
      </SectionCard>
      <SectionCard title={status ? `Exception queue: ${status}` : 'Cash movements'}>
        <CashFlowMovementTable data={cashFlow.data} onPageChange={setPage} />
        <FilterBar label="Cash flow filters" contentClassName={styles.filters}>
          <DateRangePicker
            aria-label="Cash flow date"
            value={dates}
            onChange={(next) => {
              setDates(next)
              setPage(1)
            }}
          />
          <Select
            allowClear
            aria-label="Cash flow status"
            placeholder="Reconciliation status"
            value={status}
            options={[
              { value: 'LINKED', label: 'Linked' },
              { value: 'UNLINKED', label: 'Unlinked' },
              { value: 'NEEDS_REVIEW', label: 'Needs review' },
            ]}
            onChange={(next) => {
              setStatus(next)
              setPage(1)
            }}
          />
        </FilterBar>
      </SectionCard>
    </section>
  )
}
