import assert from 'node:assert/strict'
import test from 'node:test'

import { DESIGN_TASK_STATUS_TABS } from '../constants/designTasksConstants.js'
import {
  buildApproveDesignTaskPayload,
  buildAssignDesignTaskPayload,
  buildBulkCreatePsdTasksPayload,
  buildCancelDesignTaskPayload,
  buildCreateDesignTaskPayload,
  buildDesignTaskQuery,
  buildRejectDesignTaskPayload,
  buildSubmitDesignTaskPayload,
  getDesignTaskActions,
  getPsdTaskActions,
  mapBackendDesignTasksResponse,
  mapDesignAssignees,
  mapDesignSubmissionsResponse,
  mapDesignTaskDetail,
  mapDesignWorkload,
  mapPsdTemplateCandidatesResponse,
} from './designTasksApi.js'

test('buildDesignTaskQuery maps PSD tab filters to backend task query', () => {
  assert.deepEqual(
    buildDesignTaskQuery({
      taskType: 'PSD_TEMPLATE',
      statusTab: DESIGN_TASK_STATUS_TABS.IN_PROGRESS,
      search: ' b0abc ',
      shopId: 'shop-1',
      assignedDesignerId: 'designer-1',
      priority: 'urgent',
      psdStatus: 'missing',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-16',
      sortBy: 'priority',
      sortOrder: 'asc',
      page: 2,
      pageSize: 20,
    }),
    {
      taskType: 'PSD_TEMPLATE',
      status: 'IN_PROGRESS',
      search: 'b0abc',
      shopId: 'shop-1',
      assignedDesignerId: 'designer-1',
      priority: 'URGENT',
      psdStatus: 'MISSING',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-16',
      sortBy: 'priority',
      sortOrder: 'asc',
      page: 2,
      limit: 20,
    },
  )
})

test('buildDesignTaskQuery maps unassigned tab to backend unassigned filter', () => {
  assert.deepEqual(
    buildDesignTaskQuery({
      taskType: 'PSD_TEMPLATE',
      statusTab: 'unassigned',
      page: 1,
      pageSize: 20,
    }),
    {
      taskType: 'PSD_TEMPLATE',
      unassigned: true,
      page: 1,
      limit: 20,
    },
  )
})

test('mapBackendDesignTasksResponse flattens backend PSD task rows for the table', () => {
  const result = mapBackendDesignTasksResponse(
    {
      items: [
        {
          id: 'task-1',
          status: 'REQUESTED',
          priority: 'HIGH',
          createdAt: '2026-07-15T00:00:00.000Z',
          listingSnapshot: {
            asin: 'B0ABC',
            psdStatus: 'MISSING',
            title: 'Personalized Shirt',
          },
          assignedDesigner: { fullName: 'Jane Cooper' },
          seller: { name: 'Main Shop' },
          asinType: 'NORMAL',
        },
      ],
      pagination: { total: 1 },
    },
    { taskType: 'PSD_TEMPLATE' },
  )

  assert.equal(result.total, 1)
  assert.equal(result.summaryTotal, 1)
  assert.equal(result.counts[DESIGN_TASK_STATUS_TABS.REQUESTED], 1)
  assert.equal(result.items[0].id, 'task-1')
  assert.deepEqual(result.items[0].createdAt, {
    date: 'Jul 15, 2026',
    relative: '2026-07-15T00:00:00.000Z',
  })
  assert.equal(result.items[0].asin, 'B0ABC')
  assert.equal(result.items[0].statusTask, 'Requested')
  assert.equal(result.items[0].assigned, 'Jane Cooper')
  assert.equal(result.items[0].priority, 'HIGH')
  assert.equal(result.items[0].psdStatus, 'Missing')
  assert.equal(result.items[0].seller, 'Main Shop')
  assert.equal(result.items[0].asinType, 'NORMAL')
  assert.equal(result.items[0].productTone, 'gray')
  assert.equal(result.items[0].raw.id, 'task-1')
})

test('mapBackendDesignTasksResponse maps rows without using raw ids as primary labels', () => {
  const result = mapBackendDesignTasksResponse({
    items: [
      {
        id: 'task-1',
        status: 'REQUESTED',
        taskType: 'IDEA',
        listingId: 'listing-raw-id',
        assignedDesignerId: 'designer-raw-id',
        latestSubmittedAsset: { id: 'asset-raw-id' },
      },
    ],
  })

  assert.equal(result.items[0].listingTitle, 'Unknown listing')
  assert.equal(result.items[0].listingCode, '-')
  assert.equal(result.items[0].assigned, 'Unassigned')
  assert.equal(result.items[0].latestFile, 'No file')
})

