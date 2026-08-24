import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { CurrentAccount, ScopedAccess } from '@/features/auth/api/authApi'
import { createShop, listShops, updateShopStatus } from '@/features/portal/shops/api/shopApi'
import { ShopWorkspacePage } from '@/features/portal/shops/pages/ShopWorkspacePage'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/portal/shops/api/shopApi', () => ({
  createShop: vi.fn(),
  listShops: vi.fn(),
  updateShopStatus: vi.fn(),
}))

const shop = {
  id: 'shop-1',
  name: 'Football US',
  currency: 'USD',
  status: 'ACTIVE' as const,
  createdAt: '2026-07-31T00:00:00.000Z',
  updatedAt: '2026-07-31T00:00:00.000Z',
}

const secondShop = { ...shop, id: 'shop-2', name: 'Pet Shop' }

const account = (permissions: string[], scopes: ScopedAccess[] = []): CurrentAccount => ({
  account: { id: 'account-1', email: 'user@lng.co', mustChangePassword: false },
  roles: [],
  permissions,
  scopes,
  profileSetupRequired: false,
})

const globalWriter = account(['SHOPS:READ', 'SHOPS:WRITE'])

function LocationProbe() {
  return <output aria-label="location">{useLocation().search}</output>
}

function renderPage(
  initialEntry = '/portal/shops?page=1',
  currentAccount: CurrentAccount = globalWriter,
) {
  const router = createMemoryRouter(
    [
      {
        id: 'workspace',
        path: '/portal/shops',
        HydrateFallback: () => null,
        loader: () => currentAccount,
        element: (
          <>
            <ShopWorkspacePage />
            <LocationProbe />
          </>
        ),
      },
    ],
    { initialEntries: [initialEntry] },
  )
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

describe('ShopWorkspacePage', () => {
  beforeEach(async () => {
    vi.useRealTimers()
    queryClient.clear()
    await i18n.changeLanguage('en')
    vi.mocked(listShops).mockResolvedValue({
      items: [shop],
      pagination: { total: 1, page: 1, limit: 20 },
    })
    vi.mocked(createShop).mockResolvedValue(shop)
    vi.mocked(updateShopStatus).mockResolvedValue(shop)
  })

  afterEach(() => {
    cleanup()
    queryClient.clear()
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('waits 200 ms before searching and resets the URL page', async () => {
    renderPage('/portal/shops?page=2&status=ACTIVE')

    await waitFor(() =>
      expect(listShops).toHaveBeenCalledWith({ page: 2, limit: 20, status: 'ACTIVE' }),
    )
    expect(await screen.findByText('Football US', {}, { timeout: 5_000 })).toBeVisible()
    vi.useFakeTimers()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search shops' }), {
      target: { value: 'football' },
    })
    expect(listShops).toHaveBeenCalledTimes(1)
    await act(() => vi.advanceTimersByTimeAsync(199))
    expect(listShops).toHaveBeenCalledTimes(1)
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(listShops).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      search: 'football',
      status: 'ACTIVE',
    })
    expect(screen.getByRole('status', { name: 'location' })).toHaveTextContent(
      'page=1&status=ACTIVE&search=football',
    )
  })

  it('shows the copyable shop ID next to the shop record', async () => {
    renderPage()

    expect(await screen.findByText('shop-1')).toBeVisible()
  })

  it('keeps global Create hidden and limits status actions to the exact scoped shop', async () => {
    vi.mocked(listShops).mockResolvedValue({
      items: [shop, secondShop],
      pagination: { total: 2, page: 1, limit: 20 },
    })
    const scopedWriter = account(
      ['SHOPS:READ'],
      [
        {
          assignmentId: 'assignment-1',
          scopeType: 'shop',
          scopeId: 'shop-1',
          resourceId: 'shop-1',
          roles: [],
          permissions: ['SHOPS:WRITE'],
        },
      ],
    )
    renderPage('/portal/shops', scopedWriter)

    expect(await screen.findByText('Football US')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Create shop' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Football US' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Edit Pet Shop' })).not.toBeInTheDocument()
  }, 15_000)

  it('lets a read-only user inspect a row without showing a status-save action', async () => {
    renderPage('/portal/shops', account(['SHOPS:READ']))

    fireEvent.click(await screen.findByRole('row', { name: /Football US/ }))
    expect(await screen.findByDisplayValue('Football US')).toBeInTheDocument()
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('switch', { name: 'Status' })).toBeDisabled()
    expect(within(dialog).queryByRole('button', { name: 'Save status' })).not.toBeInTheDocument()
  })

  it('opens the status editor for a writer', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Edit Football US' }))
    expect(await screen.findByDisplayValue('Football US')).toBeInTheDocument()
  })

  it('submits only the API-supported create and status inputs', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Create shop' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'Football CA' },
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(createShop).toHaveBeenCalled())
    expect(vi.mocked(createShop).mock.calls[0]?.[0]).toEqual({
      name: 'Football CA',
      currency: 'USD',
    })

    fireEvent.click(await screen.findByText('Football US'))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Status' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save status' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Save status' }))
    await waitFor(() => expect(updateShopStatus).toHaveBeenCalledWith('shop-1', 'INACTIVE'))
  })

  it('shows Retry for failed lists and keeps failed mutation values visible', async () => {
    vi.mocked(listShops).mockRejectedValue(new Error('List unavailable'))
    renderPage()

    expect(await screen.findByRole('button', { name: 'Retry' })).toBeVisible()
    vi.mocked(listShops).mockResolvedValue({
      items: [shop],
      pagination: { total: 1, page: 1, limit: 20 },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Football US')).toBeVisible()

    vi.mocked(createShop).mockRejectedValueOnce(new Error('Name is already in use'))
    fireEvent.click(screen.getByRole('button', { name: 'Create shop' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'Football CA' },
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    const productError = await screen.findByText('Name is already in use')
    expect(productError.closest('.ant-notification-notice')).not.toBeNull()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Football CA')
  })

  it('sanitizes malformed URL filters before querying the API', async () => {
    renderPage('/portal/shops?page=-3&status=UNKNOWN&search=%20football%20')

    expect(await screen.findByText('Football US')).toBeVisible()
    expect(listShops).toHaveBeenCalledWith({ page: 1, limit: 20, search: 'football' })
  })

  it('shows filtered no-results with a Clear filters action', async () => {
    vi.mocked(listShops).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 20 },
    })
    const router = renderPage('/portal/shops?page=2&status=ACTIVE')

    const emptyMessage = await screen.findByText('No shops match these filters')
    expect(emptyMessage).toBeVisible()
    const clearButton = within(emptyMessage.closest('.ant-empty')!)
      .getByText('Clear filters')
      .closest('button')
    expect(clearButton).not.toBeNull()
    fireEvent.click(clearButton!)
    await waitFor(() => expect(router.state.location.search).toBe('?page=1'))
  })

  it('explains an empty authorized Shop scope when no filters are active', async () => {
    vi.mocked(listShops).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 20 },
    })
    renderPage(
      '/portal/shops',
      account(
        [],
        [
          {
            assignmentId: 'assignment-1',
            scopeType: 'shop',
            scopeId: 'shop-1',
            resourceId: 'shop-1',
            roles: [],
            permissions: ['SHOPS:READ'],
          },
        ],
      ),
    )

    expect(await screen.findByText('No shops are assigned to your access')).toBeVisible()
  })
})
