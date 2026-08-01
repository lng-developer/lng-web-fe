import type { ShipmentParams } from './shipmentApi'

export const shipmentKeys = {
  all: ['shipments'] as const,
  list: (params: ShipmentParams) => [...shipmentKeys.all, 'list', params] as const,
  summary: (params: Omit<ShipmentParams, 'page' | 'limit'>) =>
    [...shipmentKeys.all, 'summary', params] as const,
  detail: (id: string) => [...shipmentKeys.all, 'detail', id] as const,
  logs: (vendorSubmissionId: string) => [...shipmentKeys.all, 'logs', vendorSubmissionId] as const,
}
