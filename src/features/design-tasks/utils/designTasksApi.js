import { TASK_TYPES } from '../../../constants/app.js'
import { hasAnyPermission } from '../../auth/utils/authz.js'
import {
  DESIGN_TASK_ASIN_TYPE_FILTERS,
  DESIGN_TASK_PAGE_SIZE,
  DESIGN_TASK_SELLER_FILTERS,
  DESIGN_TASK_STATUS_TABS,
} from '../constants/designTasksConstants.js'

export const DESIGN_TASK_TYPE_OPTIONS = [
  { value: 'IDEA', label: 'Idea' },
  { value: 'PSD_TEMPLATE', label: 'PSD Template' },
  { value: 'CLONE', label: 'Clone' },
  { value: 'MOCKUP', label: 'Mockup' },
  { value: 'PNG_ASSET', label: 'PNG Asset' },
]

export const DESIGN_TASK_PRIORITY_OPTIONS = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
export const DESIGN_TASK_OUTPUT_OPTIONS = ['PSD_TEMPLATE', 'MOCKUP', 'PNG_ASSET']

const TASK_TYPE_QUERY = {
  [TASK_TYPES.IDEA]: 'IDEA',
  [TASK_TYPES.PSD]: 'PSD_TEMPLATE',
  [TASK_TYPES.PNG]: 'PNG_ASSET',
}

const STATUS_QUERY = {
  [DESIGN_TASK_STATUS_TABS.NEW]: 'REQUESTED',
  [DESIGN_TASK_STATUS_TABS.REQUESTED]: 'REQUESTED',
  [DESIGN_TASK_STATUS_TABS.ASSIGNED]: 'ASSIGNED',
  [DESIGN_TASK_STATUS_TABS.IN_PROGRESS]: 'IN_PROGRESS',
  [DESIGN_TASK_STATUS_TABS.UPLOADED]: 'SUBMITTED',
  [DESIGN_TASK_STATUS_TABS.QC_PASSED]: 'APPROVED',
  [DESIGN_TASK_STATUS_TABS.QC_REJECTED]: 'REJECTED',
}

const STATUS_LABEL = {
  REQUESTED: 'Requested',
  OPEN: 'New',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

const STATUS_TAB = {
  REQUESTED: DESIGN_TASK_STATUS_TABS.REQUESTED,
  OPEN: DESIGN_TASK_STATUS_TABS.NEW,
  ASSIGNED: DESIGN_TASK_STATUS_TABS.ASSIGNED,
  IN_PROGRESS: DESIGN_TASK_STATUS_TABS.IN_PROGRESS,
  SUBMITTED: DESIGN_TASK_STATUS_TABS.UPLOADED,
  APPROVED: DESIGN_TASK_STATUS_TABS.QC_PASSED,
  REJECTED: DESIGN_TASK_STATUS_TABS.QC_REJECTED,
}

export function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

function cleanObject(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  )
}

function cleanArray(values = []) {
  return values.map((value) => String(value || '').trim()).filter(Boolean)
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function display(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  return value.name || value.fullName || value.title || value.code || value.id || fallback
}

function displayNoId(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') {
    return /^[a-f0-9]{24}$/i.test(value) || /raw-id$/i.test(value) ? fallback : value
  }
  return value.name || value.fullName || value.title || value.code || fallback
}

function trimText(value) {
  const text = String(value || '').trim()
  return text || undefined
}

function trimUpper(value) {
  return trimText(value)?.toUpperCase()
}

function taskTypeLabel(value) {
  return (
    DESIGN_TASK_TYPE_OPTIONS.find((option) => option.value === value)?.label ||
    display(value, 'Design task')
  )
}

function assetDownloadUrl(assetId) {
  return assetId ? `/api/media/assets/${assetId}/download` : null
}

export function buildDesignTaskQuery(filters = {}) {
  return cleanObject({
    taskType: filters.taskType || TASK_TYPE_QUERY[filters.subTab],
    status: STATUS_QUERY[filters.statusTab],
    unassigned: filters.statusTab === 'unassigned' ? true : undefined,
    orderId: trimText(filters.orderId),
    search: trimText(filters.search),
    shopId:
      filters.shopId ||
      (filters.seller && filters.seller !== DESIGN_TASK_SELLER_FILTERS.ALL
        ? filters.seller
        : undefined),
    sellerId: filters.sellerId,
    assignedDesignerId:
      filters.assignedDesignerId && filters.assignedDesignerId !== 'all'
        ? filters.assignedDesignerId
        : undefined,
    asinType: filters.asinType !== DESIGN_TASK_ASIN_TYPE_FILTERS.ALL ? filters.asinType : undefined,
    priority: trimUpper(filters.priority === 'all' ? '' : filters.priority),
    psdStatus: trimUpper(filters.psdStatus === 'all' ? '' : filters.psdStatus),
    dateFrom: trimText(filters.dateFrom),
    dateTo: trimText(filters.dateTo),
    sortBy: trimText(filters.sortBy),
    sortOrder: trimText(filters.sortOrder),
    page: Math.max(Number(filters.page) || 1, 1),
    limit: Math.max(Number(filters.pageSize) || DESIGN_TASK_PAGE_SIZE, 1),
  })
}

