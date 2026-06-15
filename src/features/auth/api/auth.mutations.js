import { useMutation } from '@tanstack/react-query'

import { AUTH_RESPONSE_FIELDS } from '@/constants/app'
import { apiClient, setAuthTokens } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

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

  return response.data
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: login,
  })
}
