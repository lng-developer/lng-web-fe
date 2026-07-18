export function getDisplayValue(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) return value.map((item) => getDisplayValue(item)).join(', ')
  if (typeof value === 'object') {
    return getDisplayValue(
      value.name ||
        value.title ||
        value.label ||
        value.code ||
        value.sku ||
        value.id ||
        value.externalOrderId,
      fallback,
    )
  }

  return fallback
}

export function getListItems(data) {
  if (Array.isArray(data)) return data

  const list =
    data?.items ||
    data?.rows ||
    data?.results ||
    data?.data?.items ||
    data?.data?.rows ||
    data?.data?.results

  return Array.isArray(list) ? list : []
}

function firstOrderWorkbenchItem(row) {
  const first = row?.items?.[0]
  return first?.item || first || row?.orderItem || {}
}

function firstReadableIssue(...values) {
  return values.find((value) => getDisplayValue(value, '') !== '') || undefined
}

function baseRow(row, index) {
  return {
    id: getDisplayValue(
      row.id || row._id || row.orderItemId || row.externalOrderId,
      `API-${index + 1}`,
    ),
    platform: getDisplayValue(row.platform || row.salesChannelCode || row.marketplaceCode),
    title: getDisplayValue(row.title || row.name || row.listingName || row.sku || row.code),
    owner: getDisplayValue(row.shop?.name || row.vendor?.name || row.vendorName || row.shopName),
    status: getDisplayValue(row.status || row.approvalStatus || row.reconciliationStatus),
    issue: getDisplayValue(row.issue || row.lastError || row.reason || row.productTypeGroup?.name),
    updatedAt: getDisplayValue(row.updatedAt || row.createdAt),
  }
}

function orderRow(row, index) {
  const order = row.order || row
  const item = firstOrderWorkbenchItem(row)
  const mapping = row.items?.[0]?.mapping || item.mapping || {}
  const customization = row.items?.[0]?.customization || item.customization || {}

  return {
    id: getDisplayValue(
      item.id || item._id || item.orderItemId || order.id || order._id,
      `API-${index + 1}`,
    ),
    platform: getDisplayValue(order.salesChannelCode || order.marketplaceCode || order.platform),
    title: getDisplayValue(item.title || item.name || item.sku || order.externalOrderId),
    owner: getDisplayValue(order.shop?.name || order.shopName || order.shopId),
    status: getDisplayValue(item.status || item.readinessStatus || order.status),
    issue: getDisplayValue(
      firstReadableIssue(
        item.issue,
        item.readinessStatus,
        mapping.status,
        customization.status,
        order.importStatus,
      ),
    ),
    updatedAt: getDisplayValue(item.updatedAt || order.updatedAt || order.createdAt),
  }
}

function productionRow(row, index) {
  return {
    id: getDisplayValue(row.id || row._id || row.orderItemId, `API-${index + 1}`),
    platform: getDisplayValue(
      row.salesChannelCode || row.marketplaceCode || row.orderItem?.salesChannelCode,
    ),
    title: getDisplayValue(
      row.orderItem?.title ||
        row.listing?.title ||
        row.internalTemplate?.name ||
        row.vendorProduct?.name ||
        row.id,
    ),
    owner: getDisplayValue(
      row.vendorProduct?.vendor?.name || row.vendorProduct?.vendorName || row.vendorProduct?.name,
    ),
    status: getDisplayValue(row.status || row.productionStatus),
    issue: getDisplayValue(
      row.fileCheckStatus || row.qcStatus || row.lastError || row.customization?.status,
    ),
    updatedAt: getDisplayValue(row.updatedAt || row.createdAt),
  }
}

function financeRow(row, index) {
  return {
    id: getDisplayValue(row.orderItemId || row.id || row._id || row.orderId, `API-${index + 1}`),
    platform: getDisplayValue(row.salesChannelCode || row.marketplaceCode || row.platform),
    title: getDisplayValue(row.orderItem?.title || row.sku || row.orderItemId || row.orderId),
    owner: getDisplayValue(row.grossRevenue || row.revenue || row.shop?.name || row.shopId),
    status: getDisplayValue(row.reconciliationStatus || row.status),
    issue: getDisplayValue(row.profitStatus || row.marginStatus || row.lastError || row.reason),
    updatedAt: getDisplayValue(row.updatedAt || row.createdAt),
  }
}

function mappingRow(row, index) {
  return {
    ...baseRow(row, index),
    title: getDisplayValue(
      row.matchTarget || row.rawValue || row.sourceValue || row.semanticRole || row.code,
    ),
    owner: getDisplayValue(
      row.sku || row.matchType || row.ruleType || row.shop?.name || row.shopId,
    ),
    status: getDisplayValue(row.status || row.approvalStatus || row.enabled),
    issue: getDisplayValue(row.productTypeGroup?.name || row.semanticRole || row.reason),
  }
}

function catalogRow(row, index) {
  return {
    id: getDisplayValue(row.id || row._id || row.code, `API-${index + 1}`),
    platform: 'Catalog',
    title: getDisplayValue(row.name || row.title || row.code),
    owner: getDisplayValue(row.code),
    status: getDisplayValue(row.status || row.approvalStatus),
    issue: getDisplayValue(
      row.issue || row.reason || row.readinessStatus,
      'Template and listing readiness',
    ),
    updatedAt: getDisplayValue(row.updatedAt || row.createdAt),
  }
}

function logisticsRow(row, index) {
  return {
    ...baseRow(row, index),
    id: getDisplayValue(
      row.id || row._id || row.productionTaskId || row.orderItemId,
      `API-${index + 1}`,
    ),
    title: getDisplayValue(
      row.payload?.externalOrderId || row.orderItemId || row.orderId || row.productionTaskId,
    ),
    owner: getDisplayValue(
      row.vendor?.name || row.vendorProduct?.vendor?.name || row.vendorProductId,
    ),
    status: getDisplayValue(row.status || row.submissionStatus || row.shipmentStatus),
    issue: getDisplayValue(row.payloadStatus || row.lastError || row.failureReason),
  }
}

export function mapApiRowForModule(moduleId, row, index) {
  if (moduleId === 'catalog') return catalogRow(row, index)
  if (moduleId === 'orders') return orderRow(row, index)
  if (moduleId === 'production') return productionRow(row, index)
  if (moduleId === 'finance') return financeRow(row, index)
  if (moduleId === 'mapping') return mappingRow(row, index)
  if (moduleId === 'logistics') return logisticsRow(row, index)

  return baseRow(row, index)
}
