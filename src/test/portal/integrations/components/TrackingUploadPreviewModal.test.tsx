import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { listShipments } from '@/features/portal/shipments/api/shipmentApi'
import { createAmazonTrackingSubmission } from '@/features/portal/integrations/api/integrationApi'
import { TrackingUploadPreviewModal } from '@/features/portal/integrations/components/TrackingUploadPreviewModal'
import i18n from '@/shared/i18n/i18n'

vi.mock('@/features/portal/shipments/api/shipmentApi', () => ({ listShipments: vi.fn() }))
vi.mock('@/features/portal/integrations/api/integrationApi', () => ({
  createAmazonTrackingSubmission: vi.fn(),
  listExtensionManagementAgents: vi.fn().mockResolvedValue({ items: [] }),
}))

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
    expect(screen.getByText('Missing Info')).toBeVisible()
    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })
  it('submits ready tracking rows when agentId is provided', async () => {
    vi.mocked(createAmazonTrackingSubmission).mockResolvedValue({
      id: 'sub-1',
      shopId: 'shop-1',
      agentId: 'agent-1',
      shipmentIds: ['shipment-1'],
      filename: 'shipping-confirmation-1.txt',
      rowCount: 1,
      checksum: 'fake-checksum',
      status: 'PENDING',
      createdAt: '2026-09-29T10:00:00.000Z',
      updatedAt: '2026-09-29T10:00:00.000Z',
    } as Awaited<ReturnType<typeof createAmazonTrackingSubmission>>)

    const onClose = vi.fn()

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <TrackingUploadPreviewModal shopId="shop-1" agentId="agent-1" onClose={onClose} />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByText('114-1234567-1234567')).toBeVisible())

    const submitButton = screen.getByRole('button', { name: /Submit 1 to Amazon/i })
    expect(submitButton).toBeEnabled()
    submitButton.click()

    await waitFor(() => {
      expect(createAmazonTrackingSubmission).toHaveBeenCalledWith({
        shopId: 'shop-1',
        agentId: 'agent-1',
        shipmentIds: ['shipment-1'],
      })
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('groups multi-item shipments sharing the same tracking number into one row and submits all shipment IDs', async () => {
    vi.mocked(listShipments).mockResolvedValue({
      items: [
        {
          id: 'shipment-101',
          shopId: 'shop-1',
          externalOrderId: '114-0159247-1546624',
          carrier: 'UPS Mail Innovations',
          trackingNumber: '92612903108421543475001234',
          shippedAt: '2026-11-11T00:00:00.000Z',
          marketplaceConfirmationStatus: 'PENDING',
        },
        {
          id: 'shipment-102',
          shopId: 'shop-1',
          externalOrderId: '114-0159247-1546624',
          carrier: 'UPS Mail Innovations',
          trackingNumber: '92612903108421543475001234',
          shippedAt: '2026-11-11T00:00:00.000Z',
          marketplaceConfirmationStatus: 'PENDING',
        },
      ],
      pagination: { total: 2, page: 1, limit: 100 },
    } as Awaited<ReturnType<typeof listShipments>>)

    vi.mocked(createAmazonTrackingSubmission).mockResolvedValue({
      id: 'sub-2',
      shopId: 'shop-1',
      agentId: 'agent-1',
      shipmentIds: ['shipment-101', 'shipment-102'],
      filename: 'shipping-confirmation-2.txt',
      rowCount: 1,
      checksum: 'fake-checksum',
      status: 'PENDING',
      createdAt: '2026-11-11T10:00:00.000Z',
      updatedAt: '2026-11-11T10:00:00.000Z',
    } as Awaited<ReturnType<typeof createAmazonTrackingSubmission>>)

    const onClose = vi.fn()

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <TrackingUploadPreviewModal shopId="shop-1" agentId="agent-1" onClose={onClose} />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByText('114-0159247-1546624')).toBeVisible())
    // Should display the 2 items tag
    expect(screen.getByText('2 items')).toBeVisible()

    // Submit button should indicate 1 order and 2 items
    const submitButton = screen.getByRole('button', {
      name: /Submit 1 orders? \(2 items\) to Amazon/i,
    })
    expect(submitButton).toBeEnabled()
    submitButton.click()

    await waitFor(() => {
      expect(createAmazonTrackingSubmission).toHaveBeenCalledWith({
        shopId: 'shop-1',
        agentId: 'agent-1',
        shipmentIds: ['shipment-101', 'shipment-102'],
      })
      expect(onClose).toHaveBeenCalled()
    })
  })
})
