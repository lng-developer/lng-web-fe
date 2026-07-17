const UI_TAB_TO_API_TAB = {
  all: 'ALL',
  new: 'NEW_ORDER',
  missingCostCenter: 'NO_COST_CENTER',
  missingPsd: 'NO_PSD',
  awaitingPayment: 'PAYMENT_PENDING',
  processing: 'IN_PROGRESS',
  shipped: 'SHIPPED',
  delivered: 'DELIVERED',
  cancelled: 'CANCELLED',
  openCase: 'OPEN_CASE',
}

const API_TAB_TO_UI_TAB = {
  ALL: 'all',
  NEW_ORDER: 'new',
  NO_COST_CENTER: 'missingCostCenter',
  NO_PSD: 'missingPsd',
  PAYMENT_PENDING: 'awaitingPayment',
  IN_PROGRESS: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  OPEN_CASE: 'openCase',
}

const STATUS_TAB_MAP = {
  IMPORTED: 'new',
  PROCESSING: 'processing',
  PARTIALLY_SHIPPED: 'processing',
  SHIPPED: 'shipped',
  CANCELLED: 'cancelled',
  REFUNDED: 'cancelled',
  FAILED: 'cancelled',
  ON_HOLD: 'processing',
}

const CHANNEL_MAP = {
  amazon: 'AMAZON',
  etsy: 'ETSY',
  shopify: 'SHOPIFY',
  tiktok_shop: 'TIKTOK_SHOP',
  walmart: 'WALMART',
  custom: 'CUSTOM',
}

const STATUS_LABEL_KEY_MAP = {
  IMPORTED: 'orders.values.status.new',
  PROCESSING: 'orders.values.status.processing',
  PARTIALLY_SHIPPED: 'orders.values.status.partiallyShipped',
  SHIPPED: 'orders.values.status.shipped',
  CANCELLED: 'orders.values.status.cancelled',
  REFUNDED: 'orders.values.status.refunded',
  FAILED: 'orders.values.status.failed',
  ON_HOLD: 'orders.values.status.onHold',
}

const ITEM_STATUS_LABEL_KEY_MAP = {
  NEW: 'orders.values.status.new',
  MAPPING_PENDING: 'orders.values.status.mappingPending',
  CUSTOMIZATION_PENDING: 'orders.values.status.customizationPending',
  CUSTOMIZATION_PARSED: 'orders.values.status.customizationParsed',
  FULFILLMENT_PLANNING: 'orders.values.status.fulfillmentPlanning',
  FULFILLMENT_READY: 'orders.values.status.fulfillmentReady',
  NEED_PRODUCTION: 'orders.values.status.needProduction',
  IN_PRODUCTION: 'orders.values.status.inProduction',
  QC_REJECTED: 'orders.values.status.qcRejected',
  READY_TO_SEND_VENDOR: 'orders.values.status.readyToSendVendor',
  SENT_TO_VENDOR: 'orders.values.status.sentToVendor',
  TRACKING_PENDING: 'orders.values.status.trackingPending',
  SHIPPED: 'orders.values.status.shipped',
  CANCELLED: 'orders.values.status.cancelled',
  REFUNDED: 'orders.values.status.refunded',
  FAILED: 'orders.values.status.failed',
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=420&q=80'

function optionalString(value) {
  const cleaned = String(value ?? '').trim()
  return cleaned || null
}

function maybeAdd(params, key, value) {
  const cleaned = typeof value === 'string' ? optionalString(value) : value
  return cleaned ? { ...params, [key]: cleaned } : params
}

function formatDate(value, locale = 'en') {
  if (!value) return '-'

  try {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

function getHandlingLabel(order = {}) {
  if (order.handlingLabel) return order.handlingLabel
  if (Number.isFinite(order.handlingDays)) {
    return `${order.handlingDays} ${order.handlingDays === 1 ? 'Day' : 'Days'}`
  }

  const start = order.orderedAt || order.createdAt
  const end = order.shipByDate
  if (!start || !end) return '-'

  const startedAt = new Date(start).getTime()
  const shipBy = new Date(end).getTime()
  if (Number.isNaN(startedAt) || Number.isNaN(shipBy) || shipBy < startedAt) return '-'

  const days = Math.ceil((shipBy - startedAt) / (24 * 60 * 60 * 1000))
  return `${days} ${days === 1 ? 'Day' : 'Days'}`
}

function getCaseTitle(order = {}) {
  return order.caseTitle || order.latestCase?.title || order.case?.title || order.openCase?.title || ''
}

function formatMoney(price = {}) {
  const amount = Number(price.itemPriceAmount ?? 0)
  const currency = price.currency || 'USD'

  if (!amount) return '-'

  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
    }).format(amount / 100)
  } catch {
    return `${amount / 100} ${currency}`
  }
}

