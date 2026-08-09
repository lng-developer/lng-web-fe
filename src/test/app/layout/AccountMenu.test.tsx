import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AccountMenu } from '@/app/layout/AccountMenu'
import { AppProviders } from '@/app/providers/AppProviders'
import { type CurrentAccount, logout } from '@/features/auth/api/authApi'
import { loadEmployeeAvatar, loadMyEmployeeProfile } from '@/features/hr/api/hrApi'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/auth/api/authApi', () => ({ logout: vi.fn() }))
vi.mock('@/features/hr/api/hrApi', () => ({
  loadEmployeeAvatar: vi.fn(),
  loadMyEmployeeProfile: vi.fn(),
}))
vi.mock('@/app/layout/MyProfileModal', () => ({
  MyProfileModal: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Profile modal</div> : null,
}))

const account: CurrentAccount = {
  account: { id: 'account-1', email: 'user@lng.co', mustChangePassword: false },
  roles: [],
  permissions: [],
  scopes: [
    {
      assignmentId: 'assignment-1',
      scopeType: 'team',
      scopeId: 'team-1',
      resourceId: 'team-1',
      roles: ['USER'],
      permissions: ['TEAMS:READ'],
    },
  ],
  profileSetupRequired: false,
}

describe('AccountMenu', () => {
  afterEach(cleanup)

  beforeEach(async () => {
    queryClient.clear()
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    vi.mocked(loadMyEmployeeProfile).mockResolvedValue({
      id: 'profile-1',
      employeeCode: 'J2501',
      fullName: 'Nguyen Van A',
      avatarAssetId: 'asset-1',
      avatarUrl: '/api/hr/employee-profiles/me/avatar',
      departmentId: 'department-1',
      teamId: 'team-1',
      status: 'ACTIVE',
      onboardingStatus: 'READY',
      isDeleted: false,
    })
    vi.mocked(loadEmployeeAvatar).mockResolvedValue('data:image/png;base64,YXZhdGFy')
    vi.mocked(logout).mockResolvedValue(undefined)
  })

  it('shows account access and opens the profile modal', async () => {
    renderMenu()

    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }))
    expect(await screen.findByText('user@lng.co')).toBeInTheDocument()
    expect(screen.getByText('USER \u00b7 Team')).toBeInTheDocument()
    fireEvent.click(screen.getByText('My profile'))

    expect(await screen.findByRole('dialog')).toHaveTextContent('Profile modal')
  })

  it('loads the protected employee avatar', async () => {
    renderMenu()

    await waitFor(() =>
      expect(
        document.querySelector('img[src="data:image/png;base64,YXZhdGFy"]'),
      ).toBeInTheDocument(),
    )
  })

  it('logs out from the dropdown', async () => {
    const router = renderMenu()

    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }))
    fireEvent.click(await screen.findByText('Sign out'))

    await waitFor(() => expect(logout).toHaveBeenCalledOnce())
    expect(router.state.location.pathname).toBe('/login')
  })
})

function renderMenu() {
  const router = createMemoryRouter([{ path: '*', element: <AccountMenu account={account} /> }], {
    initialEntries: ['/operations-dashboard'],
  })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}
