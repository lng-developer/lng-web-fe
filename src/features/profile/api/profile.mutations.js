import { useMutation } from '@tanstack/react-query'

import { authKeys } from '@/features/auth/api/auth.keys'
import { queryClient } from '@/lib/queryClient'
import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'
import { useAuthStore } from '@/store/useAuthStore'

import { profileKeys } from './profile.keys'
import { unwrapProfileResponse } from './profile.queries'

async function completeMyProfile(payload) {
  return apiClient
    .patch(ENDPOINTS.HR.MY_EMPLOYEE_PROFILE_PERSONAL, payload)
    .then(unwrapProfileResponse)
}

export function useCompleteMyProfileMutation(options = {}) {
  return useMutation({
    mutationFn: completeMyProfile,
    onSuccess: async (profile, variables, context) => {
      const currentUser = useAuthStore.getState().currentUser
      const nextUser = currentUser
        ? { ...currentUser, employeeProfile: profile, profileSetupRequired: false }
        : null

      if (nextUser) {
        useAuthStore.getState().setCurrentUser(nextUser)
        queryClient.setQueryData(authKeys.me(), nextUser)
      }

      await queryClient.invalidateQueries({ queryKey: profileKeys.me() })
      queryClient.setQueryData(profileKeys.me(), profile)
      await options.onSuccess?.(profile, variables, context)
    },
  })
}
