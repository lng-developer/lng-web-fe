export function summarizeAdsCurrency(rows, currency) {
  const totals = rows
    .filter((row) => (row.currency || 'USD') === currency)
    .reduce(
      (result, row) => {
        for (const key of Object.keys(result)) result[key] += Number(row[key] || 0)
        return result
      },
      {
        spendAmount: 0,
        attributedSalesAmount: 0,
        clicks: 0,
        attributedOrdersCount: 0,
        impressions: 0,
        newBuyerCount: 0,
      },
    )

  return {
    ...totals,
    roas: totals.spendAmount ? totals.attributedSalesAmount / totals.spendAmount : null,
    cpcAmount: totals.clicks ? totals.spendAmount / totals.clicks : null,
  }
}

export function groupAdsDailyRows(rows) {
  return Object.values(
    rows.reduce((result, row) => {
      const currency = row.currency || 'USD'
      const key = `${row.reportDate}-${currency}`
      const current = result[key] || {
        reportDate: row.reportDate,
        currency,
        spendAmount: 0,
        attributedSalesAmount: 0,
      }
      current.spendAmount += Number(row.spendAmount || 0)
      current.attributedSalesAmount += Number(row.attributedSalesAmount || 0)
      result[key] = current
      return result
    }, {}),
  ).sort((left, right) => String(left.reportDate).localeCompare(String(right.reportDate)))
}

export function getAdsQualityState(row) {
  if (row.sellerEmployeeCode === 'UNASSIGNED') return 'UNASSIGNED_SELLER'
  if (row.status === 'PARTIAL_FAILED') return 'PARTIAL_IMPORT'
  if (row.status === 'FAILED') return 'FAILED_IMPORT'
  return null
}

export function getAdsFilterOptions(rows, channel) {
  const unique = (values) => [...new Set(values.filter(Boolean))].sort()

  return {
    channels: unique(rows.map((row) => row.salesChannelCode)),
    marketplaces: unique(
      rows
        .filter((row) => !channel || row.salesChannelCode === channel)
        .map((row) => row.marketplaceCode),
    ),
    currencies: unique(rows.map((row) => row.currency)),
  }
}
