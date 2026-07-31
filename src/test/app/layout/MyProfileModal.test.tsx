import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MyProfileModal } from '@/app/layout/MyProfileModal'
import { AppProviders } from '@/app/providers/AppProviders'
import { loadMyEmployeeProfile } from '@/features/hr/api/hrApi'

vi.mock('@/features/hr/api/hrApi', () => ({
  loadEmployeeAvatar: vi.fn(),
  loadMyEmployeeProfile: vi.fn(),
}))

describe('MyProfileModal', () => {
  beforeEach(() => {
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
