import { QueryClient } from '@tanstack/react-query'
import axios from 'axios'

import { ApiError } from '@/shared/api/apiError'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // Do not retry client 4xx errors (400, 401, 403, 404, 422, etc.)
        if (error instanceof ApiError && typeof error.status === 'number') {
          if (error.status >= 400 && error.status < 500) {
            return false
          }
        }
        if (axios.isAxiosError(error) && error.response?.status) {
          const status = error.response.status
          if (status >= 400 && status < 500) {
            return false
          }
        }
        return failureCount < 2
      },
    },
  },
})
