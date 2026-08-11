import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import {
  loadAssignableRoles,
  loadEmployeeAvatar,
  loadEmployeeProfile,
  loadEmployeeProfiles,
  updateEmployeeProfile,
  uploadEmployeeAvatar,
} from '@/features/hr/api/hrApi'
import { HrWorkspacePage } from '@/features/hr/pages/HrWorkspacePage'
import { setPermissions } from '@/shared/auth/session'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/hr/api/hrApi', () => ({
  deleteEmployeeProfile: vi.fn(),
  loadAssignableRoles: vi.fn(),
  loadEmployeeAvatar: vi.fn(),
  loadEmployeeProfile: vi.fn(),
  loadEmployeeProfiles: vi.fn(),
  provisionStaff: vi.fn(),
  restoreEmployeeProfile: vi.fn(),
  updateEmployeeProfile: vi.fn(),
  uploadEmployeeAvatar: vi.fn(),
}))

vi.mock('@/features/organization/api/organizationApi', () => ({
  loadDepartments: vi.fn().mockResolvedValue({ items: [] }),
  loadTeams: vi.fn().mockResolvedValue({ items: [] }),
}))

describe('HrWorkspacePage', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
    setPermissions([])
    vi.mocked(loadAssignableRoles).mockResolvedValue([])
  })
  afterEach(() => {
    cleanup()
    setPermissions([])
  })

  it('opens the complete grouped update form directly from a staff row', async () => {
    setPermissions(['HR_EMPLOYEES:WRITE', 'HR_COMPENSATION:WRITE'])
    vi.mocked(loadEmployeeProfiles).mockResolvedValue({
      items: [
        {
          id: 'profile-1',
          employeeCode: 'J2501',
          fullName: 'Jane Nguyen',
          departmentId: 'dep-1',
          teamId: 'team-1',
          department: { id: 'dep-1', name: 'Operations' },
          team: { id: 'team-1', name: 'Fulfillment' },
          jobTitle: 'Operator',
          employmentType: 'FULL_TIME',
          workMode: 'ONSITE',
          status: 'ACTIVE',
          onboardingStatus: 'READY',
          isDeleted: false,
        },
      ],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    })
    vi.mocked(loadEmployeeProfile).mockResolvedValue({
      id: 'profile-1',
      accountId: 'account-1',
      employeeCode: 'J2501',
      fullName: 'Jane Nguyen',
      workEmail: 'jane@lng.co',
      personalEmail: 'jane@gmail.com',
      phoneNumber: '0901000001',
      gender: 'FEMALE',
      birthDate: '2000-01-02T00:00:00.000Z',
      address: 'Da Nang',
      emergencyContact: { name: 'John Nguyen', phone: '0901000002', relation: 'Father' },
      departmentId: 'dep-1',
      teamId: 'team-1',
      jobTitle: 'Operator',
      jobLevel: 'L2',
      employmentType: 'FULL_TIME',
      workMode: 'ONSITE',
      startDate: '2026-01-01T00:00:00.000Z',
      probationEndDate: '2026-03-01T00:00:00.000Z',
      endDate: null,
      status: 'ACTIVE',
      contractType: 'LABOR',
      contractNumber: 'HD-001',
      contractStartDate: '2026-01-01T00:00:00.000Z',
      contractEndDate: null,
      promotionDate: null,
      transferDate: null,
      dependantDetails: [],
      dependants: 0,
      identityCard: '001200000001',
      taxIdentification: 'TAX-001',
      socialInsuranceNumber: 'SI-001',
      bankAccount: { bankName: 'VCB', accountNumber: '123456789' },
      baseCurrency: 'VND',
      baseSalary: 15000000,
      allowances: { lunch: 500000, fuel: 300000, other: 0 },
      responsibilityAllowance: 1000000,
      onboardingStatus: 'READY',
      isDeleted: false,
    })
    vi.mocked(updateEmployeeProfile).mockResolvedValue({
      id: 'profile-1',
      employeeCode: 'J2501',
      fullName: 'Jane Nguyen',
      departmentId: 'dep-1',
      teamId: 'team-1',
      status: 'ACTIVE',
      onboardingStatus: 'READY',
      isDeleted: false,
    })
    vi.mocked(uploadEmployeeAvatar).mockResolvedValue({
      id: 'profile-1',
      employeeCode: 'J2501',
      fullName: 'Jane Nguyen',
      departmentId: 'dep-1',
      teamId: 'team-1',
      status: 'ACTIVE',
      onboardingStatus: 'READY',
      isDeleted: false,
    })

    render(
      <MemoryRouter>
        <AppProviders>
          <HrWorkspacePage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Operations')).toBeVisible()
    expect(screen.getByText('Fulfillment')).toBeVisible()
    fireEvent.mouseEnter(screen.getByRole('button', { name: /edit jane nguyen|sửa jane nguyen/i }))
    await waitFor(() => expect(loadEmployeeProfile).toHaveBeenCalledWith('profile-1', true))
    fireEvent.click(screen.getByRole('button', { name: /open jane nguyen|mở jane nguyen/i }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(await screen.findByLabelText(/phone number|số điện thoại/i)).toHaveValue('0901000001')
    expect(screen.getByLabelText(/contract number|số hợp đồng/i)).toHaveValue('HD-001')
    await waitFor(() =>
      expect(screen.getAllByLabelText(/birth date|ngày sinh/i)[0]).toHaveValue('02/01/2000'),
    )
    expect(screen.getByLabelText(/^(bank name|ngân hàng)$/i)).toHaveAttribute('role', 'combobox')
    expect(screen.getByLabelText(/employee code|mã nhân viên/i)).not.toBeRequired()
    expect(screen.getByLabelText(/^(start date|ngày bắt đầu)$/i)).not.toBeRequired()
    expect(screen.queryByLabelText(/avatar url|url ảnh đại diện/i)).not.toBeInTheDocument()
    expect(screen.getByText(/upload avatar|tải ảnh đại diện/i)).toBeInTheDocument()
    expect(screen.getByRole('dialog').closest('.ant-modal')).toHaveStyle({
      width: 'calc(100vw - 32px)',
    })
    expect(screen.getByRole('dialog').closest('.ant-modal')).not.toHaveStyle({ maxWidth: '1408px' })
    expect(screen.getByText(/employment information|thông tin công việc/i)).toBeInTheDocument()
    expect(screen.getByText(/compensation|lương và phụ cấp/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /personal information|thông tin cá nhân/i }),
    ).not.toBeInTheDocument()

    const avatar = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    const fileInput = screen.getByRole('dialog').querySelector('input[type="file"]')
    expect(fileInput).not.toBeNull()
    fireEvent.change(fileInput!, { target: { files: [avatar] } })
    fireEvent.change(screen.getByLabelText(/phone number|số điện thoại/i), {
      target: { value: '0901000003' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save|lưu/i }))

    await waitFor(() => expect(updateEmployeeProfile).toHaveBeenCalled())
    await waitFor(() => expect(uploadEmployeeAvatar).toHaveBeenCalledWith('profile-1', avatar))
  }, 10_000)

  it('opens the staff provisioning form for HR writers', async () => {
    setPermissions(['HR_EMPLOYEES:WRITE'])
    vi.mocked(loadEmployeeProfiles).mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
    })

    render(
      <MemoryRouter>
        <AppProviders>
          <HrWorkspacePage />
        </AppProviders>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: /add staff|thêm nhân viên/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByLabelText(/employee code|mã nhân viên/i)).not.toBeInTheDocument()
    expect(await screen.findByLabelText(/employee code|mã nhân viên/i)).toBeInTheDocument()
    expect(screen.getByRole('dialog').closest('.ant-modal')).toHaveStyle({ width: '1180px' })
    expect(screen.getAllByText(/add staff|thêm nhân viên/i).length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/employee code|mã nhân viên/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/base salary|lương cơ bản/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/employee code|mã nhân viên/i)).toBeRequired()
    expect(screen.getByLabelText(/full name|họ và tên/i)).toBeRequired()
    expect(screen.getByLabelText(/work email|email công việc/i)).toBeRequired()
    expect(screen.getByLabelText(/department|phòng ban/i)).not.toBeRequired()
    expect(screen.getByLabelText(/^(start date|ngày bắt đầu)$/i)).not.toBeRequired()
    expect(screen.getByLabelText(/base salary|lương cơ bản/i)).not.toBeRequired()
  })

  it('loads a protected staff avatar through the authenticated API client', async () => {
    vi.mocked(loadEmployeeProfiles).mockResolvedValue({
      items: [
        {
          id: 'profile-test',
          employeeCode: 'TEST',
          fullName: 'Test Employee',
          avatarAssetId: 'asset-test',
          avatarUrl: '/api/hr/employee-profiles/profile-test/avatar',
          departmentId: null,
          teamId: null,
          status: 'ACTIVE',
          onboardingStatus: 'READY',
          isDeleted: false,
        },
      ],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    })
    vi.mocked(loadEmployeeAvatar).mockResolvedValue('data:image/png;base64,dGVzdA==')

    render(
      <MemoryRouter>
        <AppProviders>
          <HrWorkspacePage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: /test employee/i })).toBeVisible()
    await waitFor(() =>
      expect(
        document.querySelector('img[src="data:image/png;base64,dGVzdA=="]'),
      ).toBeInTheDocument(),
    )
  })

  it('does not load profile details when scrolling moves a staff row under the pointer', async () => {
    vi.mocked(loadEmployeeProfiles).mockResolvedValue({
      items: [
        {
          id: 'profile-test',
          employeeCode: 'TEST',
          fullName: 'Test Employee',
          departmentId: null,
          teamId: null,
          status: 'ACTIVE',
          onboardingStatus: 'READY',
          isDeleted: false,
        },
      ],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    })

    render(
      <MemoryRouter>
        <AppProviders>
          <HrWorkspacePage />
        </AppProviders>
      </MemoryRouter>,
    )

    fireEvent.mouseEnter(await screen.findByRole('button', { name: /test employee/i }))

    expect(loadEmployeeProfile).not.toHaveBeenCalled()
  })
})
