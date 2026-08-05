import { apiClient } from '@/shared/api'

type ApiResponse<T> = { success: boolean; data: T }

export type OrganizationList<T> = {
  items: T[]
  pagination?: { page: number; limit: number; total: number; totalPages: number }
}

export type Department = {
  id: string
  name: string
  code: string
  status: string
  teamCount: number
}
export type Team = {
  id: string
  name: string
  code: string
  departmentId: string
  status: string
  memberCount: number
}
export type TeamMember = {
  accountId: string
  email: string | null
  employeeCode?: string | null
  fullName?: string | null
  memberType: 'leader' | 'member'
  profileId?: string | null
  roles: string[]
}
export type TeamMembers = { team: Team; leaders: TeamMember[]; members: TeamMember[] }
export type DepartmentInput = Pick<Department, 'code' | 'name'>
export type TeamInput = Pick<Team, 'code' | 'departmentId' | 'name'>
export type TeamMemberInput = Pick<TeamMember, 'accountId' | 'memberType'>
export type MemberCandidate = {
  accountId: string
  employeeCode: string | null
  fullName: string | null
  id: string
}

function unwrap<T>(response: unknown): T {
  return (response as ApiResponse<T>).data
}

async function get<T>(path: string, params?: Record<string, string | number | undefined>) {
  const response = await apiClient.get<T>(path, { params })
  return unwrap<T>(response)
}

export const loadDepartments = () =>
  get<OrganizationList<Department>>('/api/organization/departments', { limit: 100 })
export const loadTeams = () =>
  get<OrganizationList<Team>>('/api/organization/teams', { limit: 100 })
export const loadTeamMembers = (teamId: string) =>
  get<TeamMembers>(`/api/organization/teams/${teamId}/members`)
export const loadMemberCandidates = () =>
  get<{ items: MemberCandidate[]; total: number }>('/api/organization/member-candidates')
export const createDepartment = async (input: DepartmentInput) =>
  unwrap<Department>(await apiClient.post('/api/organization/departments', input))
export const updateDepartment = async (departmentId: string, input: DepartmentInput) =>
  unwrap<Department>(await apiClient.patch(`/api/organization/departments/${departmentId}`, input))
export const deactivateDepartment = async (departmentId: string) =>
  unwrap<Department>(
    await apiClient.patch(`/api/organization/departments/${departmentId}`, { status: 'inactive' }),
  )
export const createTeam = async (input: TeamInput) =>
  unwrap<Team>(await apiClient.post('/api/organization/teams', input))
export const updateTeam = async (teamId: string, input: TeamInput) =>
  unwrap<Team>(await apiClient.patch(`/api/organization/teams/${teamId}`, input))
export const deactivateTeam = async (teamId: string) =>
  unwrap<Team>(await apiClient.patch(`/api/organization/teams/${teamId}`, { status: 'inactive' }))
export const addTeamMember = async (teamId: string, input: TeamMemberInput) =>
  unwrap<TeamMember>(await apiClient.post(`/api/organization/teams/${teamId}/members`, input))
export const removeTeamMember = async (teamId: string, accountId: string) =>
  unwrap<TeamMember>(
    await apiClient.delete(`/api/organization/teams/${teamId}/members/${accountId}`),
  )
