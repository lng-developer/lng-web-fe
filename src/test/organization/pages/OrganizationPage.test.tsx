import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import {
  createDepartment,
  loadDepartments,
  loadMemberCandidates,
  loadTeamMembers,
  loadTeams,
} from '@/features/organization/api/organizationApi'
import { OrganizationPage } from '@/features/organization/pages/OrganizationPage'
import { setPermissions } from '@/shared/auth/session'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/organization/api/organizationApi', () => ({
  addTeamMember: vi.fn(),
  createDepartment: vi.fn(),
  createTeam: vi.fn(),
  deactivateDepartment: vi.fn(),
  deactivateTeam: vi.fn(),
  loadDepartments: vi.fn(),
  loadMemberCandidates: vi.fn(),
  loadTeamMembers: vi.fn(),
  loadTeams: vi.fn(),
  removeTeamMember: vi.fn(),
  updateDepartment: vi.fn(),
  updateTeam: vi.fn(),
}))

const pageOf = <T,>(items: T[]) => ({
  items,
  pagination: { limit: 100, page: 1, total: items.length, totalPages: 1 },
})

describe('OrganizationPage', () => {
  afterEach(() => {
    cleanup()
    queryClient.clear()
  })

  beforeEach(async () => {
    await i18n.changeLanguage('en')
    setPermissions(['AUTH:WRITE', 'TEAMS:WRITE'])
    vi.mocked(loadDepartments).mockResolvedValue(
      pageOf([
        { code: 'OPS', id: 'department-1', name: 'Operations', status: 'active', teamCount: 1 },
      ]),
    )
    vi.mocked(loadTeams).mockResolvedValue(
      pageOf([
        {
          code: 'FULFILLMENT',
          departmentId: 'department-1',
          id: 'team-1',
          memberCount: 2,
          name: 'Fulfillment',
          status: 'active',
        },
      ]),
    )
    vi.mocked(loadTeamMembers).mockResolvedValue({
      leaders: [],
      members: [
        {
          accountId: 'account-1',
          email: 'member@lng.co',
          employeeCode: 'J2501',
          fullName: 'Member Nguyen',
          memberType: 'member',
          roles: [],
        },
      ],
      team: {
        code: 'FULFILLMENT',
        departmentId: 'department-1',
        id: 'team-1',
        memberCount: 2,
        name: 'Fulfillment',
        status: 'active',
      },
    })
    vi.mocked(loadMemberCandidates).mockResolvedValue({
      items: [
        {
          accountId: 'account-2',
          employeeCode: 'J2502',
          fullName: 'Candidate Tran',
          id: 'profile-2',
        },
      ],
      total: 1,
    })
    vi.mocked(createDepartment).mockResolvedValue({
      code: 'QC',
      id: 'department-2',
      name: 'Quality Control',
      status: 'active',
      teamCount: 0,
    })
  })

  it('renders the directory with loaded organization data', async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <OrganizationPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect((await screen.findAllByText('Operations'))[0]).toBeVisible()
  })

  it('shows departments and teams together without tabs', async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <OrganizationPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect((await screen.findAllByText('Operations'))[0]).toBeVisible()
    expect(screen.getByText('Fulfillment')).toBeVisible()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('creates a department from the active-tab action', async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <OrganizationPage />
        </AppProviders>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Add department' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Quality Control' } })
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'QC' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Create department' })).not.toBeInTheDocument(),
    )
    expect(
      (await screen.findByText('Changes saved')).closest('.ant-notification-notice'),
    ).not.toBeNull()
  })

  it('searches and selects staff inline for a team', async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <OrganizationPage />
        </AppProviders>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Open Fulfillment' }))
    fireEvent.change(await screen.findByPlaceholderText('Search staff'), {
      target: { value: 'J2502' },
    })

    expect(await screen.findByRole('checkbox', { name: 'Candidate Tran J2502' })).toBeEnabled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Candidate Tran J2502' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))
    expect(screen.getByRole('checkbox', { name: 'Candidate Tran J2502' })).not.toBeChecked()
    expect(screen.getByText('Member Nguyen')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Member' })).toBeChecked()
    expect(await screen.findByRole('button', { name: 'Remove Member Nguyen' })).toBeInTheDocument()
  }, 15_000)

  it('keeps each team expansion independent from the organization tree', async () => {
    vi.mocked(loadTeams).mockResolvedValue(
      pageOf([
        {
          code: 'FULFILLMENT',
          departmentId: 'department-1',
          id: 'team-1',
          memberCount: 2,
          name: 'Fulfillment',
          status: 'active',
        },
        {
          code: 'QUALITY',
          departmentId: 'department-1',
          id: 'team-2',
          memberCount: 1,
          name: 'Quality',
          status: 'active',
        },
      ]),
    )
    render(
      <MemoryRouter>
        <AppProviders>
          <OrganizationPage />
        </AppProviders>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Open Fulfillment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Quality' }))

    expect(await screen.findAllByPlaceholderText('Search staff')).toHaveLength(2)
  })
})
