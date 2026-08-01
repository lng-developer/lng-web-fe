import type { WorkScoreListParams } from './workScoreApi'

export const workScoreKeys = {
  all: ['work-scores'] as const,
  list: (params: WorkScoreListParams) => [...workScoreKeys.all, 'list', params] as const,
  summary: (params: WorkScoreListParams) => [...workScoreKeys.all, 'summary', params] as const,
  detail: (id: string) => [...workScoreKeys.all, 'detail', id] as const,
}