function formatMinorMoney(amount, currency = 'USD') {
  const value = Number(amount ?? 0)
  if (!value) return '-'

  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value / 100)
  } catch {
    return `${value / 100} ${currency || 'USD'}`
  }
}

function toDisplayValue(value, preferredKeys = ['label', 'value', 'name']) {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => toDisplayValue(item, preferredKeys))
      .filter(Boolean)
      .join(', ')
  }
  if (typeof value === 'object') {
    const displayKey = preferredKeys.find(
      (key) => value[key] !== null && value[key] !== undefined && value[key] !== '',
    )
    if (displayKey) return toDisplayValue(value[displayKey], preferredKeys)
    return JSON.stringify(value)
  }

  return String(value)
}

function getVariantValue(variantRaw = {}, keys = []) {
  const entries = Object.entries(variantRaw || {})
  const match = entries.find(([key]) =>
    keys.some((expected) => key.toLowerCase().includes(expected)),
  )

  return toDisplayValue(match?.[1])
}

function getCustomerInputValue(customerInputs = {}, keys = []) {
  const structuredItems = [
    ...(customerInputs.texts || []),
    ...(customerInputs.options || []),
    ...(customerInputs.images || []),
  ]
  const structuredMatch = structuredItems.find((item) => {
    const searchable = `${item?.name || ''} ${item?.label || ''}`.toLowerCase()
    return keys.some((expected) => searchable.includes(expected))
  })
  if (structuredMatch) return toDisplayValue(structuredMatch, ['value', 'label', 'name'])

  const entries = Object.entries(customerInputs || {})
  const match = entries.find(([key]) =>
    keys.some((expected) => key.toLowerCase().includes(expected)),
  )

  return toDisplayValue(match?.[1], ['value', 'label', 'name'])
}

function getWorkbenchInputValue(inputs = [], keys = []) {
  const match = inputs.find((input) => {
    const searchable = `${input?.name || ''} ${input?.label || ''}`.toLowerCase()
    return keys.some((expected) => searchable.includes(expected))
  })

  return toDisplayValue(match?.value, ['value', 'label', 'name'])
}

function getWorkbenchImageInputs(inputs = []) {
  return inputs
    .filter((input) => input?.type === 'IMAGE')
    .map((input) => input.secureUrl)
    .filter(Boolean)
}

function getWorkbenchCustomizationFields(inputs = []) {
  return inputs
    .filter((input) => input?.type !== 'IMAGE')
    .map((input) => ({
      label: input.label || input.name || '',
      value: toDisplayValue(input.value, ['value', 'label', 'name']),
      type: input.type || '',
    }))
    .filter((field) => field.label && field.value)
}

function getWorkbenchCustomizationImages(inputs = []) {
  return inputs
    .filter((input) => input?.type === 'IMAGE' && input.secureUrl)
    .map((input) => ({
      label: input.label || input.name || '',
      url: input.secureUrl,
    }))
}

function getWorkbenchOrderFlags(order = {}) {
  return {
    missingCostCenter: order.pricing?.costCenterStatus === 'MISSING',
    missingPsd: order.psdStatus === 'MISSING',
    awaitingPayment: order.paymentStatus === 'PENDING',
    openCase: order.caseStatus === 'OPEN',
  }
}

export function getOrderTabKey(order = {}) {
  if (order.flags?.openCase) return 'openCase'
  if (order.flags?.missingCostCenter) return 'missingCostCenter'
  if (order.flags?.missingPsd) return 'missingPsd'
  if (order.flags?.awaitingPayment) return 'awaitingPayment'
  if (order.flags?.delivered) return 'delivered'

  return STATUS_TAB_MAP[order.status] || 'processing'
}

