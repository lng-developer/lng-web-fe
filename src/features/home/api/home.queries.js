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
        queues: [
          {
            id: 'orders',
            count: 18,
            labelKey: 'home.queues.orders',
            statusKey: 'home.queueStatus.active',
          },
          {
            id: 'scale',
            count: 7,
            labelKey: 'home.queues.scale',
            statusKey: 'home.queueStatus.warning',
          },
          { id: 'qc', count: 5, labelKey: 'home.queues.qc', statusKey: 'home.queueStatus.active' },
        ],
        exceptions: [
          { id: 'missing-psd', count: 4, labelKey: 'home.exceptions.missingPsd' },
          { id: 'shipping-hold', count: 3, labelKey: 'home.exceptions.shippingHold' },
          { id: 'qc-rejected', count: 2, labelKey: 'home.exceptions.qcRejected' },
        ],
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
