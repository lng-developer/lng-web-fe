function clean(value) {
  return String(value ?? '').trim()
}

function maybeAdd(params, key, value) {
  const cleaned = clean(value)
  return cleaned ? { ...params, [key]: cleaned } : params
}

export function getOrderItemWorkflowScope(order = {}) {
  const firstItemEntry = order.workbenchItems?.[0] || {}
  const item = firstItemEntry.item || {}

  return {
    orderId: clean(order.apiId || item.orderId),
    orderItemId: clean(item.id || item.orderItemId),
    shopId: clean(order.shopId || order.raw?.shopId),
    externalOrderId: clean(item.externalOrderId || order.id || order.raw?.externalOrderId),
    externalItemId: clean(item.externalItemId),
  }
}

export function buildOrderItemCaseQuery(scope = {}) {
  return [
    ['orderId', scope.orderId],
    ['orderItemId', scope.orderItemId],
  ].reduce((query, [key, value]) => maybeAdd(query, key, value), { page: 1, limit: 5 })
}

export function buildOrderItemImportIssueQuery(scope = {}) {
  return [
    ['externalOrderId', scope.externalOrderId],
    ['externalItemId', scope.externalItemId],
  ].reduce((query, [key, value]) => maybeAdd(query, key, value), { page: 1, limit: 5 })
}

export function buildOrderItemExceptionQuery(scope = {}) {
  return maybeAdd({ page: 1, limit: 20 }, 'shopId', scope.shopId)
}

export function filterRowsForOrderItemWorkflow(rows = [], scope = {}) {
  const orderId = clean(scope.orderId)
  const orderItemId = clean(scope.orderItemId)
  const externalOrderId = clean(scope.externalOrderId)

  return rows.filter((row) => {
    if (orderItemId && clean(row.orderItemId) === orderItemId) return true
    if (orderId && clean(row.orderId) === orderId) return true
    return externalOrderId && clean(row.primary) === externalOrderId
  })
}
