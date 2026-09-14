import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/orders/api/orderApi', () => ({
  getOrderSummary: vi.fn(),
  listOrderWorkbench: vi.fn(),
}))

vi.mock('@/features/portal/catalog/api/catalogApi', () => ({
  getListingSummary: vi.fn(),
  listListings: vi.fn(),
}))

vi.mock('@/features/portal/customers/api/customerApi', () => ({
  getCustomerSummary: vi.fn(),
}))

vi.mock('@/features/portal/reports/api/reportApi', () => ({
  getBuyerInsights: vi.fn(),
  getOperationsOverview: vi.fn(),
  listFinanceDailyProfit: vi.fn(),
  listVendorPerformance: vi.fn(),
}))

import { OperationsDashboardPage } from '@/features/foundation/OperationsDashboardPage'
import { getListingSummary, listListings } from '@/features/portal/catalog/api/catalogApi'
import { getCustomerSummary } from '@/features/portal/customers/api/customerApi'
import type { OrderWorkbenchRow } from '@/features/portal/orders/api/orderApi'
import { getOrderSummary, listOrderWorkbench } from '@/features/portal/orders/api/orderApi'
import {
  getBuyerInsights,
  getOperationsOverview,
  listFinanceDailyProfit,
  listVendorPerformance,
} from '@/features/portal/reports/api/reportApi'
import { setGlobalPermissions, setPermissions } from '@/shared/auth/session'
import i18n from '@/shared/i18n/i18n'
import { renderWithTestProviders } from '@/test/helpers/testProviders'

const orderRow: OrderWorkbenchRow = {
  order: {
    id: 'order-1',
    externalOrderId: '111-1111111-1111111',
    createdAt: '2026-08-17T00:00:00.000Z',
    orderedAt: '2026-08-17T00:00:00.000Z',
    status: 'PROCESSING',
    buyer: {},
    shop: null,
    shippingService: {},
    shippingAddress: {},
    addressValidationStatus: null,
    pricing: { customerPaidAmount: 0, baseCostAmount: null, currency: 'USD' },
    handlingLabel: null,
    caseStatus: null,
    assignedStaffIds: [],
  },
  items: [
    {
      item: {
        id: 'item-1',
        sourceSku: 'J2508-TEST',
        sku: 'J2508-TEST',
        asin: 'B0TEST',
        title: 'Test shirt',
        quantity: 1,
        status: 'PROCESSING',
        csNote: null,
      },
      seller: null,
      listing: { title: 'Test shirt', productImageUrl: null },
      customization: null,
      mapping: null,
      pricing: { customerPaidAmount: 0, baseCostAmount: null, currency: 'USD' },
      production: null,
      tracking: null,
      workflow: { stage: 'PROCESSING', owner: 'SYSTEM', blockers: [], nextActions: [] },
    },
  ],
}

describe('OperationsDashboardPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    setPermissions([])
    setGlobalPermissions([])
  })

  beforeEach(async () => {
    window.localStorage.setItem('lng.language', 'vi')
    await i18n.changeLanguage('vi')
    setPermissions(['ORDERS:READ', 'CATALOG:READ', 'REPORTS:READ'])
    setGlobalPermissions(['ORDERS:READ', 'CATALOG:READ', 'REPORTS:READ'])
    vi.mocked(getOrderSummary).mockResolvedValue({
      tabCounts: {
        all: 67,
        NEW_ORDER: 7,
        NO_COST_CENTER: 10,
        NO_PSD: 10,
        ADDRESS_ISSUE: 10,
      },
    })
    vi.mocked(listOrderWorkbench).mockResolvedValue({
      items: [orderRow],
      pagination: { total: 1, page: 1, limit: 8 },
    })
    vi.mocked(getListingSummary).mockResolvedValue({
      totalListingCount: 3,
      approvedCount: 0,
      draftCount: 2,
      noPsdCount: 1,
      rejectedCount: 0,
    })
    vi.mocked(listListings).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 8 },
    })
    vi.mocked(getCustomerSummary).mockResolvedValue({
      total: 0,
      newCount: 0,
      returningCount: 0,
      vipCount: 0,
      atRiskCount: 0,
      issueProneCount: 0,
      needsFollowUpCount: 0,
      totalRevenueAmount: 0,
      averageOrderValue: 0,
    })
    vi.mocked(getBuyerInsights).mockResolvedValue({
      knownBuyerCount: 20,
      newBuyerCount: 4,
      returningBuyerCount: 16,
      repeatBuyerCount: 3,
      unidentifiedOrderCount: 0,
      totalOrderCount: 25,
    })
    vi.mocked(listFinanceDailyProfit).mockResolvedValue([])
    vi.mocked(getOperationsOverview).mockResolvedValue({
      orderItemsByStatus: { MAPPING_PENDING: 6, NEED_PRODUCTION: 4, QC_REJECTED: 2 },
      productionByStatus: {},
      productionBlockers: {},
      vendorSubmissionsByStatus: { FAILED: 3 },
      shipmentsByStatus: { TRACKING_PENDING: 5, EXCEPTION: 1 },
    })
    vi.mocked(listVendorPerformance).mockResolvedValue({
      items: [
        {
          vendorId: 'vendor-1',
          vendorCode: 'ACME',
          vendorName: 'Acme Print',
          readyCount: 0,
          submittedCount: 8,
          failedCount: 2,
          cancelledCount: 0,
          shippedCount: 5,
          successRateBps: 8000,
          avgProcessingHours: 12,
        },
      ],
    })
  })

  it('renders total orders, summary, and order status chart metrics', async () => {
    renderWithTestProviders(<OperationsDashboardPage />)

    expect(await screen.findByText('Tổng đơn hàng')).toBeVisible()
    await waitFor(() => expect(getOrderSummary).toHaveBeenCalled())
    expect((await screen.findAllByText('67'))[0]).toBeVisible()
    expect(screen.getAllByRole('button', { name: 'Đơn mới: 7' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Đơn hàng: 67' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Đã duyệt: 0' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Đã duyệt: 0' })[0]).toHaveStyle({
      height: '18%',
    })
  })

  it('puts the action queue before analytic charts', async () => {
    renderWithTestProviders(<OperationsDashboardPage />)

    const queue = await screen.findByRole('region', { name: 'Hàng đợi cần xử lý' })
    const charts = screen.getByRole('region', { name: 'Phân tích đơn hàng' })
    expect(queue.compareDocumentPosition(charts)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('renders recent order IDs as copyable badges', async () => {
    renderWithTestProviders(<OperationsDashboardPage />)

    expect(await screen.findByRole('button', { name: '111-1111111-1111111' })).toBeVisible()
  })

  it('shows a data warning when the recent orders request fails', async () => {
    vi.mocked(listOrderWorkbench).mockRejectedValueOnce(new Error('Workbench unavailable'))

    renderWithTestProviders(<OperationsDashboardPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không thể tải đầy đủ dữ liệu dashboard',
    )
  })

  it('loads operational health reports and keeps import health reachable', async () => {
    renderWithTestProviders(<OperationsDashboardPage />)

    expect(await screen.findByRole('heading', { name: 'Sức khỏe vận hành' })).toBeVisible()
    await waitFor(() => expect(getOperationsOverview).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(listVendorPerformance).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('link', { name: 'Xem tình trạng import' })).toHaveAttribute(
      'href',
      '/portal/integrations',
    )
  })
})
