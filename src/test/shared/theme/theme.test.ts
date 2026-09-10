import { describe, expect, it } from 'vitest'

import { createAppTheme, resolveAppearance } from '@/shared/theme/theme'

describe('theme foundation', () => {
  it('resolves explicit and system appearances', () => {
    expect(resolveAppearance('light', true)).toBe('light')
    expect(resolveAppearance('dark', false)).toBe('dark')
    expect(resolveAppearance('system', true)).toBe('dark')
    expect(resolveAppearance('system', false)).toBe('light')
  })

  it('keeps the LNG primary color in both themes', () => {
    expect(createAppTheme('light').token?.colorPrimary).toBe('#E83B4A')
    expect(createAppTheme('dark').token?.colorPrimary).toBe('#E83B4A')
  })

  it('uses GXON-style white card surfaces and subtle borders in light mode', () => {
    const light = createAppTheme('light').token

    expect(light?.colorBgBase).toBe('#EEF1F5')
    expect(light?.colorBgContainer).toBe('#FFFFFF')
    expect(light?.colorBgLayout).toBe('#E5EAF0')
    expect(light?.colorBorder).toBe('#E8EBF1')
    expect(light?.colorBorderSecondary).toBe('#E8EBF1')
  })

  it('uses GXON dark borders instead of light card borders', () => {
    const dark = createAppTheme('dark').token

    expect(dark?.colorBorder).toBe('#3A3B4D')
    expect(dark?.colorBorderSecondary).toBe('#3A3B4D')
  })
})
