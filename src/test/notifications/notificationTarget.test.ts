import { describe, expect, it } from 'vitest'
import { notificationTarget } from '@/features/notifications/notificationTarget'

describe('notification targets', () => {
  it.each([
    ['order', 'ORDER_ASSIGNED', '/portal/orders?resourceId=record-1'],
    ['designTask', 'DESIGN_TASK_ASSIGNED', '/portal/design?resourceId=record-1'],
    ['productionTask', 'PRODUCTION_TASK_ASSIGNED', '/portal/production?resourceId=record-1'],
    [
      'vendorSubmission',
      'VENDOR_SUBMISSION_FAILED',
      '/portal/vendor-submissions?resourceId=record-1',
    ],
    ['shipment', 'SHIPMENT_EXCEPTION', '/portal/shipments?resourceId=record-1'],
    ['leaveRequest', 'LEAVE_PENDING', '/hr/me/requests?resourceId=record-1&kind=leave&review=1'],
    ['overtimeRequest', 'OVERTIME_APPROVED', '/hr/me/requests?resourceId=record-1&kind=overtime'],
    ['payrollResult', 'PAYROLL_PAID', '/hr/me/payroll?resourceId=record-1'],
    ['announcement', 'ANNOUNCEMENT', '/hr/me?resourceId=record-1'],
  ])('opens %s at its exact record', (resourceType, type, expected) => {
    expect(
      notificationTarget({ type, relatedResource: { type: resourceType, id: 'record-1' } }),
    ).toBe(expected)
  })
  it('does not invent destinations for missing or unsupported resources', () => {
    expect(notificationTarget({ type: 'UNKNOWN', relatedResource: null })).toBeNull()
    expect(
      notificationTarget({
        type: 'UNKNOWN',
        relatedResource: { type: 'https://external.test', id: '1' },
      }),
    ).toBeNull()
  })
})
