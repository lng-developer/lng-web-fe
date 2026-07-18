const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10

function trimValue(value) {
  return typeof value === 'string' ? value.trim() : value
}

function normalizeLower(value) {
  return String(value ?? '').toLowerCase()
}

function normalizeUpper(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

function cleanObject(payload = {}, options = {}) {
  return Object.entries(payload).reduce((result, [key, rawValue]) => {
    const value = trimValue(rawValue)

    if (value === null && options.preserveNull) {
      return { ...result, [key]: value }
    }

    if (value === '' || value === null || value === undefined) {
      return result
    }

    return { ...result, [key]: value }
  }, {})
}

function nullableText(value) {
  const trimmed = trimValue(value)
  return trimmed === '' || trimmed === undefined ? null : trimmed
}

function optionalNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return undefined
  }

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function nullableNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function cleanNestedObject(payload = {}) {
  const cleaned = cleanObject(payload)
  return Object.keys(cleaned).length > 0 ? cleaned : undefined
}

function cleanQuery(query = {}) {
  return Object.entries(query).reduce((params, [key, rawValue]) => {
    const value = trimValue(rawValue)

    if (value === '' || value === null || value === undefined) {
      return params
    }

    if (key === 'page') {
      return { ...params, page: Math.max(Number(value) || DEFAULT_PAGE, DEFAULT_PAGE) }
    }

    if (key === 'limit') {
      return { ...params, limit: Math.min(Math.max(Number(value) || DEFAULT_LIMIT, 1), 100) }
    }

    return { ...params, [key]: value }
  }, {})
}

export function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

export function buildVendorListQuery(query = {}) {
  const { search, ...rest } = query

  return cleanQuery({
    ...rest,
    status: rest.status && rest.status !== 'all' ? normalizeUpper(rest.status) : undefined,
    fulfillmentType:
      rest.fulfillmentType && rest.fulfillmentType !== 'all'
        ? normalizeUpper(rest.fulfillmentType)
        : undefined,
    providerKey:
      rest.providerKey && rest.providerKey !== 'all' ? normalizeUpper(rest.providerKey) : undefined,
    q: search,
  })
}

export function normalizePagination(pagination) {
  return {
    page: Math.max(Number(pagination?.page) || DEFAULT_PAGE, DEFAULT_PAGE),
    limit: Math.max(Number(pagination?.limit) || DEFAULT_LIMIT, 1),
    total: Math.max(Number(pagination?.total) || 0, 0),
  }
}

export function mapVendorResponse(vendor = {}) {
  const rawFulfillmentType = vendor.fulfillmentType || ''
  const rawStatus = vendor.status || ''

  return {
    id: vendor.id,
    code: vendor.code,
    name: vendor.name || vendor.code || '',
    fulfillmentType: normalizeLower(rawFulfillmentType),
    status: normalizeLower(rawStatus),
    rawFulfillmentType,
    rawStatus,
    providerKey: vendor.providerKey || '',
  }
}

export function mapVendorProductResponse(product = {}) {
  const vendor = product.vendor || {}
  const productTypeGroup = product.productTypeGroup || {}
  const rawStatus = product.status || ''

  return {
    id: product.id,
    code: product.code,
    imageUrl: product.imageUrl || null,
    name: product.name || product.code || '',
    productId: product.code || product.externalProductId || product.id || '',
    externalProductId: product.externalProductId || '',
    productUrl: product.productUrl || '',
    designTemplateUrl: product.designTemplateUrl || '',
    minProductionDays: product.minProductionDays ?? '',
    maxProductionDays: product.maxProductionDays ?? '',
    baseCostAmount: product.baseCostAmount ?? '',
    currency: product.currency || '',
    vendorId: vendor.id || null,
    vendorCode: vendor.code || '',
    vendorName: vendor.name || vendor.code || '',
    productTypeGroupId: productTypeGroup.id || null,
    productType: productTypeGroup.name || productTypeGroup.code || '',
    status: normalizeLower(rawStatus),
    rawStatus,
    costCenterCount: Number(product.costCenterCount) || 0,
  }
}

