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

describe('Order workbench styles', () => {
  it('softens the expanded item panel background', () => {
    expect(orderWorkbenchStyles).toMatch(
      /\.itemPanel\s*\{[^}]*background:\s*color-mix\(\s*in srgb,\s*var\(--ant-color-bg-container\) 60%,\s*var\(--ant-color-fill-quaternary\)\s*\)/s,
    )
  })
})
