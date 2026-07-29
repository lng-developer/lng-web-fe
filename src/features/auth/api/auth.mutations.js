import { useMutation } from '@tanstack/react-query'

import { AUTH_RESPONSE_FIELDS } from '@/constants/app'
import { queryClient } from '@/lib/queryClient'
import { apiClient, clearAuthTokens, setAuthTokens } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'
import { useAuthStore } from '@/store/useAuthStore'

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

function toCurrentUser(session) {
  return {
    account: session?.account ?? null,
    roles: Array.isArray(session?.roles) ? session.roles : [],
    permissions: Array.isArray(session?.permissions) ? session.permissions : [],
    scopes: Array.isArray(session?.scopes) ? session.scopes : [],
    profileSetupRequired: Boolean(session?.profileSetupRequired),
  }
}

async function login(payload, profileSetupRequired) {
  const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, payload)
  const tokens = readAuthTokens(response)

  setAuthTokens(tokens)
  queryClient.setQueryData(authKeys.me(), {
    ...toCurrentUser(response.data),
    profileSetupRequired: profileSetupRequired ?? Boolean(response.data?.profileSetupRequired),
  })

  return response.data
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

  let session
  try {
    session = await login(
      { identifier: email, password: payload.newPassword },
      currentUser.profileSetupRequired,
    )
  } catch (error) {
    clearAuthTokens()
    useAuthStore.getState().clearCurrentUser()
    throw error
  }

  const nextUser = {
    ...toCurrentUser(session),
    account,
    profileSetupRequired: Boolean(currentUser.profileSetupRequired),
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
