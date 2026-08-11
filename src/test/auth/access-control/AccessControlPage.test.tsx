import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { AccessControlPage } from '@/features/auth/access-control/pages/AccessControlPage'
import {
  createExtensionToken,
  listExtensionTokens,
  revokeExtensionToken,
} from '@/features/auth/extension-tokens/api/extensionTokensApi'
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
vi.mock('@/features/auth/extension-tokens/api/extensionTokensApi', () => ({
  createExtensionToken: vi.fn(),
  listExtensionTokens: vi.fn(),
  revokeExtensionToken: vi.fn(),
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
  beforeEach(() => {
    vi.mocked(listExtensionTokens).mockResolvedValue([])
  })

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
    expect(screen.getAllByRole('tab')).toHaveLength(4)
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
  }, 30_000)

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
  }, 15_000)

  it('shows an Extension Tokens tab only to an access administrator', async () => {
    setPermissions(['AUTH:WRITE'])
    vi.mocked(loadRoleCatalog).mockResolvedValue({
      roles: { items: [], total: 0 },
      permissions: { items: [], total: 0 },
    })
    vi.mocked(loadScopes).mockResolvedValue({ items: [], total: 0 })

    renderPage()

    expect(await screen.findByRole('tab', { name: /extension tokens/i })).toBeVisible()
  })

  it('opens the create-token workflow from the Extension Tokens tab', async () => {
    setPermissions(['AUTH:WRITE'])
    vi.mocked(loadRoleCatalog).mockResolvedValue({
      roles: { items: [], total: 0 },
      permissions: { items: [], total: 0 },
    })
    vi.mocked(loadScopes).mockResolvedValue({ items: [], total: 0 })

    renderPage()
    fireEvent.click(await screen.findByRole('tab', { name: /extension tokens/i }))

    expect(screen.getByRole('button', { name: /create token/i })).toBeVisible()
  })

  it('creates an extension token and shows the raw token once', async () => {
    setPermissions(['AUTH:WRITE'])
    vi.mocked(loadRoleCatalog).mockResolvedValue({
      roles: { items: [], total: 0 },
      permissions: { items: [], total: 0 },
    })
    vi.mocked(loadScopes).mockResolvedValue({ items: [], total: 0 })
    vi.mocked(createExtensionToken).mockResolvedValue({
      token: 'lng_ext_raw_secret',
      extensionToken: {
        id: 'token-1',
        name: 'Dev PC',
        shopId: '507f1f77bcf86cd799439011',
        environment: 'development',
        tokenHint: 'cret',
        revokedAt: null,
      },
    })

    renderPage()
    fireEvent.click(await screen.findByRole('tab', { name: /extension tokens/i }))
    fireEvent.click(screen.getByRole('button', { name: /create token/i }))
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Dev PC' } })
    fireEvent.change(screen.getByLabelText(/shop id/i), {
      target: { value: '507f1f77bcf86cd799439011' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))

    expect(await screen.findByDisplayValue('lng_ext_raw_secret')).toBeInTheDocument()
    expect(createExtensionToken).toHaveBeenCalledWith({
      name: 'Dev PC',
      shopId: '507f1f77bcf86cd799439011',
      environment: 'development',
      expiresAt: null,
    })
    expect(revokeExtensionToken).not.toHaveBeenCalled()
  }, 15_000)
})
