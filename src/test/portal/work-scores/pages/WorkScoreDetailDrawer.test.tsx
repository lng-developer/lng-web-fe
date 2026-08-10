import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { WorkScoreDetail } from '@/features/portal/work-scores/api/workScoreApi'
import { WorkScoreDetailDrawer } from '@/features/portal/work-scores/pages/WorkScoreDetailDrawer'

vi.mock('@/shared/media', () => ({
  AuthenticatedMediaImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}))

const score = (sourceType: WorkScoreDetail['sourceType']): WorkScoreDetail => ({
  id: 'score-1',
  sourceType,
  sourceTaskId: 'task-1',
  sourceUnitId: 'unit-1',
  assetId: 'asset-1',
  assetDownloadUrl: '/api/media/assets/asset-1/download',
  shopId: 'shop-1',
  workerId: 'worker-1',
  workerName: 'Designer One',
  contextSnapshot: { slotLabel: 'Front' },
  basePoints: 10,
  finalPoints: 10,
  scoreLevel: 'STANDARD',
  status: 'ACTIVE',
  adjustments: [],
  version: 1,
  scoredAt: '2026-08-10T00:00:00.000Z',
})

describe('WorkScoreDetailDrawer', () => {
  afterEach(cleanup)

  it('does not preview design submission package assets as images', () => {
    render(
      <WorkScoreDetailDrawer
        open
        score={score('DESIGN_SUBMISSION')}
        loading={false}
        error={false}
        onClose={() => undefined}
      />,
    )

    expect(screen.queryByRole('img', { name: 'Front' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download/i })).toBeVisible()
  })

  it('previews production scale assets', () => {
    render(
      <WorkScoreDetailDrawer
        open
        score={score('PRODUCTION_SCALE')}
        loading={false}
        error={false}
        onClose={() => undefined}
      />,
    )

    expect(screen.getByRole('img', { name: 'Front' })).toBeVisible()
  })
})
