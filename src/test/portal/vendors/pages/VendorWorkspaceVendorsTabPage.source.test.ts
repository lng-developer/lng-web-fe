import { describe, expect, it } from 'vitest'

import vendorsTabSource from '@/features/portal/vendors/pages/VendorWorkspaceVendorsTabPage.tsx?raw'

describe('Vendor workspace vendors table', () => {
  it('keeps the Provider key visible instead of covering it with a fixed actions column', () => {
    expect(vendorsTabSource).toContain("dataIndex: 'providerKey'")
    expect(vendorsTabSource).not.toMatch(/fixed:\s*'right'/)
  })
})