export function buildDesignScoreSummaryQuery(filters = {}) {
  return cleanObject({
    dateFrom: trimText(filters.dateFrom),
    dateTo: trimText(filters.dateTo),
    taskType: trimUpper(filters.taskType),
    designerId:
      filters.assignedDesignerId && filters.assignedDesignerId !== 'all'
        ? filters.assignedDesignerId
        : undefined,
  })
}

function mapAsset(asset = {}) {
  const id = asset.id || asset._id || null
  return {
    id,
    filename: displayNoId(asset.originalFilename || asset.filename || asset, 'Unknown file'),
    mimeType: asset.mimeType || null,
    size: asset.size ?? null,
    createdAt: asset.createdAt || null,
    downloadUrl: assetDownloadUrl(id),
  }
}

function mapSubmission(submission = {}) {
  const assetIds = submission.assetIds || submission.submittedAssetIds || []
  const assets = (submission.assets || []).map(mapAsset)
  const firstAsset = assets[0]

  return {
    id: submission.id || submission._id || null,
    version: submission.version || null,
    status: submission.status || null,
    assetIds,
    assets,
    fileLabel: firstAsset?.filename || 'Unknown file',
    canDelete: submission.status !== 'APPROVED',
    submittedAt: submission.submittedAt || null,
    note: submission.note || null,
    approvedAssetId: submission.approvedAssetId || null,
    approvedAsset: submission.approvedAsset ? mapAsset(submission.approvedAsset) : null,
    approvedAt: submission.approvedAt || null,
    rejectedAt: submission.rejectedAt || null,
    rejectReason: submission.rejectReason || null,
    score: submission.score || null,
  }
}

function mapTaskRow(task = {}) {
  const listing = task.listing || task.listingSnapshot || {}
  const order = task.order || task.orderSnapshot || {}
  const orderItem = task.orderItem || task.orderItemSnapshot || {}
  const productionTask = task.productionTask || task.productionTaskSnapshot || {}
  const latestSubmission = task.latestSubmission || {}
  const latestFile = task.latestSubmittedAsset || latestSubmission.assets?.[0] || {}
  const listingTitle = displayNoId(listing.title || listing.name || listing, 'Unknown listing')
  const listingCode = listing.asin || listing.sku || listing.code || '-'
  const orderId =
    task.externalOrderId ||
    task.orderExternalId ||
    task.orderIdDisplay ||
    order.externalOrderId ||
    order.orderId ||
    orderItem.externalOrderId ||
    productionTask.externalOrderId ||
    '-'

  return {
    id: task.id,
    createdAt: { date: formatDate(task.createdAt), relative: task.createdAt || '-' },
    updatedAt: { date: formatDate(task.updatedAt), relative: task.updatedAt || '-' },
    taskType: task.taskType || 'IDEA',
    taskTypeLabel: taskTypeLabel(task.taskType),
    orderId,
    listingTitle,
    listingCode,
    asin: listingCode,
    statusTask: STATUS_LABEL[task.status] || display(task.status),
    assigned: displayNoId(task.assignedDesigner, 'Unassigned'),
    priority: display(task.priority, 'NORMAL'),
    psdStatus: listing.psdStatus === 'PRESENT' ? 'Available' : 'Missing',
    seller: displayNoId(task.seller || task.shop, 'Unknown shop'),
    shop: displayNoId(task.shop || task.seller, 'Unknown shop'),
    asinType: display(task.asinType, 'Normal'),
    brief: task.brief || task.note || '',
    expectedOutputs: task.expectedOutputs || [],
    latestFile: displayNoId(
      latestFile.originalFilename || latestFile.filename || latestFile,
      'No file',
    ),
    latestFileId: latestFile.id || latestFile._id || null,
    submissionCount: Number(task.submissionCount || task.submissions?.length || 0),
    productTone: listing.psdStatus === 'PRESENT' ? 'green' : 'gray',
    linkProduct: listingCode,
    description: displayNoId(task.brief || listing.title || task.note, 'Design task'),
    productType: displayNoId(listing.productTypeGroup || task.productTypeGroup, 'Design'),
    raw: task,
  }
}

