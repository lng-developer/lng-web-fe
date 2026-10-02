import type {
  OrderBuyer,
  OrderCase,
  OrderCaseInput,
  OrderWorkbenchItem,
  ShippingAddress,
  ShippingService,
} from '../api/orderApi'

export type OrderModal = 'address' | 'customer' | 'shipping' | 'case' | 'replacement' | 'timeline'

export type OrderAction =
  | { kind: 'address'; address: ShippingAddress }
  | { kind: 'shipping'; shipping: ShippingService }
  | { kind: 'customer'; buyer: OrderBuyer }
  | { kind: 'validate-address' }
  | { kind: 'override-address'; reason?: string }
  | { kind: 'note'; itemId: string; note: string }
  | { kind: 'recheck-mapping'; itemId: string }
  | { kind: 'recheck-production'; itemId: string }
  | { kind: 'request-psd'; itemId: string }
  | { kind: 'retry-customization-assets'; itemId: string }
  | { kind: 'ready'; itemId: string }
  | { kind: 'cancel'; itemId: string; reason: string }
  | { kind: 'replacement'; itemId: string; reason: string; quantity: number }
  | {
      kind: 'order-replacement'
      reason: string
      items: Array<{ orderItemId: string; quantity: number }>
    }
  | { kind: 'case-save'; orderCase?: OrderCase; input: OrderCaseInput }
  | { kind: 'case-resolve'; orderCase: OrderCase; note: string }
  | { kind: 'case-cancel'; orderCase: OrderCase; note: string }
  | { kind: 'case-comment'; orderCase: OrderCase; body: string }

export type OrderItemConfirmation = {
  kind: 'cancel' | 'replacement'
  item: OrderWorkbenchItem
}

export function displayValue(input?: string | number | null) {
  return input == null || input === '' ? '—' : input
}

export function extractTimelineBlockers(metadata?: Record<string, unknown> | null): string[] {
  return Array.isArray(metadata?.blockers)
    ? metadata.blockers.filter((blocker): blocker is string => typeof blocker === 'string')
    : []
}

export function getAmazonProductUrl(asin?: string | null): string | null {
  const cleanAsin = asin?.trim()
  return cleanAsin ? `https://www.amazon.com/dp/${encodeURIComponent(cleanAsin)}` : null
}
