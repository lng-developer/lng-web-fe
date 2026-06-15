import axios from 'axios'

import { env } from '@/constants/env'
import { ROUTES } from '@/constants/routes'
import { ENDPOINTS } from '@/services/endpoints'

let accessToken = null
let refreshPromise = null

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

export function getAccessToken() {
  return accessToken
}

export function clearAccessToken() {
  accessToken = null
}

function redirectToLogin() {
  if (typeof window === 'undefined' || window.location.pathname === ROUTES.LOGIN) {
    return
  }

  window.location.assign(ROUTES.LOGIN)
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post(ENDPOINTS.AUTH.REFRESH)
      .then((response) => {
        const nextAccessToken = response.data?.access_token

        if (!nextAccessToken) {
          throw new Error('Missing access_token from refresh response')
        }

        setAccessToken(nextAccessToken)
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
      originalRequest.url !== ENDPOINTS.AUTH.REFRESH

    if (!canRefresh) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const nextAccessToken = await refreshAccessToken()

      originalRequest.headers = originalRequest.headers ?? {}
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`

      return apiClient(originalRequest)
    } catch (refreshError) {
      clearAccessToken()
      redirectToLogin()
      return Promise.reject(refreshError)
    }
  },
)
