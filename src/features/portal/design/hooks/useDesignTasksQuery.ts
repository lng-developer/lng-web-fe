import { keepPreviousData, useQuery } from '@tanstack/react-query'

import {
  type DesignListParams,
  type DesignScoreListParams,
  getDesignSummary,
  getDesignScoreSummary,
  getDesignTask,
  getDesignWorkload,
  listDesignAssignees,
  listDesignScores,
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

export function useDesignScoresQuery(
  params: DesignScoreListParams,
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: designKeys.scores(params),
    queryFn: () => listDesignScores(params),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export function useDesignScoreSummaryQuery(
  params: Omit<DesignScoreListParams, 'page' | 'limit' | 'sortBy' | 'sortOrder'>,
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: designKeys.scoreSummary(params),
    queryFn: () => getDesignScoreSummary(params),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}
