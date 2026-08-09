import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { listMappingRuleHistory } from '@/features/portal/mapping/api/mappingApi'
import { RuleHistoryModal } from '@/features/portal/mapping/components/RuleHistoryModal'
import i18n from '@/shared/i18n/i18n'

vi.mock('@/features/portal/mapping/api/mappingApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/mapping/api/mappingApi')>()),
  listMappingRuleHistory: vi.fn(),
}))

describe('RuleHistoryModal', () => {
  afterEach(cleanup)
  beforeEach(() => void i18n.changeLanguage('en'))

  it('shows only fields changed between the safe audit snapshots', async () => {
    vi.mocked(listMappingRuleHistory).mockResolvedValue([
      {
        id: 'audit-1',
        event: 'UPDATED',
        before: { appliesWhenValues: ['J2501'], priority: 100 },
        after: { appliesWhenValues: ['J2522'], priority: 100 },
        createdAt: '2026-08-09T07:44:18.699Z',
      },
    ])

    render(
      <QueryClientProvider client={new QueryClient()}>
        <RuleHistoryModal id="rule-1" open type="skuNormalize" onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('appliesWhenValues')).toBeInTheDocument()
    expect(screen.getByText('["J2501"]')).toBeInTheDocument()
    expect(screen.getByText('["J2522"]')).toBeInTheDocument()
    expect(screen.queryByText('priority')).not.toBeInTheDocument()
  })
})
