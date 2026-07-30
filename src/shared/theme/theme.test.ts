import { describe, expect, it } from 'vitest'

import { createAppTheme, resolveAppearance } from './theme'

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
})
