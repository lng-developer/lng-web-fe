import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn() } }))

import {
  assignCsTask,
  assignProductionTask,
  bulkAssignProductionTasks,
  claimProductionTask,
  exportProductionQcTasks,
  listCsAssignees,
  listProductionTasks,
  listScaleAssignees,
  recheckPsdBlockedTasks,
  submitProductionQc,
  summarizeProductionTasks,
  updateProductionCsNote,
  updateProductionCsStatus,
  uploadManualScaledOutput,
} from '@/features/portal/production/api/productionApi'
import { apiClient } from '@/shared/api'

describe('productionApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], total: 0, page: 1, limit: 20 },
    })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
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

  it('uses assignment and bulk operation contracts', async () => {
    await listScaleAssignees({ search: 'J25', limit: 20 })
    await listCsAssignees({ limit: 20 })
    await assignProductionTask('task-1', 'user-1', 'Priority')
    await assignCsTask('task-1', 'cs-1', 'Check address')
    await bulkAssignProductionTasks(['task-1', 'task-2'], 'user-1')
    await recheckPsdBlockedTasks({ limit: 50 })

    expect(apiClient.get).toHaveBeenCalledWith('/api/production/tasks/scale-assignees', {
      params: { search: 'J25', limit: 20 },
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/production/tasks/cs-assignees', {
      params: { limit: 20 },
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/production/tasks/task-1/assign', {
      assignedDesignUserId: 'user-1',
      designNote: 'Priority',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/production/tasks/task-1/assign-cs', {
      csAssigneeId: 'cs-1',
      csNote: 'Check address',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/production/tasks/bulk-assign', {
      taskIds: ['task-1', 'task-2'],
      assignedDesignUserId: 'user-1',
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/production/tasks/recheck-psd-blocked', {
      limit: 50,
    })
  })

  it('uses CS workflow and QC export contracts', async () => {
    await updateProductionCsNote('task-1', 'Confirm the customer address')
    await updateProductionCsStatus('task-1', 'IN_PROGRESS')
    await exportProductionQcTasks({ search: 'ORDER-1', status: 'QC_PENDING' })

    expect(apiClient.patch).toHaveBeenCalledWith('/api/production/tasks/task-1/cs-note', {
      csNote: 'Confirm the customer address',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/production/tasks/task-1/cs-status', {
      csStatus: 'IN_PROGRESS',
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/production/tasks/qc/export', {
      params: { search: 'ORDER-1', status: 'QC_PENDING' },
      responseType: 'blob',
    })
  })

  it('normalizes backend production list and summary field names', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'task-1',
              productionStatus: 'QC_PENDING',
              shopId: 'shop-1',
              shopName: 'Football US Shop',
              createdAt: '2026-08-01T00:00:00.000Z',
              qcPreviewFileChecks: [{ id: 'check-1', outputRequired: true }],
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        },
      })
      .mockResolvedValueOnce({ data: { total: 1, readyToSendVendor: 1 } })

    const list = await listProductionTasks({ page: 1, limit: 20 })
    const summary = await summarizeProductionTasks({})

    expect(list.items[0]).toMatchObject({
      id: 'task-1',
      status: 'QC_PENDING',
      shop: { id: 'shop-1', name: 'Football US Shop' },
      updatedAt: '2026-08-01T00:00:00.000Z',
      qcPreviewFileChecks: [{ id: 'check-1', required: true }],
    })
    expect(summary).toMatchObject({ total: 1, ready: 1 })
  })

  it('uploads a manual scaled slot with its metadata', async () => {
    const file = new File(['scaled'], 'left-sleeve.png', { type: 'image/png' })

    await uploadManualScaledOutput('task-1', {
      file,
      slotKey: 'LEFT_SLEEVE',
      slotLabel: 'Left sleeve',
    })

    const body = vi.mocked(apiClient.post).mock.calls[0][1] as FormData
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/production/tasks/task-1/file-checks/manual/scaled-output-file',
      expect.any(FormData),
    )
    expect(body.get('slotKey')).toBe('LEFT_SLEEVE')
    expect(body.get('slotLabel')).toBe('Left sleeve')
    expect(body.get('file')).toBe(file)
  })
})
