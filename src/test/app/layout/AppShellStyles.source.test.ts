/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appShellStyles = readFileSync(
  fileURLToPath(new URL('../../../app/layout/AppShell.module.scss', import.meta.url)),
  'utf8',
)
const legacySidebarStyles = readFileSync(
  fileURLToPath(new URL('../../../app/layout/LegacySidebar.module.scss', import.meta.url)),
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

  it('uses a dark navigation surface when the application theme is dark', () => {
    expect(appShellStyles).toMatch(
      /html\[data-theme='dark'\]\) \.rail\s*\{[^}]*background:\s*#242526/s,
    )
    expect(appShellStyles).toMatch(
      /html\[data-theme='dark'\]\) \.sidebar\s*\{[^}]*background:\s*#242526/s,
    )
    expect(appShellStyles).toMatch(
      /html\[data-theme='dark'\]\) \.navigation\s*\{[^}]*background:\s*#242526/s,
    )
  })

  it('keeps header actions from inheriting the header line height', () => {
    expect(appShellStyles).toMatch(/\.headerActions\s*\{[^}]*line-height:\s*normal/s)
  })

  it('styles the rendered legacy menu for the dark theme', () => {
    expect(legacySidebarStyles).toMatch(
      /html\[data-theme='dark'\]\) \.sidebar\s*\{[^}]*background:\s*#242526/s,
    )
    expect(legacySidebarStyles).toMatch(
      /html\[data-theme='dark'\]\) \.detailMenu\s*\{[^}]*background:\s*#242526/s,
    )
    expect(legacySidebarStyles).toMatch(
      /html\[data-theme='dark'\]\) \.detailMenu :global\(\.ant-menu-item\)\s*\{[^}]*color:\s*#e4e6eb/s,
    )
  })

  it('matches the GXON light menu and content surfaces', () => {
    expect(appShellStyles).toMatch(/\.content\s*\{[^}]*background:\s*#fdfdfd/s)
    expect(appShellStyles).toMatch(
      /html\[data-theme='dark'\]\) \.content\s*\{[^}]*background:\s*#18191a/s,
    )
    expect(legacySidebarStyles).toMatch(/\.sidebar\s*\{[^}]*background:\s*#fff/s)
    expect(legacySidebarStyles).toMatch(/\.sidebar\s*\{[^}]*border-right:\s*1px solid #e8ebf1/s)
    expect(legacySidebarStyles).toMatch(
      /\.sidebar\s*\{[^}]*box-shadow:\s*0 0 30px 10px rgb\(0 0 0 \/ 2%\)/s,
    )
    expect(legacySidebarStyles).toMatch(
      /html\[data-theme='dark'\]\) \.sidebar\s*\{[^}]*background:\s*#242526/s,
    )
  })
})