export function mapApiTabCounts(apiCounts = {}) {
  return Object.entries(apiCounts).reduce((counts, [apiKey, value]) => {
    const uiKey = API_TAB_TO_UI_TAB[apiKey]
    if (!uiKey) return counts

    return { ...counts, [uiKey]: Number(value) || 0 }
  }, {})
}

export function buildOrderListQuery(filters = {}) {
  const params = {
    page: Math.max(Number(filters.page) || 1, 1),
    limit: Math.min(Math.max(Number(filters.limit) || 10, 1), 100),
  }
  const tab = UI_TAB_TO_API_TAB[filters.tab]
  const search = optionalString(filters.search)
  const channel = CHANNEL_MAP[String(filters.channel || '').toLowerCase()]
  const shopId = filters.shopId === 'all' ? '' : filters.shopId
  const seller = filters.seller === 'all' ? '' : filters.seller
  const dateRange = filters.dateRange || {}

  return [
    ['tab', tab],
    ['search', search],
    ['salesChannelCode', channel],
    ['shopId', shopId],
    ['seller', seller],
    ['dateFrom', dateRange.start?.format?.('YYYY-MM-DD')],
    ['dateTo', dateRange.end?.format?.('YYYY-MM-DD')],
  ].reduce((current, [key, value]) => maybeAdd(current, key, value), params)
}

export function buildOrderSummaryQuery(filters = {}) {
  const summaryQuery = buildOrderListQuery(filters)
  delete summaryQuery.limit
  delete summaryQuery.page
  delete summaryQuery.tab
  return summaryQuery
}

export function mapApiOrderToOrderRow(
  order = {},
  { shopNameById = new Map(), locale = 'en' } = {},
) {
  const externalOrderId = order.externalOrderId || order.id
  const shopName = shopNameById.get(order.shopId) || order.shopName || order.shopId || '-'
  const customer = order.buyer?.name || order.shippingAddress?.name || '-'
  const shippingType = order.shippingService?.name || order.shippingService?.level || '-'
  const channel = String(order.salesChannelCode || '').toLowerCase()
  const firstItem = order.itemsSummary?.[0] || {}

  return {
    apiId: order.id,
    id: externalOrderId,
    tabKey: getOrderTabKey(order),
    channel,
    shopId: order.shopId,
    shop: shopName,
    seller: '',
    status: order.status,
    statusKey: STATUS_LABEL_KEY_MAP[order.status] || order.status || 'orders.values.common.noData',
    caseTitle: getCaseTitle(order),
    createdAt: formatDate(order.createdAt, locale),
    createdAgoKey: '',
    orderDate: formatDate(order.orderedAt, locale),
    orderAgoKey: '',
    shippingType,
    shippingTypeKey: '',
    customer,
    customerInfo: {
      email: order.buyer?.emailMasked || '',
      address: order.shippingAddress?.addressLine1 || '',
      address2: order.shippingAddress?.addressLine2 || '',
      state:
        order.shippingAddress?.stateOrProvinceCode || order.shippingAddress?.stateOrProvince || '',
      city: order.shippingAddress?.city || '',
      country: order.shippingAddress?.countryCode || order.shippingAddress?.country || '',
      zipCode: order.shippingAddress?.postalCode || '',
      phoneNumber: order.shippingAddress?.phoneMasked || order.buyer?.phoneMasked || '',
    },
    basecost: formatMinorMoney(order.customerPaidAmount ?? order.totalAmount, order.currency),
    storeKey: '',
    storeName: shopName,
    handlingKey: '',
    handling: getHandlingLabel(order),
    productImages: [FALLBACK_IMAGE],
    product: {
      ...buildEmptyProduct(),
      sku: firstItem.sku || '-',
      asin: order.externalAccountId || '-',
      seller: order.externalAccountId || '-',
      team: order.marketplaceCode || '-',
    },
    customization: {
      ...buildEmptyCustomization(),
      productType: firstItem.title || '-',
    },
    fulfillment: {
      ...buildEmptyFulfillment(),
      quantity: String(firstItem.quantity ?? order.itemsCount ?? '-'),
      fulfillQty: String(firstItem.quantity ?? order.itemsCount ?? '-'),
    },
    raw: order,
  }
}

export function mapOrderRows(apiOrders = [], options = {}) {
  return apiOrders.map((order) => mapApiOrderToOrderRow(order, options))
}

