import { beforeEach, expect, it, vi } from 'vitest'
import { apiClient } from '@/shared/api'
import {
  createLaunch,
  requestMockupAnalysis,
  uploadMockup,
} from '@/features/portal/catalog/listing-launch/api/listingLaunchApi'
vi.mock('@/shared/api', () => ({
  apiClient: { post: vi.fn(), get: vi.fn(), put: vi.fn(), patch: vi.fn() },
}))
beforeEach(() => vi.clearAllMocks())
it('creates a candidate and preserves analysis dispatch metadata', async () => {
  vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'launch-1' } })
  await createLaunch({ shopId: 'shop-1', marketplaceCode: 'AMAZON_US', brief: 'Cat' })
  expect(apiClient.post).toHaveBeenCalledWith(
    '/api/listing-launches',
    expect.objectContaining({ shopId: 'shop-1' }),
  )
  vi.mocked(apiClient.post).mockResolvedValue({
    success: true,
    data: { id: 'run-1' },
    replayed: true,
    dispatchWarning: 'queued',
  })
  expect(
    await requestMockupAnalysis('launch-1', { requestKey: 'key', expectedMockupRevision: 1 }),
  ).toMatchObject({ data: { id: 'run-1' }, replayed: true, dispatchWarning: 'queued' })
})
it('uploads multipart through the launch endpoint with both expected counters', async () => {
  vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'launch-1' } })
  await uploadMockup('launch-1', new File(['image'], 'cat.png', { type: 'image/png' }), {
    expectedMockupRevision: 1,
    expectedInputVersion: 2,
  })
  const [url, form] = vi.mocked(apiClient.post).mock.calls[0]
  expect(url).toBe('/api/listing-launches/launch-1/mockup')
  expect((form as FormData).get('expectedMockupRevision')).toBe('1')
  expect((form as FormData).get('expectedInputVersion')).toBe('2')
})