test('mapDesignTaskDetail preserves submissions and asset ids from backend detail', () => {
  const detail = mapDesignTaskDetail({
    id: 'task-1',
    status: 'SUBMITTED',
    priority: 'HIGH',
    listing: { asin: 'B0ABC', title: 'Personalized Shirt', psdStatus: 'MISSING' },
    seller: { name: 'Main Shop' },
    assignedDesigner: { fullName: 'Jane Cooper' },
    latestSubmission: {
      id: 'submission-1',
      version: 2,
      status: 'SUBMITTED',
      assetIds: ['asset-1', 'asset-2'],
      assets: [{ id: 'asset-2', originalFilename: 'template.psd', size: 2048 }],
      submittedAt: '2026-07-15T01:00:00.000Z',
      note: 'ready',
    },
    submissions: [
      {
        id: 'submission-1',
        version: 2,
        status: 'SUBMITTED',
        assetIds: ['asset-1', 'asset-2'],
        assets: [{ id: 'asset-2', originalFilename: 'template.psd', size: 2048 }],
      },
    ],
  })

  assert.equal(detail.id, 'task-1')
  assert.equal(detail.status, 'SUBMITTED')
  assert.equal(detail.listingTitle, 'Personalized Shirt')
  assert.equal(detail.latestSubmission.id, 'submission-1')
  assert.deepEqual(detail.latestSubmission.assetIds, ['asset-1', 'asset-2'])
  assert.equal(detail.latestSubmission.assets[0].filename, 'template.psd')
  assert.equal(detail.submissions[0].assets[0].downloadUrl, '/api/media/assets/asset-2/download')
})

test('design task mutation payload builders omit empty optional fields', () => {
  assert.deepEqual(
    buildAssignDesignTaskPayload({ assignedDesignerId: 'designer-1', note: ' assign it ' }),
    {
      assignedDesignerId: 'designer-1',
      note: 'assign it',
    },
  )
  assert.deepEqual(buildSubmitDesignTaskPayload({ mediaAssetId: 'asset-1', note: ' ready ' }), {
    submittedAssetIds: ['asset-1'],
    note: 'ready',
  })
  assert.deepEqual(
    buildApproveDesignTaskPayload({ approvedAssetId: 'asset-1', submissionId: '' }),
    {
      approvedAssetId: 'asset-1',
    },
  )
  assert.deepEqual(
    buildRejectDesignTaskPayload({ rejectReason: ' wrong file ', submissionId: '' }),
    {
      rejectReason: 'wrong file',
    },
  )
  assert.deepEqual(buildCancelDesignTaskPayload({ cancelReason: ' duplicate ' }), {
    cancelReason: 'duplicate',
  })
  assert.deepEqual(
    buildBulkCreatePsdTasksPayload({ listingIds: ['listing-1'], note: ' missing psd ' }),
    {
      listingIds: ['listing-1'],
      note: 'missing psd',
    },
  )
  assert.deepEqual(
    buildBulkCreatePsdTasksPayload({
      filters: { shopId: 'shop-1', productTypeGroupId: '', salesChannelCode: 'amazon' },
      limit: 20,
    }),
    {
      filters: { shopId: 'shop-1', salesChannelCode: 'AMAZON' },
      limit: 20,
    },
  )
})

test('buildCreateDesignTaskPayload creates readable task payloads per task type', () => {
  assert.deepEqual(
    buildCreateDesignTaskPayload({
      listingId: 'listing-1',
      taskType: 'IDEA',
      brief: ' new idea ',
      expectedOutputs: ['MOCKUP', ''],
      referenceAssetIds: ['asset-1'],
      priority: 'high',
      note: ' note ',
    }),
    {
      listingId: 'listing-1',
      taskType: 'IDEA',
      brief: 'new idea',
      expectedOutputs: ['MOCKUP'],
      referenceAssetIds: ['asset-1'],
      priority: 'HIGH',
      note: 'note',
    },
  )

  assert.deepEqual(
    buildCreateDesignTaskPayload({
      listingId: 'target-1',
      taskType: 'CLONE',
      sourceListingId: 'source-1',
      sourceInternalTemplateId: '',
      expectedOutputs: ['PSD_TEMPLATE'],
    }),
    {
      listingId: 'target-1',
      taskType: 'CLONE',
      sourceListingId: 'source-1',
      expectedOutputs: ['PSD_TEMPLATE'],
    },
  )
})

test('mapDesignWorkload and mapDesignSubmissionsResponse expose operator labels', () => {
  assert.deepEqual(
    mapDesignWorkload({
      total: 10,
      unassigned: 2,
      inProgress: 3,
      submitted: 1,
      rejected: 1,
      approved: 4,
      byDesigner: [{ assignedDesigner: { fullName: 'Jane Cooper' }, activeTaskCount: 3 }],
    }),
    {
      total: 10,
      unassigned: 2,
      inProgress: 3,
      submitted: 1,
      rejected: 1,
      approved: 4,
      byDesigner: [{ label: 'Jane Cooper', activeTaskCount: 3 }],
    },
  )

  const submissions = mapDesignSubmissionsResponse({
    items: [
      {
        id: 'sub-1',
        status: 'SUBMITTED',
        assets: [{ id: 'asset-1', originalFilename: 'file.psd' }],
      },
    ],
  })

  assert.equal(submissions[0].fileLabel, 'file.psd')
  assert.equal(submissions[0].canDelete, true)
})

