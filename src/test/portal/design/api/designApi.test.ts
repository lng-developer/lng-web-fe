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
  formatTaskSeller,
  getTaskSellerIdentity,
  getDesignSummary,
  getDesignWorkload,
  listDesignSubmissions,
  listDesignTasks,
  listPsdFiles,
  parseEmployeeCodeFromSku,
  rejectDesignTask,
  reopenDesignTask,
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
    await reopenDesignTask('task-1', 'Customer changed wording')
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
    expect(apiClient.patch).toHaveBeenCalledWith('/api/design/tasks/task-1/reopen', {
      reason: 'Customer changed wording',
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

  it.each([
    ['B0HFM6K1GX.psd', 'image/vnd.adobe.photoshop'],
    ['B0HDSZDZCB.rar', 'application/octet-stream'],
  ])('routes %s files to Wasabi multipart upload', async (filename, mimeType) => {
    vi.mocked(uploadMultipartAsset).mockResolvedValue({
      id: 'wasabi-asset-1',
      uploadStatus: 'READY',
    })

    const file = new File(['mock content'], filename, { type: mimeType })
    const result = await uploadDesignAsset(file)

    expect(uploadMultipartAsset).toHaveBeenCalledWith(file, {
      assetPurpose: 'PSD_TEMPLATE',
      onProgress: undefined,
      signal: undefined,
    })
    expect(result).toEqual({
      id: 'wasabi-asset-1',
      originalFilename: filename,
      mimeType,
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

  it('correctly parses seller employee code from SKU', () => {
    expect(parseEmployeeCodeFromSku('J001-CANVAS-01')).toBe('J001')
    expect(parseEmployeeCodeFromSku('j1234_mug')).toBe('J1234')
    expect(parseEmployeeCodeFromSku('J567')).toBe('J567')
    expect(parseEmployeeCodeFromSku('NON-MATCHING-SKU')).toBeNull()
    expect(parseEmployeeCodeFromSku(null)).toBeNull()
  })

  it('formats task seller accurately based on seller, listing, and SKU fallbacks', () => {
    // 1. Full seller with name and employee code
    expect(
      formatTaskSeller({
        id: '1',
        taskType: 'PSD_TEMPLATE',
        status: 'REQUESTED',
        priority: 'NORMAL',
        listing: {
          sku: 'J001-TEST',
          title: 'Test',
          psdStatus: null,
          productTypeName: null,
          seller: { name: 'Nguyen Van A', employeeCode: 'J001' },
        },
        listingVariantId: null,
        internalTemplate: null,
        targetListingId: null,
        assignedDesignerId: null,
        assignedDesigner: null,
        shop: { id: 'shop-1', name: 'US Shop' },
        brief: null,
        expectedOutputs: [],
        referenceAssetCount: 0,
        latestSubmission: null,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      }),
    ).toBe('Nguyen Van A (J001)')

    // 2. Seller on task object
    expect(
      formatTaskSeller({
        id: '2',
        taskType: 'PSD_TEMPLATE',
        status: 'REQUESTED',
        priority: 'NORMAL',
        listing: null,
        listingVariantId: null,
        internalTemplate: null,
        targetListingId: null,
        assignedDesignerId: null,
        assignedDesigner: null,
        shop: { id: 'shop-1', name: 'US Shop' },
        brief: null,
        expectedOutputs: [],
        referenceAssetCount: 0,
        latestSubmission: null,
        seller: { fullName: 'Tran Van B', employeeCode: 'J002' },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      }),
    ).toBe('Tran Van B (J002)')

    // 3. Fallback to SKU regex when seller profile is not yet loaded
    expect(
      formatTaskSeller({
        id: '3',
        taskType: 'PSD_TEMPLATE',
        status: 'REQUESTED',
        priority: 'NORMAL',
        listing: {
          sku: 'J999-POSTER-01',
          title: 'Poster',
          psdStatus: null,
          productTypeName: null,
        },
        listingVariantId: null,
        internalTemplate: null,
        targetListingId: null,
        assignedDesignerId: null,
        assignedDesigner: null,
        shop: { id: 'shop-1', name: 'US Shop' },
        brief: null,
        expectedOutputs: [],
        referenceAssetCount: 0,
        latestSubmission: null,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      }),
    ).toBe('J999')

    // 4. Listing seller matching SKU code
    expect(
      formatTaskSeller({
        id: '4',
        taskType: 'PSD_TEMPLATE',
        status: 'APPROVED',
        priority: 'NORMAL',
        listing: {
          sku: 'J2608-ACO-080926-1972',
          title: 'Ornament',
          psdStatus: null,
          productTypeName: null,
          seller: { name: 'yennth', employeeCode: 'J2608' },
        },
        listingVariantId: null,
        internalTemplate: null,
        targetListingId: null,
        assignedDesignerId: null,
        assignedDesigner: null,
        shop: { id: 'shop-1', name: 'US Shop' },
        brief: null,
        expectedOutputs: [],
        referenceAssetCount: 0,
        latestSubmission: null,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      }),
    ).toBe('yennth (J2608)')

    // 5. When listing has mismatched requester (J2504) for SKU J2608, do not show wrong requester
    expect(
      formatTaskSeller({
        id: '5',
        taskType: 'PSD_TEMPLATE',
        status: 'APPROVED',
        priority: 'NORMAL',
        listing: {
          sku: 'J2608-ACO-080926-1972',
          title: 'Ornament',
          psdStatus: null,
          productTypeName: null,
          seller: { name: 'Nguyễn Đức Sơn', employeeCode: 'J2504' },
        },
        listingVariantId: null,
        internalTemplate: null,
        targetListingId: null,
        assignedDesignerId: null,
        assignedDesigner: null,
        shop: { id: 'shop-1', name: 'US Shop' },
        brief: null,
        expectedOutputs: [],
        referenceAssetCount: 0,
        latestSubmission: null,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      }),
    ).toBe('J2608')
  })

  it('extracts task seller identity for EmployeeIdentity rendering', () => {
    const identity = getTaskSellerIdentity({
      id: 'task-seller-identity',
      taskType: 'PSD_TEMPLATE',
      status: 'APPROVED',
      priority: 'NORMAL',
      listing: {
        sku: 'J2504-SHIRT-01',
        title: 'Shirt',
        psdStatus: null,
        productTypeName: null,
        seller: { name: 'Nguyễn Đức Sơn', employeeCode: 'J2504' },
      },
      listingVariantId: null,
      internalTemplate: null,
      targetListingId: null,
      assignedDesignerId: null,
      assignedDesigner: null,
      shop: { id: 'shop-1', name: 'US Shop' },
      brief: null,
      expectedOutputs: [],
      referenceAssetCount: 0,
      latestSubmission: null,
      seller: {
        id: 'seller-id',
        name: 'Nguyễn Đức Sơn',
        fullName: 'Nguyễn Đức Sơn',
        employeeCode: 'J2504',
        avatarUrl: 'https://cdn.example.com/son.png',
      },
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    })

    expect(identity).toEqual({
      name: 'Nguyễn Đức Sơn',
      employeeCode: 'J2504',
      avatarUrl: 'https://cdn.example.com/son.png',
    })
  })
})
