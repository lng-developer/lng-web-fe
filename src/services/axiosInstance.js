import axios from 'axios'

import { AUTH_RESPONSE_FIELDS, STORAGE_KEYS } from '@/constants/app'
import { env } from '@/constants/env'
import { ROUTES } from '@/constants/routes'
import { ENDPOINTS } from '@/services/endpoints'

let accessToken = null
let refreshPromise = null

function getStoredRefreshToken() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN)
}

function setStoredRefreshToken(token) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN, token)
}

function clearStoredRefreshToken() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN)
}

export class ApiError extends Error {
  constructor({ message, status, data, code }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
    this.code = code
  }
}

function normalizeApiError(error) {
  if (!axios.isAxiosError(error)) {
    return error
  }

  const status = error.response?.status
  const data = error.response?.data
  const serverMessage =
    typeof data === 'object' && data !== null ? data.message || data.error?.message : undefined

  return new ApiError({
    message: serverMessage || 'errors.api.network',
    status,
    data,
    code: error.code,
  })
}

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  withCredentials: true,
})

const refreshClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  withCredentials: true,
})

export function setAccessToken(token) {
  accessToken = token
}

export function setRefreshToken(token) {
  setStoredRefreshToken(token)
}

export function getAccessToken() {
  return accessToken
}

export function getRefreshToken() {
  return getStoredRefreshToken()
}

export function clearAccessToken() {
  accessToken = null
}

export function setAuthTokens(tokens) {
  setAccessToken(tokens.accessToken)
  setRefreshToken(tokens.refreshToken)
}

export function clearAuthTokens() {
  clearAccessToken()
  clearStoredRefreshToken()
}

function redirectToLogin() {
  if (typeof window === 'undefined' || window.location.pathname === ROUTES.LOGIN) {
    return
  }

  window.location.assign(ROUTES.LOGIN)
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    const currentRefreshToken = getRefreshToken()

    if (!currentRefreshToken) {
      throw new Error('errors.auth.missingRefreshToken')
    }

    refreshPromise = refreshClient
      .post(ENDPOINTS.AUTH.REFRESH, { refreshToken: currentRefreshToken })
      .then((response) => {
        const authData = response.data?.data
        const nextAccessToken = authData?.[AUTH_RESPONSE_FIELDS.ACCESS_TOKEN]
        const nextRefreshToken = authData?.[AUTH_RESPONSE_FIELDS.REFRESH_TOKEN]

        if (!nextAccessToken) {
          throw new Error('errors.auth.missingAccessToken')
        }

        setAccessToken(nextAccessToken)
        if (nextRefreshToken) {
          setRefreshToken(nextRefreshToken)
        }

        return nextAccessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config
    const isUnauthorized = error.response?.status === 401
    const canRefresh =
      isUnauthorized &&
      originalRequest &&
      !originalRequest._retry &&
      originalRequest.url !== ENDPOINTS.AUTH.LOGIN &&
      originalRequest.url !== ENDPOINTS.AUTH.REFRESH

    if (!canRefresh) {
      return Promise.reject(normalizeApiError(error))
    }

    originalRequest._retry = true

    try {
      const nextAccessToken = await refreshAccessToken()

      originalRequest.headers = originalRequest.headers ?? {}
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`

      return apiClient(originalRequest)
    } catch (refreshError) {
      clearAuthTokens()
      redirectToLogin()
      return Promise.reject(normalizeApiError(refreshError))
    }
  },
)
