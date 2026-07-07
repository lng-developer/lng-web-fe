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
  return orders.map((order) => order.apiId || order.id).filter(Boolean)
}

export function toggleOrderSelection(selectedIds = [], orderId) {
  return selectedIds.includes(orderId)
    ? selectedIds.filter((selectedId) => selectedId !== orderId)
    : [...selectedIds, orderId]
}

export function getPaginationPages(page = 1, totalPages = 1) {
  const normalizedTotal = Math.max(Number(totalPages) || 1, 1)
  const currentPage = Math.min(Math.max(Number(page) || 1, 1), normalizedTotal)

  if (normalizedTotal <= 5) {
    return Array.from({ length: normalizedTotal }, (_, index) => index + 1)
  }

  const left = Math.max(currentPage - 1, 2)
  const right = Math.min(currentPage + 1, normalizedTotal - 1)
  const pages = [1]

  if (left > 2) {
    pages.push('...')
  } else {
    for (let pageNumber = 2; pageNumber < left; pageNumber += 1) {
      pages.push(pageNumber)
    }
  }

  for (let pageNumber = left; pageNumber <= right; pageNumber += 1) {
    pages.push(pageNumber)
  }

  if (right < normalizedTotal - 1) {
    pages.push('...')
  } else {
    for (let pageNumber = right + 1; pageNumber < normalizedTotal; pageNumber += 1) {
      pages.push(pageNumber)
    }
  }

  pages.push(normalizedTotal)

  return pages
}
