import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPsdFilesQuery,
  buildSubmissionScoresQuery,
  mapPsdFilesResponse,
  mapSubmissionScoresResponse,
} from './designTasksApi.js'

test('submission score query trims filters and preserves PSD score status', () => {
  assert.deepEqual(
    buildSubmissionScoresQuery({
      search: ' master ',
      scoreLevel: 'standard',
      scoreStatus: 'voided',
      designerId: 'designer-1',
      page: 2,
      pageSize: 25,
    }),
    {
      search: 'master',
      scoreLevel: 'STANDARD',
      scoreStatus: 'VOIDED',
      designerId: 'designer-1',
      page: 2,
      limit: 25,
    },
  )
})

test('PSD file query only sends supported created or submitted sort fields', () => {
  assert.deepEqual(
    buildPsdFilesQuery({ sortBy: 'filename', sortOrder: 'desc', page: 2, pageSize: 25 }),
    { sortOrder: 'desc', page: 2, limit: 25 },
  )
  assert.deepEqual(buildPsdFilesQuery({ sortBy: 'submittedAt', sortOrder: 'asc' }), {
    sortBy: 'submittedAt',
    sortOrder: 'asc',
    page: 1,
    limit: 20,
  })
})

test('PSD file rows keep the Design link time separate from the asset upload time', () => {
  const result = mapPsdFilesResponse({
    items: [
      {
        rowKey: 'row-1',
        asset: {
          id: 'asset-1',
          originalFilename: 'shirt.psd',
          size: 2048,
          mimeType: 'application/octet-stream',
          createdAt: '2026-07-01T00:00:00.000Z',
        },
        role: 'APPROVED',
        linkedAt: '2026-07-20T00:00:00.000Z',
        task: { id: 'task-1', status: 'APPROVED' },
        listing: { id: 'listing-1', code: 'SKU-1', title: 'Shirt' },
        designer: { id: 'designer-1', name: 'Mai' },
        submission: { id: 'submission-1', version: 2 },
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
  })
  assert.equal(result.items[0].filename, 'shirt.psd')
  assert.equal(result.items[0].rowKey, 'row-1')
  assert.equal(result.items[0].asset.mimeType, 'application/octet-stream')
  assert.equal(result.items[0].asset.createdAt, '2026-07-01T00:00:00.000Z')
  assert.equal(result.items[0].linkedAt, '2026-07-20T00:00:00.000Z')
  assert.equal(result.items[0].listingLabel, 'SKU-1')
  assert.equal(result.items[0].downloadUrl, '/api/media/assets/asset-1/download')
})

test('submission score rows retain the nested workspace read model and mapped download URL', () => {
  const result = mapSubmissionScoresResponse({
    items: [
      {
        file: {
          id: 'asset-1',
          originalFilename: 'shirt.psd',
          mimeType: 'image/vnd.adobe.photoshop',
        },
        task: { id: 'task-1', status: 'APPROVED' },
        listing: { id: 'listing-1', code: 'SKU-1', title: 'Shirt' },
        designer: { id: 'designer-1', name: 'Mai' },
        submission: { id: 'submission-1', version: 2, approvedAt: '2026-07-20T00:00:00.000Z' },
        score: {
          id: 'score-1',
          finalPoints: 3.75,
          scoreLevel: 'STANDARD',
          status: 'ACTIVE',
          scoredAt: '2026-07-20T01:00:00.000Z',
          scorer: { name: 'Linh Reviewer' },
        },
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
  })

  assert.equal(result.items[0].points, 3.75)
  assert.equal(result.items[0].listingLabel, 'SKU-1')
  assert.equal(result.items[0].designerLabel, 'Mai')
  assert.equal(result.items[0].file.filename, 'shirt.psd')
  assert.equal(result.items[0].file.downloadUrl, '/api/media/assets/asset-1/download')
  assert.equal(result.items[0].downloadUrl, '/api/media/assets/asset-1/download')
  assert.equal(result.items[0].task.status, 'APPROVED')
  assert.equal(result.items[0].submission.version, 2)
  assert.equal(result.items[0].submission.approvedAt, '2026-07-20T00:00:00.000Z')
  assert.equal(result.items[0].score.finalPoints, 3.75)
  assert.equal(result.items[0].score.status, 'ACTIVE')
  assert.equal(result.items[0].score.scoredAt, '2026-07-20T01:00:00.000Z')
  assert.equal(result.items[0].score.scorer.name, 'Linh Reviewer')
})
