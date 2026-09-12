import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useRouteLoaderData } from 'react-router-dom'
import { DollarOutlined, DownloadOutlined, FundOutlined, RiseOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Select, Space, Typography } from 'antd'
import dayjs from 'dayjs'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  DateRangePicker,
  FilterBar,
  MetricCard,
  SectionCard,
  UiTabLabel,
  UiTabs,
} from '@/shared/ui'

import type { ReportFilters, SellerDailyProfit, SellerPerformance } from '../api/reportApi'
import { ReportAdsEmployeeTab } from '../components/ReportAdsEmployeeTab'
import { ReportAdsTab } from '../components/ReportAdsTab'
import { ReportCoverageStrip } from '../components/ReportCoverageStrip'
import { formatReportMoney, formatReportPercent } from '../components/reportFormatters'
import { ReportOrderCostTab } from '../components/ReportOrderCostTab'
import { ReportProfitComparisonChart } from '../components/ReportProfitComparisonChart'
import { ReportSalesTab } from '../components/ReportSalesTab'
import { ReportTeamTab } from '../components/ReportTeamTab'
import { type ProfitabilityView, type TabKey, useReportData } from '../hooks/useReportData'
import styles from './ReportWorkspacePage.module.scss'

type DailyMatrixRow = {
  key: string
  seller: string
  metric: string
  metricKey: keyof SellerDailyProfit
  sellerGroup: number
  isFirstSellerRow: boolean
  total: number | null
  values: Record<string, number | null>
}

type SelectFilterKey = Exclude<keyof ReportFilters, 'dateBasis' | 'page' | 'limit'>

const datesInRange = (dateFrom?: string, dateTo?: string) => {
  const start = dayjs(dateFrom).startOf('day')
  const end = dayjs(dateTo).startOf('day')
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return []
  const dates: string[] = []
  for (let date = start; !date.isAfter(end, 'day'); date = date.add(1, 'day')) {
    dates.push(date.format('YYYY-MM-DD'))
  }
  return dates
}

const SALES_CHANNEL_BY_ROUTE: Record<string, 'AMAZON' | 'ETSY'> = {
  amazon: 'AMAZON',
  etsy: 'ETSY',
}

const TAB_BY_REPORT_VIEW: Record<string, TabKey> = {
  'order-cost': 'order-cost',
  ads: 'ads-employee',
  sales: 'sales-profit',
}

