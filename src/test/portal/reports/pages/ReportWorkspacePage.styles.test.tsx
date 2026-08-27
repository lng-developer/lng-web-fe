import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(
  join(
    process.cwd(),
    'src',
    'features',
    'portal',
    'reports',
    'pages',
    'ReportWorkspacePage.module.scss',
  ),
  'utf8',
)

describe('ReportWorkspacePage filter layout', () => {
  it('keeps all filters and CSV export in one desktop row', () => {
    expect(styles).toContain(
      'grid-template-columns: minmax(220px, 1.35fr) repeat(7, minmax(100px, 1fr));',
    )
  })
})
