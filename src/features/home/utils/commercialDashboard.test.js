import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCommercialDashboard, buildLastDaysQuery } from './commercialDashboard.js'

test('buildLastDaysQuery produces an inclusive UTC date range', () => {
  assert.deepEqual(buildLastDaysQuery(30, new Date('2026-07-20T12:00:00Z')), {
    dateFrom: '2026-06-21',
    dateTo: '2026-07-20',
  })
})

test('buildCommercialDashboard keeps currency totals separate and derives buyer metrics', () => {
  const result = buildCommercialDashboard({
    buyerInsights: {
      knownBuyerCount: 8,
      newBuyerCount: 3,
      returningBuyerCount: 5,
      repeatBuyerCount: 2,
      unidentifiedOrderCount: 1,
      totalOrderCount: 10,
    },
    dailyProfit: [
      {
        currency: 'USD',
        salesChannelCode: 'AMAZON',
        itemCount: 4,
        revenueAmount: 10000,
        baseCostAmount: 4000,
        grossProfitAmount: 6000,
        adSpendAmount: 1000,
        netProfitAmount: 5000,
      },
      {
        currency: 'USD',
        salesChannelCode: 'ETSY',
        itemCount: 2,
        revenueAmount: 5000,
        baseCostAmount: 2000,
        grossProfitAmount: 3000,
        adSpendAmount: 500,
        netProfitAmount: 2500,
      },
      {
        currency: 'CAD',
        salesChannelCode: 'AMAZON',
        itemCount: 1,
        revenueAmount: 8000,
        baseCostAmount: 3000,
        grossProfitAmount: 5000,
        adSpendAmount: 0,
        netProfitAmount: 5000,
      },
    ],
  })

  assert.deepEqual(result.currencies, ['CAD', 'USD'])
  assert.deepEqual(result.byCurrency.USD, {
    revenueAmount: 15000,
    baseCostAmount: 6000,
    grossProfitAmount: 9000,
    adSpendAmount: 1500,
    netProfitAmount: 7500,
    itemCount: 6,
    netMarginBps: 5000,
  })
  assert.equal(result.buyer.returningBuyerCount, 5)
  assert.equal(result.buyer.repeatPurchaseRateBps, 2500)
})

test('buildCommercialDashboard sorts acquisition rows by spend without exposing raw identities', () => {
  const result = buildCommercialDashboard({
    channelPerformance: [
      { salesChannelCode: 'ETSY', marketplaceCode: 'ETSY_US', spendAmount: 2000, newBuyerCount: 2 },
      {
        salesChannelCode: 'AMAZON',
        marketplaceCode: 'AMAZON_US',
        spendAmount: 4000,
        newBuyerCount: 3,
      },
    ],
  })

  assert.deepEqual(
    result.acquisitionRows.map((row) => row.salesChannelCode),
    ['AMAZON', 'ETSY'],
  )
  assert.equal(result.acquisitionRows[0].newBuyerCount, 3)
  assert.equal(Object.hasOwn(result.acquisitionRows[0], 'externalBuyerId'), false)
})

test('buildCommercialDashboard derives ROAS from attributed sales and spend', () => {
  const result = buildCommercialDashboard({
    channelPerformance: [{ spendAmount: 4000, attributedSalesAmount: 12000 }],
  })

  assert.equal(result.acquisitionRows[0].roas, 3)
})

test('buildCommercialDashboard clears CPA when a channel has no new buyers', () => {
  const result = buildCommercialDashboard({
    channelPerformance: [{ spendAmount: 2000, newBuyerCount: 0, cpaAmount: 2000 }],
  })

  assert.equal(result.acquisitionRows[0].cpaAmount, null)
})

test('buildCommercialDashboard derives returning buyer rate from known buyers', () => {
  const result = buildCommercialDashboard({
    buyerInsights: { knownBuyerCount: 8, returningBuyerCount: 5 },
  })

  assert.equal(result.buyer.returningBuyerRateBps, 6250)
})
