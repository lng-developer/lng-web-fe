import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const page = readFileSync(
  join(process.cwd(), 'src', 'features', 'portal', 'reports', 'pages', 'ReportWorkspacePage.tsx'),
  'utf8',
)

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
    expect(styles).toContain('.filters {')
    expect(styles).toContain('display: flex !important;')
    expect(styles).toContain('flex-wrap: wrap;')
    expect(styles).toContain('.filterAction {')
    expect(styles).toContain('flex: 0 0 auto !important;')
  })

  it('does not combine row-spanning seller cells with fixed daily columns', () => {
    expect(styles).not.toMatch(/\.dailyTable\s*\{[^}]*overflow-x:/s)
    expect(page).not.toContain('sellerRowSpan')
    expect(page).not.toContain('rowSpan:')
    expect(page).toContain("seller: metricIndex === 0 ? sellerName : ''")
    expect(page.match(/fixed: 'left'/g)).toHaveLength(3)
  })

  it('keeps seller names compact so the profit bar uses the available width', () => {
    expect(styles).toContain(
      'grid-template-columns: minmax(180px, 240px) minmax(260px, 1fr) max-content;',
    )
  })

  it('removes the redundant outer border and container styling from the filter bar', () => {
    expect(styles).toContain('.filterBar {')
    expect(styles).toContain('border: 0 !important;')
    expect(styles).toContain('background: transparent !important;')
    expect(page).toContain('className={styles.filterBar}')
  })
})
