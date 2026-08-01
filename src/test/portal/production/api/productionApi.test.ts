import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn() } }))

import {
  claimProductionTask,
  listProductionTasks,
  submitProductionQc,
} from '@/features/portal/production/api/productionApi'
import { apiClient } from '@/shared/api'

describe('productionApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })
  })

  it('uses the production queue and per-file QC contracts', async () => {
    const params = { page: 1, limit: 20, view: 'QC' as const }
    const fileDecisions = [{ fileCheckId: 'check-1', decision: 'PASSED' as const }]
    await listProductionTasks(params)
    await claimProductionTask('task-1')
    await submitProductionQc('task-1', fileDecisions)

    expect(apiClient.get).toHaveBeenCalledWith('/api/production/tasks', { params })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/production/tasks/task-1/claim')
    expect(apiClient.patch).toHaveBeenCalledWith('/api/production/tasks/task-1/qc', {
      fileDecisions,
    })
  })
})
