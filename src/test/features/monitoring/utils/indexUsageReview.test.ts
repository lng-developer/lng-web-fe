import { describe, expect, it } from 'vitest'

import type { MongoIndexUsageSnapshot } from '@/features/monitoring/api/monitoringApi'
import { getIndexReview } from '@/features/monitoring/utils/indexUsageReview'

const snapshot = (
  capturedOn: string,
  operations: number,
  classification = 'DUPLICATE',
): MongoIndexUsageSnapshot => ({
  capturedOn,
  capturedAt: `${capturedOn}T00:00:00.000Z`,
  database: 'lng_web_be',
  totals: { dataBytes: 0, storageBytes: 0, indexBytes: 0, collections: 1, indexes: 1 },
  collections: [
    {
      name: 'orders',
      documentCount: 0,
      dataBytes: 0,
      storageBytes: 0,
      indexBytes: 0,
      indexCount: 1,
      usageAvailable: true,
      indexes: [{ name: 'shopId_1', key: { shopId: 1 }, operations }],
      findings: [
        {
          indexName: 'shopId_1',
          classification,
          coveredBy: 'shopId_1_status_1',
          reason: 'covered',
        },
      ],
    },
  ],
})

describe('getIndexReview', () => {
  it('marks a covered or duplicate index as a review candidate only after seven unchanged daily snapshots', () => {
    const snapshots = Array.from({ length: 8 }, (_, index) =>
      snapshot(`2026-08-${String(25 - index).padStart(2, '0')}`, 12),
    )

    expect(getIndexReview(snapshots[0].collections[0].indexes[0], 'orders', snapshots)).toEqual({
      classification: 'DUPLICATE',
      idleDays: 7,
      candidate: true,
    })
  })

  it('keeps correctness or recently active indexes out of the review queue', () => {
    const snapshots = [snapshot('2026-08-25', 12, 'KEEP'), snapshot('2026-08-24', 11, 'KEEP')]

    expect(getIndexReview(snapshots[0].collections[0].indexes[0], 'orders', snapshots)).toEqual({
      classification: 'KEEP',
      idleDays: 0,
      candidate: false,
    })
  })
})
