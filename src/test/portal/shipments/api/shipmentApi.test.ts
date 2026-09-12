import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}))

import {
  getShipment,
  getTrackingSyncConfig,
  listShipments,
  listWebhookLogs,
  recheckShipment,
  recheckSubmittedShipments,
  recheckVendorTracking,
  summarizeShipments,
  updateShipmentStatus,
  updateShipmentTracking,
  updateTrackingSyncConfig,
  runTrackingSyncNow,
} from '@/features/portal/shipments/api/shipmentApi'
import { apiClient } from '@/shared/api'

describe('shipmentApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })
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

  it('uses tracking, status, and batch recheck contracts', async () => {
    await updateShipmentTracking('shipment-1', {
      carrier: 'USPS',
      trackingNumber: 'TRACK-1',
      trackingUrl: 'https://example.com/TRACK-1',
      note: 'Corrected',
    })
    await updateShipmentStatus('shipment-1', { status: 'EXCEPTION', note: 'Delayed' })
    await recheckVendorTracking({ vendorSubmissionId: 'submission-1' })
    await recheckSubmittedShipments({ provider: 'MERCHIZE', limit: 50 })
    await getTrackingSyncConfig()
    await updateTrackingSyncConfig({ enabled: true, intervalMinutes: 15, batchSize: 50 })
    await runTrackingSyncNow()

    expect(apiClient.patch).toHaveBeenCalledWith('/api/shipments/shipment-1/tracking', {
      carrier: 'USPS',
      trackingNumber: 'TRACK-1',
      trackingUrl: 'https://example.com/TRACK-1',
      note: 'Corrected',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/shipments/shipment-1/status', {
      status: 'EXCEPTION',
      note: 'Delayed',
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/shipments/vendor-tracking/recheck', {
      vendorSubmissionId: 'submission-1',
    })
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/shipments/vendor-tracking/recheck-submitted',
      { provider: 'MERCHIZE', limit: 50 },
    )
    expect(apiClient.get).toHaveBeenCalledWith('/api/shipments/tracking-sync/config')
    expect(apiClient.patch).toHaveBeenCalledWith('/api/shipments/tracking-sync/config', {
      enabled: true,
      intervalMinutes: 15,
      batchSize: 50,
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/shipments/tracking-sync/run')
  })
})
