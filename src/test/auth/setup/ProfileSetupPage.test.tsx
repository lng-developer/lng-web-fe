import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App as AntdApp } from 'antd'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateMock,
}))

vi.mock('@/features/hr/api/hrApi', () => ({
  loadMyEmployeeProfile: vi.fn(),
  updateMyPersonalProfile: vi.fn(),
  uploadMyEmployeeAvatar: vi.fn(),
}))

import { ProfileSetupPage } from '@/features/auth/setup/pages/ProfileSetupPage'
import {
  loadMyEmployeeProfile,
  updateMyPersonalProfile,
  uploadMyEmployeeAvatar,
} from '@/features/hr/api/hrApi'
import { ApiError } from '@/shared/api'
import i18n from '@/shared/i18n/i18n'

describe('ProfileSetupPage', () => {
  afterEach(cleanup)

  beforeEach(async () => {
    vi.clearAllMocks()
    navigateMock.mockReset()
    await i18n.changeLanguage('en')
    vi.mocked(loadMyEmployeeProfile).mockResolvedValue({
      id: 'profile-1',
      employeeCode: 'J2601',
      fullName: 'Jane Nguyen',
      departmentId: 'department-1',
      teamId: 'team-1',
      department: { id: 'department-1', name: 'Production' },
      team: { id: 'team-1', name: 'Team A' },
      status: 'ACTIVE',
      onboardingStatus: 'PROFILE_INCOMPLETE',
      isDeleted: false,
    })
  })

  it('submits the required personal profile fields and enters the workspace', async () => {
    vi.mocked(updateMyPersonalProfile).mockResolvedValue({
      id: 'profile-1',
      employeeCode: 'J2601',
      fullName: 'Jane Nguyen',
      departmentId: 'department-1',
      teamId: 'team-1',
      status: 'ACTIVE',
      onboardingStatus: 'READY',
      isDeleted: false,
    })

    renderProfileSetup()

    expect(await screen.findByText('Jane Nguyen')).toBeVisible()
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '0900000000' } })
    fireEvent.change(screen.getByLabelText('Personal email'), {
      target: { value: 'jane@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: 'Ha Noi' } })
    fireEvent.click(screen.getByRole('tab', { name: /Emergency contact/i }))
    fireEvent.change(screen.getByLabelText('Emergency contact', { selector: 'input' }), {
      target: { value: 'Parent' },
    })
    fireEvent.change(screen.getByLabelText('Emergency phone'), { target: { value: '0911111111' } })
    await selectRelationship('Parent')
    const avatar = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [avatar] } })
    fireEvent.click(screen.getByRole('button', { name: /Complete setup/ }))

    await waitFor(() => expect(uploadMyEmployeeAvatar).toHaveBeenCalledWith(avatar))
    await waitFor(() =>
      expect(updateMyPersonalProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: '0900000000',
          personalEmail: 'jane@example.com',
          address: 'Ha Noi',
          emergencyContact: { name: 'Parent', phone: '0911111111', relation: 'PARENT' },
        }),
      ),
    )
    expect(navigateMock).toHaveBeenCalledWith('/operations-dashboard', { replace: true })
  })

  it('shows the normalized submit error in the designed feedback toast', async () => {
    let rejectUpdate!: (cause: Error) => void
    vi.mocked(updateMyPersonalProfile).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectUpdate = reject
        }),
    )
    renderProfileSetup()

    await screen.findByText('Jane Nguyen')
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '0900000000' } })
    fireEvent.change(screen.getByLabelText('Personal email'), {
      target: { value: 'duplicate@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: 'Ha Noi' } })
    fireEvent.click(screen.getByRole('tab', { name: /Emergency contact/i }))
    fireEvent.change(screen.getByLabelText('Emergency contact', { selector: 'input' }), {
      target: { value: 'Parent' },
    })
    fireEvent.change(screen.getByLabelText('Emergency phone'), { target: { value: '0911111111' } })
    await selectRelationship('Parent')
    fireEvent.click(screen.getByRole('button', { name: /Complete setup/ }))
    await waitFor(() => expect(updateMyPersonalProfile).toHaveBeenCalledOnce())

    fireEvent.click(screen.getByRole('tab', { name: /Personal information/i }))
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Personal email'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: '' } })
    rejectUpdate(
      new ApiError('Employee profile has duplicate fields', {
        code: 'CONFLICT_ERROR',
        status: 409,
        details: { field: 'personalEmail' },
      }),
    )

    const title = await screen.findByText('Information already in use')
    expect(title.closest('.ant-notification-notice')).not.toBeNull()
    expect(
      await screen.findAllByText('Personal email belongs to another employee profile'),
    ).toHaveLength(2)
    expect(screen.getByLabelText('Personal email')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Phone number')).toHaveValue('0900000000')
    expect(screen.getByLabelText('Personal email')).toHaveValue('duplicate@example.com')
    expect(screen.getByLabelText('Address')).toHaveValue('Ha Noi')
    fireEvent.click(screen.getByRole('tab', { name: /Emergency contact/i }))
    expect(screen.getByLabelText('Emergency contact', { selector: 'input' })).toHaveValue('Parent')
    expect(screen.getByLabelText('Emergency phone')).toHaveValue('0911111111')
    expect(screen.getByLabelText('Relationship').closest('.ant-select')).toHaveTextContent('Parent')
    expect(loadMyEmployeeProfile).toHaveBeenCalledTimes(1)
  })

  it('offers language switching during account setup', async () => {
    renderProfileSetup()

    await screen.findByText('Jane Nguyen')
    expect(screen.getByRole('button', { name: 'Language' })).toBeVisible()
  })
})

function renderProfileSetup() {
  return render(
    <AntdApp>
      <MemoryRouter initialEntries={['/setup/profile']}>
        <Routes>
          <Route path="/setup/profile" element={<ProfileSetupPage />} />
          <Route path="/operations-dashboard" element={<h1>Workspace reached</h1>} />
        </Routes>
      </MemoryRouter>
    </AntdApp>,
  )
}

async function selectRelationship(label: string) {
  const select = document.querySelector('#emergencyContact_relation')
  if (!select) throw new Error('Emergency contact relationship select was not rendered')
  fireEvent.mouseDown(select)
  const options = await screen.findAllByText(label)
  fireEvent.click(options.find((option) => option.closest('.ant-select-item-option'))!)
}
