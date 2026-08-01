import type { DesignListParams } from './designApi'

export const designKeys = {
  all: ['portal', 'design'] as const,
  list: (params: DesignListParams) => [...designKeys.all, 'list', params] as const,
  detail: (id: string) => [...designKeys.all, 'detail', id] as const,
  assignees: () => [...designKeys.all, 'assignees'] as const,
}
