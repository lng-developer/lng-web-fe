const listKeys = ['items', 'rows', 'results', 'records', 'data']

export function getListItems(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []

  for (const key of listKeys) {
    const value = payload[key]
    if (Array.isArray(value)) return value
    if (value && typeof value === 'object') {
      const nested = getListItems(value)
      if (nested.length > 0) return nested
    }
  }

  return []
}

function firstValue(record, keys) {
  for (const key of keys) {
    const value = record?.[key]
    if (value !== null && value !== undefined && value !== '') return value
  }
  return ''
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) return `${value.length} items`

  return (
    firstValue(value, ['name', 'displayName', 'title', 'code', 'id', '_id']) ||
    JSON.stringify(value)
  )
}

export function mapWorkflowRows(items) {
  return items.map((item, index) => {
    const id = displayValue(firstValue(item, ['id', '_id', 'uuid', 'jobId']) || `row-${index + 1}`)

    return {
      id,
      title: displayValue(
        firstValue(item, [
          'externalOrderId',
          'orderId',
          'name',
          'title',
          'code',
          'trackingNumber',
          'provider',
          'status',
        ]) || id,
      ),
      status: displayValue(firstValue(item, ['status', 'state', 'submitStatus', 'shipmentStatus'])),
      owner: displayValue(
        firstValue(item, ['vendor', 'shop', 'assignee', 'owner', 'seller', 'team']),
      ),
      updatedAt: displayValue(
        firstValue(item, ['updatedAt', 'createdAt', 'orderDate', 'importedAt']),
      ),
      raw: item,
    }
  })
}
