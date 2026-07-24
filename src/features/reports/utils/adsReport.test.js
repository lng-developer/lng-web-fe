import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getAdsFilterOptions,
  getAdsQualityState,
  groupAdsDailyRows,
  summarizeAdsCurrency,
} from './adsReport.js'

test('groupAdsDailyRows combines channels into one point per day and currency', () => {
  assert.deepEqual(
    groupAdsDailyRows([
      { reportDate: '2026-07-20', currency: 'USD', spendAmount: 100, attributedSalesAmount: 400 },
      { reportDate: '2026-07-20', currency: 'USD', spendAmount: 200, attributedSalesAmount: 600 },
      { reportDate: '2026-07-21', currency: 'USD', spendAmount: 50, attributedSalesAmount: 150 },
    ]),
    [
      { reportDate: '2026-07-20', currency: 'USD', spendAmount: 300, attributedSalesAmount: 1000 },
      { reportDate: '2026-07-21', currency: 'USD', spendAmount: 50, attributedSalesAmount: 150 },
    ],
  )
})

test('summarizeAdsCurrency isolates currencies and handles zero denominators', () => {
  assert.deepEqual(
    summarizeAdsCurrency(
      [
        {
          currency: 'USD',
          spendAmount: 2000,
          attributedSalesAmount: 8000,
          clicks: 10,
          attributedOrdersCount: 2,
        },
        {
          currency: 'EUR',
          spendAmount: 1000,
          attributedSalesAmount: 3000,
          clicks: 5,
          attributedOrdersCount: 1,
        },
      ],
      'USD',
    ),
    {
      spendAmount: 2000,
      attributedSalesAmount: 8000,
      clicks: 10,
      attributedOrdersCount: 2,
      impressions: 0,
      newBuyerCount: 0,
      roas: 4,
      cpcAmount: 200,
    },
  )
  assert.equal(summarizeAdsCurrency([{ currency: 'USD' }], 'USD').roas, null)
  assert.equal(summarizeAdsCurrency([{ currency: 'USD' }], 'USD').cpcAmount, null)
})

test('getAdsQualityState returns evidence-backed warnings only', () => {
  assert.equal(getAdsQualityState({ sellerEmployeeCode: 'UNASSIGNED' }), 'UNASSIGNED_SELLER')
  assert.equal(getAdsQualityState({ status: 'PARTIAL_FAILED' }), 'PARTIAL_IMPORT')
  assert.equal(getAdsQualityState({ status: 'FAILED' }), 'FAILED_IMPORT')
  assert.equal(getAdsQualityState({ status: 'COMPLETED' }), null)
})

test('getAdsFilterOptions derives marketplaces from the selected channel', () => {
  const rows = [
    { salesChannelCode: 'AMAZON', marketplaceCode: 'AMAZON_US', currency: 'USD' },
    { salesChannelCode: 'AMAZON', marketplaceCode: 'AMAZON_CA', currency: 'CAD' },
    { salesChannelCode: 'ETSY', marketplaceCode: 'ETSY_US', currency: 'USD' },
  ]

  assert.deepEqual(getAdsFilterOptions(rows, 'AMAZON'), {
    channels: ['AMAZON', 'ETSY'],
    marketplaces: ['AMAZON_CA', 'AMAZON_US'],
    currencies: ['CAD', 'USD'],
  })
})
