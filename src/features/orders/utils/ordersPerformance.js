export function createWorkbenchRows(count = 100) {
  return Array.from({ length: count }, (_, index) => ({
    order: {
      id: `66000000000000000000${String(index).padStart(4, '0')}`,
      externalOrderId: `ORDER-${index}`,
      status: 'PROCESSING',
      salesChannelCode: 'AMAZON',
      shop: { name: 'LNG Shop' },
      buyer: { name: `Buyer ${index}` },
      pricing: { currency: 'USD', customerPaidAmount: 2500 },
    },
    items: [
      {
        item: {
          id: `77000000000000000000${String(index).padStart(4, '0')}`,
          title: 'Custom Mug',
          sku: 'MUG-11OZ',
          quantity: 1,
          status: 'CUSTOMIZATION_PARSED',
        },
        seller: { name: 'Operator A' },
        customization: { inputs: [] },
        mapping: {},
        pricing: { currency: 'USD', customerPaidAmount: 2500 },
        production: {},
      },
    ],
  }))
}

export function countDefaultDetailQueries(rows = [], expandedIds = []) {
  const expanded = new Set(expandedIds)

  return rows.reduce((count, row) => {
    const orderId = row.order?.id || row.order?.externalOrderId
    return expanded.has(orderId) ? count + 1 : count
  }, 0)
}
