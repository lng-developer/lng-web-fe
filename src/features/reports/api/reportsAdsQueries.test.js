import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('reports query layer exposes daily and seller Ads contracts', () => {
  const endpoints = readFileSync(new URL('../../../services/endpoints.js', import.meta.url), 'utf8')
  const keys = readFileSync(new URL('./reports.keys.js', import.meta.url), 'utf8')
  const queries = readFileSync(new URL('./reports.queries.js', import.meta.url), 'utf8')

  assert.match(endpoints, /ADS_BY_SELLER/)
  assert.match(endpoints, /ADS_DAILY/)
  assert.match(keys, /adsBySeller/)
  assert.match(keys, /adsDaily/)
  assert.match(queries, /useAdsSellerAttributionQuery/)
  assert.match(queries, /ENDPOINTS\.REPORTS\.ADS_BY_SELLER/)
  assert.match(queries, /useAdsDailyQuery/)
  assert.match(queries, /ENDPOINTS\.REPORTS\.ADS_DAILY/)
})
