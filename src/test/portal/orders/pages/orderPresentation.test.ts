import { describe, expect, it } from 'vitest'

import { formatMinorMoney, orderStatusTone } from '@/features/portal/orders/pages/orderPresentation'

describe('orderPresentation', () => {
  it('maps operational states and formats minor-unit money', () => {
    expect(orderStatusTone('SHIPPED')).toBe('operational')
    expect(orderStatusTone('CANCELLED')).toBe('cancelled')
    expect(orderStatusTone('ON_HOLD')).toBe('critical')
    expect(orderStatusTone('INVALID')).toBe('critical')
    expect(orderStatusTone('VALID')).toBe('approved')
    expect(orderStatusTone('IMPORTED')).toBe('pending')
    expect(formatMinorMoney(1299, 'USD', 'en-US')).toBe('$12.99')
    expect(formatMinorMoney(null, 'USD', 'en-US')).toBe('—')
  })
})
