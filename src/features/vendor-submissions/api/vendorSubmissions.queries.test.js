import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('vendor submission summary query uses the existing summary endpoint and key', async () => {
  const source = await readFile(new URL('./vendorSubmissions.queries.js', import.meta.url), 'utf8')

  assert.match(source, /useVendorSubmissionsSummaryQuery/)
  assert.match(source, /vendorSubmissionsKeys\.summary\(query\)/)
  assert.match(source, /ENDPOINTS\.VENDOR_SUBMISSIONS\.SUMMARY/)
})
