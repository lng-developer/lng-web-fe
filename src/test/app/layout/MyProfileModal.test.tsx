import { fireEvent, render, screen } from '@testing-library/react'
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
      jobLevel: 'Senior',
      gender: 'MALE',
      birthDate: '1990-01-15',
      phoneNumber: '0900000000',
      personalEmail: 'nguyen@example.com',
      address: 'Ho Chi Minh City',
      emergencyContact: { name: 'Nguyen B', phone: '0911000000', relation: 'Spouse' },
      employmentType: 'FULL_TIME',
      workMode: 'HYBRID',
      startDate: '2024-01-01',
      probationEndDate: '2024-03-01',
      contractType: 'LABOR',
      contractNumber: 'HDLD-2024-01',
      contractStartDate: '2024-01-01',
      contractEndDate: '2025-01-01',
      status: 'ACTIVE',
      onboardingStatus: 'READY',
      isDeleted: false,
    })
  })

  it('loads and shows the current employee profile when opened', async () => {
    const onEdit = vi.fn()
    render(
      <AppProviders>
        <MyProfileModal open onClose={vi.fn()} onEdit={onEdit} />
      </AppProviders>,
    )

    expect(await screen.findByText('Nguyen Van A')).toBeInTheDocument()
    expect(screen.getByText('J2501')).toBeInTheDocument()
    expect(screen.getByText('Senior')).toBeInTheDocument()
    expect(screen.getByText('Nguyen B')).toBeInTheDocument()
    expect(screen.getByText('HDLD-2024-01')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledOnce()
    expect(loadMyEmployeeProfile).toHaveBeenCalledTimes(1)
  })
})
