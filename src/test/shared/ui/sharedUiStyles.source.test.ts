/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const sharedUiStyles = readFileSync(
  fileURLToPath(new URL('../../../shared/ui/sharedUi.module.scss', import.meta.url)),
  'utf8',
)

describe('shared data table styles', () => {
  it('allows viewport-filling tables to shrink so their own body can scroll horizontally', () => {
    expect(sharedUiStyles).toMatch(/\.dataTableFillViewport\s*\{[^}]*min-width:\s*0/s)
    expect(sharedUiStyles).toMatch(
      /\.dataTableFillViewport\s+\.dataTableBody\s*\{[^}]*min-width:\s*0/s,
    )
  })
})
