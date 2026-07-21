function numberValue(value) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

const SALES_CHANNEL_LABELS = {
  AMAZON: 'Amazon',
  EBAY: 'eBay',
  ETSY: 'Etsy',
  SHOPIFY: 'Shopify',
  TIKTOK_SHOP: 'TikTok Shop',
  WALMART: 'Walmart',
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

export function getSalesChannelLabel(code, unknownLabel = 'Unknown channel') {
  const key = String(code || '')
    .trim()
    .toUpperCase()
  if (!key || key === 'UNKNOWN') return unknownLabel
  return (
    SALES_CHANNEL_LABELS[key] ||
    key
      .toLowerCase()
      .split('_')
      .map((part) => `${part[0]?.toUpperCase() || ''}${part.slice(1)}`)
      .join(' ')
  )
}

export function getProfitTone(amount) {
  return amount < 0 ? 'danger' : amount > 0 ? 'success' : 'default'
}

export function getAnalyticsRowsState({ hasAccess, isError, isPending, rows = [] }) {
  if (!hasAccess || isError) return 'unavailable'
  if (isPending) return 'loading'
  return rows.length ? 'ready' : 'empty'
}

export function buildChannelMixRows(rows = [], metric) {
  return Object.values(
    rows.reduce((result, row) => {
      const salesChannelCode = String(row.salesChannelCode || 'UNKNOWN').toUpperCase()
      result[salesChannelCode] = result[salesChannelCode] || { salesChannelCode, amount: 0 }
      result[salesChannelCode].amount += numberValue(row[metric])
      return result
    }, {}),
  )
    .map((row) => ({ ...row, magnitude: Math.abs(row.amount), isLoss: row.amount < 0 }))
    .filter((row) => row.magnitude > 0)
    .sort((left, right) => right.magnitude - left.magnitude)
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
  const acquisitionRows = [...channelPerformance]
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
    .sort((left, right) => right.spendAmount - left.spendAmount)

  return {
    acquisitionRows,
    currencies: [
      ...new Set([...Object.keys(byCurrency), ...acquisitionRows.map((row) => row.currency)]),
    ].sort(),
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
