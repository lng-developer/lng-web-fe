import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/common/CoreDataTable', async () => ({
  CoreDataTable: (await import('@/test/mocks/CoreDataTable')).CoreDataTable,
}))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => ({
    id: 'acc-1',
    email: 'lead@lng.local',
    fullName: 'Design Lead',
    status: 'ACTIVE',
    permissions: ['DESIGN:READ', 'DESIGN:WORK', 'DESIGN:REVIEW', 'WORK_SCORES:READ'],
    scopes: [],
  }),
}))

vi.mock('@/features/portal/work-scores/api/workScoreApi', () => ({
  listWorkScores: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'score-1',
        sourceType: 'DESIGN_SUBMISSION',
        sourceTaskId: 'task-1',
        sourceUnitId: 'sub-1',
        assetId: 'asset-1',
        assetDownloadUrl: null,
        shopId: 'shop-1',
        workerId: 'designer-1',
        workerName: 'Bob Artist',
        contextSnapshot: {
          taskType: 'PSD_TEMPLATE',
          sku: 'SKU-DESIGN-01',
          taskTitle: 'Front Design Template',
        },
        basePoints: 3,
        finalPoints: 3,
        scoreLevel: 'STANDARD',
        status: 'ACTIVE',
        adjustments: [],
        version: 1,
        scoredAt: '2026-03-22T08:00:00Z',
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
  }),
  getWorkScoreSummary: vi.fn().mockResolvedValue({
    totalPoints: 3,
    totalFiles: 1,
    bySourceType: [{ _id: 'DESIGN_SUBMISSION', totalPoints: 3, totalFiles: 1 }],
    byWorker: [{ _id: 'designer-1', workerName: 'Bob Artist', totalPoints: 3, totalFiles: 1 }],
    byTaskType: [{ _id: 'PSD_TEMPLATE', totalPoints: 3, totalFiles: 1 }],
  }),
  getWorkScore: vi.fn().mockResolvedValue({}),
  listWorkScoreRules: vi.fn().mockResolvedValue([]),
  overrideWorkScore: vi.fn().mockResolvedValue({}),
  upsertWorkScoreRule: vi.fn().mockResolvedValue({}),
  voidWorkScore: vi.fn().mockResolvedValue({}),
}))

import { DesignScoresPage } from '@/features/portal/design/pages/DesignScoresPage'
import i18n from '@/shared/i18n/i18n'
import { renderWithTestProviders } from '@/test/helpers/testProviders'

describe('DesignScoresPage', () => {
  afterEach(cleanup)
  beforeEach(async () => {
    window.localStorage.setItem('lng.language', 'en')
    await i18n.changeLanguage('en')
  })

  it('renders summary metrics, top designer leaderboard, and scores table', async () => {
    const view = renderWithTestProviders(<DesignScoresPage />)
    expect(await view.findByText('Top Designers:')).toBeVisible()
    expect((await view.findAllByText('Bob Artist')).length).toBeGreaterThanOrEqual(1)
    expect(view.getByText('SKU-DESIGN-01')).toBeVisible()
    expect(view.getByText('Design files')).toBeVisible()
    expect(view.getByText('Design points')).toBeVisible()
  }, 15_000)
})
