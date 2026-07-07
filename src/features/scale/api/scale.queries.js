import { useQuery } from '@tanstack/react-query'

import { fetchEtsyScaleTasks, fetchScaleGroupTasks } from '@/features/scale/utils/scaleMock'

import { scaleKeys } from './scale.keys'

export function useScaleGroupTasksQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: scaleKeys.groupTasks(query),
    queryFn: () => fetchScaleGroupTasks(query),
    ...options,
  })
}

export function useEtsyScaleTasksQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: scaleKeys.etsyTasks(query),
    queryFn: () => fetchEtsyScaleTasks(query),
    ...options,
  })
}
