import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))

import {
  approveDesignTask,
  assignDesignTask,
  bulkCreatePsdTasks,
  cancelDesignTask,
  createDesignTask,
  createPsdTaskFromListing,
  getDesignSummary,
  getDesignWorkload,
  listDesignSubmissions,
  listDesignTasks,
  listPsdCandidates,
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
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
  })

  it('uses the Design lifecycle contracts', async () => {
    await listDesignTasks({ page: 1, limit: 20, status: 'SUBMITTED' })
    await assignDesignTask('task-1', 'designer-1')
    await startDesignTask('task-1')
    await submitDesignTask('task-1', ['asset-1'], 'Ready')
    await approveDesignTask('task-1', 'asset-1')
    await rejectDesignTask('task-1', 'Wrong size')
    await getDesignSummary({ status: 'OPEN' })
    await getDesignWorkload({ taskType: 'PSD_TEMPLATE' })
    await listPsdCandidates({ page: 1, limit: 20, search: 'SKU' })
    await createPsdTaskFromListing('listing-1', 'Create PSD')
    await createDesignTask({
      listingId: 'listing-1',
      taskType: 'IDEA',
      priority: 'HIGH',
      brief: 'Create a graduation concept',
      note: 'Use references',
      referenceAssetIds: ['asset-1'],
      expectedOutputs: ['MOCKUP', 'PNG_ASSET'],
    })
    await bulkCreatePsdTasks({ listingIds: ['listing-1'] })
    await listDesignSubmissions('task-1')
    await cancelDesignTask('task-1', 'Duplicate')

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
    expect(apiClient.get).toHaveBeenCalledWith('/api/design/tasks/summary', {
      params: { status: 'OPEN' },
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/design/tasks/workload', {
      params: { taskType: 'PSD_TEMPLATE' },
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/design/tasks/psd-template/candidates', {
      params: { page: 1, limit: 20, search: 'SKU' },
    })
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/design/tasks/from-listings/listing-1/psd-template',
      { note: 'Create PSD' },
    )
    expect(apiClient.post).toHaveBeenCalledWith('/api/design/tasks', {
      listingId: 'listing-1',
      taskType: 'IDEA',
      priority: 'HIGH',
      brief: 'Create a graduation concept',
      note: 'Use references',
      referenceAssetIds: ['asset-1'],
      expectedOutputs: ['MOCKUP', 'PNG_ASSET'],
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/design/tasks/bulk-create-psd-from-listings', {
      listingIds: ['listing-1'],
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/design/tasks/task-1/submissions')
    expect(apiClient.patch).toHaveBeenCalledWith('/api/design/tasks/task-1/cancel', {
      cancelReason: 'Duplicate',
    })
  })
})
