import { getPersonDisplayName } from '../../../utils/personDisplay.js'
import {
  CS_STATUSES,
  SCALE_ALL_FILTER,
  SCALE_CHANNELS,
  SCALE_PAGE_SIZE,
  SCALE_STATUS_TABS,
  SCALE_STATUSES,
} from '../constants/scaleConstants.js'

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined && fieldValue !== ''),
  )
}

function humanizeKey(value) {
  return String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (Array.isArray(value)) return value.map(displayValue).join(', ')
  if (typeof value === 'object') return value.value ?? value.label ?? JSON.stringify(value)
  return String(value)
}

function mapCustomerInputs(customerInputs) {
  if (Array.isArray(customerInputs)) {
    return customerInputs.filter(Boolean).flatMap((input, index) => {
      if (input && typeof input === 'object') {
        return [
          {
            label: input.label || input.name || `Option ${index + 1}`,
            value: displayValue(input.value ?? input.answer ?? input.text),
            type: 'text',
          },
        ]
      }
      return [{ label: `Option ${index + 1}`, value: displayValue(input), type: 'text' }]
    })
  }

  if (!customerInputs || typeof customerInputs !== 'object') return []

  return Object.entries(customerInputs).flatMap(([key, value]) => {
    if (key.toLowerCase() === 'images') return []
    if (Array.isArray(value)) return mapCustomerInputs(value)
    return [{ label: humanizeKey(key), value: displayValue(value), type: 'text' }]
  })
}

function mapCustomerImages(customization = {}) {
  const inputs = Array.isArray(customization.customerInputs?.images)
    ? customization.customerInputs.images.filter(Boolean)
    : []
  const assets = Array.isArray(customization.imageAssets) ? customization.imageAssets : []
  const usedInputIndexes = new Set()
  const seenAssets = new Set()
  const rows = []

  function addRow(asset, input, index) {
    const assetId = asset?.assetId || input?.assetId || null
    const url =
      input?.secureUrl ||
      input?.url ||
      input?.assetDownloadUrl ||
      asset?.secureUrl ||
      asset?.assetDownloadUrl ||
      (typeof input?.value === 'string' ? input.value : null) ||
      null
    const key = assetId || url || `${input?.label || input?.name || 'customer-photo'}-${index}`
    if (seenAssets.has(String(key))) return
    seenAssets.add(String(key))

    rows.push({
      label:
        input?.label ||
        input?.name ||
        asset?.label ||
        (assets.length > 1 || inputs.length > 1 ? `Customer Photo ${index + 1}` : 'Customer Photo'),
      value: '-',
      type: 'image',
      url,
      assetId,
    })
  }

  assets.forEach((asset, index) => {
    const inputIndex = inputs.findIndex(
      (input, candidateIndex) =>
        !usedInputIndexes.has(candidateIndex) &&
        input?.assetId &&
        asset?.assetId &&
        String(input.assetId) === String(asset.assetId),
    )
    const fallbackIndex = inputIndex >= 0 ? inputIndex : !usedInputIndexes.has(index) ? index : -1
    const input = fallbackIndex >= 0 ? inputs[fallbackIndex] : null
    if (fallbackIndex >= 0) usedInputIndexes.add(fallbackIndex)
    addRow(asset, input, index)
  })

  inputs.forEach((input, index) => {
    if (usedInputIndexes.has(index)) return
    if (input.assetId || input.url || input.secureUrl || typeof input.value === 'string') {
      addRow(null, input, index)
    }
  })

  return rows
}

function formatTaskDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(',', '')
}

