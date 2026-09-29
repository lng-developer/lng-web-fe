import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { listShipments } from '@/features/portal/shipments/api/shipmentApi'
import { TrackingUploadPreviewModal } from '@/features/portal/integrations/components/TrackingUploadPreviewModal'
import i18n from '@/shared/i18n/i18n'

vi.mock('@/features/portal/shipments/api/shipmentApi', () => ({ listShipments: vi.fn() }))

describe('TrackingUploadPreviewModal', () => {
  afterEach(cleanup)

  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    vi.mocked(listShipments).mockResolvedValue({
      items: [
        {
          id: 'shipment-1',
          shopId: 'shop-1',
          externalOrderId: '114-1234567-1234567',
          carrier: 'USPS',
          trackingNumber: '9400111899223856928499',
          shippedAt: '2026-09-29T10:00:00.000Z',
        },
        {
          id: 'shipment-2',
          shopId: 'shop-1',
          externalOrderId: '114-7654321-7654321',
          carrier: null,
          trackingNumber: 'TRACK-2',
          shippedAt: null,
        },
      ],
      pagination: { total: 2, page: 1, limit: 100 },
    } as Awaited<ReturnType<typeof listShipments>>)
  })

  it('shows vendor tracking fields and marks incomplete rows without filling them', async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <TrackingUploadPreviewModal shopId="shop-1" onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    await waitFor(() =>
      expect(listShipments).toHaveBeenCalledWith({
        shopId: 'shop-1',
        status: 'SHIPPED',
        page: 1,
        limit: 100,
      }),
    )

    await waitFor(() => expect(screen.getByText('114-1234567-1234567')).toBeVisible())
    expect(screen.getByText('USPS')).toBeVisible()
    expect(screen.getByText('9400111899223856928499')).toBeVisible()
    expect(screen.getByText('Wait for vendor')).toBeVisible()
    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })
})
