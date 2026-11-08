import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NavigationSearch } from '@/app/layout/NavigationSearch'
import { AppProviders } from '@/app/providers/AppProviders'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

const mockAccount: CurrentAccount = {
  account: { id: 'account-1', email: 'admin@lng.co', mustChangePassword: false },
  roles: ['SUPER_ADMIN'],
  permissions: [],
  scopes: [],
  profileSetupRequired: false,
}

describe('NavigationSearch', () => {
  beforeEach(async () => {
    queryClient.clear()
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
  })

  afterEach(() => {
    cleanup()
    queryClient.clear()
  })

  const renderComponent = (props: { account?: CurrentAccount; onNavigate?: () => void } = {}) => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <NavigationSearch
              account={props.account ?? mockAccount}
              onNavigate={props.onNavigate}
            />
          ),
        },
        {
          path: '/portal/orders',
          element: <div>Orders Page</div>,
        },
      ],
      { initialEntries: ['/'] },
    )

    return {
      ...render(
        <AppProviders>
          <RouterProvider router={router} />
        </AppProviders>,
      ),
      router,
    }
  }

  it('renders the search input with shortcut hint', () => {
    renderComponent()
    const input = screen.getByRole('textbox', { name: /search navigation/i })
    expect(input).toBeVisible()
    expect(screen.getByText(/ctrl k|⌘k/i)).toBeVisible()
  })

  it('opens quick navigation popover when clicked', async () => {
    renderComponent()
    const input = screen.getByRole('textbox', { name: /search navigation/i })
    fireEvent.click(input)

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeVisible()
    })
    expect(screen.getByText(/quick navigation/i)).toBeVisible()
  })

  it('filters navigation items by keyword and navigates on click', async () => {
    const onNavigate = vi.fn()
    const { router } = renderComponent({ onNavigate })

    const input = screen.getByRole('textbox', { name: /search navigation/i })
    fireEvent.change(input, { target: { value: 'orders' } })

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeVisible()
    })

    const options = screen.getAllByRole('option')
    expect(options.length).toBeGreaterThan(0)

    // Click on the first option
    fireEvent.click(options[0])

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalled()
    })
    expect(router.state.location.pathname).toBe('/portal/orders')
  })

  it('supports keyboard navigation with arrows and enter key', async () => {
    const onNavigate = vi.fn()
    const { router } = renderComponent({ onNavigate })

    const input = screen.getByRole('textbox', { name: /search navigation/i })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'orders' } })

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeVisible()
    })

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalled()
    })
    expect(router.state.location.pathname).toContain('orders')
  })

  it('shows empty state when no results match query', async () => {
    renderComponent()
    const input = screen.getByRole('textbox', { name: /search navigation/i })
    fireEvent.change(input, { target: { value: 'xyznonexistentroute12345' } })

    await waitFor(() => {
      expect(screen.getByText(/no navigation items found/i)).toBeVisible()
    })
  })

  it('opens search input when pressing Ctrl+K', async () => {
    renderComponent()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeVisible()
    })
  })
})
