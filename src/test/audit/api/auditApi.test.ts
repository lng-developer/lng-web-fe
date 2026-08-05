import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAuditEvent, listAuditEvents } from '@/features/audit/api/auditApi'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn() } }))

describe('auditApi', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockResolvedValue({
      success: true,
      data: { items: [], nextCursor: null },
    })
  })

  it('passes supported filters and cursor to the backend', async () => {
    await listAuditEvents({ action: 'ORDER.UPDATED', outcome: 'SUCCEEDED' }, 'next-page')

    expect(apiClient.get).toHaveBeenCalledWith('/api/audit/events', {
      params: {
        action: 'ORDER.UPDATED',
        outcome: 'SUCCEEDED',
        cursor: 'next-page',
        limit: 50,
      },
    })
  })

  it('loads the complete audit event when an operator opens a row', async () => {
    await getAuditEvent('event-1')

    expect(apiClient.get).toHaveBeenCalledWith('/api/audit/events/event-1')
  })
})
