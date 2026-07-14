import { useQuery } from '@tanstack/react-query'

import { fetchQcTasks } from '@/features/qc/utils/qcMock'

import { qcKeys } from './qc.keys'

export function useQcTasksQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: qcKeys.tasks(query),
    queryFn: () => fetchQcTasks(query),
    ...options,
  })
}
