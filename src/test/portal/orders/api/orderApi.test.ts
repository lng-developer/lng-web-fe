import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn() } }))

import {
  addOrderCaseComment,
  cancelOrderCase,
  cancelOrderItem,
  createOrderCase,
  createOrderItemReplacement,
  createOrderReplacement,
  getOrderCase,
  getOrderSummary,
  listOrderCases,
  listOrderItemTimeline,
  listOrderTimeline,
  listOrderWorkbench,
  markOrderItemFulfillmentReady,
  recheckMapping,
  recheckProduction,
  resolveOrderCase,
  updateOrderBuyer,
  updateOrderCase,
  updateOrderItemCsNote,
  updateShippingAddress,
  updateShippingService,
  validateShippingAddress,
} from '@/features/portal/orders/api/orderApi'
import { apiClient } from '@/shared/api'

describe('orderApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], pagination: { page: 1, limit: 10, total: 0 } },
    })
  })

  it('uses shipping service and case write contracts', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], pagination: { page: 1, limit: 10, total: 0 } },
    })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })

    await updateShippingService('order-1', { name: 'Standard', level: 'GROUND' })
    await listOrderCases('order-1')
    await createOrderCase({
      orderId: 'order-1',
      caseType: 'ADDRESS',
      severity: 'HIGH',
      title: 'Invalid address',
      description: 'Postal code needs review',
    })
    await updateOrderCase('case-1', { title: 'Updated title' })
    await resolveOrderCase('case-1', 'Corrected by customer')
    await cancelOrderCase('case-1', 'Opened by mistake')
    await getOrderCase('case-1')
    await addOrderCaseComment('case-1', 'Customer confirmed the change')

    expect(apiClient.patch).toHaveBeenCalledWith('/api/orders/order-1/shipping-service', {
      name: 'Standard',
      level: 'GROUND',
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/orders/cases', {
      params: { orderId: 'order-1', page: 1, limit: 10 },
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/orders/cases', {
      orderId: 'order-1',
      caseType: 'ADDRESS',
      severity: 'HIGH',
      title: 'Invalid address',
      description: 'Postal code needs review',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/orders/cases/case-1', {
      title: 'Updated title',
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/orders/cases/case-1/resolve', {
      resolutionNote: 'Corrected by customer',
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/orders/cases/case-1/cancel', {
      cancelReason: 'Opened by mistake',
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/orders/cases/case-1')
    expect(apiClient.post).toHaveBeenCalledWith('/api/orders/cases/case-1/comments', {
      body: 'Customer confirmed the change',
    })
  })

  it('omits empty filters from workbench requests', async () => {
    await listOrderWorkbench({ page: 1, limit: 10, search: '', tab: undefined })
    await getOrderSummary({ page: 1, limit: 10, search: '', tab: 'ALL' })

    expect(apiClient.get).toHaveBeenCalledWith('/api/orders/workbench', {
      params: { page: 1, limit: 10 },
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/orders/summary', {
      params: { page: 1, limit: 10, tab: 'ALL' },
    })
  })

  it('uses the existing order write contracts', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'job-1', status: 'COMPLETED', result: {} },
    })

    await updateShippingAddress('order-1', { city: 'Austin', countryCode: 'US' })
    await updateOrderBuyer('order-1', { name: 'Updated customer' })
    await listOrderTimeline('order-1')
    await listOrderItemTimeline('item-1')
    await validateShippingAddress('order-1')
    await updateOrderItemCsNote('item-1', 'Check artwork')
    await recheckMapping('item-1')
    await recheckProduction('item-1')
    await cancelOrderItem('item-1', 'Customer requested cancellation')
    await createOrderItemReplacement('item-1', { reason: 'Damaged', quantity: 2 })
    await createOrderReplacement('order-1', {
      reason: 'Package damaged',
      items: [{ orderItemId: 'item-1', quantity: 2 }],
    })
    await markOrderItemFulfillmentReady('item-1')

    expect(apiClient.patch).toHaveBeenCalledWith('/api/orders/order-1/shipping-address', {
      city: 'Austin',
      countryCode: 'US',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/orders/order-1/buyer', {
      name: 'Updated customer',
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/orders/order-1/timeline', {
      params: { page: 1, limit: 50 },
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/orders/items/item-1/timeline', {
      params: { page: 1, limit: 50 },
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/orders/order-1/validate-address')
    expect(apiClient.patch).toHaveBeenCalledWith('/api/orders/items/item-1/cs-note', {
      csNote: 'Check artwork',
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/mapping/order-items/item-1/recheck')
    expect(apiClient.post).toHaveBeenCalledWith('/api/production/order-items/item-1/recheck')
    expect(apiClient.post).toHaveBeenCalledWith('/api/orders/items/item-1/cancel', {
      reason: 'Customer requested cancellation',
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/orders/items/item-1/replacement', {
      reason: 'Damaged',
      quantity: 2,
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/orders/order-1/replacement', {
      reason: 'Package damaged',
      items: [{ orderItemId: 'item-1', quantity: 2 }],
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/orders/items/item-1/mark-fulfillment-ready')
  })
})
