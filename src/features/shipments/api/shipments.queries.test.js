import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('shipment summary query uses the existing summary endpoint and key', async () => {
  const source = await readFile(new URL('./shipments.queries.js', import.meta.url), 'utf8')

  assert.match(source, /useShipmentsSummaryQuery/)
  assert.match(source, /shipmentsKeys\.summary\(query\)/)
  assert.match(source, /ENDPOINTS\.SHIPMENTS\.SUMMARY/)
})
