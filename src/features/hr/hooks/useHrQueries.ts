import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  deleteEmployeeProfile,
  type EmployeeProfile,
  loadAssignableRoles,
  loadEmployeeProfile,
  loadEmployeeProfiles,
  loadMyEmployeeProfile,
  restoreEmployeeProfile,
} from '../api/hrApi'
import { hrKeys } from '../api/hrKeys'
import {
  getHrDashboard,
  getMyHrWorkspace,
  getPayrollSettings,
  getTeamHrWorkspace,
  listAnnouncements,
  listMyPayrolls,
  listPayrollAdjustments,
  listPayrollResults,
  listPayrolls,
} from '../api/hrTimeApi'

export function useEmployeeProfilesQuery(
  includeDeleted = false,
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: hrKeys.profiles(includeDeleted),
    queryFn: () => loadEmployeeProfiles(includeDeleted),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export function useEmployeeProfileDetailQuery(
  profileId?: string,
  includeSensitive = false,
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: hrKeys.profile(profileId ?? '', includeSensitive),
    queryFn: () => loadEmployeeProfile(profileId!, includeSensitive),
    enabled: Boolean(profileId) && (options?.enabled ?? true),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useMyEmployeeProfileQuery(options?: { readonly enabled?: boolean }) {
  return useQuery({
    queryKey: hrKeys.myProfile(),
    queryFn: loadMyEmployeeProfile,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export function useAssignableRolesQuery(options?: { readonly enabled?: boolean }) {
  return useQuery({
    queryKey: hrKeys.assignableRoles(),
    queryFn: loadAssignableRoles,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export function useStaffWorkspaceQuery(
  params: { dateKey: string; month: number; year: number },
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: hrKeys.workspaceSelf(params),
    queryFn: () => getMyHrWorkspace(params),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export function useTeamWorkspaceQuery(
  params: { dateKey: string; month: number; year: number },
  rangeDays: 1 | 7 | 30,
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: hrKeys.workspaceTeam(params.dateKey, rangeDays),
    queryFn: () => getTeamHrWorkspace({ ...params, days: rangeDays }),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export function useHrDashboardQuery(
  dateKey: string,
  rangeDays: 1 | 7 | 30,
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: hrKeys.overviewDashboard(rangeDays),
    queryFn: () => getHrDashboard(dateKey, rangeDays),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export function useHrAnnouncementsQuery(options?: { readonly enabled?: boolean }) {
  return useQuery({
    queryKey: hrKeys.overviewAnnouncements(),
    queryFn: () => listAnnouncements({ limit: 100 }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export function usePayrollRunsQuery(
  params: { month: number; year: number; limit?: number },
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: hrKeys.payrollRuns(params.month, params.year),
    queryFn: () => listPayrolls(params),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export function usePayrollResultsQuery(
  params: { month: number; year: number; limit?: number },
  canRead = false,
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: [
      ...hrKeys.payrollResults(params.month, params.year),
      canRead ? 'management' : 'personal',
    ],
    queryFn: () => (canRead ? listPayrollResults(params) : listMyPayrolls(params)),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export function usePayrollAdjustmentsQuery(
  params: { month: number; year: number; limit?: number },
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: hrKeys.payrollAdjustments(params.month, params.year),
    queryFn: () => listPayrollAdjustments(params),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export function usePayrollSettingsQuery(options?: { readonly enabled?: boolean }) {
  return useQuery({
    queryKey: hrKeys.payrollSettings(),
    queryFn: getPayrollSettings,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export function useDeleteEmployeeProfileMutation(options?: {
  readonly onSuccess?: (data: EmployeeProfile, profileId: string) => void | Promise<void>
  readonly onError?: (error: Error) => void
}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (profileId: string) => deleteEmployeeProfile(profileId),
    onSuccess: async (data, profileId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: hrKeys.profilesRoot }),
        queryClient.invalidateQueries({ queryKey: hrKeys.profile(profileId) }),
      ])
      await options?.onSuccess?.(data, profileId)
    },
    onError: (error) => {
      options?.onError?.(error instanceof Error ? error : new Error(String(error)))
    },
  })
}

export function useRestoreEmployeeProfileMutation(options?: {
  readonly onSuccess?: (data: EmployeeProfile, profileId: string) => void | Promise<void>
  readonly onError?: (error: Error) => void
}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (profileId: string) => restoreEmployeeProfile(profileId),
    onSuccess: async (data, profileId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: hrKeys.profilesRoot }),
        queryClient.invalidateQueries({ queryKey: hrKeys.profile(profileId) }),
      ])
      await options?.onSuccess?.(data, profileId)
    },
    onError: (error) => {
      options?.onError?.(error instanceof Error ? error : new Error(String(error)))
    },
  })
}
