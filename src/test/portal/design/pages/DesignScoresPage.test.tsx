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
    permissions: ['DESIGN:READ', 'DESIGN:REVIEW'],
    scopes: [],
  }),
}))

vi.mock('@/features/portal/design/api/designApi', () => ({
  listDesignScores: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'score-1',
        taskId: 'task-1',
        submissionId: 'sub-1',
        assetId: 'asset-1',
        designerId: 'designer-1',
        designerName: 'Bob Artist',
        designerTeam: 'Alpha Team',
        designerDepartment: 'Design Dept',
        shopId: 'shop-1',
        shopName: 'PrintHub',
        taskType: 'PSD_TEMPLATE',
        priority: 'NORMAL',
        basePoints: 3,
        finalPoints: 3,
        scoreLevel: 'STANDARD',
        status: 'ACTIVE',
        scoredAt: '2026-03-22T08:00:00Z',
        approvedAsset: null,
        overrideReason: null,
        voidReason: null,
        version: 1,
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
  }),
  getDesignScoreSummary: vi.fn().mockResolvedValue({
    total: 1,
    totalPoints: 3,
    totalFiles: 1,
    byTaskType: [{ _id: 'PSD_TEMPLATE', totalPoints: 3, totalFiles: 1 }],
    byDesigner: [{ _id: 'designer-1', designerName: 'Bob Artist', totalPoints: 3, totalFiles: 1 }],
  }),
  listDesignAssignees: vi.fn().mockResolvedValue([
    {
      id: 'designer-1',
      fullName: 'Bob Artist',
      avatarUrl: null,
      activeTaskCount: 1,
    },
  ]),
  overrideDesignScore: vi.fn().mockResolvedValue({}),
  voidDesignScore: vi.fn().mockResolvedValue({}),
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
    await view.findByText('Top designers:')
    expect(await view.findByText('PrintHub')).toBeVisible()
    expect(view.getAllByText('Bob Artist').length).toBeGreaterThan(0)
    expect(view.getByText('Total points')).toBeVisible()
  }, 15_000)
})
