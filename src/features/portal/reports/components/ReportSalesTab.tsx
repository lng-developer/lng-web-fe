import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DollarOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  MinusCircleOutlined,
  RiseOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons'
import { Button, Input, Segmented, Space, Typography, type TableColumnsType } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { MetricCard, SectionCard } from '@/shared/ui'

import type { SellerDailyProfit, SellerPerformance } from '../api/reportApi'
import styles from '../pages/ReportWorkspacePage.module.scss'
import { formatReportMoney } from './reportFormatters'
import { ReportProfitComparisonChart } from './ReportProfitComparisonChart'

interface ReportSalesTabProps {
  data?: SellerDailyProfit[]
  isPending: boolean
  canCompareSellers: boolean
  dates?: string[]
  filterBar?: ReactNode
}

type MetricFilterKey = 'all' | 'core' | 'profit'

type DailySalesRow = {
  date: string
  currency: string | null
  itemCount: number
  orderCount: number
  revenueAmount: number
  totalCostAmount: number | null
  marketplaceFeeAmount: number
  refundAmount: number
  discountAmount: number
  operatingCostAmount: number
  adSpendAmount: number
  netProfitAmount: number | null
  netMarginBps: number | null
  missingCostCount: number
}

type SalesSummary = {
  currency: string
  orderCount: number
  revenueAmount: number
  totalCostAmount: number | null
  netProfitAmount: number | null
  adjustmentsAmount: number
}

type SellerMatrixMetricKey =
  | 'orders'
  | 'revenue'
  | 'fulfillmentCost'
  | 'fee'
  | 'adSpend'
  | 'discount'
  | 'grossProfit'
  | 'operatingCost'
  | 'refund'
  | 'netProfit'

type SellerMatrixMetric = {
  key: SellerMatrixMetricKey
  label: string
  value: (row: SellerDailyProfit) => number | null
}

type SellerMatrixRow = {
  key: string
  sellerName: string
  sellerEmployeeCode: string | null
  metricKey: SellerMatrixMetricKey
  metricLabel: string
  metricIndex: number
  totalValue: number | null
  dateValues: Record<string, number | null>
}

type SellerMatrixGroup = {
  currency: string
  dates: string[]
  rows: SellerMatrixRow[]
}

const METRIC_STYLES: Record<
  SellerMatrixMetricKey,
  {
    isBold?: boolean
  }
> = {
  orders: {},
  revenue: { isBold: true },
  fulfillmentCost: {},
  fee: {},
  adSpend: {},
  discount: {},
  grossProfit: { isBold: true },
  operatingCost: {},
  refund: {},
  netProfit: { isBold: true },
}

function formatSellerMatrixValue(
  metricKey: SellerMatrixMetricKey,
  value: number | null,
  currency: string,
) {
  if (value === null) return '—'
  if (metricKey === 'orders') return value.toLocaleString()
  return formatReportMoney(value, currency)
}

function renderMatrixCellValue(
  metricKey: SellerMatrixMetricKey,
  value: number | null,
  currency: string,
) {
  if (value === null) {
    return <span style={{ color: 'var(--ant-color-text-quaternary)' }}>—</span>
  }
  const text = formatSellerMatrixValue(metricKey, value, currency)

  if (metricKey === 'grossProfit' || metricKey === 'netProfit') {
    if (value > 0) {
      return <span style={{ color: 'var(--ant-color-success)', fontWeight: 700 }}>{text}</span>
    }
    if (value < 0) {
      return <span style={{ color: 'var(--ant-color-error)', fontWeight: 700 }}>{text}</span>
    }
    return <span style={{ fontWeight: 600 }}>{text}</span>
  }

  if (metricKey === 'revenue') {
    return <span style={{ fontWeight: 600 }}>{text}</span>
  }

  if (metricKey === 'orders') {
    return <span style={{ fontWeight: 500 }}>{text}</span>
  }

  return <span>{text}</span>
}

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function formatHeaderDate(dateStr: string, locale?: string) {
  try {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const year = Number.parseInt(parts[0], 10)
      const month = Number.parseInt(parts[1], 10) - 1
      const day = Number.parseInt(parts[2], 10)
      const d = new Date(Date.UTC(year, month, day))
      const dayOfWeek = (locale === 'vi' ? WEEKDAYS_VI : WEEKDAYS_EN)[d.getUTCDay()] || ''
      return {
        date: `${parts[2]}/${parts[1]}`,
        dayOfWeek,
      }
    }
  } catch {
    // fallback
  }
  return { date: dateStr.slice(5), dayOfWeek: '' }
}

