import { describe, expect, it } from 'vitest'

import { isCompactBreakpoint } from '@/app/layout/appShellResponsive'

describe('isCompactBreakpoint', () => {
  it('uses the mobile navigation when Ant Design reports a compact viewport', () => {
    expect(isCompactBreakpoint({ xs: true, sm: true, md: false })).toBe(true)
  })

  it('keeps the desktop navigation before breakpoint observation initializes', () => {
    expect(isCompactBreakpoint({})).toBe(false)
  })
})
