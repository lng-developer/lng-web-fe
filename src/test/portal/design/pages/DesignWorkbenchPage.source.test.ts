import { describe, expect, it } from 'vitest'

import source from '@/features/portal/design/pages/DesignWorkbenchPage.tsx?raw'

describe('DesignWorkbenchPage source contract', () => {
  it('keeps the channel navigation outside the task card', () => {
    expect(source).toMatch(
      /<div className=\{styles\.taskNavigation\}>[\s\S]*?<\/div>\s*<SectionCard>/,
    )
  })
})