export function mapVendorCostCenterResponse(costCenter = {}) {
  const rawStatus = costCenter.status || ''

  return {
    id: costCenter.id,
    code: costCenter.code || '',
    name: costCenter.name || costCenter.code || '',
    sku: costCenter.sku || '',
    lngCode: costCenter.lngCode || '',
    vendorSize: costCenter.vendorSize || '',
    vendorColor: costCenter.vendorColor || '',
    standardSize: costCenter.standardSize || '',
    standardColor: costCenter.standardColor || '',
    baseCostAmount: costCenter.baseCostAmount ?? undefined,
    currency: costCenter.currency || '',
    domesticShipping: costCenter.domesticShipping || {},
    internationalShipping: costCenter.internationalShipping || {},
    priorityShipping: costCenter.priorityShipping || {},
    importTaxAmount: costCenter.importTaxAmount ?? undefined,
    status: normalizeLower(rawStatus),
    rawStatus,
  }
}

export function mapProductTypeOptions(groups = []) {
  return groups.map((group) => ({
    id: group.id,
    label: group.name || group.code || group.id,
    status: group.status,
  }))
}

export function buildVendorPayload(values = {}, options = {}) {
  const isUpdate = options.mode === 'update'

  return cleanObject(
    {
      code: normalizeUpper(values.code),
      name: values.name,
      providerKey: isUpdate
        ? nullableText(normalizeUpper(values.providerKey))
        : normalizeUpper(values.providerKey),
      fulfillmentType: normalizeUpper(values.fulfillmentType),
      status: normalizeUpper(values.status),
    },
    { preserveNull: isUpdate },
  )
}

export function buildVendorProductPayload(values = {}, options = {}) {
  const isUpdate = options.mode === 'update'

  return cleanObject(
    {
      vendorId: values.vendorId,
      productTypeGroupId: values.productTypeGroupId,
      code: normalizeUpper(values.code),
      name: values.name,
      externalProductId: isUpdate
        ? nullableText(values.externalProductId)
        : values.externalProductId,
      imageUrl: isUpdate ? nullableText(values.imageUrl) : values.imageUrl,
      productUrl: isUpdate ? nullableText(values.productUrl) : values.productUrl,
      designTemplateUrl: isUpdate
        ? nullableText(values.designTemplateUrl)
        : values.designTemplateUrl,
      minProductionDays: isUpdate
        ? nullableNumber(values.minProductionDays)
        : optionalNumber(values.minProductionDays),
      maxProductionDays: isUpdate
        ? nullableNumber(values.maxProductionDays)
        : optionalNumber(values.maxProductionDays),
      baseCostAmount: optionalNumber(values.baseCostAmount),
      currency: normalizeUpper(values.currency),
      status: normalizeUpper(values.status),
    },
    { preserveNull: isUpdate },
  )
}

export function buildVendorCostCenterPayload(values = {}, options = {}) {
  const isUpdate = options.mode === 'update'

  return cleanObject(
    {
      code: normalizeUpper(values.code),
      name: values.name,
      sku: isUpdate ? nullableText(normalizeUpper(values.sku)) : normalizeUpper(values.sku),
      lngCode: isUpdate
        ? nullableText(normalizeUpper(values.lngCode))
        : normalizeUpper(values.lngCode),
      vendorSize: isUpdate ? nullableText(values.vendorSize) : values.vendorSize,
      vendorColor: isUpdate ? nullableText(values.vendorColor) : values.vendorColor,
      standardSize: isUpdate ? nullableText(values.standardSize) : values.standardSize,
      standardColor: isUpdate ? nullableText(values.standardColor) : values.standardColor,
      baseCostAmount: optionalNumber(values.baseCostAmount),
      currency: normalizeUpper(values.currency),
      domesticShipping: cleanNestedObject({
        economyAmount: optionalNumber(values.domesticEconomyAmount),
        additionalAmount: optionalNumber(values.domesticAdditionalAmount),
      }),
      internationalShipping: cleanNestedObject({
        economyAmount: optionalNumber(values.internationalEconomyAmount),
        additionalAmount: optionalNumber(values.internationalAdditionalAmount),
      }),
      priorityShipping: cleanNestedObject({
        economyAmount: optionalNumber(values.priorityEconomyAmount),
        additionalAmount: optionalNumber(values.priorityAdditionalAmount),
      }),
      importTaxAmount: optionalNumber(values.importTaxAmount),
      status: normalizeUpper(values.status),
    },
    { preserveNull: isUpdate },
  )
}

export function mapPaginatedResponse(response, mapper) {
  return {
    items: (response?.items || []).map(mapper),
    pagination: normalizePagination(response?.pagination),
  }
}
