import axios from 'axios'

import { env } from '@/constants/env'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error),
)
