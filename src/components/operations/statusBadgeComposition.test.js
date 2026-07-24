import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const statusBadgeSource = readFileSync(new URL('./StatusBadge.jsx', import.meta.url), 'utf8')
const scalePageSource = readFileSync(
  new URL('../../features/scale/pages/ScalePage.jsx', import.meta.url),
  'utf8',
)

test('shared StatusBadge renders compact semantic pills and supports plain text status', () => {
  assert.match(statusBadgeSource, /bordered = true/)
  assert.match(statusBadgeSource, /success: 'bg-success-bg text-success-strong'/)
  assert.match(statusBadgeSource, /min-h-5 max-w-full items-center rounded-full px-2 py-0.5/)
  assert.match(statusBadgeSource, /variant = 'badge'/)
  assert.match(statusBadgeSource, /variant === 'text'/)
  assert.match(statusBadgeSource, /bordered \? `border[^`]*` : 'border-0'/)
})

test('Scale uses shared StatusBadge for semantic statuses', () => {
  assert.match(
    scalePageSource,
    /import \{[^}]*StatusBadge[^}]*\} from '@\/components\/operations'/s,
  )
  assert.match(scalePageSource, /<StatusBadge[\s\S]*getStatusLabelKey\(task\.scaleStatus\)/)
  assert.match(scalePageSource, /getOrderStatusTone\(value\)[\s\S]*task\.orderStatus/)
  assert.doesNotMatch(scalePageSource, /statusBadgeClasses/)
})

test('QC renders order status as a bordered semantic badge', () => {
  const qcPageSource = readFileSync(
    new URL('../../features/qc/pages/QcPage.jsx', import.meta.url),
    'utf8',
  )

  assert.match(qcPageSource, /QcOrderStatusBadge[\s\S]*task\.statusOrder/)
  assert.doesNotMatch(qcPageSource, /variant="text"/)
})
