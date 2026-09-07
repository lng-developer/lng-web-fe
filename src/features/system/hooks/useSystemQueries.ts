import { useQuery } from '@tanstack/react-query'

import { getSystemDashboard } from '../api/systemDashboardApi'
import { systemKeys } from '../api/systemKeys'

export function useSystemDashboardQuery() {
  return useQuery({
    queryKey: systemKeys.dashboard(),
    queryFn: getSystemDashboard,
    retry: false,
  })
}