test('getDesignTaskActions follows shared backend lifecycle gates', () => {
  assert.equal(getDesignTaskActions({ status: 'REQUESTED' }).canAssign, true)
  assert.equal(getDesignTaskActions({ status: 'ASSIGNED' }).canStart, true)
  assert.equal(getDesignTaskActions({ status: 'IN_PROGRESS' }).canSubmit, true)
  assert.equal(getDesignTaskActions({ status: 'REJECTED' }).canSubmit, true)
  assert.equal(getDesignTaskActions({ status: 'SUBMITTED' }).canReview, true)
  assert.equal(getDesignTaskActions({ status: 'APPROVED' }).canDeleteSubmission, false)
})

test('getDesignTaskActions hides lifecycle actions without matching permissions', () => {
  const submittedTask = { status: 'SUBMITTED' }

  assert.deepEqual(getDesignTaskActions(submittedTask, { permissions: ['DESIGN:READ'] }), {
    canAssign: false,
    canStart: false,
    canSubmit: false,
    canReview: false,
    canCancel: false,
    canDeleteSubmission: false,
    isReadOnly: false,
  })

  assert.equal(
    getDesignTaskActions(submittedTask, { permissions: ['DESIGN:REVIEW'] }).canReview,
    true,
  )
})

test('getDesignTaskActions separates worker reviewer and manager permissions', () => {
  const worker = { permissions: ['DESIGN:WORK'] }
  const reviewer = { permissions: ['DESIGN:REVIEW'] }
  const manager = { permissions: ['DESIGN:WRITE'] }

  assert.equal(getDesignTaskActions({ status: 'ASSIGNED' }, worker).canStart, true)
  assert.equal(getDesignTaskActions({ status: 'IN_PROGRESS' }, worker).canSubmit, true)
  assert.equal(getDesignTaskActions({ status: 'SUBMITTED' }, worker).canReview, false)

  assert.equal(getDesignTaskActions({ status: 'SUBMITTED' }, reviewer).canReview, true)
  assert.equal(getDesignTaskActions({ status: 'IN_PROGRESS' }, reviewer).canSubmit, false)

  assert.equal(getDesignTaskActions({ status: 'REQUESTED' }, manager).canAssign, true)
  assert.equal(getDesignTaskActions({ status: 'SUBMITTED' }, manager).canCancel, true)
  assert.equal(getDesignTaskActions({ status: 'SUBMITTED' }, manager).canReview, true)
})

test('getDesignTaskActions keeps admin lifecycle actions through manage system', () => {
  const actions = getDesignTaskActions({ status: 'ASSIGNED' }, { permissions: ['MANAGE_SYSTEM'] })

  assert.equal(actions.canAssign, true)
  assert.equal(actions.canStart, true)
  assert.equal(actions.canCancel, true)
})

test('getPsdTaskActions follows backend status gates', () => {
  assert.deepEqual(getPsdTaskActions({ status: 'ASSIGNED' }), {
    canAssign: true,
    canStart: true,
    canSubmit: false,
    canReview: false,
    canCancel: true,
    canDeleteSubmission: true,
    isReadOnly: false,
  })
  assert.equal(getPsdTaskActions({ status: 'REQUESTED' }).canAssign, true)
  assert.equal(getPsdTaskActions({ status: 'IN_PROGRESS' }).canSubmit, true)
  assert.equal(getPsdTaskActions({ status: 'REJECTED' }).canSubmit, true)
  assert.equal(getPsdTaskActions({ status: 'SUBMITTED' }).canReview, true)
  assert.equal(getPsdTaskActions({ status: 'SUBMITTED' }).canCancel, true)
  assert.equal(getPsdTaskActions({ status: 'APPROVED' }).isReadOnly, true)
  assert.equal(getPsdTaskActions({ status: 'CANCELLED' }).isReadOnly, true)
  assert.equal(getPsdTaskActions({ status: 'CANCELLED' }).canCancel, false)
})

test('mapDesignAssignees and mapPsdTemplateCandidatesResponse expose UI options', () => {
  assert.deepEqual(
    mapDesignAssignees({
      items: [{ id: 'designer-1', fullName: 'Jane Cooper', activeTaskCount: 3 }],
    }),
    [{ id: 'designer-1', label: 'Jane Cooper (3 active)', activeTaskCount: 3 }],
  )

  const candidates = mapPsdTemplateCandidatesResponse({
    items: [
      {
        id: 'listing-1',
        asin: 'B0ABC',
        sku: 'SKU-1',
        title: 'Personalized Shirt',
        shop: { name: 'Main Shop' },
      },
    ],
    pagination: { total: 1, page: 1, limit: 10 },
  })

  assert.equal(candidates.items[0].id, 'listing-1')
  assert.equal(candidates.items[0].label, 'B0ABC · Personalized Shirt')
  assert.equal(candidates.items[0].seller, 'Main Shop')
  assert.deepEqual(candidates.pagination, { total: 1, page: 1, limit: 10 })
})
