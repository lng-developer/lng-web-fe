import { keepPreviousData, useQuery } from '@tanstack/react-query'

import {
  type DesignListParams,
  getDesignSummary,
  getDesignTask,
  getDesignWorkload,
  listDesignAssignees,
  listDesignTasks,
  listPsdFiles,
  type PsdFileListParams,
} from '../api/designApi'
import { designKeys } from '../api/designKeys'

export interface UseDesignTasksQueryParams extends DesignListParams {
  readonly enabled?: boolean
}

export function useDesignTasksQuery(params: UseDesignTasksQueryParams) {
  const { enabled = true, ...queryParams } = params

  return useQuery({
    queryKey: designKeys.list(queryParams),
    queryFn: () => listDesignTasks(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled,
  })
}

export function useDesignTaskDetailQuery(id?: string, options?: { readonly enabled?: boolean }) {
  return useQuery({
    queryKey: designKeys.detail(id ?? ''),
    queryFn: () => getDesignTask(id!),
    enabled: Boolean(id) && (options?.enabled ?? true),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useDesignAssigneesQuery(options?: { readonly enabled?: boolean }) {
  return useQuery({
    queryKey: designKeys.assignees(),
    queryFn: listDesignAssignees,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export function useDesignSummaryQuery(params: object, options?: { readonly enabled?: boolean }) {
  return useQuery({
    queryKey: designKeys.summary(params),
    queryFn: () => getDesignSummary(params),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export function useDesignWorkloadQuery(params: object, options?: { readonly enabled?: boolean }) {
  return useQuery({
    queryKey: designKeys.workload(params),
    queryFn: () => getDesignWorkload(params),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export function usePsdFilesQuery(
  params: PsdFileListParams,
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: designKeys.psdFiles(params),
    queryFn: () => listPsdFiles(params),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}
