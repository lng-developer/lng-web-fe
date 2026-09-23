import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const loginStyles = readFileSync(
  fileURLToPath(
    new URL('../../../features/auth/login/pages/LoginPage.module.scss', import.meta.url),
  ),
  'utf8',
)

describe('LoginPage visual styles', () => {
  it('keeps the light background mark balanced with the dark composition and centers the preference controls vertically', () => {
    expect(loginStyles).toMatch(/login-operations-hero\.png[^;]*\/\s*auto\s+138%/s)
    expect(loginStyles).toMatch(
      /\.page::before[\s\S]*login-operations-hero-dark-v2\.png'\) calc\(50% \+ 70px\) calc\(50% \+ 72px\)\s*\/\s*auto\s+138%/,
    )
    expect(loginStyles).toMatch(
      /\.preferences\s*\{[^}]*top:\s*50%[^}]*right:\s*24px[^}]*flex-direction:\s*column[^}]*transform:\s*translateY\(-50%\)/s,
    )
  })

  it('uses readable foreground colors for dark-mode login content', () => {
    expect(loginStyles).toMatch(
      /html\[data-theme='dark'\]\) \.card\s*\{[^}]*color:\s*rgb\(226\s+232\s+240\)/s,
    )
    expect(loginStyles).toMatch(
      /html\[data-theme='dark'\]\) \.formContent[^}]*\.ant-form-item-label[^}]*color:\s*rgb\(203\s+213\s+225\)/s,
    )
  })
})
