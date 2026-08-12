import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AccessEditorPage } from '@/features/auth/access/pages/AccessEditorPage'
import { setPermissions } from '@/shared/auth/session'
import i18n from '@/shared/i18n/i18n'

vi.mock('@/features/auth/api/accessExplorerApi', () => ({
  loadAccessExplorer: vi.fn().mockResolvedValue({
    account: {
      account: { email: 'operator@lng.test', id: 'account-1', status: 'active' },
      access: { customPermissionIds: [], roleIds: ['role-1'] },
    },
    assignments: { items: [], total: 0 },
    permissions: {
      items: [{ code: 'AUTH:READ', id: 'permission-1', name: 'Read access' }],
      total: 1,
    },
    roles: { items: [{ code: 'ADMIN', id: 'role-1', name: 'Administrator' }], total: 1 },
    scopes: { items: [], total: 0 },
    scopedRolePermissions: { items: [], total: 0 },
  }),
}))

vi.mock('@/features/auth/access/api/accessMutationsApi', () => ({
  createAccessAssignment: vi.fn(),
  deleteAccessAssignment: vi.fn(),
  setScopedRolePermissions: vi.fn(),
  updateAccessAssignment: vi.fn(),
  updateGlobalAccess: vi.fn(),
}))

describe('AccessEditorPage', () => {
  beforeEach(async () => {
    setPermissions(['AUTH:READ', 'AUTH:WRITE'])
    await i18n.changeLanguage('vi')
  })

  afterEach(cleanup)

  it('opens a focused access editor for the selected account', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/auth/access/account-1']}>
          <Routes>
            <Route path="/auth/access/:accountId" element={<AccessEditorPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('operator@lng.test')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Lưu quyền toàn cục' })).toBeVisible()
    expect(screen.getAllByRole('button', { name: 'Thêm quyền theo phạm vi' })[0]).toBeVisible()
  })
})
