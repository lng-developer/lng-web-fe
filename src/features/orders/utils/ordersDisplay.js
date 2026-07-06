export function normalizeSearch(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function matchesOption(value, selected) {
  return !selected || selected === 'all' || value === selected
}

function getOrderSearchText(order) {
  return [
    order.id,
    order.customer,
    order.channel,
    order.shop,
    order.seller,
    order.product?.sku,
    order.product?.asin,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function filterOrders(orders = [], filters = {}) {
  const search = normalizeSearch(filters.search)

  return orders.filter((order) => {
    const tabMatch = !filters.tab || filters.tab === 'all' || order.tabKey === filters.tab
    const searchMatch = !search || getOrderSearchText(order).includes(search)

    return (
      tabMatch &&
      searchMatch &&
      matchesOption(order.channel, filters.channel) &&
      matchesOption(order.shop, filters.shop) &&
      matchesOption(order.seller, filters.seller)
    )
  })
}

export function getOrderTabCounts(orders = []) {
  return orders.reduce(
    (counts, order) => ({
      ...counts,
      all: counts.all + 1,
      [order.tabKey]: (counts[order.tabKey] ?? 0) + 1,
    }),
    { all: 0 },
  )
}

export function getDefaultExpandedOrderIds(orders = []) {
  return orders.map((order) => order.id).filter(Boolean)
}

export function toggleOrderSelection(selectedIds = [], orderId) {
  return selectedIds.includes(orderId)
    ? selectedIds.filter((selectedId) => selectedId !== orderId)
    : [...selectedIds, orderId]
}
