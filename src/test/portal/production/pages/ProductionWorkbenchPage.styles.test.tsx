import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(
  join(
    process.cwd(),
    'src',
    'features',
    'portal',
    'production',
    'pages',
    'ProductionWorkbenchPage.module.scss',
  ),
  'utf8',
)

const filterBar = readFileSync(
  join(
    process.cwd(),
    'src',
    'features',
    'portal',
    'production',
    'pages',
    'ProductionWorkbenchFilterBar.tsx',
  ),
  'utf8',
)

const page = readFileSync(
  join(
    process.cwd(),
    'src',
    'features',
    'portal',
    'production',
    'pages',
    'ProductionWorkbenchPage.tsx',
  ),
  'utf8',
)

const productionApi = readFileSync(
  join(process.cwd(), 'src', 'features', 'portal', 'production', 'api', 'productionApi.ts'),
  'utf8',
)

describe('ProductionWorkbenchPage detail layout', () => {
  it('lays the four production metrics out evenly', () => {
    expect(styles).toMatch(
      /\.metrics\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/s,
    )
  })

  it('gives CS and output work more width than product input', () => {
    expect(styles).toMatch(/\.inlineWorkspace\s*\{[^}]*grid-template-columns:/s)
    expect(styles).toMatch(/minmax\(\s*220px,\s*0\.72fr\)/)
    expect(styles).toMatch(/minmax\(\s*260px,\s*1fr\)/)
    expect(styles).toMatch(/minmax\(\s*240px,\s*0\.85fr\)/)
    expect(styles).toMatch(/minmax\(\s*420px,\s*1\.35fr\s*\)/)
  })

  it('stacks product actions vertically', () => {
    expect(styles).toMatch(
      /\.productActions\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s,
    )
  })

  it('keeps a single expanded task content-sized instead of forcing a vertical scroll', () => {
    const workspaceRule = styles.match(/\.inlineWorkspace\s*\{([^}]*)\}/s)?.[1]

    expect(workspaceRule).toBeDefined()
    expect(workspaceRule).not.toMatch(/\bheight\s*:/)
    expect(styles).toMatch(
      /\.outputSection\s*\{[^}]*align-self:\s*start;[^}]*height:\s*auto;[^}]*grid-template-rows:\s*auto\s+auto/s,
    )
    expect(styles).toMatch(/\.outputSection\s*\{[^}]*gap:\s*0;/s)
    expect(styles).toMatch(/\.requiredSlotsNote\s*\{[^}]*max-height:\s*72px;/s)
    expect(styles).toMatch(/\.requiredSlotsContent\s*\{[^}]*padding-top:\s*10px;/s)
  })

  it('does not turn the one-record queue pane into another scroll container', () => {
    expect(styles).toMatch(
      /\.singleRecordQueuePane\s*\{[^}]*flex:\s*0\s+0\s+auto;[^}]*height:\s*auto;[^}]*overflow:\s*visible;/s,
    )
    expect(styles).toMatch(
      /\.singleRecordQueuePane\s+:global\(\.ant-table-wrapper\)\s*\{[^}]*height:\s*auto;/s,
    )
  })

  it('keeps the search action inside one bordered field and vertically aligns the toolbar', () => {
    const sharedPaneRule = styles.match(/\.queuePane,\s*\.taskPane\s*\{([^}]*)\}/s)?.[1]

    expect(filterBar).toMatch(/<FilterBar\s+className=\{styles\.queueFilterBar\}\s+label=/)
    expect(filterBar).not.toMatch(/<FilterBar\s+bordered/)
    expect(filterBar).toMatch(/<Input\s+className=\{styles\.search\}\s+allowClear/)
    expect(filterBar).toMatch(
      /suffix=\{\s*<Button[\s\S]*className=\{styles\.searchSubmit\}[\s\S]*icon=\{<SearchOutlined\s*\/>\}/,
    )
    expect(filterBar).not.toMatch(/<SearchInput/)
    expect(filterBar).not.toMatch(/<Input\.Search/)
    expect(sharedPaneRule).toBeDefined()
    expect(sharedPaneRule).not.toMatch(/\bborder(?:-radius)?\s*:/)
    expect(sharedPaneRule).not.toMatch(/\bbackground\s*:/)
    expect(sharedPaneRule).not.toMatch(/\bbox-shadow\s*:/)
    expect(styles).toMatch(/\.queueFilterBar\s*\{[^}]*border:\s*0\s*!important;/s)
    expect(styles).toMatch(
      /\.search:global\(\.ant-input-affix-wrapper\)\s*\{[^}]*border-color:\s*var\(--ant-color-border\)\s*!important;/s,
    )
    expect(styles).toMatch(
      /\.queueControls\s+:global\(\.ant-btn\)\s*\{[^}]*height:\s*36px\s*!important;/s,
    )
    expect(styles).toMatch(
      /\.queueControls\s+\.searchSubmit\s*\{[^}]*height:\s*28px\s*!important;/s,
    )
    expect(styles).toMatch(/\.queueControls\s*\{[^}]*padding:\s*12px\s+0;/s)
    expect(styles).toMatch(/\.queueControls\s*\{[^}]*border-bottom:\s*0;/s)
  })

  it('filters production tasks by the backend created-date range', () => {
    expect(productionApi).toMatch(/dateFrom\?:\s*string/)
    expect(productionApi).toMatch(/dateTo\?:\s*string/)
    expect(filterBar).toMatch(/import\s*\{[^}]*DateRangePicker[^}]*\}\s*from '@\/shared\/ui'/s)
    expect(filterBar).toMatch(
      /<DateRangePicker[\s\S]*className=\{styles\.dateRange\}[\s\S]*value=\{dates\}[\s\S]*onChange=\{onDatesChange\}/,
    )
    expect(page).toMatch(
      /const \[createdDates, setCreatedDates\] = useState<DateRangeValue>\(\{\}\)/,
    )
    expect(page).toMatch(/\.\.\.createdDates/)
    expect(page).toMatch(/onDatesChange=\{handleCreatedDatesChange\}/)
    expect(styles).toMatch(
      /\.dateRange:global\(\.ant-picker\)\s*\{[^}]*width:\s*230px\s*!important;[^}]*height:\s*36px;/s,
    )
  })

  it('lays output cards out as a horizontally scrollable rail', () => {
    expect(styles).toMatch(
      /\.inlineSlots\s*\{[^}]*grid-auto-flow:\s*column;[^}]*grid-auto-columns:\s*minmax\(200px,\s*1fr\);[^}]*overflow-x:\s*auto;/s,
    )
    expect(styles).toMatch(/\.slotPreviewButton\s*\{[^}]*cursor:\s*zoom-in;/s)
  })

  it('gives scaled artwork a legible preview beside its rework detail', () => {
    expect(styles).toMatch(
      /\.inlineSlotWithRework\s*\{[^}]*grid-template-columns:\s*minmax\(114px,\s*0\.9fr\)\s+minmax\(0,\s*1\.1fr\);/s,
    )
    expect(styles).toMatch(
      /\.inlineSlotWithRework\s*\{[^}]*grid-template-areas:\s*'header header'\s*'preview note'\s*'actions actions';/s,
    )
    expect(styles).toMatch(
      /\.slotOutput\s*\{[^}]*min-height:\s*104px;[^}]*aspect-ratio:\s*4\s*\/\s*3;/s,
    )
  })

  it('keeps QC rework details compact inside output slots', () => {
    expect(styles).toMatch(/\.rejectionNote\s*\{[^}]*padding:\s*6px\s+8px;[^}]*font-size:\s*12px;/s)
    expect(styles).toMatch(/\.rejectionNote > span:last-child\s*\{[^}]*-webkit-line-clamp:\s*2;/s)
  })
})
