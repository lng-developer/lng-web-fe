import { describe, expect, it } from 'vitest'

import source from '@/features/portal/orders/pages/OrderWorkbenchPage.tsx?raw'

describe('Order workbench tab loading', () => {
  it('uses deferred search and keeps previous rows while filtering', () => {
    expect(source).toContain('useDeferredValue(search)')
    expect(source).toContain('placeholderData: keepPreviousData')
    expect(source).toContain('loading={orders.isFetching}')
    expect(source).toContain('dataSource={orders.data?.items ?? []}')
  })
  it('keeps row actions and expansion attached to the same query contract', () => {
    expect(source).toContain('OrderWorkbenchExpandedRow')
    expect(source).toContain('OrderWorkbenchFilterBar')
    expect(source).toContain('expandedRowKeys')
    expect(source).toContain('showExpandColumn: false')
  })
})