function countByStatus(items) {
  const counts = { [DESIGN_TASK_STATUS_TABS.ALL]: items.length }
  for (const item of items) {
    const tab = STATUS_TAB[item.status]
    if (tab) counts[tab] = (counts[tab] || 0) + 1
  }
  return counts
}

export function mapBackendDesignTasksResponse(response = {}) {
  const items = response.items || response.rows || response.results || []

  return {
    counts: countByStatus(items),
    items: items.map(mapTaskRow),
    lastUpdatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    summaryTotal: Number(response.pagination?.total || response.total || items.length),
    total: Number(response.pagination?.total || response.total || items.length),
    pagination: {
      total: Number(response.pagination?.total || response.total || items.length),
      page: Number(response.pagination?.page || 1),
      limit: Number(response.pagination?.limit || items.length || DESIGN_TASK_PAGE_SIZE),
    },
  }
}

export function mapDesignTaskDetail(task = {}) {
  const row = mapTaskRow(task)
  const listing = task.listing || task.listingSnapshot || {}
  const submissions = (task.submissions || []).map(mapSubmission)

  return {
    ...row,
    status: task.status,
    statusLabel: STATUS_LABEL[task.status] || display(task.status),
    listingTitle: row.listingTitle,
    listingCode: row.listingCode,
    psdStatus: listing.psdStatus === 'PRESENT' ? 'Available' : 'Missing',
    note: task.note || null,
    rejectReason: task.rejectReason || null,
    latestSubmittedAsset: task.latestSubmittedAsset ? mapAsset(task.latestSubmittedAsset) : null,
    latestSubmission: task.latestSubmission ? mapSubmission(task.latestSubmission) : null,
    approvedSubmission: task.approvedSubmission ? mapSubmission(task.approvedSubmission) : null,
    approvedAssetId: task.approvedAssetId || null,
    submissions,
    raw: task,
  }
}

export function buildSubmitDesignTaskPayload({ mediaAssetId, note } = {}) {
  return cleanObject({
    submittedAssetIds: mediaAssetId ? [mediaAssetId] : undefined,
    note: trimText(note),
  })
}

export function buildAssignDesignTaskPayload({ assignedDesignerId, note } = {}) {
  return cleanObject({
    assignedDesignerId,
    note: trimText(note),
  })
}

export function buildApproveDesignTaskPayload({ approvedAssetId, submissionId } = {}) {
  return cleanObject({
    approvedAssetId,
    submissionId,
  })
}

export function buildApproveLatestSubmissionVariables(task = {}) {
  const raw = task.raw || task
  const submission = task.latestSubmission || raw.latestSubmission || {}
  const approvedAssetId =
    submission.approvedAssetId ||
    submission.assetIds?.[0] ||
    submission.submittedAssetIds?.[0] ||
    submission.assets?.[0]?.id ||
    submission.assets?.[0]?._id ||
    task.latestSubmittedAsset?.id ||
    raw.latestSubmittedAsset?.id ||
    raw.latestSubmittedAsset?._id

  return cleanObject({
    taskId: task.id || raw.id,
    approvedAssetId,
    submissionId: submission.id || submission._id,
  })
}

export function buildRejectDesignTaskPayload({ rejectReason, submissionId } = {}) {
  return cleanObject({
    rejectReason: trimText(rejectReason),
    submissionId,
  })
}

export function buildCancelDesignTaskPayload({ cancelReason } = {}) {
  return cleanObject({
    cancelReason: trimText(cancelReason),
  })
}

export function buildOverrideSubmissionScorePayload({ points, scoreLevel, overrideReason } = {}) {
  return cleanObject({
    points: points === '' || points === null || points === undefined ? undefined : Number(points),
    scoreLevel: trimUpper(scoreLevel),
    overrideReason: trimText(overrideReason),
  })
}

export function buildVoidSubmissionScorePayload({ voidReason } = {}) {
  return cleanObject({ voidReason: trimText(voidReason) })
}

export function buildCreateDesignTaskPayload(values = {}) {
  return cleanObject({
    listingId: values.listingId,
    taskType: trimUpper(values.taskType),
    sourceListingId: values.sourceListingId || undefined,
    sourceInternalTemplateId: values.sourceInternalTemplateId || undefined,
    brief: trimText(values.brief),
    referenceAssetIds: cleanArray(values.referenceAssetIds).length
      ? cleanArray(values.referenceAssetIds)
      : undefined,
    expectedOutputs: cleanArray(values.expectedOutputs).length
      ? cleanArray(values.expectedOutputs)
      : undefined,
    priority: trimUpper(values.priority),
    note: trimText(values.note),
  })
}

