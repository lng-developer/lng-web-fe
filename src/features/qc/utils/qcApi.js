import dayjs from 'dayjs'

const QC_STATUS_FILTERS = {
  pending: 'PENDING',
  qcRejected: 'REJECTED',
  completed: 'PASSED',
}

const QC_TAB_FILTERS = {
  failed: 'FAILED',
  addressInvalid: 'ADDRESS_INVALID',
}

const SUPPORTED_STATUS_TABS = new Set([
  'all',
  ...Object.keys(QC_STATUS_FILTERS),
  ...Object.keys(QC_TAB_FILTERS),
])

const DEFAULT_STATUS_TAB = 'pending'
const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10

function addQueryParam(query, key, value) {
  if (value !== undefined && value !== null && value !== '' && value !== 'all') {
    query[key] = value
  }
}

function getPositiveInteger(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function parseDateParam(value) {
  if (!value) return null
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed : null
}

function toDateBoundary(value, boundary) {
  if (!value) return undefined
  return value[boundary]('day').toISOString()
}

export function readQcDashboardSearch(search = '') {
  const params = new URLSearchParams(search)
  const result = {}
  const statusTab = params.get('status')
  const platform = params.get('channel')?.toLowerCase()
  const searchValue = params.get('search')?.trim()
  const sellerCode = params.get('sellerCode')?.trim()
  const shopId = params.get('shopId')?.trim()
  const page = getPositiveInteger(params.get('page'))
  const pageSize = getPositiveInteger(params.get('limit'))
  const dateFrom = parseDateParam(params.get('dateFrom'))
  const dateTo = parseDateParam(params.get('dateTo'))

  if (SUPPORTED_STATUS_TABS.has(statusTab)) result.statusTab = statusTab
  if (platform === 'amazon' || platform === 'etsy') result.channel = platform
  if (searchValue) result.search = searchValue
  if (sellerCode) result.sellerCode = sellerCode
  if (shopId) result.shopId = shopId
  if (dateFrom || dateTo) result.dateRange = { start: dateFrom, end: dateTo }
  if (page) result.page = page
  if (pageSize) result.pageSize = pageSize

  return result
}

export function buildQcDashboardSearch(filters = {}) {
  const params = new URLSearchParams()
  const channel = String(filters.channel ?? filters.platform ?? 'all').toLowerCase()
  const statusTab = filters.statusTab
  const search = filters.search?.trim()
  const sellerCode = filters.sellerCode?.trim()
  const shopId = filters.shopId
  const page = getPositiveInteger(filters.page) || DEFAULT_PAGE
  const pageSize = getPositiveInteger(filters.pageSize) || DEFAULT_PAGE_SIZE
  const dateFrom = filters.dateRange?.start?.format?.('YYYY-MM-DD')
  const dateTo = filters.dateRange?.end?.format?.('YYYY-MM-DD')

  if (SUPPORTED_STATUS_TABS.has(statusTab) && statusTab !== DEFAULT_STATUS_TAB) {
    params.set('status', statusTab)
  }
  if (channel === 'amazon' || channel === 'etsy') params.set('channel', channel)
  if (search) params.set('search', search)
  if (sellerCode) params.set('sellerCode', sellerCode)
  if (shopId && shopId !== 'all') params.set('shopId', shopId)
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)
  if (page > DEFAULT_PAGE) params.set('page', String(page))
  if (pageSize !== DEFAULT_PAGE_SIZE) params.set('limit', String(pageSize))

  return params.toString()
}

export function buildQcTaskQuery(filters = {}) {
  const channel = String(filters.channel ?? filters.platform ?? 'all').toLowerCase()
  const query = { view: 'QC' }
  if (channel === 'amazon' || channel === 'etsy') query.salesChannelCode = channel.toUpperCase()
  const qcStatus = QC_STATUS_FILTERS[filters.statusTab]
  const tab = QC_TAB_FILTERS[filters.statusTab]

  if (qcStatus) query.qcStatus = qcStatus
  if (tab) query.tab = tab
  addQueryParam(query, 'search', filters.search?.trim())
  addQueryParam(query, 'sellerCode', filters.sellerCode?.trim().toUpperCase())
  addQueryParam(query, 'shopId', filters.shopId)
  addQueryParam(query, 'dateFrom', toDateBoundary(filters.dateRange?.start, 'startOf'))
  addQueryParam(query, 'dateTo', toDateBoundary(filters.dateRange?.end, 'endOf'))

  query.page = Math.max(Number(filters.page) || 1, 1)
  query.limit = Math.max(Number(filters.pageSize) || 10, 1)

  return query
}

export function buildQcSummaryQuery(filters = {}) {
  const query = buildQcTaskQuery({ ...filters, page: 1, pageSize: 1 })
  delete query.view
  delete query.qcStatus
  delete query.tab
  delete query.page
  delete query.limit
  return query
}