export function ReportSalesTab({
  data = [],
  isPending,
  canCompareSellers,
  dates: selectedDates = [],
  filterBar,
}: ReportSalesTabProps) {
  const { t, i18n } = useTranslation()
  const [metricFilter, setMetricFilter] = useState<MetricFilterKey>('all')
  const [sellerSearch, setSellerSearch] = useState('')
  const [showChart, setShowChart] = useState(true)

  const dailyRows = useMemo<DailySalesRow[]>(() => {
    const rows = new Map<string, DailySalesRow>()
    data.forEach((row) => {
      const key = `${row.date}-${row.currency}`
      const current = rows.get(key)
      const totalCostAmount =
        current?.totalCostAmount === null || row.totalCostAmount === null
          ? null
          : (current?.totalCostAmount || 0) + row.totalCostAmount
      const netProfitAmount =
        current?.netProfitAmount === null || row.netProfitAmount === null
          ? null
          : (current?.netProfitAmount || 0) + row.netProfitAmount
      const revenueAmount = (current?.revenueAmount || 0) + row.revenueAmount
      rows.set(key, {
        date: row.date,
        currency: row.currency,
        itemCount: (current?.itemCount || 0) + row.itemCount,
        orderCount: (current?.orderCount || 0) + row.orderCount,
        revenueAmount,
        totalCostAmount,
        marketplaceFeeAmount: (current?.marketplaceFeeAmount || 0) + row.marketplaceFeeAmount,
        refundAmount: (current?.refundAmount || 0) + row.refundAmount,
        discountAmount: (current?.discountAmount || 0) + row.discountAmount,
        operatingCostAmount: (current?.operatingCostAmount || 0) + row.operatingCostAmount,
        adSpendAmount: (current?.adSpendAmount || 0) + (row.adSpendAmount || 0),
        netProfitAmount,
        netMarginBps:
          netProfitAmount !== null && revenueAmount > 0
            ? Math.round((netProfitAmount / revenueAmount) * 10000)
            : null,
        missingCostCount: (current?.missingCostCount || 0) + row.missingCostCount,
      })
    })
    return [...rows.values()].sort((left, right) => left.date.localeCompare(right.date))
  }, [data])

  const summaries = useMemo<SalesSummary[]>(() => {
    const rows = new Map<string, SalesSummary>()
    dailyRows.forEach((row) => {
      const currency = row.currency || 'USD'
      const current = rows.get(currency)
      rows.set(currency, {
        currency,
        orderCount: (current?.orderCount || 0) + row.orderCount,
        revenueAmount: (current?.revenueAmount || 0) + row.revenueAmount,
        totalCostAmount:
          current?.totalCostAmount === null || row.totalCostAmount === null
            ? null
            : (current?.totalCostAmount || 0) + row.totalCostAmount,
        netProfitAmount:
          current?.netProfitAmount === null || row.netProfitAmount === null
            ? null
            : (current?.netProfitAmount || 0) + row.netProfitAmount,
        adjustmentsAmount:
          (current?.adjustmentsAmount || 0) + row.refundAmount + row.discountAmount,
      })
    })
    return [...rows.values()].sort((left, right) => left.currency.localeCompare(right.currency))
  }, [dailyRows])

  const displaySummaries = useMemo<SalesSummary[]>(() => {
    if (summaries.length) return summaries
    return [
      {
        currency: 'USD',
        orderCount: 0,
        revenueAmount: 0,
        totalCostAmount: null,
        netProfitAmount: null,
        adjustmentsAmount: 0,
      },
    ]
  }, [summaries])

  const sellerRowsByCurrency = useMemo(() => {
    const currencyRows = new Map<string, Map<string, SellerPerformance>>()
    data.forEach((row) => {
      const currency = row.currency || 'USD'
      const sellerKey = row.sellerEmployeeCode || row.sellerName || 'UNASSIGNED'
      const rows = currencyRows.get(currency) || new Map<string, SellerPerformance>()
      const current = rows.get(sellerKey)
      const revenueAmount = (current?.revenueAmount || 0) + row.revenueAmount
      const netProfitAmount =
        current?.netProfitAmount === null || row.netProfitAmount === null
          ? null
          : (current?.netProfitAmount || 0) + row.netProfitAmount
      const partialNetProfitAmount = current
        ? current.partialNetProfitAmount === undefined || row.partialNetProfitAmount === undefined
          ? undefined
          : current.partialNetProfitAmount === null || row.partialNetProfitAmount === null
            ? null
            : current.partialNetProfitAmount + row.partialNetProfitAmount
        : row.partialNetProfitAmount
      rows.set(sellerKey, {
        sellerEmployeeCode: row.sellerEmployeeCode,
        sellerName: row.sellerName,
        currency,
        itemCount: (current?.itemCount || 0) + row.itemCount,
        revenueAmount,
        baseCostAmount: (current?.baseCostAmount || 0) + row.baseCostAmount,
        grossProfitAmount:
          current?.grossProfitAmount === null || row.grossProfitAmount === null
            ? null
            : (current?.grossProfitAmount || 0) + row.grossProfitAmount,
        operatingCostAmount: (current?.operatingCostAmount || 0) + row.operatingCostAmount,
        adSpendAmount: (current?.adSpendAmount || 0) + (row.adSpendAmount || 0),
        netProfitAmount,
        partialNetProfitAmount,
        netMarginBps:
          netProfitAmount !== null && revenueAmount > 0
            ? Math.round((netProfitAmount / revenueAmount) * 10000)
            : null,
        missingCostCount: (current?.missingCostCount || 0) + row.missingCostCount,
        costedItemCount:
          (current?.costedItemCount || 0) +
          (row.costedItemCount ?? Math.max(row.itemCount - row.missingCostCount, 0)),
      })
      currencyRows.set(currency, rows)
    })
    return [...currencyRows.entries()].map(([currency, rows]) => ({
      currency,
      rows: [...rows.values()],
    }))
  }, [data])

  const hasMultipleSellers = useMemo(
    () => sellerRowsByCurrency.some(({ rows }) => rows.length > 1),
    [sellerRowsByCurrency],
  )

  const sellerMatrixMetrics = useMemo<SellerMatrixMetric[]>(
    () => [
      { key: 'orders', label: t('reports.columns.orders'), value: (row) => row.orderCount },
      { key: 'revenue', label: t('reports.columns.revenue'), value: (row) => row.revenueAmount },
      {
        key: 'fulfillmentCost',
        label: t('reports.columns.fulfillmentCost'),
        value: (row) => row.totalCostAmount,
      },
      {
        key: 'fee',
        label: t('reports.columns.marketplaceFee'),
        value: (row) => row.marketplaceFeeAmount,
      },
      { key: 'adSpend', label: t('reports.columns.spend'), value: (row) => row.adSpendAmount || 0 },
      { key: 'discount', label: t('reports.columns.discount'), value: (row) => row.discountAmount },
      {
        key: 'grossProfit',
        label: t('reports.metrics.grossProfit'),
        value: (row) => row.partialGrossProfitAmount ?? row.grossProfitAmount,
      },
      {
        key: 'operatingCost',
        label: t('reports.columns.operatingCost'),
        value: (row) => row.operatingCostAmount,
      },
      { key: 'refund', label: t('reports.columns.refund'), value: (row) => row.refundAmount },
      {
        key: 'netProfit',
        label: t('reports.columns.netProfit'),
        value: (row) => row.partialNetProfitAmount ?? row.netProfitAmount,
      },
    ],
    [t],
  )

  const activeMetrics = useMemo(() => {
    if (metricFilter === 'core') {
      return sellerMatrixMetrics.filter((m) =>
        ['orders', 'revenue', 'grossProfit', 'netProfit'].includes(m.key),
      )
    }
    if (metricFilter === 'profit') {
      return sellerMatrixMetrics.filter((m) =>
        ['revenue', 'grossProfit', 'netProfit'].includes(m.key),
      )
    }
    return sellerMatrixMetrics
  }, [sellerMatrixMetrics, metricFilter])

  const sellerMatrixByCurrency = useMemo<SellerMatrixGroup[]>(() => {
    const grouped = new Map<
      string,
      { dates: Set<string>; sellers: Map<string, Map<string, SellerDailyProfit>> }
    >()
    data.forEach((row) => {
      const currency = row.currency || 'USD'
      const group = grouped.get(currency) || { dates: new Set<string>(), sellers: new Map() }
      const sellerKey = row.sellerEmployeeCode || row.sellerName || 'UNASSIGNED'
      const sellerRows = group.sellers.get(sellerKey) || new Map<string, SellerDailyProfit>()
      group.dates.add(row.date)
      sellerRows.set(row.date, row)
      group.sellers.set(sellerKey, sellerRows)
      grouped.set(currency, group)
    })

    const normalizedSearch = sellerSearch.trim().toLowerCase()

    return [...grouped.entries()].map(([currency, group]) => {
      const dates = selectedDates.length ? selectedDates : [...group.dates].sort()
      const rows = [...group.sellers.entries()]
        .filter(([, sellerRows]) => {
          if (!normalizedSearch) return true
          const firstRow = [...sellerRows.values()][0]
          const name = firstRow?.sellerName?.toLowerCase() || ''
          const code = firstRow?.sellerEmployeeCode?.toLowerCase() || ''
          return name.includes(normalizedSearch) || code.includes(normalizedSearch)
        })
        .sort(([, left], [, right]) => {
          const leftName = [...left.values()][0]?.sellerName || ''
          const rightName = [...right.values()][0]?.sellerName || ''
          return leftName.localeCompare(rightName)
        })
        .flatMap(([sellerKey, sellerRows]) => {
          const sellerName =
            [...sellerRows.values()][0]?.sellerName ||
            [...sellerRows.values()][0]?.sellerEmployeeCode ||
            '—'
          return activeMetrics.map((metric, metricIndex) => {
            const dateValues = Object.fromEntries(
              dates.map((date) => {
                const row = sellerRows.get(date)
                return [
                  date,
                  row ? (metric.value(row) ?? null) : metric.key === 'orders' ? 0 : null,
                ]
              }),
            )
            const totalValue = Object.values(dateValues).reduce<number>(
              (sum, value) => sum + (value || 0),
              0,
            )
            return {
              key: `${currency}-${sellerKey}-${metric.key}`,
              sellerName,
              sellerEmployeeCode: sellerKey === 'UNASSIGNED' ? null : sellerKey,
              metricKey: metric.key,
              metricLabel: metric.label,
              metricIndex,
              totalValue,
              dateValues,
            }
          })
        })
      return { currency, dates, rows }
    })
  }, [data, selectedDates, activeMetrics, sellerSearch])

  const columnsByCurrency = useMemo(() => {
    const map = new Map<string, TableColumnsType<SellerMatrixRow>>()
    sellerMatrixByCurrency.forEach((group) => {
      const cols: TableColumnsType<SellerMatrixRow> = [
        {
          title: t('reports.columns.seller'),
          width: 150,
          fixed: 'left',
          align: 'center',
          onCell: (row) => ({
            rowSpan: row.metricIndex === 0 ? activeMetrics.length : 0,
            className: styles.dailySellerCell,
          }),
          render: (_, row) =>
            row.metricIndex === 0 ? (
              <div className={styles.sellerNameWrapper}>
                <Typography.Text strong ellipsis title={row.sellerName}>
                  {row.sellerName}
                </Typography.Text>
                {row.sellerEmployeeCode ? (
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {row.sellerEmployeeCode}
                  </Typography.Text>
                ) : null}
              </div>
            ) : null,
        },
        {
          title: t('reports.columns.type'),
          dataIndex: 'metricLabel',
          width: 140,
          fixed: 'left',
          className: styles.dailyTypeCell,
          render: (label: string, row: SellerMatrixRow) => {
            const config = METRIC_STYLES[row.metricKey]
            return <Typography.Text strong={config?.isBold}>{label}</Typography.Text>
          },
        },
        {
          title: t('reports.columns.total'),
          width: 110,
          align: 'center',
          className: styles.dailyTotalCell,
          render: (_, row) => renderMatrixCellValue(row.metricKey, row.totalValue, group.currency),
        },
        ...(group.dates.map((date) => {
          const { date: displayDate, dayOfWeek } = formatHeaderDate(date, i18n.language)
          return {
            title: (
              <div className={styles.matrixDateHeader}>
                <span>{displayDate}</span>
                {dayOfWeek ? <span className={styles.matrixWeekday}>{dayOfWeek}</span> : null}
              </div>
            ),
            dataIndex: ['dateValues', date],
            width: 95,
            align: 'center' as const,
            render: (_: unknown, row: SellerMatrixRow) =>
              renderMatrixCellValue(row.metricKey, row.dateValues[date], group.currency),
          }
        }) as TableColumnsType<SellerMatrixRow>),
      ]
      map.set(group.currency, cols)
    })
    return map
  }, [sellerMatrixByCurrency, activeMetrics.length, t, i18n.language])

  return (
    <div className={styles.stack}>
      {displaySummaries.map((summary) => (
        <section
          key={summary.currency}
          className={styles.currencySection}
          aria-label={summary.currency}
        >
          {displaySummaries.length > 1 ? (
            <Typography.Text strong className={styles.currencyLabel}>
              {summary.currency}
            </Typography.Text>
          ) : null}
          <div className={styles.salesMetrics}>
            <MetricCard
              icon={<ShoppingCartOutlined />}
              variant="primary"
              label={t('reports.columns.orders')}
              value={summary.orderCount}
              loading={isPending}
            />
            <MetricCard
              icon={<DollarOutlined />}
              variant="info"
              label={t('reports.columns.revenue')}
              value={formatReportMoney(summary.revenueAmount, summary.currency)}
              loading={isPending}
            />
            <MetricCard
              icon={<DollarOutlined />}
              variant="warning"
              label={t('reports.columns.fulfillmentCost')}
              value={
                summary.totalCostAmount === null
                  ? '—'
                  : formatReportMoney(summary.totalCostAmount, summary.currency)
              }
              loading={isPending}
            />
            <MetricCard
              icon={<RiseOutlined />}
              variant="success"
              label={t('reports.metrics.netProfit')}
              value={
                summary.netProfitAmount === null
                  ? '—'
                  : formatReportMoney(summary.netProfitAmount, summary.currency)
              }
              loading={isPending}
            />
            <MetricCard
              icon={<MinusCircleOutlined />}
              variant="danger"
              label={t('reports.metrics.adjustments')}
              value={formatReportMoney(summary.adjustmentsAmount, summary.currency)}
              loading={isPending}
            />
          </div>
        </section>
      ))}

      {filterBar}

      {canCompareSellers && hasMultipleSellers ? (
        <div className={styles.chartToggleRow}>
          <Button
            size="small"
            icon={showChart ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setShowChart((prev) => !prev)}
          >
            {showChart
              ? t('reports.profitability.hideChart')
              : t('reports.profitability.showChart')}
          </Button>
        </div>
      ) : null}
      {canCompareSellers && showChart
        ? sellerRowsByCurrency
            .filter(({ rows }) => rows.length > 1)
            .map(({ currency, rows }) => (
              <ReportProfitComparisonChart
                key={currency}
                rows={rows}
                currency={currency}
                variant="sales"
              />
            ))
        : null}
      {sellerMatrixByCurrency.map((group) => (
        <SectionCard
          key={group.currency}
          title={`${t('reports.profitability.dailyTable')} · ${group.currency}`}
          extra={
            <Space wrap size="middle">
              <Input
                placeholder={t('reports.profitability.searchSeller')}
                prefix={<SearchOutlined style={{ color: 'var(--ant-color-text-quaternary)' }} />}
                allowClear
                size="small"
                value={sellerSearch}
                onChange={(e) => setSellerSearch(e.target.value)}
                style={{ width: 170 }}
              />
              <Segmented
                size="small"
                value={metricFilter}
                onChange={(val) => setMetricFilter(val as MetricFilterKey)}
                options={[
                  { label: t('reports.profitability.allMetrics'), value: 'all' },
                  { label: t('reports.profitability.coreMetrics'), value: 'core' },
                  { label: t('reports.profitability.profitOnly'), value: 'profit' },
                ]}
              />
            </Space>
          }
        >
          <CoreDataTable
            bordered
            className={styles.dailyTable}
            tableLayout="fixed"
            rowKey="key"
            dataSource={group.rows}
            loading={isPending}
            pagination={false}
            rowClassName={(row) => {
              if (row.metricKey === 'grossProfit') return styles.dailyRowGrossProfit
              if (row.metricKey === 'netProfit') return styles.dailyRowNetProfit
              if (row.metricIndex === 0) return styles.dailySellerGroupStart
              return ''
            }}
            columns={columnsByCurrency.get(group.currency) || []}
            scroll={{ x: 400 + group.dates.length * 95, y: 600 }}
          />
        </SectionCard>
      ))}
    </div>
  )
}
