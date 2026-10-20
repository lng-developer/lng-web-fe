import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/common/CoreDataTable', async () => ({
  CoreDataTable: (await import('@/test/mocks/CoreDataTable')).CoreDataTable,
}))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => ({
    id: 'acc-2',
    email: 'scaler@lng.local',
    fullName: 'Production Scaler',
    status: 'ACTIVE',
    permissions: ['PRODUCTION:READ', 'PRODUCTION:SCALE_WORK', 'WORK_SCORES:READ'],
    scopes: [],
  }),
}))

vi.mock('@/features/portal/work-scores/api/workScoreApi', () => ({
  listWorkScores: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'score-scale-1',
        sourceType: 'PRODUCTION_SCALE',
        sourceTaskId: 'prod-task-1',
        sourceUnitId: 'file-check-1',
        assetId: 'asset-scale-1',
        assetDownloadUrl: null,
        shopId: 'shop-1',
        workerId: 'scaler-1',
        workerName: 'Nguyen Van Scale',
        contextSnapshot: {
          scaleDifficultyLevel: 'HARD',
          sku: 'SKU-PROD-01',
          externalOrderId: 'AMZ-ORDER-999',
        },
        basePoints: 2,
        finalPoints: 2,
        scoreLevel: 'HARD',
        status: 'ACTIVE',
        adjustments: [],
        version: 1,
        scoredAt: '2026-03-22T09:00:00Z',
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
  }),
  getWorkScoreSummary: vi.fn().mockResolvedValue({
    totalPoints: 2,
    totalFiles: 1,
    bySourceType: [{ _id: 'PRODUCTION_SCALE', totalPoints: 2, totalFiles: 1 }],
    byWorker: [{ _id: 'scaler-1', workerName: 'Nguyen Van Scale', totalPoints: 2, totalFiles: 1 }],
    byTaskType: [],
    byDifficulty: [{ _id: 'HARD', totalPoints: 2, totalFiles: 1 }],
  }),
  getWorkScore: vi.fn().mockResolvedValue({}),
  listWorkScoreRules: vi.fn().mockResolvedValue([]),
  overrideWorkScore: vi.fn().mockResolvedValue({}),
  upsertWorkScoreRule: vi.fn().mockResolvedValue({}),
  voidWorkScore: vi.fn().mockResolvedValue({}),
}))

import { ProductionScoresPage } from '@/features/portal/production/pages/ProductionScoresPage'
import i18n from '@/shared/i18n/i18n'
import { renderWithTestProviders } from '@/test/helpers/testProviders'

describe('ProductionScoresPage', () => {
  afterEach(cleanup)
  beforeEach(async () => {
    window.localStorage.setItem('lng.language', 'en')
    await i18n.changeLanguage('en')
  })

  it('renders summary metrics, top scalers leaderboard, and scale scores table', async () => {
    const view = renderWithTestProviders(<ProductionScoresPage />)
    expect(await view.findByText('Top Scalers:')).toBeVisible()
    expect((await view.findAllByText('Nguyen Van Scale')).length).toBeGreaterThanOrEqual(1)
    expect(view.getByText('SKU-PROD-01')).toBeVisible()
    expect(view.getByText('Scale files')).toBeVisible()
    expect(view.getByText('Scale points')).toBeVisible()
    expect(view.getByText('Hard')).toBeVisible()
  }, 15_000)
})