export function buildQcExportQuery(filters = {}) {
  const query = buildQcTaskQuery(filters)
  delete query.view
  delete query.page
  delete query.limit
  return query
}

export function mapProductionSummaryToQcCounts(summary = {}) {
  const byQcStatus = summary.byQcStatus || {}

  return {
    all: Number(summary.total) || 0,
    pending: Number(byQcStatus.PENDING) || 0,
    qcRejected: Number(byQcStatus.REJECTED) || 0,
    failed: Number(summary.failed) || 0,
    completed: Number(byQcStatus.PASSED) || 0,
    addressInvalid: Number(summary.addressInvalid) || 0,
  }
}

function getPersonName(person) {
  return person?.fullName || person?.name || person?.employeeCode || '-'
}

function getPngStatus(task) {
  const outputChecks =
    task.qcPreviewFileChecks || task.scaleContext?.use?.scaleSlots || task.fileChecks || []
  const requiredChecks = outputChecks.filter(isQcOutputRequired)
  const statuses = requiredChecks.map((check) => check.outputStatus).filter(Boolean)

  if (statuses.includes('MISSING')) return 'MISSING'
  if (statuses.includes('UPLOADED')) return 'UPLOADED'
  if (statuses.includes('NOT_REQUIRED')) return 'NOT_REQUIRED'
  if (requiredChecks.length === 0) return 'NOT_REQUIRED'

  return requiredChecks.every((check) => Boolean(check.outputAssetId)) ? 'UPLOADED' : 'MISSING'
}

function asArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function toDisplayLabel(value, fallback) {
  if (!value) return fallback
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getFirstString(...values) {
  return values.find((value) => typeof value === 'string' && value.trim()) || ''
}

function collectImageValues(value) {
  if (!value) return []
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap((item) => collectImageValues(item))
  if (typeof value === 'object') {
    return collectImageValues(
      value.url ||
        value.secureUrl ||
        value.downloadUrl ||
        value.assetDownloadUrl ||
        value.imageUrl ||
        value.value,
    )
  }
  return []
}

function normalizeCustomizationItems(customization) {
  if (!customization) return []
  if (Array.isArray(customization)) {
    return customization
      .map((item, index) => ({
        label: item?.label || item?.name || item?.key || `Field ${index + 1}`,
        value: item?.value ?? item?.text ?? item?.url ?? item?.secureUrl ?? '',
        type: item?.type || item?.inputType || item?.kind || '',
      }))
      .filter((item) => item.label || item.value)
  }
  if (typeof customization === 'object') {
    const inputs = customization.inputs || customization.fields || customization.customerInputs
    if (inputs) {
      if (typeof inputs === 'object' && !Array.isArray(inputs)) {
        const groups = [
          ['texts', 'text'],
          ['options', 'option'],
          ['images', 'image'],
        ]
        const groupedItems = groups.flatMap(([key, type]) =>
          asArray(inputs[key]).map((item, index) => ({
            label: item?.label || item?.name || `${toDisplayLabel(key, key)} ${index + 1}`,
            value:
              type === 'image'
                ? collectImageValues(item)[0] || item?.value || ''
                : (item?.value ?? item?.text ?? ''),
            type,
          })),
        )
        if (groupedItems.length) return groupedItems.filter((item) => item.label || item.value)
      }
      return normalizeCustomizationItems(inputs)
    }
    return Object.entries(customization)
      .map(([key, value]) => ({
        label: toDisplayLabel(key, key),
        value,
        type: Array.isArray(value) ? 'image' : '',
      }))
      .filter((item) => item.value !== undefined && item.value !== null && item.value !== '')
  }
  return []
}

function addUniqueImageItem(target, seenUrls, item) {
  if (!item?.url || seenUrls.has(item.url)) return
  seenUrls.add(item.url)
  target.push(item)
}

function getCheckLabel(check, index) {
  return (
    check?.slotLabel ||
    check?.position ||
    check?.slot ||
    check?.fileCheckId ||
    check?.id ||
    `Layer ${index + 1}`
  )
}

function getCheckId(check, index) {
  return String(
    check?.id || check?.fileCheckId || check?.position || check?.slot || `layer-${index}`,
  )
}

function isQcOutputRequired(check = {}) {
  return check.outputRequired ?? (check.required !== false && check.scaleStatus !== 'NOT_REQUIRED')
}

function buildLayerFromUrl({ check, index, kind, label, url }) {
  const checkId = getCheckId(check, index)
  const outputRequired = isQcOutputRequired(check)
  const outputStatus =
    kind === 'output' && !url && outputRequired
      ? 'MISSING'
      : check?.outputStatus || check?.status || null

  return {
    id: `${checkId}-${kind}`,
    label: `${toDisplayLabel(label, `Layer ${index + 1}`)} ${kind}`,
    url,
    kind,
    required: outputRequired,
    outputRequired,
    outputStatus,
    sourceId: checkId,
    unavailableReason: url ? null : outputStatus === 'MISSING' ? 'MISSING' : 'UNAVAILABLE',
  }
}

export function buildQcImageReviewItems(task = {}) {
  const detail = task.detail || {}
  const product = detail.product || {}
  const customizationPayload = detail.customization || {}
  const customization = normalizeCustomizationItems(customizationPayload)
  const referenceImages = []
  const layers = []
  const seenReferenceUrls = new Set()

  addUniqueImageItem(referenceImages, seenReferenceUrls, {
    id: 'product-image',
    label: 'Product Image',
    url: product.imageUrl,
    type: 'product',
  })

  asArray(product.customerImages || detail.customerImages || detail.customerPhoto)
    .flatMap((image) => collectImageValues(image))
    .forEach((url, index) => {
      addUniqueImageItem(referenceImages, seenReferenceUrls, {
        id: `customer-image-${index}`,
        label: `Customer Image ${index + 1}`,
        url,
        type: 'customer',
      })
    })

  customization.forEach((item, index) => {
    if (String(item.type).toLowerCase() !== 'image') return
    collectImageValues(item.value).forEach((url, imageIndex) => {
      addUniqueImageItem(referenceImages, seenReferenceUrls, {
        id: `customization-image-${index}-${imageIndex}`,
        label: item.label || `Customer Image ${index + 1}`,
        url,
        type: 'customization',
      })
    })
  })
  asArray(customizationPayload.imageAssets)
    .flatMap((image) => collectImageValues(image))
    .forEach((url, index) => {
      addUniqueImageItem(referenceImages, seenReferenceUrls, {
        id: `customization-asset-${index}`,
        label: `Customer Upload ${index + 1}`,
        url,
        type: 'customization',
      })
    })
  const previewChecks =
    detail.qcPreviewFileChecks ||
    task.qcPreviewFileChecks ||
    detail.fileChecks ||
    detail.scaleSlots ||
    []

  previewChecks.filter(isQcOutputRequired).forEach((check, index) => {
    const label = getCheckLabel(check, index)
    const inputUrl = getFirstString(
      check.inputAssetDownloadUrl,
      check.sourceAssetDownloadUrl,
      check.inputAsset?.downloadUrl,
      check.sourceAsset?.downloadUrl,
    )
    const outputUrl = getFirstString(
      check.outputAssetDownloadUrl,
      check.scaledOutputAssetDownloadUrl,
      check.outputAsset?.downloadUrl,
      check.assetDownloadUrl,
      check.url,
    )

    layers.push(buildLayerFromUrl({ check, index, kind: 'input', label, url: inputUrl }))
    layers.push(buildLayerFromUrl({ check, index, kind: 'output', label, url: outputUrl }))
  })

  const reviewInputUrls = new Set(
    layers
      .filter((layer) => layer.kind === 'input')
      .map((layer) => layer.url)
      .filter(Boolean),
  )

  return [
    {
      id: task.orderItemId || task.id || 'qc-item',
      taskId: task.id || '',
      orderId: task.orderId || '-',
      orderItemId: task.orderItemId || '',
      statusQc: task.statusQc || 'NOT_READY',
      scaleBy: task.scaleBy || '-',
      qcBy: task.qcBy || '-',
      product,
      customization,
      referenceImages: referenceImages.filter((image) => !reviewInputUrls.has(image.url)),
      layers,
      csNote: detail.csNote || '',
      qcNote: detail.qcNote || '',
      fulfillName: detail.fulfillName || '-',
      vendorProduct: detail.vendorProduct || '-',
      pngStatus: detail.pngStatus || 'NOT_REQUIRED',
      scaleStatus: detail.scaleStatus || 'NOT_REQUIRED',
    },
  ]
}

export function mapProductionTaskToQcRow(task = {}, options = {}) {
  const orderItem = task.orderItem || {}
  const vendor = task.vendorProduct?.vendor || {}
  const shopName =
    task.shopName || task.shop?.name || options.shopNameById?.get(String(task.shopId || ''))
  const qcNote =
    task.qcNote ||
    task.qcReview?.note ||
    (task.qcPreviewFileChecks || task.fileChecks || []).map((check) => check.note).find(Boolean) ||
    ''

  return {
    id: String(task.id || ''),
    orderItemId: String(task.orderItemId || ''),
    fulfillmentPlanId: task.fulfillmentPlanId || null,
    orderId: orderItem.externalOrderId || '-',
    statusQc: task.qcStatus || 'NOT_READY',
    productionStatus: task.productionStatus || task.status || null,
    createdAt: task.createdAt || null,
    orderDate: task.orderDate || task.orderedAt || null,
    statusOrder: task.orderStatus || orderItem.status || '-',
    shippingType:
      task.shippingType || task.shippingService?.name || task.shippingService?.level || '-',
    shopId: task.shopId || null,
    shop: shopName || task.shopId || '-',
    seller: task.seller?.name || task.seller?.employeeCode || '-',
    scaleBy: getPersonName(task.assignedDesigner || task.scaleByUser),
    qcBy: getPersonName(task.qcUser || task.qcByUser),
    vendorSubmissionStatus: task.vendorSubmission?.status || null,
    detail: {
      product: {
        sku: orderItem.sku || '-',
        asin: orderItem.asin || '-',
        title: orderItem.title || '-',
        quantity: Number(task.fulfillQty) || 0,
        imageUrl: task.productImageUrl || orderItem.productImageUrl || null,
        customerImages:
          orderItem.customerImages ||
          orderItem.customerPhoto ||
          orderItem.customization?.customerImages ||
          [],
      },
      scaleStatus: task.scaleStatus || 'NOT_REQUIRED',
      orderOwner: getPersonName(task.orderOwner),
      fulfillName: task.fulfillName || task.fulfillmentPlanId || '-',
      pngStatus: getPngStatus(task),
      vendorProduct: task.vendorProduct?.name || task.vendorProduct?.code || '-',
      vendorName:
        (typeof vendor === 'string' ? vendor : vendor.name || vendor.fullName || vendor.code) ||
        '-',
      vendorCostCenter: task.vendorCostCenter?.name || task.vendorCostCenter?.code || '-',
      seller: task.seller?.name || task.seller?.employeeCode || '-',
      shop: shopName || task.shopId || '-',
      blockers: task.blockers || [],
      workflow: task.workflow || null,
      designNote: task.designNote || '',
      qcAt: task.qcAt || null,
      qcPreviewFileChecks: task.qcPreviewFileChecks,
      scaleSlots: task.scaleContext?.use?.scaleSlots || [],
      fileChecks: task.qcPreviewFileChecks || task.fileChecks || [],
      customization:
        task.customization ||
        orderItem.customization?.inputs ||
        orderItem.customization ||
        orderItem.customizations ||
        [],
      csNote: task.csNote || orderItem.csNote || orderItem.buyerNote || orderItem.note || '',
      qcNote,
    },
  }
}

function hasRequiredScaledOutputs(task = {}) {
  const checks =
    task.detail?.qcPreviewFileChecks ||
    task.qcPreviewFileChecks ||
    task.detail?.fileChecks ||
    task.fileChecks ||
    []
  const requiredChecks = checks.filter(isQcOutputRequired)

  return requiredChecks.every((check) =>
    Boolean(
      check.outputAssetId ||
      check.outputAssetDownloadUrl ||
      check.scaledOutputAssetDownloadUrl ||
      check.outputAsset?.downloadUrl,
    ),
  )
}

export function canSubmitQcPass(task = {}) {
  if (task.statusQc === 'PASSED') return false
  return hasRequiredScaledOutputs(task)
}

export function canSubmitQcReject(task = {}) {
  return !['PASSED', 'REJECTED'].includes(task.statusQc)
}

export function canSubmitQcDecision(task = {}, decision = 'PASSED') {
  return decision === 'REJECTED' ? canSubmitQcReject(task) : canSubmitQcPass(task)
}

export function mergeQcTaskDetail(row, task = {}) {
  if (!row) return mapProductionTaskToQcRow(task)

  const mapped = mapProductionTaskToQcRow(task, {
    shopNameById: new Map(row.shopId ? [[String(row.shopId), row.shop]] : []),
  })
  const mappedProduct = mapped.detail.product
  const currentProduct = row.detail.product

  return {
    ...row,
    productionStatus: mapped.productionStatus || row.productionStatus,
    statusQc: mapped.statusQc || row.statusQc,
    vendorSubmissionStatus: mapped.vendorSubmissionStatus || row.vendorSubmissionStatus,
    detail: {
      ...row.detail,
      ...mapped.detail,
      product: {
        sku: mappedProduct.sku === '-' ? currentProduct.sku : mappedProduct.sku,
        asin: mappedProduct.asin === '-' ? currentProduct.asin : mappedProduct.asin,
        title: mappedProduct.title === '-' ? currentProduct.title : mappedProduct.title,
        quantity: mappedProduct.quantity || currentProduct.quantity,
        imageUrl: mappedProduct.imageUrl || currentProduct.imageUrl,
      },
      fileChecks: task.fileChecks || row.detail.fileChecks || [],
      scaleSlots: mapped.detail.scaleSlots || row.detail.scaleSlots || [],
    },
  }
}
