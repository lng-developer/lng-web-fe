import { useQuery } from '@tanstack/react-query'

import { homeKeys } from './home.keys'

// Demo: thay bằng `apiClient.get(ENDPOINTS.HOME.SUMMARY)` khi có API thực tế
// (xem @/services/axiosInstance, @/services/endpoints). Hàm trả về Promise để giữ đúng shape của queryFn.
function fetchHomeSummary() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        totalUsers: 128,
        totalOrders: 56,
        totalRevenue: 102_400_000,
      })
    }, 500)
  })
}

export function useHomeSummaryQuery() {
  return useQuery({
    queryKey: homeKeys.summary(),
    queryFn: fetchHomeSummary,
  })
}
