import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))

import {
  approveDesignTask,
  assignDesignTask,
  listDesignTasks,
  rejectDesignTask,
  startDesignTask,
  submitDesignTask,
} from '@/features/portal/design/api/designApi'
import { apiClient } from '@/shared/api'

describe('designApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })
  })

  it('uses the Design lifecycle contracts', async () => {
    await listDesignTasks({ page: 1, limit: 20, status: 'SUBMITTED' })
    await assignDesignTask('task-1', 'designer-1')
    await startDesignTask('task-1')
    await submitDesignTask('task-1', ['asset-1'], 'Ready')
    await approveDesignTask('task-1', 'asset-1')
    await rejectDesignTask('task-1', 'Wrong size')

    expect(apiClient.get).toHaveBeenCalledWith('/api/design/tasks', {
      params: { page: 1, limit: 20, status: 'SUBMITTED' },
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/design/tasks/task-1/assign', {
      assignedDesignerId: 'designer-1',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/design/tasks/task-1/start', {})
    expect(apiClient.patch).toHaveBeenCalledWith('/api/design/tasks/task-1/submit', {
      submittedAssetIds: ['asset-1'],
      note: 'Ready',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/design/tasks/task-1/approve', {
      approvedAssetId: 'asset-1',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/design/tasks/task-1/reject', {
      rejectReason: 'Wrong size',
    })
  })
})
