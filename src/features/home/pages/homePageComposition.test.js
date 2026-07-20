import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('HomePage composes the commercial operations dashboard', async () => {
  const source = await readFile(new URL('./HomePage.jsx', import.meta.url), 'utf8')

  assert.match(source, /useHomeDashboardQuery/)
  assert.match(source, /OperationsPageShell/)
  assert.match(source, /OperationsHeader/)
  assert.match(source, /DailyProfitChart/)
  assert.match(source, /ChannelProfitChart/)
  assert.match(source, /AcquisitionTable/)
  assert.match(source, /AcquisitionFunnelChart/)
  assert.match(source, /ChannelMixChart/)
  assert.match(source, /home\.commercial\.buyer\.title|Buyer insights/)
  assert.doesNotMatch(source, /useHomeSummaryQuery/)
})
