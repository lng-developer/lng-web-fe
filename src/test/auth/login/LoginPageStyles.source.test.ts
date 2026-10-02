import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const loginStyles = readFileSync(
  fileURLToPath(
    new URL('../../../features/auth/login/pages/LoginPage.module.scss', import.meta.url),
  ),
  'utf8',
)

const loginPage = readFileSync(
  fileURLToPath(new URL('../../../features/auth/login/pages/LoginPage.tsx', import.meta.url)),
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

  it('keeps every social sign-in icon on a visible dark-mode surface', () => {
    expect(loginStyles).toMatch(
      /html\[data-theme='dark'\]\) \.socialActions\s*:global\(\.ant-btn\)\s*\{[^}]*background:\s*rgb\(51\s+65\s+85\)\s*!important[^}]*border-color:\s*rgb\(71\s+85\s+105\)\s*!important/s,
    )
    expect(loginStyles).toMatch(
      /html\[data-theme='dark'\]\) \.socialActions\s*:global\(\.ant-btn\):hover\s*\{[^}]*box-shadow:\s*0\s+8px\s+16px\s+rgb\(0\s+0\s+0\s*\/\s*35%\)/s,
    )
    expect(loginStyles).toMatch(
      /html\[data-theme='dark'\]\) \.socialActions\s+\.facebookButton\s*\{[^}]*color:\s*rgb\(96\s+165\s+250\)\s*!important/s,
    )
  })

  it('gives the Microsoft sign-in button a visible hover surface in both appearances', () => {
    expect(loginStyles).toMatch(
      /\.microsoftButton:hover\s*\{[^}]*background:\s*rgb\(37\s+99\s+235\)\s*!important[^}]*border-color:\s*rgb\(96\s+165\s+250\)\s*!important/s,
    )
    expect(loginStyles).toMatch(
      /html\[data-theme='dark'\]\) \.socialActions\s+\.microsoftButton:hover\s*\{[^}]*background:\s*rgb\(37\s+99\s+235\)\s*!important[^}]*border-color:\s*rgb\(96\s+165\s+250\)\s*!important[^}]*transition-duration:\s*0ms/s,
    )
  })

  it('keeps Facebook, X, and GitHub hover feedback above the dark social-button base style', () => {
    expect(loginStyles).toMatch(
      /html\[data-theme='dark'\]\) \.socialActions\s+\.facebookButton:hover\s*\{[^}]*background:\s*rgb\(24\s+119\s+242\)\s*!important[^}]*border-color:\s*rgb\(96\s+165\s+250\)\s*!important/s,
    )
    expect(loginStyles).toMatch(
      /html\[data-theme='dark'\]\) \.socialActions\s+\.xButton:hover\s*\{[^}]*color:\s*rgb\(15\s+23\s+42\)\s*!important[^}]*background:\s*rgb\(226\s+232\s+240\)\s*!important/s,
    )
    expect(loginStyles).toMatch(
      /html\[data-theme='dark'\]\) \.socialActions\s+\.githubButton:hover\s*\{[^}]*color:\s*rgb\(15\s+23\s+42\)\s*!important[^}]*background:\s*rgb\(248\s+250\s+252\)\s*!important/s,
    )
  })

  it('uses a uniform light-mode surface and a soft hover glow for every social icon', () => {
    expect(loginStyles).toMatch(
      /\.socialActions\s*:global\(\.ant-btn\)\s*\{[^}]*background:\s*rgb\(255\s+255\s+255\)\s*!important[^}]*border-color:\s*rgb\(203\s+213\s+225\)\s*!important/s,
    )
    expect(loginStyles).toMatch(
      /\.microsoftButton:hover\s*\{[^}]*box-shadow:\s*0\s+0\s+22px\s+rgb\(59\s+130\s+246\s*\/\s*46%\),\s*0\s+12px\s+28px\s+rgb\(59\s+130\s+246\s*\/\s*36%\)/s,
    )
    expect(loginStyles).toMatch(
      /\.facebookButton:hover\s*\{[^}]*box-shadow:\s*0\s+0\s+22px\s+rgb\(24\s+119\s+242\s*\/\s*46%\),\s*0\s+12px\s+28px\s+rgb\(24\s+119\s+242\s*\/\s*36%\)/s,
    )
    expect(loginStyles).toMatch(
      /\.xButton:hover\s*\{[^}]*box-shadow:\s*0\s+0\s+18px\s+rgb\(15\s+23\s+42\s*\/\s*28%\),\s*0\s+12px\s+28px\s+rgb\(15\s+23\s+42\s*\/\s*20%\)/s,
    )
    expect(loginStyles).toMatch(
      /\.githubButton:hover\s*\{[^}]*box-shadow:\s*0\s+0\s+18px\s+rgb\(15\s+23\s+42\s*\/\s*28%\),\s*0\s+12px\s+28px\s+rgb\(15\s+23\s+42\s*\/\s*20%\)/s,
    )
  })

  it('removes preference tooltips from the login screen only', () => {
    expect(loginPage).toContain('<LanguageSwitch showTooltip={false} />')
    expect(loginPage).toContain('<ThemeSwitch showTooltip={false} />')
  })
})
