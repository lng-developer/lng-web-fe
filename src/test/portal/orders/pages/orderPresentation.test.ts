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
    expect(formatter?.('NEED_PRODUCTION', t)).toBe('Need Production')
  })

  it('humanizes SCREAMING_SNAKE_CASE strings while preserving acronyms', () => {
    const { humanizeCode } = orderPresentation
    expect(humanizeCode('PROCESSING')).toBe('Processing')
    expect(humanizeCode('CANCELLED')).toBe('Cancelled')
    expect(humanizeCode('NEED_PRODUCTION')).toBe('Need Production')
    expect(humanizeCode('PRODUCTION_SCALE_SUBMITTED_QC')).toBe('Production Scale Submitted QC')
    expect(humanizeCode('PRODUCTION_SCALED_FILE_UPLOADED')).toBe('Production Scaled File Uploaded')
    expect(humanizeCode('PRESENT')).toBe('Present')
    expect(humanizeCode('OPEN_CASE')).toBe('Open Case')
    expect(humanizeCode(null)).toBe('—')
  })

  it('formats PSD readiness status labels with i18n and fallback', () => {
    const translations: Record<string, string> = {
      'orders.psdStatuses.PRESENT': 'Có sẵn',
    }
    const t: Translate = (key, options) => translations[key] ?? options?.defaultValue ?? key
    const { formatPsdStatusLabel } = orderPresentation

    expect(formatPsdStatusLabel('PRESENT', t)).toBe('Có sẵn')
    expect(formatPsdStatusLabel('MISSING', t)).toBe('Missing')
    expect(formatPsdStatusLabel(null, t)).toBe('—')
  })

  it('formats timeline events, blockers, and case labels with i18n and fallback', () => {
    const translations: Record<string, string> = {
      'orders.history.events.ORDER_STATUS_CHANGED': 'Trạng thái đơn hàng thay đổi',
      'orders.case.types.REFUND': 'Hoàn tiền',
    }
    const t: Translate = (key, options) => translations[key] ?? options?.defaultValue ?? key
    const {
      formatAddressStatusLabel,
      formatCaseSeverityLabel,
      formatCaseTypeLabel,
      formatTimelineBlockerLabel,
      formatTimelineEventLabel,
    } = orderPresentation

    expect(formatTimelineEventLabel('ORDER_STATUS_CHANGED', t)).toBe('Trạng thái đơn hàng thay đổi')
    expect(formatTimelineEventLabel('PRODUCTION_SCALE_SUBMITTED_QC')).toBe(
      'Production Scale Submitted QC',
    )
    expect(formatTimelineBlockerLabel('OPEN_CASE', t)).toBe('Open Case')
    expect(formatAddressStatusLabel('NOT_CHECKED', t)).toBe('Not Checked')
    expect(formatCaseTypeLabel('REFUND', t)).toBe('Hoàn tiền')
    expect(formatCaseTypeLabel('RETURN', t)).toBe('Return')
    expect(formatCaseSeverityLabel('HIGH', t)).toBe('High')
  })

  it('computes bottleneck stage and breakdown for single and multi-item orders', () => {
    const translations: Record<string, string> = {
      'orders.statuses.QC_PENDING': 'Chờ QC',
      'orders.statuses.IN_SCALE': 'Đang Scale',
      'orders.statuses.NEED_PSD': 'Thiếu file PSD',
      'orders.statuses.READY_TO_SEND_VENDOR': 'Sẵn sàng gửi vendor',
      'orders.statuses.QC_REJECTED': 'QC từ chối',
      'orders.statuses.CANCELLED': 'Đã hủy',
    }
    const t: Translate = (key, options) => translations[key] ?? options?.defaultValue ?? key
    const { getOrderBottleneckStage } = orderPresentation

    // Empty items
    expect(getOrderBottleneckStage([], t)).toBeNull()

    // Single item
    const single = getOrderBottleneckStage(
      [{ item: { id: '1', sku: 'SKU-1' }, workflow: { stage: 'QC_PENDING' } }],
      t,
    )
    expect(single?.bottleneckStage).toBe('QC_PENDING')
    expect(single?.displayLabel).toBe('Chờ QC')
    expect(single?.isMixed).toBe(false)
    expect(single?.tone).toBe('pending')

    // 2 items with identical stage
    const sameStage = getOrderBottleneckStage(
      [
        { item: { id: '1', sku: 'SKU-1' }, workflow: { stage: 'IN_SCALE' } },
        { item: { id: '2', sku: 'SKU-2' }, workflow: { stage: 'IN_SCALE' } },
      ],
      t,
    )
    expect(sameStage?.bottleneckStage).toBe('IN_SCALE')
    expect(sameStage?.displayLabel).toBe('Đang Scale')
    expect(sameStage?.isMixed).toBe(false)
    expect(sameStage?.tone).toBe('processing')

    // 2 items with mixed stages: NEED_PSD (rank 70) vs READY_TO_SEND_VENDOR (rank 120)
    const mixed = getOrderBottleneckStage(
      [
        { item: { id: '1', sku: 'SKU-A' }, workflow: { stage: 'NEED_PSD' } },
        { item: { id: '2', sku: 'SKU-B' }, workflow: { stage: 'READY_TO_SEND_VENDOR' } },
      ],
      t,
    )
    expect(mixed?.bottleneckStage).toBe('NEED_PSD')
    expect(mixed?.displayLabel).toBe('Thiếu file PSD (1/2)')
    expect(mixed?.isMixed).toBe(true)
    expect(mixed?.tone).toBe('pending')
    expect(mixed?.itemsBreakdown).toEqual([
      {
        id: '1',
        sku: 'SKU-A',
        stage: 'NEED_PSD',
        stageLabel: 'Thiếu file PSD',
        isBottleneck: true,
      },
      {
        id: '2',
        sku: 'SKU-B',
        stage: 'READY_TO_SEND_VENDOR',
        stageLabel: 'Sẵn sàng gửi vendor',
        isBottleneck: false,
      },
    ])

    // 3 items with 2 at the critical bottleneck stage
    const threeItems = getOrderBottleneckStage(
      [
        { item: { id: '1', sku: 'SKU-1' }, workflow: { stage: 'QC_REJECTED' } },
        { item: { id: '2', sku: 'SKU-2' }, workflow: { stage: 'QC_PENDING' } },
        { item: { id: '3', sku: 'SKU-3' }, workflow: { stage: 'QC_REJECTED' } },
      ],
      t,
    )
    expect(threeItems?.bottleneckStage).toBe('QC_REJECTED')
    expect(threeItems?.displayLabel).toBe('QC từ chối (2/3)')
    expect(threeItems?.tone).toBe('critical')

    // Mixed active and cancelled items: active item should be the bottleneck
    const withCancelled = getOrderBottleneckStage(
      [
        { item: { id: '1', sku: 'SKU-1' }, workflow: { stage: 'CANCELLED' } },
        { item: { id: '2', sku: 'SKU-2' }, workflow: { stage: 'QC_PENDING' } },
      ],
      t,
    )
    expect(withCancelled?.bottleneckStage).toBe('QC_PENDING')
    expect(withCancelled?.displayLabel).toBe('Chờ QC (1/2)')
    expect(withCancelled?.tone).toBe('pending')
  })
})
