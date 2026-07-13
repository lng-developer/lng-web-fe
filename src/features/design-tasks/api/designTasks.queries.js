import { useQuery } from '@tanstack/react-query'

import { fetchDesignTasks } from '@/features/design-tasks/utils/designTasksMock'

import { designTasksKeys } from './designTasks.keys'

export function useDesignTasksQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: designTasksKeys.list(query),
    queryFn: () => fetchDesignTasks(query),
    ...options,
  })
}
