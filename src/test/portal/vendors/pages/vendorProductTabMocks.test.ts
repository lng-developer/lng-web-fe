import { describe, expect, it } from 'vitest'

import { mockVendorProducts } from '@/features/portal/vendors/pages/vendorProductTabMocks'

describe('mockVendorProducts', () => {
  it('maps the supplied product-tab response into rows for the Products tab', () => {
    expect(mockVendorProducts[0]).toMatchObject({
      baseCostAmount: 1718,
      code: 'PRODUCT_1717_2XL_BANANA_31005',
      name: '2XL / BANANA',
      status: 'ACTIVE',
    })
  })
})
