import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  uploadApiClient: { post: vi.fn() },
}))
vi.mock('@/shared/media', () => ({
  uploadMultipartAsset: vi.fn(),
}))

import {
  approveDesignTask,
  assignDesignTask,
  bulkAssignDesignTasks,
  cancelDesignTask,
  createDesignTask,
  getDesignSummary,
  getDesignWorkload,
  listDesignSubmissions,
  listDesignTasks,
  listPsdFiles,
  rejectDesignTask,
  startDesignTask,
  submitDesignTask,
  updateDesignTaskPriority,
  uploadDesignAsset,
} from '@/features/portal/design/api/designApi'
import { apiClient, uploadApiClient } from '@/shared/api'
import { uploadMultipartAsset } from '@/shared/media'

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
    await updateDesignTaskPriority('task-1', 'URGENT')
    await bulkAssignDesignTasks(['task-1', 'task-2'], 'designer-1')
    await startDesignTask('task-1')
    await submitDesignTask('task-1', ['asset-1'], 'Ready')
    await approveDesignTask('task-1', 'asset-1')
    await rejectDesignTask('task-1', 'Wrong size')
    await getDesignSummary({ status: 'OPEN' })
    await getDesignWorkload({ taskType: 'PSD_TEMPLATE' })
    await listPsdFiles({
      page: 1,
      limit: 20,
      search: 'flower',
      role: 'APPROVED',
      taskStatus: 'APPROVED',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    })
    await createDesignTask({
      listingId: 'listing-1',
      taskType: 'IDEA',
      priority: 'HIGH',
      brief: 'Create a graduation concept',
      note: 'Use references',
      referenceAssetIds: ['asset-1'],
      expectedOutputs: ['MOCKUP', 'PNG_ASSET'],
    })
    await listDesignSubmissions('task-1')
    await cancelDesignTask('task-1', 'Duplicate')

    expect(apiClient.get).toHaveBeenCalledWith('/api/design/tasks', {
      params: { page: 1, limit: 20, status: 'SUBMITTED' },
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/design/tasks/task-1/assign', {
      assignedDesignerId: 'designer-1',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/design/tasks/task-1/priority', {
      priority: 'URGENT',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/design/tasks/bulk-assign', {
      taskIds: ['task-1', 'task-2'],
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
    expect(apiClient.get).toHaveBeenCalledWith('/api/design/psd-files', {
      params: {
        page: 1,
        limit: 20,
        search: 'flower',
        role: 'APPROVED',
        taskStatus: 'APPROVED',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
      },
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/design/tasks', {
      listingId: 'listing-1',
      taskType: 'IDEA',
      priority: 'HIGH',
      brief: 'Create a graduation concept',
      note: 'Use references',
      referenceAssetIds: ['asset-1'],
      expectedOutputs: ['MOCKUP', 'PNG_ASSET'],
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/design/tasks/task-1/submissions')
    expect(apiClient.patch).toHaveBeenCalledWith('/api/design/tasks/task-1/cancel', {
      cancelReason: 'Duplicate',
    })
  })

  it('routes PSD files to Wasabi multipart upload', async () => {
    vi.mocked(uploadMultipartAsset).mockResolvedValue({
      id: 'wasabi-asset-1',
      uploadStatus: 'READY',
    })

    const file = new File(['mock content'], 'B0HFM6K1GX.psd', { type: 'image/vnd.adobe.photoshop' })
    const result = await uploadDesignAsset(file)

    expect(uploadMultipartAsset).toHaveBeenCalledWith(file, {
      assetPurpose: 'PSD_TEMPLATE',
      onProgress: undefined,
      signal: undefined,
    })
    expect(result).toEqual({
      id: 'wasabi-asset-1',
      originalFilename: 'B0HFM6K1GX.psd',
      mimeType: 'image/vnd.adobe.photoshop',
      size: file.size,
      downloadUrl: '/api/media/assets/wasabi-asset-1/download',
    })
  })

  it('routes non-PSD files to uploadApiClient', async () => {
    vi.mocked(uploadApiClient.post).mockResolvedValue({
      data: {
        id: 'direct-asset-1',
        originalFilename: 'preview.png',
        mimeType: 'image/png',
        size: 1024,
        downloadUrl: '/api/media/assets/direct-asset-1/download',
      },
    })

    const file = new File(['mock png'], 'preview.png', { type: 'image/png' })
    const result = await uploadDesignAsset(file)

    expect(uploadApiClient.post).toHaveBeenCalledWith('/api/design/assets', expect.any(FormData))
    expect(result.id).toBe('direct-asset-1')
  })
})
