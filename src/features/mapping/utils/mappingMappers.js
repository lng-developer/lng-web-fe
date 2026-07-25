const listKeys = [
  'recentUnmatchedOrderItemSamples',
  'samples',
  'items',
  'rows',
  'results',
  'records',
  'data',
]

function asArray(value) {
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

function firstValue(record, keys) {
  for (const key of keys) {
    const value = record?.[key]
    if (value !== null && value !== undefined && value !== '') return value
  }
  return ''
}

function display(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return (
    firstValue(value, ['name', 'displayName', 'title', 'label', 'code', 'id', '_id']) || fallback
  )
}

function displayWithoutId(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback
  if (Array.isArray(value)) {
    return (
      value
        .map((item) => displayWithoutId(item, ''))
        .filter(Boolean)
        .join(', ') || fallback
    )
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return firstValue(value, ['name', 'displayName', 'title', 'label', 'code']) || fallback
}

function getListItems(payload) {
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

function mapInput(input) {
  const role = display(firstValue(input, ['role', 'semanticRole', 'label']), 'Input')
  const value = display(firstValue(input, ['value', 'rawValue', 'matchValue']))
  const normalized = display(firstValue(input, ['normalizedValue', 'normalized', 'output']))
  return normalized === '-' || normalized === value
    ? `${role}: ${value}`
    : `${role}: ${value} -> ${normalized}`
}

function getOrderItemId(item) {
  return display(firstValue(item, ['orderItemId', 'itemId', 'id', '_id']), '')
}

function isVisibleHistoryField(field) {
  return !['id', '_id', 'createdAt', 'updatedAt'].includes(field) && !/Ids?$/.test(field)
}

function historyValue(value) {
  if (Array.isArray(value)) return value.map(historyValue).filter(Boolean).join(', ') || '-'
  if (value && typeof value === 'object') {
    return (
      Object.entries(value)
        .filter(([field]) => isVisibleHistoryField(field))
        .map(([field, nestedValue]) => `${field}: ${historyValue(nestedValue)}`)
        .join(', ') || '-'
    )
  }
  return displayWithoutId(value)
}

export function mapMappingAuthorableShops(payload = {}, globalLabel = 'Global') {
  const shops = getListItems(payload).map((shop) => ({
    id: String(shop.id),
    label: shop.code ? `${shop.name} (${shop.code})` : shop.name,
  }))
  return payload.canCreateGlobal ? [{ id: '', label: globalLabel }, ...shops] : shops
}

export function mapMappingWorkbenchRows(payload) {
  return getListItems(payload).map((item, index) => {
    const skuNormalization = item.skuNormalization || {}
    const skuMapping = item.skuMapping || {}
    const plan = item.plan || item.fulfillmentPlan || {}

    return {
      id: getOrderItemId(item) || `item-${index + 1}`,
      orderLabel: display(firstValue(item, ['externalOrderId', 'orderNumber', 'orderId'])),
      itemLabel: display(
        firstValue(item, ['title', 'itemTitle', 'productTitle', 'sku']),
        'Order item',
      ),
      originalSku: display(firstValue(skuNormalization, ['originalSku', 'rawSku']) || item.sku),
      canonicalSku: display(
        firstValue(skuNormalization, ['canonicalSku', 'normalizedSku']) || item.canonicalSku,
      ),
      configCode: display(firstValue(skuMapping, ['configCode']) || item.configCode),
      blockingReasons: asArray(firstValue(item, ['blockingReasons', 'reasons'])).map(display),
      recommendedFixes: asArray(firstValue(item, ['recommendedFixTypes', 'recommendedFixes'])).map(
        display,
      ),
      normalizedInputs: asArray(item.normalizedInputs).map(mapInput),
      vendorCandidateCount: asArray(item.vendorProductCandidates).length,
      costCenterCandidateCount: asArray(item.costCenterCandidates).length,
      planStatus: display(firstValue(plan, ['status'])),
      raw: item,
    }
  })
}

function mapVendorCandidate(candidate) {
  const vendor = display(candidate.vendor)
  const product = display(firstValue(candidate, ['name', 'productName', 'title']), 'Vendor product')
  return {
    id: display(firstValue(candidate, ['vendorProductId', 'id', '_id']), ''),
    label: vendor === '-' ? product : `${vendor} / ${product}`,
    raw: candidate,
  }
}

function mapCostCenterCandidate(candidate) {
  const id = display(firstValue(candidate, ['vendorCostCenterId', 'costCenterId', 'id', '_id']), '')
  const vendorProductId = display(firstValue(candidate, ['vendorProductId', 'productId']), '')
  const cost = firstValue(candidate, ['totalCost', 'cost', 'price'])
  const currency = display(firstValue(candidate, ['currency', 'currencyCode']), '')
  const name = display(firstValue(candidate, ['name', 'costCenterName', 'label']), 'Cost center')
  const label = cost === '' ? name : `${name} - ${cost}${currency ? ` ${currency}` : ''}`

  return {
    id,
    label,
    raw: candidate,
    vendorCostCenterId: id,
    vendorProductId,
  }
}

export function mapMappingPreview(payload = {}) {
  const skuNormalization = payload.skuNormalization || {}
  const skuMapping = payload.skuMapping || {}
  const autoMatch = payload.autoMatch || null

  return {
    ready: Boolean(payload.ready),
    originalSku: display(firstValue(skuNormalization, ['originalSku', 'rawSku'])),
    canonicalSku: display(firstValue(skuNormalization, ['canonicalSku', 'normalizedSku'])),
    configCode: display(firstValue(skuMapping, ['configCode'])),
    normalizedInputs: asArray(payload.normalizedInputs).map(mapInput),
    vendorCandidates: asArray(payload.vendorProductCandidates).map(mapVendorCandidate),
    costCenterCandidates: asArray(payload.costCenterCandidates).map(mapCostCenterCandidate),
    blockingReasons: asArray(payload.blockingReasons).map(display),
    autoMatch: autoMatch
      ? {
          vendorCostCenterId: display(
            firstValue(autoMatch, ['vendorCostCenterId', 'costCenterId']),
            '',
          ),
          vendorProductId: display(firstValue(autoMatch, ['vendorProductId', 'productId']), ''),
        }
      : null,
  }
}

export function mapMappingPlan(payload = {}) {
  const plan = payload.plan || payload.fulfillmentPlan || payload
  return {
    selectionMode: display(plan.selectionMode),
    status: display(plan.status),
    vendor: display(plan.vendor),
    vendorCostCenter: display(plan.vendorCostCenter || plan.costCenter),
    vendorProduct: display(plan.vendorProduct),
  }
}

export function mapMappingRuleRows(type, payload) {
  return getListItems(payload).map((rule, index) => ({
    id: display(firstValue(rule, ['id', '_id']), `rule-${index + 1}`),
    label: displayWithoutId(
      firstValue(rule, ['semanticRole', 'configCode', 'patternType', 'vendorName']) ||
        rule.productTypeGroup,
      type === 'vendorRouting' ? 'Vendor routing rule' : 'Mapping rule',
    ),
    match: displayWithoutId(
      firstValue(rule, ['matchValue', 'platformProductType', 'appliesWhenValues', 'segmentRole']),
    ),
    output: displayWithoutId(
      firstValue(rule, [
        'normalizedValue',
        'productTypeGroupName',
        'outputAction',
        'vendorProductName',
      ]) ||
        rule.vendor ||
        rule.internalTemplate ||
        rule.productTypeGroup,
      type === 'vendorRouting' ? 'Preferred vendor' : '-',
    ),
    priority: firstValue(rule, ['priority']) || 0,
    raw: rule,
    scope: displayWithoutId(
      rule.shop || rule.shopName,
      rule.shopId
        ? 'Scoped shop'
        : [rule.salesChannelCode, rule.marketplaceCode].filter(Boolean).join(' / ') || 'Global',
    ),
    status: display(rule.status, 'ACTIVE'),
    type,
  }))
}

export function mapMappingRuleHistory(payload) {
  return getListItems(payload).map((item, index) => {
    const before = item.before || {}
    const after = item.after || {}
    const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])]

    return {
      id: display(firstValue(item, ['id', '_id']), `history-${index + 1}`),
      actor: displayWithoutId(
        firstValue(item, ['actor', 'actorAccount']),
        item.actorAccountId ? 'ACCOUNT' : 'SYSTEM',
      ),
      changes: fields
        .filter(
          (field) =>
            isVisibleHistoryField(field) &&
            JSON.stringify(before[field]) !== JSON.stringify(after[field]),
        )
        .map((field) => ({
          field,
          before: historyValue(before[field]),
          after: historyValue(after[field]),
        })),
      createdAt: item.createdAt || null,
      event: display(item.event, 'UPDATED'),
    }
  })
}