export function mapWorkbenchOrderToOrderRow(row = {}, { locale = 'en' } = {}) {
  const order = row.order || {}
  const itemEntry = row.items?.[0] || {}
  const item = itemEntry.item || {}
  const customization = itemEntry.customization || {}
  const inputs = customization.inputs || []
  const mapping = itemEntry.mapping || {}
  const pricing = itemEntry.pricing || {}
  const production = itemEntry.production || {}
  const shopName = order.shop?.name || order.shopName || order.shopId || '-'
  const externalOrderId = order.externalOrderId || order.id
  const customizationColor = getWorkbenchInputValue(inputs, ['color', 'colour']) || '-'
  const customizationSize = getWorkbenchInputValue(inputs, ['size']) || '-'
  const fulfillmentColor = mapping.vendorCostCenter?.color || customizationColor
  const fulfillmentSize = mapping.vendorCostCenter?.size || customizationSize
  const customerName =
    getWorkbenchInputValue(inputs, ['name', 'text', 'custom']) || order.buyer?.name || '-'
  const photos = getWorkbenchImageInputs(inputs)
  const customizationFields = getWorkbenchCustomizationFields(inputs)
  const customizationImages = getWorkbenchCustomizationImages(inputs)
  const currency = order.pricing?.currency || pricing.currency || order.currency || 'USD'
  const baseCostAmount =
    order.pricing?.baseCostAmount ??
    order.pricing?.totalCostAmount ??
    order.pricing?.customerPaidAmount ??
    order.customerPaidAmount

  return {
    apiId: order.id,
    id: externalOrderId,
    tabKey: getOrderTabKey({
      status: order.status,
      flags: getWorkbenchOrderFlags(order),
    }),
    channel: String(order.salesChannelCode || '').toLowerCase(),
    shopId: order.shopId,
    shop: shopName,
    seller: itemEntry.seller?.name || itemEntry.seller?.employeeCode || '',
    status: order.status,
    statusKey: STATUS_LABEL_KEY_MAP[order.status] || order.status || 'orders.values.common.noData',
    caseStatus: order.caseStatus || 'NONE',
    caseTitle: getCaseTitle(order),
    createdAt: formatDate(order.createdAt, locale),
    createdAgoKey: '',
    orderDate: formatDate(order.orderedAt, locale),
    orderAgoKey: '',
    shippingType: order.shippingService?.name || order.shippingService?.level || '-',
    shippingTypeKey: '',
    customer: order.buyer?.name || '-',
    customerInfo: {
      email: order.buyer?.emailMasked || '',
      address: order.shippingAddress?.addressLine1 || '',
      address2: order.shippingAddress?.addressLine2 || '',
      state:
        order.shippingAddress?.stateOrProvinceCode || order.shippingAddress?.stateOrProvince || '',
      city: order.shippingAddress?.city || '',
      country: order.shippingAddress?.countryCode || order.shippingAddress?.country || '',
      zipCode: order.shippingAddress?.postalCode || '',
      phoneNumber: order.shippingAddress?.phoneMasked || order.buyer?.phoneMasked || '',
    },
    basecost: formatMinorMoney(baseCostAmount, currency),
    storeKey: '',
    storeName: shopName,
    handlingKey: '',
    handling: getHandlingLabel(order),
    productImages: photos.length > 0 ? photos : [FALLBACK_IMAGE],
    product: {
      ...buildEmptyProduct(),
      scaleByKey: production.scaleBy ? '' : 'orders.values.common.noData',
      scaleBy: production.scaleBy || '-',
      qcBy: production.qcBy || '-',
      sku: item.sku || '-',
      asin: item.asin || itemEntry.listing?.asin || '-',
      seller: itemEntry.seller?.name || itemEntry.seller?.employeeCode || '-',
      team: order.marketplaceCode || '-',
    },
    customization: {
      ...buildEmptyCustomization(),
      productType: item.title || '-',
      shirtColor: customizationColor,
      size: customizationSize,
      customerPhoto: photos.length > 0 ? photos : [FALLBACK_IMAGE],
      customerName,
      fields: customizationFields,
      images: customizationImages,
    },
    fulfillment: {
      ...buildEmptyFulfillment(),
      quantity: String(item.quantity ?? '-'),
      fulfillQty: String(item.quantity ?? '-'),
      statusKey:
        ITEM_STATUS_LABEL_KEY_MAP[item.status] || item.status || 'orders.values.common.noData',
      trackingKey: itemEntry.tracking?.trackingNumber || 'orders.values.common.noData',
      vendorProduct:
        mapping.vendorProduct?.name || mapping.vendorProduct?.code || item.title || '-',
      size: fulfillmentSize,
      color: fulfillmentColor,
      fulfillName: order.externalOrderId || item.externalItemId || '-',
      noteKey: itemEntry.tracking?.note || 'orders.values.common.noData',
    },
    raw: order,
    workbenchItems: row.items || [],
  }
}

