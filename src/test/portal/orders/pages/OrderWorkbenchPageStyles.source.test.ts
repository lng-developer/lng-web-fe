/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const orderWorkbenchStyles = readFileSync(
  fileURLToPath(
    new URL(
      '../../../../features/portal/orders/pages/OrderWorkbenchPage.module.scss',
      import.meta.url,
    ),
  ),
  'utf8',
)

describe('Order workbench layout styles', () => {
  it('constrains the grid column so a narrow viewport uses the table horizontal scroll', () => {
    expect(orderWorkbenchStyles).toMatch(
      /\.page\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s,
    )
  })

  it('does not force the table to fit its container before horizontal scrolling can occur', () => {
    expect(orderWorkbenchStyles).not.toMatch(
      /\.table\s+:global\(\.ant-table\s+table\)\s*\{[^}]*width:\s*100%\s*!important/s,
    )
  })

  it('adapts filters and expanded item panels to the Orders content width', () => {
    expect(orderWorkbenchStyles).toMatch(/\.page\s*\{[^}]*container-type:\s*inline-size/s)
    expect(orderWorkbenchStyles).toMatch(
      /@container\s*\(max-width:\s*1200px\)\s*\{[^}]*\.filters\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s,
    )
    expect(orderWorkbenchStyles).toMatch(
      /@container\s*\(max-width:\s*1180px\)\s*\{[^}]*\.itemPanel\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s,
    )
    expect(orderWorkbenchStyles).toMatch(
      /@container\s*\(max-width:\s*720px\)\s*\{[^}]*\.itemPanel[^}]*grid-template-columns:\s*1fr/s,
    )
  })
})
