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

  it('uses a muted light canvas instead of a white-heavy surface stack', () => {
    const light = createAppTheme('light').token

    expect(light?.colorBgBase).toBe('#EEF1F5')
    expect(light?.colorBgContainer).toBe('#F7F8FA')
    expect(light?.colorBgLayout).toBe('#E5EAF0')
  })
})
