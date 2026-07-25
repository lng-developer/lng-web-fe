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

export function getMappingRuleInvalidationKeys(type, id) {
  const keys = [['mapping', 'rules', type]]
  if (id) keys.push(['mapping', 'rules', type, id, 'history'])
  return keys
}
