import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { loadRoleCatalog } from '@/features/auth/roles/api/rolesApi'
import { RolesPage } from '@/features/auth/roles/pages/RolesPage'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/auth/roles/api/rolesApi', () => ({
  createRole: vi.fn(),
  deleteRole: vi.fn(),
  loadRoleCatalog: vi.fn(),
  updateRole: vi.fn(),
}))

describe('RolesPage', () => {
  afterEach(() => {
    cleanup()
    queryClient.clear()
  })

  beforeEach(async () => {
    queryClient.clear()
    await i18n.changeLanguage('en')
    vi.mocked(loadRoleCatalog).mockResolvedValue({
      permissions: {
        items: [{ code: 'AUTH:READ', id: 'permission-1', name: 'Read auth' }],
        total: 1,
      },
      roles: {
        items: [
          { code: 'REVIEWER', id: 'role-1', name: 'Reviewer', permissions: ['permission-1'] },
        ],
        total: 1,
      },
    })
  })

  it('lists roles with permission counts and a focused create action', async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <RolesPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Reviewer')).toBeVisible()
    expect(screen.getByText('AUTH:READ')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Create role' }))
    expect(screen.getByRole('dialog', { name: 'Create role' })).toBeVisible()
  })
})
