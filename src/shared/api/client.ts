import axios from 'axios'

import { env } from '@/shared/config/env'

import { normalizeApiError } from './apiError'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
})

apiClient.interceptors.response.use(
  (response) => response.data,
  (error: unknown) => Promise.reject(normalizeApiError(error)),
)
