function clean(value) {
  return String(value ?? '').trim()
}

export function buildSellerOptions(rows = []) {
  const sellers = [...new Set(rows.map((row) => clean(row.seller)).filter(Boolean))].sort()

  return [
    { value: 'all', labelKey: 'orders.values.sellers.all' },
    ...sellers.map((seller) => ({ value: seller, label: seller })),
  ]
}

export function buildOrderFilterChips(filters = {}) {
  return [
    ['search', 'orders.filters.search', clean(filters.search)],
    ['channel', 'orders.filters.channel', filters.channel === 'all' ? '' : clean(filters.channel)],
    ['shopId', 'orders.filters.shop', filters.shopId === 'all' ? '' : clean(filters.shopId)],
    ['seller', 'orders.filters.seller', filters.seller === 'all' ? '' : clean(filters.seller)],
  ]
    .filter(([, , value]) => value)
    .map(([key, labelKey, value]) => ({ key, labelKey, value }))
}