function getDisplayScaleStatus(task = {}) {
  const workflowStage = task.workflow?.stage
  if (workflowStage === 'READY_FOR_SCALE') return SCALE_STATUSES.NEED_SCALE
  if (workflowStage === 'IN_SCALE') return SCALE_STATUSES.PENDING
  if (workflowStage === 'QC_REJECTED') return SCALE_STATUSES.QC_REJECTED
  if (['QC_PENDING', 'READY_TO_SEND_VENDOR'].includes(workflowStage))
    return SCALE_STATUSES.COMPLETED
  if (workflowStage === 'SENT_TO_VENDOR') return SCALE_STATUSES.SENT

  if (task.qcStatus === 'REJECTED' || task.productionStatus === 'QC_REJECTED') {
    return SCALE_STATUSES.QC_REJECTED
  }
  if (task.productionStatus === 'SENT_TO_VENDOR') return SCALE_STATUSES.SENT
  if (task.scaleStatus === 'SCALED') return SCALE_STATUSES.COMPLETED
  if (task.assignedDesignUserId) return SCALE_STATUSES.PENDING
  return SCALE_STATUSES.NEED_SCALE
}

function statusQuery(statusTab) {
  if (statusTab === SCALE_STATUS_TABS.CS_UNASSIGNED) {
    return { csUnassigned: true }
  }
  if (statusTab === SCALE_STATUS_TABS.NEED_SCALE) return { scaleStatus: 'NEED_SCALE' }
  if (statusTab === SCALE_STATUS_TABS.PENDING) {
    return { designAssignmentStatus: 'ASSIGNED' }
  }
  if (statusTab === SCALE_STATUS_TABS.COMPLETED) return { scaleStatus: 'SCALED' }
  if (statusTab === SCALE_STATUS_TABS.QC_REJECTED) return { qcStatus: 'REJECTED' }
  if (statusTab === SCALE_STATUS_TABS.ADDRESS_INVALID) return { tab: 'ADDRESS_INVALID' }
  if (statusTab === SCALE_STATUS_TABS.FAILED) return { tab: 'FAILED' }
  return {}
}

function dateBoundary(value, method) {
  return value?.[method]?.('day')?.toISOString?.()
}

export function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

export function readScaleDashboardSearch(search = '') {
  const params = new URLSearchParams(search)
  const result = {}
  const statusTab = params.get('status')
  const channel = params.get('channel')?.toLowerCase()

  if (Object.values(SCALE_STATUS_TABS).includes(statusTab)) result.statusTab = statusTab
  if (channel === 'amazon' || channel === 'etsy') result.channel = channel

  return result
}

export function buildProductionTaskQuery(filters = {}) {
  const dateRange = filters.dateRange || {}

  return compactObject({
    ...statusQuery(filters.statusTab),
    readyForScale: true,
    salesChannelCode:
      filters.channel === undefined
        ? filters.salesChannelCode
        : filters.channel === 'amazon'
          ? SCALE_CHANNELS.AMAZON
          : filters.channel === 'etsy'
            ? SCALE_CHANNELS.ETSY
            : undefined,
    search: filters.search?.trim(),
    shopId: filters.shop && filters.shop !== SCALE_ALL_FILTER ? filters.shop : undefined,
    scaleBy: filters.scaleBy && filters.scaleBy !== SCALE_ALL_FILTER ? filters.scaleBy : undefined,
    qcBy: filters.qcBy && filters.qcBy !== SCALE_ALL_FILTER ? filters.qcBy : undefined,
    sellerCode: filters.sellerCode?.trim?.().toUpperCase?.(),
    dateFrom: dateBoundary(dateRange.start, 'startOf') || filters.dateFrom,
    dateTo: dateBoundary(dateRange.end, 'endOf') || filters.dateTo,
    assignedAtFrom: filters.assignedDateFrom || filters.assignedAtFrom,
    assignedAtTo: filters.assignedDateTo || filters.assignedAtTo,
    readyAtFrom: filters.readyDateFrom || filters.readyAtFrom,
    readyAtTo: filters.readyDateTo || filters.readyAtTo,
    page: Math.max(Number(filters.page) || 1, 1),
    limit: Math.min(Math.max(Number(filters.pageSize) || SCALE_PAGE_SIZE, 1), 100),
    sort: filters.sort || '-updatedAt',
  })
}

