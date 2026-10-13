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
    expect(createAppTheme('light').token?.colorPrimary).toBe('#2563eb')
    expect(createAppTheme('dark').token?.colorPrimary).toBe('#2563eb')
  })

  it('uses bright white card surfaces and subtle borders in light mode', () => {
    const light = createAppTheme('light').token

    expect(light?.colorBgBase).toBe('#FFFFFF')
    expect(light?.colorBgContainer).toBe('#FFFFFF')
    expect(light?.colorBgLayout).toBe('#F8FAFC')
    expect(light?.colorBorder).toBe('#CBD5E1')
    expect(light?.colorBorderSecondary).toBe('#E2E8F0')
  })

  it('uses dark borders in dark mode', () => {
    const dark = createAppTheme('dark').token

    expect(dark?.colorBgLayout).toBe('#18191A')
    expect(dark?.colorBgContainer).toBe('#242526')
    expect(dark?.colorBorder).toBe('#393A3B')
    expect(dark?.colorBorderSecondary).toBe('#2F3031')
  })
})
