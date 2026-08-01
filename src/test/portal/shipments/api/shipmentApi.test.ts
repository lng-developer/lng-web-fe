import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

import {
  getShipment,
  listShipments,
  listWebhookLogs,
  recheckShipment,
  summarizeShipments,
} from '@/features/portal/shipments/api/shipmentApi'
import { apiClient } from '@/shared/api'

describe('shipmentApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
  })

  it('uses shipment identity recheck without caller-selected vendor fields', async () => {
    const params = { page: 1, limit: 20, status: 'TRACKING_PENDING' as const }
    await listShipments(params)
    await summarizeShipments({ status: 'TRACKING_PENDING' })
    await getShipment('shipment-1')
    await listWebhookLogs({ page: 1, limit: 20 })
    await recheckShipment('shipment-1')

    expect(apiClient.get).toHaveBeenCalledWith('/api/shipments', { params })
    expect(apiClient.get).toHaveBeenCalledWith('/api/shipments/summary', {
      params: { status: 'TRACKING_PENDING' },
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/shipments/shipment-1')
    expect(apiClient.get).toHaveBeenCalledWith('/api/shipments/vendor-webhooks/logs', {
      params: { page: 1, limit: 20 },
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/shipments/shipment-1/recheck')
  })
})
