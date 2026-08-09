import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { AccessControlPage } from '@/features/auth/access-control/pages/AccessControlPage'
import { loadRoleCatalog, updateRole } from '@/features/auth/roles/api/rolesApi'
import { loadScopes } from '@/features/auth/scopes/api/scopesApi'
import { setPermissions } from '@/shared/auth/session'
import i18n from '@/shared/i18n/i18n'

vi.mock('@/features/auth/roles/api/rolesApi', () => ({
  createRole: vi.fn(),
  deleteRole: vi.fn(),
  loadRoleCatalog: vi.fn(),
  updateRole: vi.fn(),
}))
vi.mock('@/features/auth/scopes/api/scopesApi', () => ({
  createScope: vi.fn(),
  deactivateScope: vi.fn(),
  loadScopes: vi.fn(),
  updateScope: vi.fn(),
}))
vi.mock('@/features/auth/permissions/api/permissionsApi', () => ({
  createPermission: vi.fn(),
  deletePermission: vi.fn(),
  updatePermission: vi.fn(),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <AppProviders>
        <AccessControlPage />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('AccessControlPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('manages role permissions and scope registry across tabs', async () => {
    await i18n.changeLanguage('en')
    setPermissions(['AUTH:WRITE'])
    vi.mocked(loadRoleCatalog).mockResolvedValue({
      roles: {
        items: [
          { id: 'role-1', code: 'ADMIN', name: 'Administrator', permissionIds: ['p-1'] },
          {
            id: 'role-super',
            code: 'SUPER_ADMIN',
            name: 'Super Admin',
            permissionIds: ['p-1', 'p-2'],
          },
        ],
        total: 2,
      },
      permissions: {
        items: [
          { id: 'p-1', code: 'AUTH:READ', name: 'Read access' },
          { id: 'p-2', code: 'AUTH:WRITE', name: 'Manage access' },
        ],
        total: 2,
      },
    })
    vi.mocked(loadScopes).mockResolvedValue({
      items: [
        {
          id: 'scope-1',
          name: 'Operations',
          scopeId: 'dep-1',
          scopeType: 'DEPARTMENT',
          status: 'ACTIVE',
        },
      ],
      total: 1,
    })
    vi.mocked(updateRole).mockResolvedValue({})
    renderPage()

    expect(await screen.findByText('Administrator')).toBeVisible()
    expect(screen.getAllByRole('tab')).toHaveLength(3)
    fireEvent.click(screen.getByRole('tab', { name: /scope registry.*1/i }))
    expect(screen.getByText('Operations')).toBeVisible()
    fireEvent.click(screen.getByRole('tab', { name: /roles.*2/i }))
    expect(screen.getByText(/full access.*automatic|toàn quyền.*tự động/i)).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: /administrator/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /manage access/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/unsaved changes/i)
    fireEvent.click(screen.getByRole('button', { name: /save permissions|lưu quyền/i }))

    await waitFor(() =>
      expect(updateRole).toHaveBeenCalledWith('role-1', {
        code: 'ADMIN',
        description: undefined,
        name: 'Administrator',
        permissionIds: ['p-1', 'p-2'],
      }),
    )
    expect(
      (await screen.findByText('Changes saved')).closest('.ant-notification-notice'),
    ).not.toBeNull()
  }, 15_000)

  it('opens a small editor instead of the legacy catalog drawer', async () => {
    setPermissions(['AUTH:WRITE'])
    vi.mocked(loadRoleCatalog).mockResolvedValue({
      roles: { items: [], total: 0 },
      permissions: {
        items: [{ id: 'p-1', code: 'AUTH:READ', name: 'Read access' }],
        total: 1,
      },
    })
    vi.mocked(loadScopes).mockResolvedValue({ items: [], total: 0 })
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /create role|tạo vai trò/i }))
    expect(screen.getByRole('dialog')).toHaveTextContent(/create role|tạo vai trò/i)
    expect(screen.getByRole('dialog')).toHaveStyle({ width: '720px' })
    expect(screen.getByRole('checkbox', { name: /read access/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /role catalog|danh mục vai trò/i }),
    ).not.toBeInTheDocument()
  })
})
