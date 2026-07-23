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

test('PSD file rows expose readable names and never use IDs as labels', () => {
  const result = mapPsdFilesResponse({
    items: [
      {
        rowKey: 'row-1',
        asset: { id: 'asset-1', originalFilename: 'shirt.psd', size: 2048 },
        role: 'APPROVED',
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
  assert.equal(result.items[0].listingLabel, 'SKU-1')
  assert.equal(result.items[0].downloadUrl, '/api/media/assets/asset-1/download')
})

test('submission score rows expose score and readable operator labels', () => {
  const result = mapSubmissionScoresResponse({
    items: [
      {
        id: 'score-1',
        finalPoints: 3.75,
        scoreLevel: 'STANDARD',
        status: 'ACTIVE',
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

  assert.equal(result.items[0].points, 3.75)
  assert.equal(result.items[0].listingLabel, 'SKU-1')
  assert.equal(result.items[0].designerLabel, 'Mai')
})
