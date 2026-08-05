import { describe, expect, it } from 'vitest'

import source from '@/features/portal/orders/pages/OrderWorkbenchPage.tsx?raw'

describe('Order workbench tab loading', () => {
  it('renders current rows immediately and defers only their expanded detail', () => {
    expect(source).not.toContain('keepPreviousData')
    expect(source).toContain('loading={orders.isFetching}')
    expect(source).toContain('dataSource={orders.data?.items ?? []}')
    expect(source).not.toContain('useDeferredValue')
    expect(source).toContain('new IntersectionObserver')
    expect(source).toContain("rootMargin: '600px 0px'")
  })
})
