import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DollarOutlined,
  MinusCircleOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons'
import { Typography, type TableColumnsType } from 'antd'

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
}

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
    dotColor: string
    textColor?: string
    isBold?: boolean
  }
> = {
  orders: { dotColor: 'var(--ant-color-primary)' },
  revenue: {
    dotColor: 'var(--ant-color-primary)',
    textColor: 'var(--ant-color-primary)',
    isBold: true,
  },
  fulfillmentCost: { dotColor: 'var(--ant-color-warning)', textColor: 'var(--ant-color-warning)' },
  fee: { dotColor: 'var(--ant-color-warning)', textColor: 'var(--ant-color-warning)' },
  adSpend: { dotColor: '#7248ba', textColor: '#7248ba' },
  discount: { dotColor: 'var(--ant-color-error)', textColor: 'var(--ant-color-error)' },
  grossProfit: {
    dotColor: 'var(--ant-color-success)',
    textColor: 'var(--ant-color-success)',
    isBold: true,
  },
  operatingCost: {
    dotColor: 'var(--ant-color-text-secondary)',
    textColor: 'var(--ant-color-text-secondary)',
  },
  refund: { dotColor: 'var(--ant-color-error)', textColor: 'var(--ant-color-error)' },
  netProfit: {
    dotColor: 'var(--ant-color-primary)',
    textColor: 'var(--ant-color-primary)',
    isBold: true,
  },
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
    const isNegative = value < 0
    const color = isNegative
      ? 'var(--ant-color-error)'
      : metricKey === 'grossProfit'
        ? 'var(--ant-color-success)'
        : 'var(--ant-color-primary)'
    return <span style={{ color, fontWeight: 700 }}>{text}</span>
  }

  if (metricKey === 'revenue') {
    return <span style={{ color: 'var(--ant-color-primary)', fontWeight: 600 }}>{text}</span>
  }

  if (metricKey === 'fulfillmentCost') {
    return <span style={{ color: 'var(--ant-color-warning)', fontWeight: 500 }}>{text}</span>
  }

  if (metricKey === 'fee') {
    return <span style={{ color: 'var(--ant-color-warning)' }}>{text}</span>
  }

  if (metricKey === 'adSpend') {
    return <span style={{ color: value > 0 ? '#7248ba' : undefined }}>{text}</span>
  }

  if (metricKey === 'discount') {
    return <span style={{ color: value > 0 ? 'var(--ant-color-error)' : undefined }}>{text}</span>
  }

  if (metricKey === 'refund') {
    return (
      <span
        style={{
          color: value > 0 ? 'var(--ant-color-error)' : undefined,
          fontWeight: value > 0 ? 600 : undefined,
        }}
      >
        {text}
      </span>
    )
  }

  if (metricKey === 'operatingCost') {
    return <span style={{ color: 'var(--ant-color-text-secondary)' }}>{text}</span>
  }

  if (metricKey === 'orders') {
    return <span style={{ fontWeight: 500 }}>{text}</span>
  }

  return <span>{text}</span>
}

export function ReportSalesTab({
  data = [],
  isPending,
  canCompareSellers,
  dates: selectedDates = [],
}: ReportSalesTabProps) {
  const { t } = useTranslation()
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

    return [...grouped.entries()].map(([currency, group]) => {
      const dates = selectedDates.length ? selectedDates : [...group.dates].sort()
      const rows = [...group.sellers.entries()]
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
          return sellerMatrixMetrics.map((metric, metricIndex) => {
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
  }, [data, selectedDates, sellerMatrixMetrics])

  const getSellerMatrixColumns = (currency: string, dates: string[]) =>
    [
      {
        title: t('reports.columns.seller'),
        width: 190,
        fixed: 'left',
        align: 'center',
        onCell: (row) => ({
          rowSpan: row.metricIndex === 0 ? sellerMatrixMetrics.length : 0,
          className: styles.dailySellerCell,
        }),
        render: (_, row) =>
          row.metricIndex === 0 ? (
            <div className={styles.sellerNameWrapper}>
              <Typography.Text strong>{row.sellerName}</Typography.Text>
              {row.sellerEmployeeCode ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {row.sellerEmployeeCode}
                </Typography.Text>
              ) : null}
            </div>
          ) : null,
      },
      {
        title: t('reports.columns.type'),
        dataIndex: 'metricLabel',
        width: 180,
        fixed: 'left',
        className: styles.dailyTypeCell,
        render: (label: string, row: SellerMatrixRow) => {
          const config = METRIC_STYLES[row.metricKey]
          return (
            <div className={styles.typeLabelCell}>
              <span className={styles.metricDot} style={{ backgroundColor: config.dotColor }} />
              <Typography.Text
                strong={config.isBold}
                style={config.textColor ? { color: config.textColor } : undefined}
              >
                {label}
              </Typography.Text>
            </div>
          )
        },
      },
      {
        title: t('reports.columns.total'),
        width: 130,
        align: 'center',
        className: styles.dailyTotalCell,
        render: (_, row) => renderMatrixCellValue(row.metricKey, row.totalValue, currency),
      },
      ...(dates.map((date) => ({
        title: date.slice(5),
        dataIndex: ['dateValues', date],
        width: 120,
        align: 'center' as const,
        render: (_: unknown, row: SellerMatrixRow) =>
          renderMatrixCellValue(row.metricKey, row.dateValues[date], currency),
      })) as TableColumnsType<SellerMatrixRow>),
    ] as TableColumnsType<SellerMatrixRow>

  return (
    <div className={styles.stack}>
      {summaries.map((summary) => (
        <section
          key={summary.currency}
          className={styles.currencySection}
          aria-label={summary.currency}
        >
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
      {canCompareSellers
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
        >
          <CoreDataTable
            bordered
            className={styles.dailyTable}
            tableLayout="fixed"
            rowKey="key"
            dataSource={group.rows}
            loading={isPending}
            pagination={false}
            virtual
            rowClassName={(row) => {
              if (row.metricKey === 'grossProfit') return styles.dailyRowGrossProfit
              if (row.metricKey === 'netProfit') return styles.dailyRowNetProfit
              if (row.metricIndex === 0) return styles.dailySellerGroupStart
              return ''
            }}
            columns={getSellerMatrixColumns(group.currency, group.dates)}
            scroll={{ x: 500 + group.dates.length * 120, y: 560 }}
          />
        </SectionCard>
      ))}
    </div>
  )
}