export function buildProductionSummaryQuery(filters = {}) {
  const query = buildProductionTaskQuery({
    ...filters,
    statusTab: SCALE_STATUS_TABS.ALL,
    page: 1,
  })
  delete query.page
  delete query.limit
  return query
}

export function mapProductionTask(task = {}, shopNames = new Map()) {
  const orderItem = task.orderItem || {}
  const scaleContext = task.scaleContext || {}
  const scaleUse = scaleContext.use || {}
  const listing = scaleUse.listing || {}
  const template = scaleUse.template || null
  const psdTemplate = scaleUse.psdTemplate || {}
  const customization = task.customization || {}
  const vendorProduct = task.vendorProduct || {}
  const vendorCostCenter = task.vendorCostCenter || {}
  const scaleSlots = scaleUse.scaleSlots || []
  const customerImages = mapCustomerImages(customization)
  const scaleBy = task.assignedDesignUserId || ''
  const scaleByName = getPersonDisplayName(task.assignedDesigner || task.scaleByUser, 'Unassigned')
  const qcBy = getPersonDisplayName(task.qcUser || task.qcByUser, 'Unassigned')
  const csAssigneeId = task.csAssigneeId || ''
  const csAssigneeName = getPersonDisplayName(task.csAssignee, 'Unassigned')
  const shopId = task.shopId || listing.shopId || null
  const seller = task.seller?.name || task.seller?.employeeCode || '-'
  const orderOwner = getPersonDisplayName(task.orderOwner, 'Unassigned')

  const customizationRows = mapCustomerInputs(customization.customerInputs)
  customizationRows.push(...customerImages)

  return {
    id: task.id,
    orderItemId: task.orderItemId || orderItem.id || null,
    orderId: orderItem.externalOrderId || task.orderId || '-',
    orderDate: formatTaskDate(
      task.orderDate || task.createdAt || task.assignedAt || task.updatedAt,
    ),
    scaleStatus: getDisplayScaleStatus(task),
    shop: shopNames.get(shopId) || shopId || '-',
    shopId,
    seller,
    orderStatus: task.orderStatus || orderItem.status || task.productionStatus || '-',
    shippingType: task.shippingType || '-',
    orderOwner,
    qcBy,
    qcById: task.qcBy || '',
    scaleBy,
    scaleByName: scaleByName || '-',
    csAssigneeId,
    csAssigneeName,
    csStatus: task.csStatus || CS_STATUSES.UNASSIGNED,
    assignmentStatus: scaleBy ? CS_STATUSES.ASSIGNED : CS_STATUSES.UNASSIGNED,
    channel: task.salesChannelCode || listing.salesChannelCode || null,
    marketplaceCode: task.marketplaceCode || listing.marketplaceCode || null,
    workflow: task.workflow || null,
    detail: {
      product: {
        name: orderItem.title || listing.title || '-',
        primaryCode: orderItem.asin || listing.asin || '-',
        secondaryCode: orderItem.sku || listing.sku || '-',
        psdStatus: psdTemplate.status || listing.psdStatus || '-',
        quantity: task.fulfillQty || 1,
        imageUrl:
          task.productImageUrl || listing.previewAssetPreviewUrl || customerImages[0]?.url || null,
      },
      customization: customizationRows,
      taskStatus: {
        mapping: scaleContext.status || (task.blockers?.length ? 'BLOCKED' : 'READY_TO_SCALE'),
        scale: task.scaleStatus || '-',
        qc: task.qcStatus || '-',
      },
      costCenter: {
        vendorProduct: vendorProduct.name || vendorProduct.code || '-',
        productCost: vendorCostCenter.name || vendorCostCenter.code || '-',
        sku: vendorProduct.code || '-',
        vendor:
          vendorProduct.vendor?.name || vendorProduct.vendor?.code || vendorProduct.vendor || '-',
      },
      notes: {
        design: task.designNote || '',
        cs: task.csNote || '',
        qc: '',
      },
      mockups: scaleSlots.map((slot) => ({
        id: slot.fileCheckId || slot.slotKey,
        fileCheckId: slot.fileCheckId || null,
        slotKey: slot.slotKey || null,
        label: slot.slotLabel || slot.slotKey || 'Output',
        sourceType: slot.sourceType || null,
        inputAssetId: slot.inputAssetId || null,
        inputAssetDownloadUrl: slot.inputAssetDownloadUrl || null,
        outputAssetId: slot.outputAssetId || null,
        outputAssetDownloadUrl: slot.outputAssetDownloadUrl || null,
        outputStatus: slot.outputStatus || (slot.outputAssetId ? 'UPLOADED' : 'MISSING'),
        scaleStatus: slot.scaleStatus,
        qcStatus: slot.qcStatus,
        blockers: slot.blockers || [],
      })),
      psdTemplate: {
        assetId: psdTemplate.assetId || null,
        assetDownloadUrl: psdTemplate.assetDownloadUrl || null,
        fileCheckId: psdTemplate.fileCheckId || null,
        status: psdTemplate.status || 'UNKNOWN',
      },
      inputAssetId: psdTemplate.assetId || null,
      template,
      contextStatus: scaleContext.status || null,
      canScale: Boolean(scaleContext.canScale),
      missingRequirements: scaleContext.missingRequirements || [],
      blockers: task.blockers || [],
      fulfillName: task.fulfillName || '-',
    },
  }
}

