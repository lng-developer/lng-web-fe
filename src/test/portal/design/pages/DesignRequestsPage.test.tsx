import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { App } from 'antd'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('react-router-dom', () => ({ useRouteLoaderData: () => undefined }))

vi.mock('@/features/portal/design/api/designApi', () => ({
  listDesignRequests: vi.fn(),
  listDesignAssignees: vi.fn(),
  assignDesignRequest: vi.fn(),
  updateDesignRequestStatus: vi.fn(),
}))

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { listDesignAssignees, listDesignRequests } from '@/features/portal/design/api/designApi'
import { DesignRequestsPage } from '@/features/portal/design/pages/DesignRequestsPage'

const account = (permissions: string[]): CurrentAccount => ({
  account: { id: 'account-1', email: 'design@lng.co', mustChangePassword: false },
  roles: [],
  permissions,
  scopes: [],
  profileSetupRequired: false,
})

const renderPage = (currentAccount: CurrentAccount) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <App>
        <DesignRequestsPage account={currentAccount} />
      </App>
    </QueryClientProvider>,
  )

describe('DesignRequestsPage', () => {
  it('shows assignment controls only to request leaders', async () => {
    vi.mocked(listDesignRequests).mockResolvedValue([
      {
        id: 'request-1',
        orderId: 'order-1',
        orderItemId: 'item-1',
        shopId: 'shop-1',
        requestType: 'PSD_TEMPLATE',
        status: 'PENDING_ASSIGNMENT',
        requestedByAccountId: 'seller-1',
        assignedDesignerAccountId: null,
        note: null,
        listingSnapshot: {
          sku: 'SKU-1',
          title: 'Listing one',
          listingId: 'listing-1',
          listingVariantId: null,
        },
        createdAt: null,
        updatedAt: null,
      },
    ])
    vi.mocked(listDesignAssignees).mockResolvedValue([{ id: 'designer-1', fullName: 'Designer' }])

    renderPage(account(['DESIGN:REQUEST_READ', 'DESIGN:REQUEST_ASSIGN']))

    expect(await screen.findByText('SKU-1')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'portal.design.requests.assign' }),
    ).toBeInTheDocument()
  })

  it('shows only the returned assigned work and its status action to a designer', async () => {
    vi.mocked(listDesignRequests).mockResolvedValue([
      {
        id: 'request-2',
        orderId: 'order-2',
        orderItemId: 'item-2',
        shopId: 'shop-1',
        requestType: 'PSD_TEMPLATE',
        status: 'ASSIGNED',
        requestedByAccountId: 'seller-1',
        assignedDesignerAccountId: 'account-1',
        note: null,
        listingSnapshot: {
          sku: 'SKU-2',
          title: 'Listing two',
          listingId: 'listing-2',
          listingVariantId: null,
        },
        createdAt: null,
        updatedAt: null,
      },
    ])
    vi.mocked(listDesignAssignees).mockResolvedValue([])

    renderPage(account(['DESIGN:REQUEST_READ', 'DESIGN:REQUEST_WORK']))

    expect(await screen.findByText('SKU-2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'portal.design.requests.start' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'portal.design.requests.assign' }),
    ).not.toBeInTheDocument()
  })
})
