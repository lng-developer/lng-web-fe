import { describe, expect, it } from 'vitest'

import { toMinorUnits } from '@/features/portal/finance/api/refundMoney'

describe('toMinorUnits', () => {
  it('converts a displayed USD amount to the integer amount required by the refund API', () => {
    expect(toMinorUnits(12.34)).toBe(1234)
  })
})
