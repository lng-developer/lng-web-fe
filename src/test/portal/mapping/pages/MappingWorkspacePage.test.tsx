import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { App as AntdApp } from 'antd'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/mapping/api/mappingApi', () => ({ getMappingSummary: vi.fn() }))
vi.mock('@/features/portal/mapping/pages/MappingWorkbenchPage', () => ({
  MappingWorkbenchPage: () => <div>Workbench content</div>,
}))
vi.mock('@/features/portal/mapping/pages/MappingRulePage', () => ({
  MappingRulePage: ({ pageKey }: { pageKey: string }) => <div>{pageKey} rules</div>,
}))

import { getMappingSummary } from '@/features/portal/mapping/api/mappingApi'
import { MappingWorkspacePage } from '@/features/portal/mapping/pages/MappingWorkspacePage'
import i18n from '@/shared/i18n/i18n'

describe('MappingWorkspacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    void i18n.changeLanguage('en')
    vi.mocked(getMappingSummary).mockResolvedValue({
      readyPlanCount: 0,
      confirmedPlanCount: 0,
      totalPlanCount: 0,
      blockedSampleCount: 0,
      missingSkuConfigCount: 0,
      missingSemanticRuleCount: 0,
      missingVendorProductCount: 0,
      missingVendorCostCenterCount: 0,
      ambiguousSkuConfigCount: 0,
    })
  })

  it('keeps a visited tab mounted when switching to another mapping tab', async () => {
    const router = createMemoryRouter(
      [{ path: '/portal/mapping', element: <MappingWorkspacePage /> }],
      { initialEntries: ['/portal/mapping?tab=workbench'] },
    )
    render(
      <AntdApp>
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AntdApp>,
    )

    expect(await screen.findByText('Workbench content')).toBeInTheDocument()
    await screen.findByRole('tab', { name: 'Product mapping' }).then((tab) => tab.click())

    expect(await screen.findByText('product-mapping rules')).toBeInTheDocument()
    expect(screen.getByText('Workbench content')).toBeInTheDocument()
  })
})
