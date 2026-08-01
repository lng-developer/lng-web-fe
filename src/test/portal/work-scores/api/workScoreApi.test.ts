import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), patch: vi.fn() } }))

import {
  getWorkScore,
  getWorkScoreSummary,
  listWorkScores,
  overrideWorkScore,
  voidWorkScore,
} from '@/features/portal/work-scores/api/workScoreApi'
import { apiClient } from '@/shared/api'

describe('workScoreApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })
  })

  it('uses compact filters and versioned mutation contracts', async () => {
    await listWorkScores({ page: 1, limit: 20, sourceType: 'DESIGN_SUBMISSION', search: undefined })
    await getWorkScoreSummary({ sourceType: 'PRODUCTION_SCALE', workerId: undefined })
    await getWorkScore('score-1')
    await overrideWorkScore('score-1', {
      points: 3,
      scoreLevel: 'HARD',
      reason: 'Complex file',
      expectedVersion: 2,
    })
    await voidWorkScore('score-1', { reason: 'Duplicate file', expectedVersion: 3 })

    expect(apiClient.get).toHaveBeenCalledWith('/api/work-scores', {
      params: { page: 1, limit: 20, sourceType: 'DESIGN_SUBMISSION' },
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/work-scores/summary', {
      params: { sourceType: 'PRODUCTION_SCALE' },
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/work-scores/score-1')
    expect(apiClient.patch).toHaveBeenCalledWith('/api/work-scores/score-1/override', {
      points: 3,
      scoreLevel: 'HARD',
      reason: 'Complex file',
      expectedVersion: 2,
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/work-scores/score-1/void', {
      reason: 'Duplicate file',
      expectedVersion: 3,
    })
  })
})
