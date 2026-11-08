import { describe, expect, it } from 'vitest'

import { isImportantNotification } from '@/features/notifications/utils/notificationUrgency'

describe('isImportantNotification', () => {
  it('returns false for null or undefined', () => {
    expect(isImportantNotification(null)).toBe(false)
    expect(isImportantNotification(undefined)).toBe(false)
  })

  it('identifies important notifications by type', () => {
    expect(
      isImportantNotification({
        type: 'ORDER_ASSIGNED',
        title: 'Thông báo',
        message: 'Nội dung thông thường',
        relatedResource: null,
      }),
    ).toBe(true)

    expect(
      isImportantNotification({
        type: 'QC_FAILED',
        title: 'File lỗi',
        message: 'Cần kiểm tra',
        relatedResource: null,
      }),
    ).toBe(true)

    expect(
      isImportantNotification({
        type: 'PRODUCTION_ALERT',
        title: 'Thông báo',
        message: 'Trạng thái',
        relatedResource: null,
      }),
    ).toBe(true)
  })

  it('identifies important notifications by relatedResource type', () => {
    expect(
      isImportantNotification({
        type: 'GENERIC_NOTICE',
        title: 'Thông báo',
        message: 'Kiểm tra',
        relatedResource: { type: 'order', id: 'ord-123' },
      }),
    ).toBe(true)

    expect(
      isImportantNotification({
        type: 'UPDATE',
        title: 'Yêu cầu',
        message: 'Chi tiết',
        relatedResource: { type: 'payroll', id: 'pay-1' },
      }),
    ).toBe(true)
  })

  it('identifies important notifications by title or message keywords', () => {
    expect(
      isImportantNotification({
        type: 'CUSTOM',
        title: 'Cần duyệt đơn nghỉ phép',
        message: 'Nhân viên A xin nghỉ',
        relatedResource: null,
      }),
    ).toBe(true)

    expect(
      isImportantNotification({
        type: 'SYSTEM',
        title: 'Cảnh báo đồng bộ thất bại',
        message: 'Hệ thống phát hiện lỗi',
        relatedResource: null,
      }),
    ).toBe(true)

    expect(
      isImportantNotification({
        type: 'INFO',
        title: 'Action required immediately',
        message: 'Please review',
        relatedResource: null,
      }),
    ).toBe(true)
  })

  it('returns false for generic, non-urgent notifications', () => {
    expect(
      isImportantNotification({
        type: 'GENERAL_ANNOUNCEMENT',
        title: 'Chúc mừng sinh nhật',
        message: 'Chúc bạn một ngày vui vẻ',
        relatedResource: null,
      }),
    ).toBe(false)
  })
})
