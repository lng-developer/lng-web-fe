import type { AppNotification } from './api/notificationApi'

const targets: Record<string, string> = {
  order: '/portal/orders',
  designTask: '/portal/design/idea-tasks',
  productionTask: '/portal/production',
  vendorSubmission: '/portal/vendor-submissions',
  shipment: '/portal/shipments',
  leaveRequest: '/hr/me/requests',
  overtimeRequest: '/hr/me/requests',
  payrollResult: '/hr/me/payroll',
  announcement: '/hr/me',
}

export function notificationTarget(
  item: Pick<AppNotification, 'type' | 'relatedResource'>,
): string | null {
  const resource = item.relatedResource
  if (!resource?.id || !Object.hasOwn(targets, resource.type)) return null
  const params = new URLSearchParams({ resourceId: resource.id })
  if (resource.type === 'leaveRequest' || resource.type === 'overtimeRequest') {
    params.set('kind', resource.type === 'leaveRequest' ? 'leave' : 'overtime')
    if (item.type.endsWith('_PENDING')) params.set('review', '1')
  }
  return `${targets[resource.type]}?${params}`
}
