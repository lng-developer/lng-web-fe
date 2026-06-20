import { useMutation } from '@tanstack/react-query'

import { AUTH_RESPONSE_FIELDS } from '@/constants/app'
import { queryClient } from '@/lib/queryClient'
import { apiClient, setAuthTokens } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { authKeys } from './auth.keys'

function readAuthTokens(response) {
  const authData = response?.data
  const accessToken = authData?.[AUTH_RESPONSE_FIELDS.ACCESS_TOKEN]
  const refreshToken = authData?.[AUTH_RESPONSE_FIELDS.REFRESH_TOKEN]

  if (!accessToken || !refreshToken) {
    throw new Error('errors.auth.invalidLoginResponse')
  }

  return { accessToken, refreshToken }
}

async function login(payload) {
  const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, payload)
  const tokens = readAuthTokens(response)

  setAuthTokens(tokens)
  queryClient.setQueryData(authKeys.me(), response.data)

  return response.data
export function useLoginMutation() {
  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, payload)
      const authData = response?.data
      const accessToken = authData?.[AUTH_RESPONSE_FIELDS.ACCESS_TOKEN]
      const refreshToken = authData?.[AUTH_RESPONSE_FIELDS.REFRESH_TOKEN]

      if (!accessToken || !refreshToken) {
        throw new Error('errors.auth.invalidLoginResponse')
      }

      setAuthTokens({ accessToken, refreshToken })
      return authData
    },
  })
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (payload) => apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, payload),
  })
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (payload) => apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, payload),
  })
}
