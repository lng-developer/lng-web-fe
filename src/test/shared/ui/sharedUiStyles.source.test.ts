/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const sharedUiStyles = readFileSync(
  fileURLToPath(new URL('../../../shared/ui/sharedUi.module.scss', import.meta.url)),
  'utf8',
)

describe('shared data table styles', () => {
  it('uses the GXON border and shadow treatment for shared cards and tables', () => {
    expect(sharedUiStyles).toMatch(
      /\.sectionCard\s*\{[^}]*border:\s*1px solid var\(--ant-color-border\)/s,
    )
    expect(sharedUiStyles).toMatch(
      /\.metricCard\s*\{[^}]*border:\s*1px solid var\(--ant-color-border\)/s,
    )
    expect(sharedUiStyles).toMatch(
      /\.dataTable :global\(\.ant-table-container\)\s*\{[^}]*border:\s*1px solid var\(--ant-color-border\)/s,
    )
  })

  it('keeps every table within its card without adding a second horizontal scrollbar', () => {
    expect(sharedUiStyles).toMatch(
      /\.dataTable\s*\{[^}]*min-width:\s*0[^}]*max-width:\s*100%(?![^}]*overflow-x)/s,
    )
  })

  it('allows viewport-filling tables to shrink so their own body can scroll horizontally', () => {
    expect(sharedUiStyles).toMatch(/\.dataTableFillViewport\s*\{[^}]*min-width:\s*0/s)
    expect(sharedUiStyles).toMatch(
      /\.dataTableFillViewport\s+\.dataTableBody\s*\{[^}]*min-width:\s*0/s,
    )
  })
})
