export function getMappingFlowInvalidationKeys(orderItemId) {
  const keys = [['mapping'], ['orders']]

  if (orderItemId) {
    keys.push(['orders', 'items', orderItemId, 'readiness'])
  }

  keys.push(['production'])

  if (orderItemId) {
    keys.push(['production', 'order-item', orderItemId])
  }

  return keys
}