export function ReportWorkspacePage() {
  const { t } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const { salesChannelCode: routeSalesChannelCode, reportView } = useParams()
  const fixedSalesChannelCode = SALES_CHANNEL_BY_ROUTE[routeSalesChannelCode?.toLowerCase() ?? '']
  const [selectedTab, setSelectedTab] = useState<TabKey>('overview')
  const [orderCostPage, setOrderCostPage] = useState(1)
  const dedicatedTab = TAB_BY_REPORT_VIEW[reportView?.toLowerCase() ?? '']
  const activeTab = dedicatedTab || selectedTab
  const isDedicatedReport = Boolean(dedicatedTab)
  const [profitabilityView, setProfitabilityView] = useState<ProfitabilityView>('summary')
  const [filters, setFilters] = useState<ReportFilters>(() => ({
    dateFrom: dayjs().subtract(6, 'day').startOf('day').toISOString(),
    dateTo: dayjs().endOf('day').toISOString(),
    dateBasis: 'ORDERED_AT',
  }))
  const effectiveFilters = fixedSalesChannelCode
    ? { ...filters, salesChannelCode: fixedSalesChannelCode }
    : filters
  const reportFilters =
    activeTab === 'order-cost' ? { ...effectiveFilters, page: orderCostPage } : effectiveFilters
  const reportDates = datesInRange(filters.dateFrom, filters.dateTo)

  const globalRead = account.permissions.includes('REPORTS:READ')
  const operationalScope =
    globalRead ||
    account.scopes.some(
      (scope) => scope.scopeType === 'shop' && scope.permissions.includes('REPORTS:READ'),
    )

  const {
    options,
    sellers,
    coverage,
    sellerDaily,
    orderProfitability,
    adsSellerDaily,
    teams,
    channels,
    adsDaily,
    exportCsv,
  } = useReportData({
    filters: reportFilters,
    activeTab,
    profitabilityView,
    operationalScope,
  })

  const filterOptions = options.data

  const handleFilterChange = useCallback((key: keyof ReportFilters, value?: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setOrderCostPage(1)
  }, [])

  const select = useCallback(
    (
      key: SelectFilterKey,
      placeholder: string,
      values: Array<{ value: string; label: string }>,
    ) => (
      <Select
        allowClear
        showSearch
        optionFilterProp="label"
        value={filters[key]}
        placeholder={placeholder}
        options={values}
        onChange={(value) => handleFilterChange(key, value)}
      />
    ),
    [filters, handleFilterChange],
  )

  const handleDateRangeChange = useCallback((range: { dateFrom?: string; dateTo?: string }) => {
    setFilters((current) => ({ ...current, ...range }))
    setOrderCostPage(1)
  }, [])

  const handleTabChange = useCallback((key: string) => {
    setSelectedTab(key as TabKey)
  }, [])

  const exportButton = (
    <span className={styles.filterAction} data-testid="reports-tab-actions">
      <Button
        icon={<DownloadOutlined />}
        loading={exportCsv.isPending}
        onClick={() => exportCsv.mutate()}
      >
        {t('reports.exportCsv')}
      </Button>
    </span>
  )

  const sellersByCurrency = useMemo(
    () =>
      Object.entries(
        (sellers.data || []).reduce<Record<string, SellerPerformance[]>>((result, row) => {
          const currency = row.currency || 'USD'
          result[currency] = [...(result[currency] || []), row]
          return result
        }, {}),
      ),
    [sellers.data],
  )

  const sellerColumns: TableColumnsType<SellerPerformance> = useMemo(
    () => [
      {
        title: t('reports.columns.seller'),
        width: 200,
        ellipsis: true,
        render: (_, row) => row.sellerName || row.sellerEmployeeCode || '—',
      },
      {
        title: t('reports.columns.items'),
        dataIndex: 'itemCount',
        width: 80,
        align: 'right',
        sorter: (a, b) => a.itemCount - b.itemCount,
      },
      {
        title: t('reports.columns.revenue'),
        width: 120,
        align: 'right',
        sorter: (a, b) => a.revenueAmount - b.revenueAmount,
        render: (_, row) => formatReportMoney(row.revenueAmount, row.currency || 'USD'),
      },
      {
        title: t('reports.columns.baseCost'),
        width: 120,
        align: 'right',
        sorter: (a, b) => a.baseCostAmount - b.baseCostAmount,
        render: (_, row) => formatReportMoney(row.baseCostAmount, row.currency || 'USD'),
      },
      {
        title: t('reports.columns.operatingCost'),
        width: 128,
        align: 'right',
        sorter: (a, b) => a.operatingCostAmount - b.operatingCostAmount,
        render: (_, row) => formatReportMoney(row.operatingCostAmount, row.currency || 'USD'),
      },
      {
        title: t('reports.columns.spend'),
        width: 110,
        align: 'right',
        sorter: (a, b) => (a.adSpendAmount || 0) - (b.adSpendAmount || 0),
        render: (_, row) => formatReportMoney(row.adSpendAmount || 0, row.currency || 'USD'),
      },
      {
        title: t('reports.columns.netProfit'),
        width: 120,
        align: 'right',
        sorter: (a, b) => (a.netProfitAmount ?? -Infinity) - (b.netProfitAmount ?? -Infinity),
        render: (_, row) =>
          row.netProfitAmount === null
            ? '—'
            : formatReportMoney(row.netProfitAmount, row.currency || 'USD'),
      },
      {
        title: t('reports.columns.margin'),
        width: 90,
        align: 'right',
        sorter: (a, b) => (a.netMarginBps ?? -Infinity) - (b.netMarginBps ?? -Infinity),
        render: (_, row) => formatReportPercent(row.netMarginBps),
      },
    ],
    [t],
  )

  const filterBar = (
    <FilterBar label={t('reports.filters.label')} contentClassName={styles.filters}>
      {select(
        'shopId',
        t('reports.filters.shop'),
        (filterOptions?.shops || []).map((row) => ({
          value: row.id,
          label: row.name || row.code || t('reports.filters.unnamed'),
        })),
      )}
      {fixedSalesChannelCode
        ? null
        : select(
            'salesChannelCode',
            t('reports.filters.channel'),
            (filterOptions?.channels || []).map((value) => ({ value, label: value })),
          )}
      {select(
        'marketplaceCode',
        t('reports.filters.marketplace'),
        (filterOptions?.marketplaces || []).map((value) => ({ value, label: value })),
      )}
      {select(
        'sellerEmployeeCode',
        t('reports.filters.seller'),
        (filterOptions?.sellers || []).map((row) => ({
          value: row.employeeCode,
          label: `${row.employeeCode} · ${row.name || t('reports.filters.unnamed')}`,
        })),
      )}
      {select(
        'teamId',
        t('reports.filters.team'),
        (filterOptions?.teams || []).map((row) => ({
          value: row.id,
          label: row.name || row.code || t('reports.filters.unnamed'),
        })),
      )}
      {select(
        'departmentId',
        t('reports.filters.department'),
        (filterOptions?.departments || []).map((row) => ({
          value: row.id,
          label: row.name || row.code || t('reports.filters.unnamed'),
        })),
      )}
      <div className={styles.dateFilter}>
        <DateRangePicker
          value={{ dateFrom: filters.dateFrom, dateTo: filters.dateTo }}
          aria-label={t('reports.filters.date')}
          placeholder={[t('reports.filters.from'), t('reports.filters.to')]}
          style={{ maxWidth: 'none' }}
          onChange={handleDateRangeChange}
        />
      </div>
      {exportButton}
    </FilterBar>
  )

  const profitabilityFormula = () => (
    <SectionCard title={t('reports.profitability.explanation')}>
      <Space orientation="vertical" size={4}>
        <Typography.Text>{t('reports.profitability.grossFormula')}</Typography.Text>
        <Typography.Text strong>{t('reports.profitability.netFormula')}</Typography.Text>
        <Typography.Text type="secondary">
          {t('reports.profitability.excludedCostNote')}
        </Typography.Text>
        <Typography.Text type="secondary">{t('reports.profitability.dataNote')}</Typography.Text>
      </Space>
    </SectionCard>
  )

  const sellerProfitabilitySummary = (
    <div className={styles.stack}>
      {sellersByCurrency.map(([currency, rows]) => {
        const revenue = rows.reduce((total, row) => total + row.revenueAmount, 0)
        const grossProfit = rows.some((row) => row.grossProfitAmount === null)
          ? null
          : rows.reduce((total, row) => total + (row.grossProfitAmount ?? 0), 0)
        const netProfit = rows.some((row) => row.netProfitAmount === null)
          ? null
          : rows.reduce((total, row) => total + (row.netProfitAmount ?? 0), 0)
        return (
          <section key={currency} className={styles.currencySection} aria-label={currency}>
            <Typography.Text strong className={styles.currencyLabel}>
              {currency}
            </Typography.Text>
            <div className={styles.metrics}>
              <MetricCard
                icon={<FundOutlined />}
                variant="primary"
                label={t('reports.metrics.sellers')}
                value={String(rows.length)}
              />
              <MetricCard
                icon={<DollarOutlined />}
                variant="info"
                label={t('reports.metrics.revenue')}
                value={formatReportMoney(revenue, currency)}
              />
              <MetricCard
                icon={<RiseOutlined />}
                variant="success"
                label={t('reports.metrics.grossProfit')}
                value={grossProfit === null ? '—' : formatReportMoney(grossProfit, currency)}
              />
              <MetricCard
                icon={<RiseOutlined />}
                variant="success"
                label={t('reports.metrics.netProfit')}
                value={netProfit === null ? '—' : formatReportMoney(netProfit, currency)}
              />
            </div>
            <ReportProfitComparisonChart rows={rows} currency={currency} />
            <SectionCard title={t('reports.profitability.table')}>
              <CoreDataTable
                className={styles.dailyTable}
                tableLayout="fixed"
                rowKey={(row) => `${row.sellerEmployeeCode}-${row.currency}`}
                columns={sellerColumns}
                dataSource={rows}
                loading={sellers.isPending}
                pagination={false}
                scroll={{ x: 970 }}
              />
            </SectionCard>
          </section>
        )
      })}
    </div>
  )

  const sellerDailySections = useMemo(() => {
    const metrics: Array<{ key: keyof SellerDailyProfit; label: string }> = [
      { key: 'orderCount', label: t('reports.columns.orders') },
      { key: 'revenueAmount', label: t('reports.columns.revenue') },
      { key: 'baseCostAmount', label: t('reports.columns.baseCost') },
      { key: 'additionalFulfillmentCostAmount', label: t('reports.columns.fulfillmentCost') },
      { key: 'marketplaceFeeAmount', label: t('reports.columns.marketplaceFee') },
      { key: 'adSpendAmount', label: t('reports.columns.spend') },
      { key: 'refundAmount', label: t('reports.columns.refund') },
      { key: 'discountAmount', label: t('reports.columns.discount') },
      { key: 'grossProfitAmount', label: t('reports.metrics.grossProfit') },
      { key: 'operatingCostAmount', label: t('reports.columns.operatingCost') },
      { key: 'netProfitAmount', label: t('reports.columns.netProfit') },
    ]
    const byCurrency = new Map<string, SellerDailyProfit[]>()
    ;(sellerDaily.data || []).forEach((row) => {
      const currency = row.currency || 'USD'
      byCurrency.set(currency, [...(byCurrency.get(currency) || []), row])
    })
    return [...byCurrency.entries()].map(([currency, rows]) => {
      const dates = datesInRange(filters.dateFrom, filters.dateTo)
      if (!dates.length) dates.push(...new Set(rows.map((row) => row.date)).values())
      const sellersByKey = new Map<string, SellerDailyProfit[]>()
      rows.forEach((row) => {
        const key = `${row.sellerEmployeeCode || 'UNASSIGNED'}-${row.sellerName || ''}`
        sellersByKey.set(key, [...(sellersByKey.get(key) || []), row])
      })
      const matrixRows: DailyMatrixRow[] = [...sellersByKey.entries()].flatMap(
        ([sellerKey, sellerRows], sellerGroup) =>
          metrics.map(({ key, label }, metricIndex) => {
            const sellerName = sellerRows[0]?.sellerName || sellerRows[0]?.sellerEmployeeCode || '—'
            const values = Object.fromEntries(
              dates.map((date) => {
                const row = sellerRows.find((item) => item.date === date)
                const value = row?.[key]
                if (key === 'orderCount') return [date, Number(value || 0)]
                return [date, value === null || value === undefined ? null : Number(value)]
              }),
            )
            const knownValues = Object.values(values).filter(
              (value): value is number => value !== null,
            )
            return {
              key: `${sellerKey}-${key}`,
              seller: metricIndex === 0 ? sellerName : '',
              metric: label,
              metricKey: key,
              sellerGroup,
              isFirstSellerRow: metricIndex === 0,
              total: knownValues.length
                ? knownValues.reduce((total, value) => total + value, 0)
                : null,
              values,
            }
          }),
      )
      return { currency, dates, matrixRows }
    })
  }, [filters.dateFrom, filters.dateTo, sellerDaily.data, t])

  const sellerDailyTab = (
    <div className={styles.stack}>
      {profitabilityFormula()}
      {sellerDailySections.map(({ currency, dates, matrixRows }) => {
        const renderAmount = (amount: number | null, row: DailyMatrixRow) => {
          if (amount === null) return '—'
          if (row.metricKey === 'orderCount') return <span>{amount}</span>
          const className =
            row.metricKey === 'revenueAmount'
              ? styles.dailyMoneyRevenue
              : row.metricKey === 'netProfitAmount'
                ? amount < 0
                  ? styles.dailyMoneyLoss
                  : styles.dailyMoneyProfit
                : styles.dailyMoneyCost
          return <span className={className}>{formatReportMoney(amount, currency)}</span>
        }
        const columns: TableColumnsType<DailyMatrixRow> = [
          {
            title: t('reports.columns.seller'),
            dataIndex: 'seller',
            width: 150,
            fixed: 'left',
            render: (_, row) =>
              row.seller ? <Typography.Text strong>{row.seller}</Typography.Text> : null,
            onCell: () => ({ className: styles.dailySellerCell }),
          },
          {
            title: t('reports.columns.metric'),
            dataIndex: 'metric',
            width: 176,
            fixed: 'left',
            render: (_, row) => <span className={styles.dailyMetric}>{row.metric}</span>,
            onCell: () => ({ className: styles.dailyMetricCell }),
          },
          {
            title: t('reports.columns.total'),
            width: 116,
            fixed: 'left',
            align: 'right',
            render: (_, row) => renderAmount(row.total, row),
            onCell: () => ({ className: styles.dailyTotalCell }),
          },
          ...dates.map((date) => {
            const d = dayjs(date)
            return {
              title: (
                <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
                  <div>{d.format('DD/MM')}</div>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {d.format('ddd')}
                  </Typography.Text>
                </div>
              ),
              width: 112,
              align: 'right' as const,
              render: (_: unknown, row: DailyMatrixRow) => renderAmount(row.values[date], row),
            }
          }),
        ]
        return (
          <section key={currency} className={styles.currencySection} aria-label={currency}>
            <Typography.Text strong className={styles.currencyLabel}>
              {currency}
            </Typography.Text>
            <SectionCard title={t('reports.profitability.dailyTable')}>
              <CoreDataTable
                className={styles.dailyTable}
                tableLayout="fixed"
                rowKey="key"
                columns={columns}
                dataSource={matrixRows}
                loading={sellerDaily.isPending}
                pagination={false}
                scroll={{ x: 520 + dates.length * 112, y: 560 }}
                rowClassName={(row) =>
                  [
                    row.metricKey === 'grossProfitAmount'
                      ? styles.dailyRowGrossProfit
                      : row.metricKey === 'netProfitAmount'
                        ? styles.dailyRowNetProfit
                        : row.sellerGroup % 2
                          ? styles.dailySellerStripe
                          : '',
                    row.isFirstSellerRow ? styles.dailySellerGroupStart : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                }
              />
            </SectionCard>
          </section>
        )
      })}
    </div>
  )

  const sellerProfitabilityTab = (
    <div className={styles.stack}>
      <ReportCoverageStrip rows={coverage.data} dateBasis={filters.dateBasis} />
      <Space className={styles.profitabilityMode}>
        <Button
          type={profitabilityView === 'summary' ? 'primary' : 'default'}
          onClick={() => setProfitabilityView('summary')}
        >
          {t('reports.profitability.summary')}
        </Button>
        <Button
          type={profitabilityView === 'daily' ? 'primary' : 'default'}
          onClick={() => setProfitabilityView('daily')}
        >
          {t('reports.profitability.daily')}
        </Button>
      </Space>
      {profitabilityView === 'summary' ? sellerProfitabilitySummary : sellerDailyTab}
    </div>
  )

  const reportContent =
    activeTab === 'order-cost' ? (
      <ReportOrderCostTab
        data={orderProfitability.data}
        isPending={orderProfitability.isPending}
        onPageChange={setOrderCostPage}
      />
    ) : activeTab === 'ads-employee' ? (
      <ReportAdsEmployeeTab data={adsSellerDaily.data} isPending={adsSellerDaily.isPending} />
    ) : activeTab === 'sales-profit' ? (
      <ReportSalesTab
        data={sellerDaily.data}
        isPending={sellerDaily.isPending}
        canCompareSellers={operationalScope}
        dates={reportDates}
      />
    ) : activeTab === 'overview' ? (
      sellerProfitabilityTab
    ) : activeTab === 'sales' ? (
      <ReportAdsTab
        operationalScope={operationalScope}
        adsDailyData={adsDaily.data}
        isAdsDailyPending={adsDaily.isPending}
        channelsData={channels.data}
        isChannelsPending={channels.isPending}
      />
    ) : (
      <ReportTeamTab teamsData={teams.data} isTeamsPending={teams.isPending} />
    )

  return (
    <div className={styles.page}>
      {filterBar}
      {isDedicatedReport ? (
        <div className={styles.stack}>{reportContent}</div>
      ) : (
        <UiTabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            {
              key: 'overview',
              label: <UiTabLabel>{t('reports.tabs.profitability')}</UiTabLabel>,
              children: sellerProfitabilityTab,
            },
            {
              key: 'sales',
              label: <UiTabLabel>{t('reports.tabs.ads')}</UiTabLabel>,
              children: (
                <ReportAdsTab
                  operationalScope={operationalScope}
                  adsDailyData={adsDaily.data}
                  isAdsDailyPending={adsDaily.isPending}
                  channelsData={channels.data}
                  isChannelsPending={channels.isPending}
                />
              ),
            },
            {
              key: 'operations',
              label: <UiTabLabel>{t('reports.tabs.teams')}</UiTabLabel>,
              children: <ReportTeamTab teamsData={teams.data} isTeamsPending={teams.isPending} />,
            },
          ]}
        />
      )}
    </div>
  )
}