export function mapScaleSummary(summary = {}) {
  return {
    [SCALE_STATUS_TABS.ALL]: summary.total || 0,
    [SCALE_STATUS_TABS.CS_UNASSIGNED]: summary.csUnassigned ?? summary.byCsStatus?.UNASSIGNED ?? 0,
    [SCALE_STATUS_TABS.NEED_SCALE]: summary.needScale || 0,
    [SCALE_STATUS_TABS.PENDING]: summary.byAssignmentStatus?.ASSIGNED || 0,
    [SCALE_STATUS_TABS.COMPLETED]: summary.byScaleStatus?.SCALED || 0,
    [SCALE_STATUS_TABS.QC_REJECTED]: summary.byQcStatus?.REJECTED || 0,
    [SCALE_STATUS_TABS.ADDRESS_INVALID]: summary.addressInvalid || 0,
    [SCALE_STATUS_TABS.FAILED]: summary.failed || 0,
    csAssigned: summary.csAssigned ?? summary.byCsStatus?.ASSIGNED ?? 0,
    csInProgress: summary.byCsStatus?.IN_PROGRESS ?? 0,
    csDone: summary.byCsStatus?.DONE ?? 0,
  }
}

export function mapScaleAssignees(items = []) {
  return items.map((assignee) => ({
    id: assignee.id,
    name: getPersonDisplayName(assignee, 'Unassigned'),
    employeeCode: assignee.employeeCode || null,
  }))
}

export function mapShopOptions(items = []) {
  return items.map((shop) => ({ id: shop.id, name: shop.name }))
}

export function mapProductionListResponse(response = {}, shops = []) {
  const shopNames = new Map(shops.map((shop) => [shop.id, shop.name]))
  const items = (response.items || []).map((task) => mapProductionTask(task, shopNames))
  const scaleUsers = [
    ...new Map(
      items
        .filter((task) => task.scaleBy)
        .map((task) => [task.scaleBy, { id: task.scaleBy, name: task.scaleByName }]),
    ).values(),
  ]
  const qcUsers = [
    ...new Map(
      (response.items || [])
        .filter((task) => task.qcBy)
        .map((task) => [
          task.qcBy,
          {
            id: task.qcBy,
            name: getPersonDisplayName(task.qcUser || task.qcByUser, 'Unassigned'),
          },
        ]),
    ).values(),
  ]

  return {
    items,
    total: response.total || 0,
    page: response.page || 1,
    limit: response.limit || SCALE_PAGE_SIZE,
    options: {
      shops,
      scaleUsers,
      qcUsers,
    },
  }
}
