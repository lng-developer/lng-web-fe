import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

import {
  expireSession,
  getAccessToken,
  hasRefreshSession,
  setAccessToken,
} from '@/shared/auth/session'
import { env } from '@/shared/config/env'

import { normalizeApiError } from './apiError'

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else if (token) prom.resolve(token)
  })
  failedQueue = []
}

export const refreshClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
  withCredentials: true,
})

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
  withCredentials: true,
})

export const uploadApiClient = axios.create({
  baseURL: env.uploadApiBaseUrl,
  timeout: 120_000,
  withCredentials: true,
})

apiClient.interceptors.request.use((request) => {
  const token = getAccessToken()
  if (token) request.headers.Authorization = `Bearer ${token}`
  return request
})

uploadApiClient.interceptors.request.use((request) => {
  const token = getAccessToken()
  if (token) request.headers.Authorization = `Bearer ${token}`
  return request
})

const setAuthHeader = (request: InternalAxiosRequestConfig, token: string) => {
  if (!request.headers) {
    request.headers = new axios.AxiosHeaders()
  }
  if (typeof request.headers.set === 'function') {
    request.headers.set('Authorization', `Bearer ${token}`)
  }
  request.headers.Authorization = `Bearer ${token}`
}

const handleAuthError = async (error: unknown, client: AxiosInstance): Promise<unknown> => {
  const apiError = normalizeApiError(error)
  const originalRequest = axios.isAxiosError(error)
    ? (error.config as RetryableRequestConfig | undefined)
    : undefined
  const requestUrl = originalRequest?.url
  const cleanUrl = requestUrl?.split('?')[0] ?? ''

  if (apiError.status === 401) {
    if (cleanUrl === '/api/auth/login' || cleanUrl.endsWith('/api/auth/login')) {
      return Promise.reject(apiError)
    }

    if (cleanUrl === '/api/auth/refresh' || cleanUrl.endsWith('/api/auth/refresh')) {
      expireSession()
      return Promise.reject(apiError)
    }

    if (originalRequest?._retry) {
      expireSession()
      return Promise.reject(apiError)
    }

    if (hasRefreshSession()) {
      if (originalRequest) {
        originalRequest._retry = true
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          if (originalRequest) {
            setAuthHeader(originalRequest, token)
            return client(originalRequest)
          }
          return Promise.reject(apiError)
        })
      }

      isRefreshing = true

      try {
        const refreshResponse = await refreshClient.post(
          '/api/auth/refresh',
          {},
          {
            adapter: originalRequest?.adapter || client.defaults.adapter,
          },
        )
        const responseData = refreshResponse.data
        const newAccessToken =
          responseData?.data?.accessToken ??
          responseData?.accessToken ??
          responseData?.data?.token ??
          responseData?.token ??
          (typeof responseData === 'string' ? responseData : null)

        if (!newAccessToken) {
          throw new Error('No access token received from refresh endpoint')
        }

        setAccessToken(newAccessToken)
        processQueue(null, newAccessToken)
        isRefreshing = false

        if (originalRequest) {
          setAuthHeader(originalRequest, newAccessToken)
          return client(originalRequest)
        }
        return Promise.reject(apiError)
      } catch (refreshError) {
        const normalizedRefreshError = normalizeApiError(refreshError)
        processQueue(normalizedRefreshError, null)
        isRefreshing = false
        expireSession()
        return Promise.reject(normalizedRefreshError)
      }
    }

    expireSession()
    return Promise.reject(apiError)
  }

  return Promise.reject(apiError)
}

apiClient.interceptors.response.use(
  (response) => response.data,
  (error: unknown) => handleAuthError(error, apiClient),
)

uploadApiClient.interceptors.response.use(
  (response) => response.data,
  (error: unknown) => handleAuthError(error, uploadApiClient),
)
