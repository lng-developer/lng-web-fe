function numberValue(value) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

function toUtcDate(value) {
  return value.toISOString().slice(0, 10)
}

export function buildLastDaysQuery(days = 30, now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - Math.max(Number(days) || 1, 1) + 1)
  return { dateFrom: toUtcDate(start), dateTo: toUtcDate(end) }
}

export function buildCommercialDashboard({
  channelPerformance = [],
  dailyProfit = [],
  buyerInsights = {},
} = {}) {
  const byCurrency = dailyProfit.reduce((result, row) => {
    const currency = row.currency || 'USD'
    const current = result[currency] || {
      revenueAmount: 0,
      baseCostAmount: 0,
      grossProfitAmount: 0,
      adSpendAmount: 0,
      netProfitAmount: 0,
      itemCount: 0,
    }
    current.revenueAmount += numberValue(row.revenueAmount)
    current.baseCostAmount += numberValue(row.baseCostAmount)
    current.grossProfitAmount += numberValue(row.grossProfitAmount)
    current.adSpendAmount += numberValue(row.adSpendAmount)
    current.netProfitAmount += numberValue(row.netProfitAmount)
    current.itemCount += numberValue(row.itemCount)
    result[currency] = current
    return result
  }, {})

  Object.values(byCurrency).forEach((total) => {
    total.netMarginBps = total.revenueAmount
      ? Math.round((total.netProfitAmount / total.revenueAmount) * 10000)
      : null
  })

  const knownBuyerCount = numberValue(buyerInsights.knownBuyerCount)
  const repeatBuyerCount = numberValue(buyerInsights.repeatBuyerCount)
  const returningBuyerCount = numberValue(buyerInsights.returningBuyerCount)

  return {
    acquisitionRows: [...channelPerformance]
      .map((row) => {
        const spendAmount = numberValue(row.spendAmount)
        const attributedSalesAmount = numberValue(row.attributedSalesAmount)
        const newBuyerCount = numberValue(row.newBuyerCount)

        return {
          salesChannelCode: row.salesChannelCode || 'UNKNOWN',
          marketplaceCode: row.marketplaceCode || null,
          currency: row.currency || 'USD',
          spendAmount,
          attributedSalesAmount,
          impressions: numberValue(row.impressions),
          clicks: numberValue(row.clicks),
          attributedOrdersCount: numberValue(row.attributedOrdersCount),
          newBuyerCount,
          ctrBps: row.ctrBps ?? null,
          conversionBps: row.conversionBps ?? null,
          cpaAmount: newBuyerCount
            ? (row.cpaAmount ?? Math.round(spendAmount / newBuyerCount))
            : null,
          roas: spendAmount ? attributedSalesAmount / spendAmount : null,
        }
      })
      .sort((left, right) => right.spendAmount - left.spendAmount),
    currencies: Object.keys(byCurrency).sort(),
    byCurrency,
    buyer: {
      knownBuyerCount,
      newBuyerCount: numberValue(buyerInsights.newBuyerCount),
      returningBuyerCount,
      returningBuyerRateBps: knownBuyerCount
        ? Math.round((returningBuyerCount / knownBuyerCount) * 10000)
        : null,
      repeatBuyerCount,
      repeatPurchaseRateBps: knownBuyerCount
        ? Math.round((repeatBuyerCount / knownBuyerCount) * 10000)
        : null,
      unidentifiedOrderCount: numberValue(buyerInsights.unidentifiedOrderCount),
      totalOrderCount: numberValue(buyerInsights.totalOrderCount),
    },
  }
}
