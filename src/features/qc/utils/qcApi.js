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

function addQueryParam(query, key, value) {
  if (value !== undefined && value !== null && value !== '' && value !== 'all') {
    query[key] = value
  }
}

function toDateBoundary(value, boundary) {
  if (!value) return undefined
  return value[boundary]('day').toISOString()
}

export function isSupportedQcStatusTab(statusTab) {
  return SUPPORTED_STATUS_TABS.has(statusTab || 'all')
}

export function readQcDashboardSearch(search = '') {
  const params = new URLSearchParams(search)
  const result = {}
  const statusTab = params.get('status')
  const platform = params.get('channel')?.toLowerCase()

  if (SUPPORTED_STATUS_TABS.has(statusTab)) result.statusTab = statusTab
  if (platform === 'amazon' || platform === 'etsy') result.platform = platform

  return result
}

export function buildQcTaskQuery(filters = {}) {
  const query = {
    salesChannelCode: String(filters.platform || 'amazon').toUpperCase(),
  }
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
  const query = buildQcTaskQuery({ ...filters, statusTab: 'all', page: 1, pageSize: 1 })
  delete query.page
  delete query.limit
  return query
}

export function buildQcExportQuery(filters = {}) {
  const query = buildQcTaskQuery(filters)
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
  const scaleSlots = task.scaleContext?.use?.scaleSlots || []
  const fileChecks = task.fileChecks || []
  const outputChecks = scaleSlots.length > 0 ? scaleSlots : fileChecks
  const statuses = outputChecks.map((check) => check.outputStatus).filter(Boolean)

  if (statuses.includes('MISSING')) return 'MISSING'
  if (statuses.includes('UPLOADED')) return 'UPLOADED'
  if (statuses.includes('NOT_REQUIRED')) return 'NOT_REQUIRED'
  if (outputChecks.length === 0) return 'NOT_REQUIRED'

  return outputChecks.every((check) => Boolean(check.outputAssetId)) ? 'UPLOADED' : 'MISSING'
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
    if (inputs) return normalizeCustomizationItems(inputs)
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

function buildLayerFromUrl({ check, index, kind, label, url }) {
  const checkId = getCheckId(check, index)
  const outputStatus = check?.outputStatus || check?.status || null

  return {
    id: `${checkId}-${kind}`,
    label: `${toDisplayLabel(label, `Layer ${index + 1}`)} ${kind}`,
    url,
    kind,
    outputStatus,
    sourceId: checkId,
  }
}

export function buildQcImageReviewItems(task = {}) {
  const detail = task.detail || {}
  const product = detail.product || {}
  const customization = normalizeCustomizationItems(detail.customization)
  const referenceImages = []
  const layers = []
  const seenReferenceUrls = new Set()
  const seenLayerUrls = new Set()

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
  ;[...(detail.fileChecks || []), ...(detail.scaleSlots || [])].forEach((check, index) => {
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

    if (inputUrl && !seenLayerUrls.has(inputUrl)) {
      seenLayerUrls.add(inputUrl)
      layers.push(buildLayerFromUrl({ check, index, kind: 'input', label, url: inputUrl }))
    }
    if (outputUrl && !seenLayerUrls.has(outputUrl)) {
      seenLayerUrls.add(outputUrl)
      layers.push(buildLayerFromUrl({ check, index, kind: 'output', label, url: outputUrl }))
    }
  })

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
      referenceImages,
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
  const shopName =
    task.shopName || task.shop?.name || options.shopNameById?.get(String(task.shopId || ''))

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
      scaleSlots: task.scaleContext?.use?.scaleSlots || [],
      fileChecks: task.fileChecks || [],
      customization:
        task.customization ||
        orderItem.customization?.inputs ||
        orderItem.customization ||
        orderItem.customizations ||
        [],
      csNote: task.csNote || orderItem.csNote || orderItem.buyerNote || orderItem.note || '',
      qcNote: task.qcNote || task.qcReview?.note || '',
    },
  }
}

export function getPushableQcTaskIds(tasks = [], selectedTaskIds = new Set()) {
  return tasks
    .filter(
      (task) => selectedTaskIds.has(task.id) && task.productionStatus === 'READY_TO_SEND_VENDOR',
    )
    .map((task) => task.id)
}

function hasRequiredScaledOutputs(task = {}) {
  const checks = [
    ...(task.detail?.fileChecks || []),
    ...(task.detail?.scaleSlots || []),
    ...(task.fileChecks || []),
  ]
  const requiredChecks = checks.filter((check) => check.required !== false)

  if (requiredChecks.length === 0) return false

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
  if (['PENDING', 'REJECTED'].includes(task.statusQc)) return true

  return hasRequiredScaledOutputs(task)
}

export function canSubmitQcReject(task = {}) {
  return task.statusQc !== 'PASSED'
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
