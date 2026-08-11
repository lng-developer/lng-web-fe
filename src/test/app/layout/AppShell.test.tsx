import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from '@/app/layout/AppShell'
import { AppProviders } from '@/app/providers/AppProviders'
import i18n from '@/shared/i18n/i18n'

vi.mock('@/app/layout/AppSidebar', () => ({
  AppSidebar: () => <nav aria-label="Test navigation" />,
}))
vi.mock('@/app/layout/AppRail', () => ({
  AppRail: () => <nav aria-label="Test core rail" />,
}))
vi.mock('@/app/layout/AccountMenu', () => ({
  AccountMenu: () => <button type="button">Test account</button>,
}))

describe('AppShell', () => {
  beforeEach(async () => {
    document.title = ''
    await i18n.changeLanguage('en')
  })

  it('renders the shell and child route without importing application pages', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          loader: () => ({
            account: { id: 'account-1', email: 'admin@lng.co', mustChangePassword: false },
            roles: [],
            permissions: ['HR_ATTENDANCE:WRITE'],
            scopes: [],
            profileSetupRequired: false,
          }),
          HydrateFallback: () => null,
          element: <AppShell />,
          children: [{ path: 'operations-dashboard', element: <h1>Foundation test page</h1> }],
        },
      ],
      { initialEntries: ['/operations-dashboard'] },
    )

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    expect(await screen.findByRole('banner')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Foundation test page' })).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Test navigation' })).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Test core rail' })).toBeVisible()
  })

  it('updates the browser tab title from the active navigation page', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          loader: () => ({
            account: { id: 'account-1', email: 'admin@lng.co', mustChangePassword: false },
            roles: [],
            permissions: ['ORDERS:READ'],
            scopes: [],
            profileSetupRequired: false,
          }),
          HydrateFallback: () => null,
          element: <AppShell />,
          children: [{ path: 'portal/orders', element: <h1>Orders test page</h1> }],
        },
      ],
      { initialEntries: ['/portal/orders'] },
    )

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    expect(await screen.findByRole('heading', { name: 'Orders test page' })).toBeVisible()
    expect(document.title).toBe('Orders | LNG Web')
  })
})
