import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { AccessControlPage } from '@/features/auth/access-control/pages/AccessControlPage'

vi.mock('@/features/auth/permissions/pages/PermissionsPage', () => ({
  PermissionsPage: () => <div>Permissions catalog</div>,
}))

vi.mock('@/features/auth/roles/pages/RolesPage', () => ({
  RolesPage: () => <div>Roles catalog</div>,
}))

vi.mock('@/features/auth/scopes/pages/ScopesPage', () => ({
  ScopesPage: () => <div>Scopes registry</div>,
}))

function Location() {
  const location = useLocation()
  return <output>{location.search}</output>
}

describe('AccessControlPage', () => {
  afterEach(cleanup)

  it('opens the permission catalog from the selected URL tab', () => {
    render(
      <MemoryRouter initialEntries={['/auth/access-control?tab=permissions']}>
        <AppProviders>
          <Routes>
            <Route
              path="*"
              element={
                <>
                  <AccessControlPage />
                  <Location />
                </>
              }
            />
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByRole('tab', { name: /permissions|quyền/i, selected: true })).toBeVisible()
    expect(screen.getByText('Permissions catalog')).toBeVisible()
    expect(screen.getByText('?tab=permissions')).toBeVisible()
  })
})
