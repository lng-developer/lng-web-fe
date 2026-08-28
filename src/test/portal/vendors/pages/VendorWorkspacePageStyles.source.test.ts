/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const vendorWorkspaceStyles = readFileSync(
  fileURLToPath(
    new URL(
      '../../../../features/portal/vendors/pages/VendorWorkspacePage.module.scss',
      import.meta.url,
    ),
  ),
  'utf8',
)

describe('Vendor workspace layout styles', () => {
  it('keeps the page within the workspace so only tables scroll horizontally', () => {
    expect(vendorWorkspaceStyles).toMatch(
      /\.page\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s,
    )
    expect(vendorWorkspaceStyles).toMatch(/\.page\s*\{[^}]*min-width:\s*0/s)
    expect(vendorWorkspaceStyles).toMatch(/\.page\s*>\s*\*\s*\{[^}]*min-width:\s*0/s)
  })
})
