import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { WorkspaceIndexRedirect } from '@/app/router/WorkspaceIndexRedirect'

describe('WorkspaceIndexRedirect', () => {
  it('sends staff to their first permitted workspace', async () => {
    const router = createMemoryRouter([
      {
        id: 'workspace',
        path: '/',
        HydrateFallback: () => null,
        loader: () => ({
          account: { id: 'account-1', email: 'staff@lng.co', mustChangePassword: false },
          roles: [],
          permissions: ['HR_ATTENDANCE:WRITE'],
          scopes: [],
          profileSetupRequired: false,
        }),
        children: [
          { index: true, element: <WorkspaceIndexRedirect /> },
          { path: 'hr/me', element: <h1>Personal workspace</h1> },
        ],
      },
    ])

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    expect(await screen.findByRole('heading', { name: 'Personal workspace' })).toBeVisible()
    expect(router.state.location.pathname).toBe('/hr/me')
  })
})
