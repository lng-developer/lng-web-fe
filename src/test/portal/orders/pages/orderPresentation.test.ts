import { describe, expect, it } from 'vitest'

import * as orderPresentation from '@/features/portal/orders/pages/orderPresentation'

const { formatMinorMoney, orderStatusTone } = orderPresentation

type Translate = (key: string, options?: { defaultValue?: string }) => string

describe('orderPresentation', () => {
  it('maps operational states and formats minor-unit money', () => {
    expect(orderStatusTone('SHIPPED')).toBe('operational')
    expect(orderStatusTone('CANCELLED')).toBe('cancelled')
    expect(orderStatusTone('ON_HOLD')).toBe('critical')
    expect(orderStatusTone('INVALID')).toBe('critical')
    expect(orderStatusTone('VALID')).toBe('approved')
    expect(orderStatusTone('PRESENT')).toBe('approved')
    expect(orderStatusTone('IMPORTED')).toBe('pending')
    expect(formatMinorMoney(1299, 'USD', 'en-US')).toBe('$12.99')
    expect(formatMinorMoney(null, 'USD', 'en-US')).toBe('—')
  })

  it('formats order status labels through the order status locale namespace', () => {
    const translations: Record<string, string> = {
      'orders.statuses.OPEN': 'Đang mở',
      'orders.statuses.PROCESSING': 'Đang xử lý',
      'orders.statuses.IMPORTED': 'Đã nhập',
    }
    const t: Translate = (key, options) => translations[key] ?? options?.defaultValue ?? key
    const formatter = (
      orderPresentation as {
        formatOrderStatusLabel?: (status: string | null | undefined, t: Translate) => string
      }
    ).formatOrderStatusLabel

    expect(formatter?.('PROCESSING', t)).toBe('Đang xử lý')
    expect(formatter?.('IMPORTED', t)).toBe('Đã nhập')
    expect(formatter?.(null, t)).toBe('Đang mở')
  })
})
