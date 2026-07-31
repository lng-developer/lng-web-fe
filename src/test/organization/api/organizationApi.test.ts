import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  addTeamMember,
  createDepartment,
  createTeam,
  deactivateDepartment,
  deactivateTeam,
  loadMemberCandidates,
  removeTeamMember,
  updateDepartment,
  updateTeam,
} from '@/features/organization/api/organizationApi'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({
  apiClient: { delete: vi.fn(), get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}))

describe('organizationApi mutations', () => {
  beforeEach(() => {
    vi.mocked(apiClient.delete).mockResolvedValue({ success: true, data: {} })
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: { items: [], total: 0 } })
    vi.mocked(apiClient.patch).mockResolvedValue({ success: true, data: {} })
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: {} })
  })

  it('uses the existing Organization write contracts', async () => {
    await createDepartment({ code: 'OPS', name: 'Operations' })
    await updateDepartment('department-1', { code: 'OPS', name: 'Operations' })
    await deactivateDepartment('department-1')
    await createTeam({ code: 'FULFILLMENT', departmentId: 'department-1', name: 'Fulfillment' })
    await updateTeam('team-1', {
      code: 'FULFILLMENT',
      departmentId: 'department-1',
      name: 'Fulfillment',
    })
    await deactivateTeam('team-1')
    await addTeamMember('team-1', { accountId: 'account-1', memberType: 'leader' })
    await removeTeamMember('team-1', 'account-1')
    await loadMemberCandidates()

    expect(apiClient.post).toHaveBeenCalledWith('/api/organization/departments', {
      code: 'OPS',
      name: 'Operations',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/organization/departments/department-1', {
      code: 'OPS',
      name: 'Operations',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/organization/departments/department-1', {
      status: 'inactive',
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/organization/teams', {
      code: 'FULFILLMENT',
      departmentId: 'department-1',
      name: 'Fulfillment',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/organization/teams/team-1', {
      code: 'FULFILLMENT',
      departmentId: 'department-1',
      name: 'Fulfillment',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/organization/teams/team-1', {
      status: 'inactive',
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/organization/teams/team-1/members', {
      accountId: 'account-1',
      memberType: 'leader',
    })
    expect(apiClient.delete).toHaveBeenCalledWith(
      '/api/organization/teams/team-1/members/account-1',
    )
    expect(apiClient.get).toHaveBeenCalledWith('/api/organization/member-candidates', {
      params: undefined,
    })
  })
})
