import { useMutation } from '@tanstack/react-query'

import { AUTH_RESPONSE_FIELDS } from '@/constants/app'
import { queryClient } from '@/lib/queryClient'
import { apiClient, clearAuthTokens, setAuthTokens } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'
import { useAuthStore } from '@/store/useAuthStore'

import { resolveCurrentUser } from '../utils/currentUser'
import { authKeys } from './auth.keys'
import { fetchCurrentUser } from './auth.queries'

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
  try {
    const currentUser = resolveCurrentUser(await fetchCurrentUser())
    queryClient.setQueryData(authKeys.me(), currentUser)

    return currentUser
  } catch (error) {
    clearAuthTokens()
    queryClient.removeQueries({ queryKey: authKeys.me() })
    throw error
  }
}

async function changeOwnPassword(payload) {
  const response = await apiClient.post(ENDPOINTS.AUTH.CHANGE_OWN_PASSWORD, payload)
  const account = response?.data

  if (!account) {
    throw new Error('errors.auth.invalidLoginResponse')
  }

  const currentUser = useAuthStore.getState().currentUser
  const email = currentUser?.account?.email

  if (!email) {
    throw new Error('errors.auth.invalidLoginResponse')
  }

  let freshUser
  try {
    freshUser = await login({ identifier: email, password: payload.newPassword })
  } catch (error) {
    clearAuthTokens()
    useAuthStore.getState().clearCurrentUser()
    throw error
  }

  const nextUser = {
    ...freshUser,
    account,
  }

  useAuthStore.getState().setCurrentUser(nextUser)
  queryClient.setQueryData(authKeys.me(), nextUser)

  return account
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: login,
  })
}

export function useChangeOwnPasswordMutation() {
  return useMutation({
    mutationFn: changeOwnPassword,
  })
}