export function buildBulkCreatePsdTasksPayload({ listingIds, filters, limit, note } = {}) {
  const cleanFilters = cleanObject({
    shopId: filters?.shopId,
    salesChannelCode: trimUpper(filters?.salesChannelCode),
    marketplaceCode: trimUpper(filters?.marketplaceCode),
    productTypeGroupId: filters?.productTypeGroupId,
  })

  return cleanObject({
    listingIds: Array.isArray(listingIds) && listingIds.length ? listingIds : undefined,
    filters: Object.keys(cleanFilters).length ? cleanFilters : undefined,
    limit: limit ? Number(limit) : undefined,
    note: trimText(note),
  })
}

export function mapDesignAssignees(response = {}) {
  return (response.items || []).map((profile) => ({
    id: profile.id,
    label: `${displayNoId(profile.fullName || profile, 'Designer')} (${Number(profile.activeTaskCount) || 0} active)`,
    activeTaskCount: Number(profile.activeTaskCount) || 0,
  }))
}

export function mapDesignWorkload(response = {}) {
  return {
    total: Number(response.total || 0),
    unassigned: Number(response.unassigned || response.unassignedCount || 0),
    inProgress: Number(response.inProgress || 0),
    submitted: Number(response.submitted || 0),
    rejected: Number(response.rejected || 0),
    approved: Number(response.approved || 0),
    byDesigner: (response.byDesigner || []).map((row) => ({
      label: displayNoId(row.assignedDesigner || row.designer || row, 'Unassigned'),
      activeTaskCount: Number(row.activeTaskCount || row.count || 0),
    })),
  }
}

export function mapDesignSubmissionsResponse(response = {}) {
  return (response.items || response.submissions || []).map(mapSubmission)
}

export function mapPsdTemplateCandidatesResponse(response = {}) {
  const items = response.items || []

  return {
    items: items.map((listing) => ({
      id: listing.id,
      asin: listing.asin || '',
      sku: listing.sku || '',
      title: listing.title || listing.name || '',
      seller: displayNoId(listing.shop || listing.seller, 'Unknown shop'),
      label: `${listing.asin || listing.sku || 'Unknown listing'} · ${displayNoId(
        listing.title || listing.name,
        'Listing',
      )}`,
      raw: listing,
    })),
    pagination: {
      total: Number(response.pagination?.total || response.total || items.length),
      page: Number(response.pagination?.page || 1),
      limit: Number(response.pagination?.limit || items.length || 10),
    },
  }
}

export function getDesignTaskActions(task = {}, user = null) {
  const status = task.status || task.raw?.status
  const can = (permissions) => !user || hasAnyPermission(user, permissions)

  return {
    canAssign:
      ['REQUESTED', 'OPEN', 'ASSIGNED'].includes(status) &&
      can(['DESIGN:WRITE', 'DESIGN_TASKS:ASSIGN', 'DESIGN_TASKS:WRITE']),
    canStart:
      status === 'ASSIGNED' &&
      can(['DESIGN:WORK', 'DESIGN:WRITE', 'DESIGN_TASKS:START', 'DESIGN_TASKS:WRITE']),
    canSubmit:
      ['IN_PROGRESS', 'REJECTED'].includes(status) &&
      can(['DESIGN:WORK', 'DESIGN:WRITE', 'DESIGN_TASKS:SUBMIT', 'DESIGN_TASKS:WRITE']),
    canReview:
      status === 'SUBMITTED' &&
      can([
        'DESIGN:REVIEW',
        'DESIGN:WRITE',
        'DESIGN_TASKS:APPROVE',
        'DESIGN_TASKS:REVIEW',
        'DESIGN_TASKS:WRITE',
      ]),
    canCancel:
      ['REQUESTED', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REJECTED'].includes(status) &&
      can(['DESIGN:WRITE', 'DESIGN_TASKS:CANCEL', 'DESIGN_TASKS:WRITE']),
    canDeleteSubmission:
      status !== 'APPROVED' &&
      can(['DESIGN:WRITE', 'DESIGN_TASKS:DELETE_SUBMISSION', 'DESIGN_TASKS:WRITE']),
    isReadOnly: status === 'APPROVED' || status === 'CANCELLED',
  }
}

export function getPsdTaskActions(task = {}, user = null) {
  return getDesignTaskActions(task, user)
}
