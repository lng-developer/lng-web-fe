function getItems(data) {
  if (Array.isArray(data)) return data
  return data?.items || data?.rows || data?.results || data?.data || []
}

function formatDate(value) {
  if (!value) return '-'
  try {
    return new Intl.DateTimeFormat('en', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

function text(value, fallback = '-') {
  const cleaned = String(value ?? '').trim()
  return cleaned || fallback
}

function labelize(value, fallback = '-') {
  const cleaned = text(value, fallback)
  const words = cleaned.toLowerCase().split('_').filter(Boolean)
  const sentence = words.join(' ')
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

function getTimelineStatusChange(item = {}) {
  if (!item.fromStatus && !item.toStatus) return '-'
  return `${text(item.fromStatus, 'Start')} -> ${text(item.toStatus, 'End')}`
}

export function mapCustomerExceptionRows(data) {
  return getItems(data).map((item, index) => ({
    id: item.id || `${item.orderId || 'exception'}-${item.orderItemId || index}`,
    primary: text(item.externalOrderId, 'Order unavailable'),
    secondary: text(item.title || item.sku, 'No item context'),
    status: text(item.status),
    tag: text(item.reason || item.caseType, 'Exception'),
    message: text(item.message),
    date: formatDate(item.createdAt),
    orderId: item.orderId || null,
    orderItemId: item.orderItemId || null,
  }))
}

export function mapOrderCaseRows(data) {
  return getItems(data).map((item) => ({
    id: item.id,
    primary: text(item.title, 'Untitled case'),
    secondary: text(item.description, 'No description'),
    status: text(item.status),
    tag: text(item.caseType || item.severity, 'Case'),
    message: text(item.resolutionNote || item.cancelReason, 'Needs operator review'),
    date: formatDate(item.createdAt),
    orderId: item.orderId || null,
    orderItemId: item.orderItemId || null,
  }))
}

export function mapImportIssueRows(data) {
  return getItems(data).map((item) => ({
    id: item.id,
    primary: text(item.externalOrderId, `Row ${item.rowNumber || '-'}`),
    secondary: text(item.externalItemId || item.source, 'No item reference'),
    status: text(item.status),
    tag: text(item.issueType || item.severity, 'Import issue'),
    message: text(item.errorMessage || item.errorCode, 'No error message'),
    date: formatDate(item.createdAt),
    importJobId: item.importJobId || null,
    rawRecordId: item.rawRecordId || null,
  }))
}

export function mapReadinessRows(data = {}) {
  const checks = data.checks || {}
  const blockingIssues = checks.blockingIssues || {}

  return [
    {
      key: 'address',
      label: 'Address',
      ok: Boolean(checks.address?.ok),
      value: text(checks.address?.status),
    },
    {
      key: 'customization',
      label: 'Customization',
      ok: Boolean(checks.customization?.ok),
      value: text(checks.customization?.status),
    },
    {
      key: 'blockingIssues',
      label: 'Blocking issues',
      ok: Boolean(blockingIssues.ok),
      value: `${Number(blockingIssues.count || 0)} open`,
    },
    {
      key: 'itemStatus',
      label: 'Item status',
      ok: Boolean(checks.itemStatus?.ok),
      value: text(checks.itemStatus?.status),
    },
  ]
}

export function mapTimelineRows(data) {
  return getItems(data).map((item, index) => ({
    id: item.id || `${item.eventType || 'event'}-${index}`,
    event: labelize(item.eventType, 'Event'),
    message: text(item.message, 'No message'),
    statusChange: getTimelineStatusChange(item),
    source: text(item.source),
    date: formatDate(item.createdAt),
  }))
}

export function mapOrderItemOptions(detail = {}) {
  const items = Array.isArray(detail) ? detail : Array.isArray(detail.items) ? detail.items : []

  return items
    .map((entry, index) => {
      const item = entry.item || entry
      const value = item.id || item.orderItemId
      if (!value) return null

      return {
        value,
        label: text(item.title || item.sku, `Item ${index + 1}`),
        caption: [item.sku, `Qty ${item.quantity ?? '-'}`, item.status].filter(Boolean).join(' | '),
        raw: item,
      }
    })
    .filter(Boolean)
}
