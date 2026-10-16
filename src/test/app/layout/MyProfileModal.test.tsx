import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MyProfileModal } from '@/app/layout/MyProfileModal'
import { AccountMenu } from '@/app/layout/AccountMenu'
import { AppProviders } from '@/app/providers/AppProviders'
import { loadEmployeeAvatar, loadMyEmployeeProfile } from '@/features/hr/api/hrApi'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/hr/api/hrApi', () => ({
  loadEmployeeAvatar: vi.fn(),
  loadMyEmployeeProfile: vi.fn(),
}))

describe('MyProfileModal', () => {
  afterEach(cleanup)
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
    vi.mocked(loadMyEmployeeProfile).mockResolvedValue({
      id: 'profile-1',
      employeeCode: 'J2501',
      fullName: 'Nguyen Van A',
      departmentId: 'department-1',
      teamId: 'team-1',
      department: { id: 'department-1', name: 'Developer' },
      team: { id: 'team-1', name: 'Team Dev' },
      jobTitle: 'Developer',
      status: 'ACTIVE',
      onboardingStatus: 'READY',
      isDeleted: false,
    })
  })

  it('shares the header avatar request with the profile modal', async () => {
    const profile = await loadMyEmployeeProfile()
    vi.mocked(loadMyEmployeeProfile).mockResolvedValue({
      ...profile,
      avatarAssetId: 'asset',
      avatarUrl: '/avatar',
    })
    vi.mocked(loadEmployeeAvatar).mockResolvedValue('data:image/png;base64,YQ==')
    const account = {
      account: { id: 'account', email: 'a@example.test', mustChangePassword: false },
      roles: [],
      permissions: [],
      scopes: [],
      profileSetupRequired: false,
    }
    const view = render(
      <MemoryRouter>
        <AppProviders>
          <AccountMenu account={account} />
        </AppProviders>
      </MemoryRouter>,
    )
    await waitFor(() => expect(loadEmployeeAvatar).toHaveBeenCalledTimes(1))
    view.rerender(
      <MemoryRouter>
        <AppProviders>
          <AccountMenu account={account} />
          <MyProfileModal open onClose={vi.fn()} />
        </AppProviders>
      </MemoryRouter>,
    )
    await screen.findByText('Nguyen Van A')
    expect(loadEmployeeAvatar).toHaveBeenCalledTimes(1)
  })

  it('loads and shows the current employee profile when opened', async () => {
    render(
      <AppProviders>
        <MyProfileModal open onClose={vi.fn()} />
      </AppProviders>,
    )

    expect(await screen.findByText('Nguyen Van A')).toBeInTheDocument()
    expect(screen.getByText('J2501')).toBeInTheDocument()
    expect(loadMyEmployeeProfile).toHaveBeenCalledTimes(1)
  })
})
