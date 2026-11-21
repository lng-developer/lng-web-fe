import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createAmazonTrackingSubmission,
  createExtensionCommand,
  previewAmazonTrackingSubmission,
} from '@/features/portal/integrations/api/integrationApi'
import { TrackingUploadPreviewModal } from '@/features/portal/integrations/components/TrackingUploadPreviewModal'
import i18n from '@/shared/i18n/i18n'

vi.mock('@/features/portal/integrations/api/integrationApi', () => ({
  createAmazonTrackingSubmission: vi.fn(),
  createExtensionCommand: vi.fn(),
  previewAmazonTrackingSubmission: vi.fn(),
  listExtensionManagementAgents: vi.fn().mockResolvedValue({ items: [] }),
}))

describe('TrackingUploadPreviewModal', () => {
  afterEach(cleanup)

  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    vi.mocked(previewAmazonTrackingSubmission).mockResolvedValue({
      items: [
        {
          key: '114-1234567-1234567__9400111899223856928499',
          shipmentIds: ['shipment-1'],
          externalOrderId: '114-1234567-1234567',
          carrier: 'USPS',
          carrierCode: 'USPS',
          carrierName: '',
          shipMethod: 'USPS Ground Advantage',
          trackingNumber: '9400111899223856928499',
          shipDate: '2026-09-29',
          itemCount: 1,
          marketplaceConfirmationStatus: 'PENDING',
          isReady: true,
          issues: [],
        },
        {
          key: '114-7654321-7654321__TRACK-2',
          shipmentIds: ['shipment-2'],
          externalOrderId: '114-7654321-7654321',
          carrier: '',
          carrierCode: 'Other',
          carrierName: '',
          shipMethod: 'Standard',
          trackingNumber: 'TRACK-2',
          shipDate: '',
          itemCount: 1,
          marketplaceConfirmationStatus: 'PENDING',
          isReady: false,
          issues: ['missing_carrier', 'missing_shipped_at'],
        },
      ],
      tsv: 'order-id\torder-item-id\tquantity\tship-date\tcarrier-code\tcarrier-name\ttracking-number\tship-method\r\n114-1234567-1234567\t\t\t2026-09-29\tUSPS\t\t9400111899223856928499\tUSPS Ground Advantage\r\n',
      rowCount: 1,
      summary: {
        totalOrders: 2,
        totalShipments: 2,
        readyOrders: 1,
        readyShipments: 1,
        confirmedOrders: 0,
        pendingOrders: 2,
      },
    })
  })

  it('shows Amazon feed fields and marks incomplete rows with missing info', async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <TrackingUploadPreviewModal shopId="shop-1" onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    await waitFor(() =>
      expect(previewAmazonTrackingSubmission).toHaveBeenCalledWith({
        shopId: 'shop-1',
      }),
    )

    await waitFor(() => expect(screen.getByText('114-1234567-1234567')).toBeVisible())
    expect(screen.getByText('USPS')).toBeVisible()
    expect(screen.getByText('USPS Ground Advantage')).toBeVisible()
    expect(screen.getByText('9400111899223856928499')).toBeVisible()
    expect(screen.getByText('2026-09-29')).toBeVisible()
    expect(screen.getByText(/Missing Data/i)).toBeVisible()
  })

  it('renders all UI labels in Vietnamese when language is switched to vi', async () => {
    await i18n.changeLanguage('vi')

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <TrackingUploadPreviewModal shopId="shop-1" onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByText('114-1234567-1234567')).toBeVisible())
    // Verify Vietnamese table headers and status
    expect(screen.getAllByText('Mã đơn hàng')[0]).toBeVisible()
    expect(screen.getAllByText('Ngày gửi hàng')[0]).toBeVisible()
    expect(screen.getAllByText('Mã nhà vận chuyển')[0]).toBeVisible()
    expect(screen.getAllByText('Tên nhà vận chuyển')[0]).toBeVisible()
    expect(screen.getAllByText('Phương thức vận chuyển')[0]).toBeVisible()
    expect(screen.getAllByText('Mã vận đơn')[0]).toBeVisible()
    expect(screen.getAllByText('Trạng thái')[0]).toBeVisible()
    expect(screen.getAllByText(/Thiếu thông tin/i)[0]).toBeVisible()
    expect(screen.getAllByText(/Sẵn sàng gửi/i)[0]).toBeVisible()
    expect(screen.getByText(/Xem trước dữ liệu tải lên tracking Amazon/i)).toBeVisible()
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
    })

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

  it('creates one Etsy command from the selected preview rows', async () => {
    vi.mocked(createExtensionCommand).mockResolvedValue({ id: 'command-1' } as never)
    const onClose = vi.fn()

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <TrackingUploadPreviewModal
          shopId="shop-1"
          agentId="agent-1"
          mode="ETSY"
          onClose={onClose}
        />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByText('114-1234567-1234567')).toBeVisible())
    screen.getByRole('button', { name: /Create Etsy command for 1 order/i }).click()

    await waitFor(() => {
      expect(createExtensionCommand).toHaveBeenCalledWith({
        type: 'UPLOAD_TRACKING',
        shopId: 'shop-1',
        agentId: 'agent-1',
        items: [
          {
            orderId: '114-1234567-1234567',
            trackingNumber: '9400111899223856928499',
            carrier: 'USPS',
          },
        ],
      })
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('groups multi-item shipments sharing the same tracking number into one row and submits all shipment IDs', async () => {
    vi.mocked(previewAmazonTrackingSubmission).mockResolvedValue({
      items: [
        {
          key: '114-0159247-1546624__92612903108421543475001234',
          shipmentIds: ['shipment-101', 'shipment-102'],
          externalOrderId: '114-0159247-1546624',
          carrier: 'UPS Mail Innovations',
          carrierCode: 'UPS',
          carrierName: '',
          shipMethod: 'UPS Mail Innovations',
          trackingNumber: '92612903108421543475001234',
          shipDate: '2026-11-11',
          itemCount: 2,
          marketplaceConfirmationStatus: 'PENDING',
          isReady: true,
          issues: [],
        },
      ],
      tsv: 'order-id\torder-item-id\tquantity\tship-date\tcarrier-code\tcarrier-name\ttracking-number\tship-method\r\n114-0159247-1546624\t\t\t2026-11-11\tUPS\t\t92612903108421543475001234\tUPS Mail Innovations\r\n',
      rowCount: 1,
      summary: {
        totalOrders: 1,
        totalShipments: 2,
        readyOrders: 1,
        readyShipments: 1,
        confirmedOrders: 0,
        pendingOrders: 1,
      },
    })

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
    })

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
