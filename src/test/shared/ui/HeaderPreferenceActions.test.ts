import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const themeSwitchStyles = readFileSync(
  fileURLToPath(new URL('../../../shared/theme/ThemeSwitch.module.scss', import.meta.url)),
  'utf8',
)
const languageSwitchStyles = readFileSync(
  fileURLToPath(new URL('../../../shared/i18n/LanguageSwitch.module.scss', import.meta.url)),
  'utf8',
)
const appShellStyles = readFileSync(
  fileURLToPath(new URL('../../../app/layout/AppShell.module.scss', import.meta.url)),
  'utf8',
)

describe('header preference actions', () => {
  it('keeps theme and language actions compact and visually coordinated', () => {
    for (const styles of [themeSwitchStyles, languageSwitchStyles]) {
      expect(styles).toContain('width: 32px')
      expect(styles).toContain('height: 32px')
      expect(styles).toContain('border-radius: 8px')
      expect(styles).not.toContain('border-radius: 50%')
      expect(styles).not.toContain('box-shadow: 0 3px')
    }
  })

  it('uses a shared 36px hit area for header actions and the account avatar', () => {
    expect(appShellStyles).toMatch(
      /\.headerActions :global\(\.ant-btn\)\s*\{[^}]*width:\s*36px[^}]*height:\s*36px/s,
    )
    expect(appShellStyles).toMatch(/\.accountButton\s*\{[^}]*width:\s*36px[^}]*height:\s*36px/s)
  })
})