export function mapWorkbenchRows(workbenchRows = [], options = {}) {
  return workbenchRows.map((row) => mapWorkbenchOrderToOrderRow(row, options))
}

function buildEmptyProduct() {
  return {
    psdKey: 'orders.values.common.noData',
    pngStatusKey: 'orders.values.common.noData',
    scaleByKey: 'orders.values.common.noData',
    qcBy: '-',
    sku: '-',
    asinTypeKey: 'orders.values.common.normal',
    asin: '-',
    psdIdKey: 'orders.values.common.noData',
    seller: '-',
    team: '-',
  }
}

function buildEmptyCustomization() {
  return {
    productType: '-',
    shirtColor: '-',
    size: '-',
    customerPhoto: [FALLBACK_IMAGE],
    customerName: '-',
    fields: [],
    images: [],
    year: '-',
    customSleeve: '-',
    rightSleeve: '-',
    leftSleeve: '-',
    priorityKey: 'orders.values.common.noThankYou',
    customizationUrl: '-',
  }
}

function buildEmptyFulfillment() {
  return {
    quantity: '-',
    fulfillQty: '-',
    statusKey: 'orders.values.status.new',
    trackingKey: 'orders.values.common.noData',
    vendorProduct: '-',
    size: '-',
    color: '-',
    fulfillName: '-',
    noteKey: 'orders.values.common.noData',
  }
}

export function mapOrderDetail({
  order = {},
  items = [],
  customizationsByItemId = new Map(),
} = {}) {
  const item = items[0] || {}
  const customization = customizationsByItemId.get(item.id) || {}
  const customerInputs = customization.customerInputs || customization.review?.customerInputs || {}
  const extractedImages =
    customization.extractedImages ||
    customization.review?.extractedImages ||
    customization.imageAssets ||
    []
  const variantRaw = item.variantRaw || {}
  const color =
    getVariantValue(variantRaw, ['color', 'colour']) ||
    getCustomerInputValue(customerInputs, ['color', 'colour']) ||
    toDisplayValue(customerInputs.color, ['value', 'label', 'name']) ||
    '-'
  const size =
    getVariantValue(variantRaw, ['size']) ||
    getCustomerInputValue(customerInputs, ['size']) ||
    toDisplayValue(customerInputs.size, ['value', 'label', 'name']) ||
    '-'
  const customerName =
    getCustomerInputValue(customerInputs, ['name', 'text', 'custom']) ||
    toDisplayValue(customerInputs.name, ['value', 'label', 'name']) ||
    '-'
  const photos = extractedImages.map((image) => image.secureUrl).filter(Boolean)

  return {
    productImages: photos.length > 0 ? photos : [FALLBACK_IMAGE],
    product: {
      ...buildEmptyProduct(),
      sku: item.sku || '-',
      asin: item.asin || item.externalProductId || '-',
      seller: order.salesChannelCode || '-',
      team: order.marketplaceCode || '-',
    },
    customization: {
      ...buildEmptyCustomization(),
      productType: item.title || '-',
      shirtColor: color,
      size,
      customerPhoto: photos.length > 0 ? photos : [FALLBACK_IMAGE],
      customerName,
      customizationUrl: customization.downloadedZip?.sourceUrlRedacted || '-',
    },
    fulfillment: {
      ...buildEmptyFulfillment(),
      quantity: String(item.quantity ?? '-'),
      fulfillQty: String(item.quantity ?? '-'),
      statusKey:
        ITEM_STATUS_LABEL_KEY_MAP[item.status] || item.status || 'orders.values.common.noData',
      vendorProduct: item.title || '-',
      size,
      color,
      fulfillName: order.externalOrderId || item.externalOrderId || '-',
      noteKey: 'orders.values.common.noData',
    },
    basecost: formatMoney(item.price),
  }
}
