import type { DesignListParams, DesignScoreListParams, PsdFileListParams } from './designApi'

export const designKeys = {
  all: ['portal', 'design'] as const,
  lists: () => [...designKeys.all, 'list'] as const,
  list: (params: DesignListParams) => [...designKeys.all, 'list', params] as const,
  detail: (id: string) => [...designKeys.all, 'detail', id] as const,
  assignees: () => [...designKeys.all, 'assignees'] as const,
  tasks: () => [...designKeys.all, 'list'] as const,
  summaries: () => [...designKeys.all, 'summary'] as const,
  summary: (params: object) => [...designKeys.all, 'summary', params] as const,
  workloads: () => [...designKeys.all, 'workload'] as const,
  workload: (params: object) => [...designKeys.all, 'workload', params] as const,
  psdFileList: () => [...designKeys.all, 'psd-files'] as const,
  psdFiles: (params: PsdFileListParams) => [...designKeys.all, 'psd-files', params] as const,
  submissions: (id: string) => [...designKeys.all, 'submissions', id] as const,
  scores: (params: DesignScoreListParams) => [...designKeys.all, 'scores', params] as const,
  scoreSummary: (params: object) => [...designKeys.all, 'score-summary', params] as const,
}
