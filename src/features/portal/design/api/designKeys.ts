import type { DesignListParams } from './designApi'

export const designKeys = {
  all: ['portal', 'design'] as const,
  list: (params: DesignListParams) => [...designKeys.all, 'list', params] as const,
  detail: (id: string) => [...designKeys.all, 'detail', id] as const,
  assignees: () => [...designKeys.all, 'assignees'] as const,
  summary: (params: object) => [...designKeys.all, 'summary', params] as const,
  workload: (params: object) => [...designKeys.all, 'workload', params] as const,
  candidates: (params: object) => [...designKeys.all, 'candidates', params] as const,
  submissions: (id: string) => [...designKeys.all, 'submissions', id] as const,
}
