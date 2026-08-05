import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { loadPermissions } from '@/features/auth/permissions/api/permissionsApi'
import { PermissionsPage } from '@/features/auth/permissions/pages/PermissionsPage'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/auth/permissions/api/permissionsApi', () => ({
  createPermission: vi.fn(),
  deletePermission: vi.fn(),
  loadPermissions: vi.fn(),
  updatePermission: vi.fn(),
}))

describe('PermissionsPage', () => {
  afterEach(() => {
    cleanup()
    queryClient.clear()
  })

  beforeEach(() => {
    vi.mocked(loadPermissions).mockResolvedValue({
      items: [
        { code: 'AUTH:READ', description: 'Read access', id: 'permission-1', name: 'Read auth' },
      ],
      total: 1,
    })
  })

  it('shows the permission catalog', async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <PermissionsPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(await screen.findByText('AUTH:READ')).toBeVisible()
    expect(screen.getByRole('button', { name: /create permission|tạo quyền/i })).toBeVisible()
  })
})
