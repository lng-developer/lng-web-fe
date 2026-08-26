import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import {
  getWorkScore,
  listWorkScoreRules,
  overrideWorkScore,
  upsertWorkScoreRule,
} from '@/features/portal/work-scores/api/workScoreApi'
import { WorkScoreWorkbenchPage } from '@/features/portal/work-scores/pages/WorkScoreWorkbenchPage'
import { ApiError } from '@/shared/api/apiError'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => ({
    permissions: ['WORK_SCORES:READ', 'WORK_SCORES:ADJUST'],
    scopes: [],
  }),
}))
vi.mock('@/features/portal/work-scores/api/workScoreApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/work-scores/api/workScoreApi')>()),
  listWorkScores: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'score-1',
        sourceType: 'PRODUCTION_SCALE',
        sourceTaskId: 'task-1',
        sourceUnitId: 'slot-1',
        assetId: 'asset-1',
        assetDownloadUrl: null,
        shopId: 'shop-1',
        workerId: 'worker-1',
        workerName: 'Nguyen Van An',
        contextSnapshot: { externalOrderId: 'ORDER-1', slotLabel: 'Front' },
        basePoints: 1,
        finalPoints: 1,
        scoreLevel: 'STANDARD',
        status: 'ACTIVE',
        adjustments: [],
        version: 2,
        scoredAt: '2026-08-01T00:00:00Z',
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
  }),
  getWorkScoreSummary: vi.fn().mockResolvedValue({
    totalFiles: 1,
    totalPoints: 1,
    bySourceType: [{ _id: 'PRODUCTION_SCALE', totalFiles: 1, totalPoints: 1 }],
    byWorker: [],
    byTaskType: [],
  }),
  getWorkScore: vi.fn().mockResolvedValue({}),
  listWorkScoreRules: vi.fn().mockResolvedValue([]),
  overrideWorkScore: vi.fn().mockResolvedValue({}),
  upsertWorkScoreRule: vi.fn().mockResolvedValue({}),
  voidWorkScore: vi.fn().mockResolvedValue({}),
}))

describe('WorkScoreWorkbenchPage', () => {
  afterEach(cleanup)
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listWorkScoreRules).mockResolvedValue([])
    vi.mocked(upsertWorkScoreRule).mockResolvedValue({} as never)
    queryClient.clear()
    i18n.changeLanguage('en')
  })

  it('renders Scale rows and keeps quick actions in one overlay', async () => {
    render(
      <AppProviders>
        <WorkScoreWorkbenchPage />
      </AppProviders>,
    )
    expect(await screen.findByText('ORDER-1')).toBeVisible()
    expect(screen.getByText('Nguyen Van An')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Override score' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  }, 30_000)

  it('submits the current version with an override reason', async () => {
    render(
      <AppProviders>
        <WorkScoreWorkbenchPage />
      </AppProviders>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Override score' }))
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Complex output' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() =>
      expect(overrideWorkScore).toHaveBeenCalledWith(
        'score-1',
        expect.objectContaining({
          reason: 'Complex output',
          expectedVersion: 2,
        }),
      ),
    )
  }, 15_000)

  it('refreshes a conflicting score version without clearing the reason', async () => {
    vi.mocked(overrideWorkScore)
      .mockRejectedValueOnce(new ApiError('Score changed', { status: 409 }))
      .mockResolvedValueOnce({} as never)
    vi.mocked(getWorkScore).mockResolvedValueOnce({
      id: 'score-1',
      finalPoints: 2,
      scoreLevel: 'HARD',
      version: 3,
    } as never)
    render(
      <AppProviders>
        <WorkScoreWorkbenchPage />
      </AppProviders>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Override score' }))
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Keep this reason' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(getWorkScore).toHaveBeenCalledWith('score-1'))
    expect(screen.getByLabelText('Reason')).toHaveValue('Keep this reason')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() =>
      expect(overrideWorkScore).toHaveBeenLastCalledWith(
        'score-1',
        expect.objectContaining({ expectedVersion: 3, reason: 'Keep this reason' }),
      ),
    )
  }, 15_000)

  it('renders Vietnamese labels', async () => {
    await i18n.changeLanguage('vi')
    render(
      <AppProviders>
        <WorkScoreWorkbenchPage />
      </AppProviders>,
    )
    expect(await screen.findByText('Tổng điểm')).toBeVisible()
  }, 15_000)

  it('shows priority in Design rule setup and no obsolete slot field', async () => {
    render(
      <AppProviders>
        <WorkScoreWorkbenchPage />
      </AppProviders>,
    )

    expect(await screen.findByLabelText('Priority')).toBeVisible()
    expect(screen.queryByLabelText('Slot key')).not.toBeInTheDocument()
  }, 15_000)
})
