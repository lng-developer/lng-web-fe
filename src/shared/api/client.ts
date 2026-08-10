import axios from 'axios'

import { expireSession, getAccessToken, setAccessToken } from '@/shared/auth/session'
import { env } from '@/shared/config/env'

import { normalizeApiError } from './apiError'

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

apiClient.interceptors.response.use(
  (response) => response.data,
  (error: unknown) => {
    const apiError = normalizeApiError(error)
    const requestUrl = axios.isAxiosError(error) ? error.config?.url : undefined
    if (apiError.status === 401 && requestUrl === '/api/auth/refresh') expireSession()
    else if (apiError.status === 401 && requestUrl !== '/api/auth/login') setAccessToken(null)
    return Promise.reject(apiError)
  },
)

uploadApiClient.interceptors.response.use(
  (response) => response.data,
  (error: unknown) => Promise.reject(normalizeApiError(error)),
)
