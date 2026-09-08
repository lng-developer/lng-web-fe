/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appShellStyles = readFileSync(
  fileURLToPath(new URL('../../../app/layout/AppShell.module.scss', import.meta.url)),
  'utf8',
)

describe('AppShell sidebar styles', () => {
  it('uses the legacy white menu surface across the entire navigation area', () => {
    expect(appShellStyles).toMatch(
      /\.sidebar\s*\{[^}]*background:\s*var\(--ant-color-bg-container\)/s,
    )
    expect(appShellStyles).toMatch(
      /\.navigation\s*\{[^}]*background:\s*var\(--ant-color-bg-container\)/s,
    )
    expect(appShellStyles).toMatch(
      /\.navigation\s+:global\(\.ant-menu\)\s*\{[^}]*background:\s*var\(--ant-color-bg-container\)/s,
    )
  })

  it('keeps header actions from inheriting the header line height', () => {
    expect(appShellStyles).toMatch(/\.headerActions\s*\{[^}]*line-height:\s*normal/s)
  })
})
