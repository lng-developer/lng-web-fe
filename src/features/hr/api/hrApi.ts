import { apiClient } from '@/shared/api'

type ApiResponse<T> = { success: boolean; data: T }
type OrgRef = { id: string; code?: string; name: string } | null

export type EmployeeProfile = {
  id: string
  accountId?: string | null
  employeeCode: string | null
  fullName: string | null
  gender?: string | null
  birthDate?: string | null
  phoneNumber?: string | null
  address?: string | null
  avatarUrl?: string | null
  avatarAssetId?: string | null
  personalEmail?: string | null
  emergencyContact?: {
    name?: string | null
    phone?: string | null
    relation?: string | null
  } | null
  departmentId: string | null
  teamId: string | null
  department?: OrgRef
  team?: OrgRef
  jobTitle?: string | null
  jobLevel?: string | null
  employmentType?: string | null
  workMode?: string | null
  workEmail?: string | null
  status: string | null
  onboardingStatus: 'PROFILE_INCOMPLETE' | 'READY'
  isDeleted: boolean
  startDate?: string | null
  probationEndDate?: string | null
  endDate?: string | null
  contractType?: string | null
  contractNumber?: string | null
  contractStartDate?: string | null
  contractEndDate?: string | null
  promotionDate?: string | null
  transferDate?: string | null
  dependantDetails?: Array<{
    name: string
    relation: string
    dob?: string | null
    gender?: string | null
  }>
  dependants?: number
  identityCard?: string | null
  taxIdentification?: string | null
  socialInsuranceNumber?: string | null
  bankAccount?: { bankName?: string | null; accountNumber?: string | null } | null
  baseCurrency?: string | null
  baseSalary?: number | null
  allowances?: { lunch?: number; fuel?: number; other?: number }
  responsibilityAllowance?: number | null
  capabilities?: { edit: boolean; delete: boolean; restore: boolean }
}

export type EmployeeProfileList = {
  items: EmployeeProfile[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export type AssignableRole = { id: string; name: string; description: string | null }
export type EmployeeProfileInput = {
  employeeCode: string
  fullName: string
  workEmail?: string | null
  gender?: string | null
  birthDate?: string | null
  phoneNumber?: string | null
  address?: string | null
  avatarAssetId?: string | null
  personalEmail?: string | null
  emergencyContact?: { name?: string | null; phone?: string | null; relation?: string | null }
  departmentId?: string | null
  teamId?: string | null
  jobTitle?: string | null
  jobLevel?: string | null
  employmentType: string
  workMode: string
  startDate: string
  probationEndDate?: string | null
  endDate?: string | null
  status: string
  contractType?: string | null
  contractNumber?: string | null
  contractStartDate?: string | null
  contractEndDate?: string | null
  promotionDate?: string | null
  transferDate?: string | null
  dependantDetails?: Array<{
    name: string
    relation: string
    dob?: string | null
    gender?: string | null
  }>
  dependants?: number
  identityCard?: string | null
  taxIdentification?: string | null
  socialInsuranceNumber?: string | null
  bankAccount?: { bankName?: string | null; accountNumber?: string | null }
  baseCurrency?: string
  baseSalary?: number
  allowances?: { lunch?: number; fuel?: number; other?: number }
  responsibilityAllowance?: number
}
export type StaffProvisioningInput = Omit<
  EmployeeProfileInput,
  'baseCurrency' | 'baseSalary' | 'employmentType' | 'startDate' | 'status' | 'workMode'
> & {
  workEmail: string
  employmentType?: string
  workMode?: string
  startDate?: string
  status?: string
  baseCurrency?: string
  baseSalary?: number
  assignments: Array<{
    roleId: string
    scopeType: 'global' | 'department' | 'team'
    scopeId: string | null
    customPermissionIds: string[]
    overridePermissionIds: null
  }>
}

export type PersonalProfileInput = {
  gender?: string | null
  birthDate?: string | null
  phoneNumber: string
  address: string
  personalEmail: string
  emergencyContact: { name: string; phone: string; relation: string }
  identityCard?: string | null
  taxIdentification?: string | null
  socialInsuranceNumber?: string | null
  bankAccount?: { bankName?: string | null; accountNumber?: string | null }
}

const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function loadEmployeeAvatar(avatarUrl: string) {
  const blob = (await apiClient.get(avatarUrl, { responseType: 'blob' })) as unknown as Blob
  return blobToDataUrl(blob)
}

export async function loadEmployeeProfiles(includeDeleted = false) {
  return unwrap<EmployeeProfileList>(
    await apiClient.get('/api/hr/employee-profiles', { params: { includeDeleted, limit: 100 } }),
  )
}

export async function loadEmployeeProfile(profileId: string, includeSensitive = false) {
  return unwrap<EmployeeProfile>(
    await apiClient.get(`/api/hr/employee-profiles/${profileId}`, { params: { includeSensitive } }),
  )
}

export async function loadAssignableRoles() {
  return unwrap<AssignableRole[]>(await apiClient.get('/api/hr/staff-provisioning/roles'))
}

export async function provisionStaff(input: StaffProvisioningInput) {
  return unwrap<{ profile: EmployeeProfile }>(
    await apiClient.post('/api/hr/staff-provisioning', input),
  )
}

export async function updateEmployeeProfile(profileId: string, input: EmployeeProfileInput) {
  return unwrap<EmployeeProfile>(
    await apiClient.patch(`/api/hr/employee-profiles/${profileId}`, input),
  )
}

export async function uploadEmployeeAvatar(profileId: string, file: File) {
  const body = new FormData()
  body.append('file', file)
  return unwrap<EmployeeProfile>(
    await apiClient.post(`/api/hr/employee-profiles/${profileId}/avatar`, body),
  )
}

export async function deleteEmployeeProfile(profileId: string) {
  return unwrap<EmployeeProfile>(await apiClient.delete(`/api/hr/employee-profiles/${profileId}`))
}

export async function restoreEmployeeProfile(profileId: string) {
  return unwrap<EmployeeProfile>(
    await apiClient.patch(`/api/hr/employee-profiles/${profileId}/restore`),
  )
}

export async function loadMyEmployeeProfile() {
  return unwrap<EmployeeProfile>(await apiClient.get('/api/hr/employee-profiles/me'))
}

export async function updateMyPersonalProfile(input: PersonalProfileInput) {
  return unwrap<EmployeeProfile>(
    await apiClient.patch('/api/hr/employee-profiles/me/personal', input),
  )
}

export async function uploadMyEmployeeAvatar(file: File) {
  const body = new FormData()
  body.append('file', file)
  return unwrap<EmployeeProfile>(await apiClient.post('/api/hr/employee-profiles/me/avatar', body))
}
