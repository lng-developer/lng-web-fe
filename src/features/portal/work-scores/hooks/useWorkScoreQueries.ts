import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getWorkScore,
  getWorkScoreSummary,
  listWorkScoreRules,
  listWorkScores,
  upsertWorkScoreRule,
  type WorkScoreListParams,
  type WorkScoreRuleInput,
} from '../api/workScoreApi'
import { workScoreKeys } from '../api/workScoreKeys'

export function useWorkScoresQuery(params: WorkScoreListParams) {
  return useQuery({
    queryKey: workScoreKeys.list(params),
    queryFn: () => listWorkScores(params),
    retry: false,
  })
}

export function useWorkScoreSummaryQuery(params: WorkScoreListParams) {
  return useQuery({
    queryKey: workScoreKeys.summary(params),
    queryFn: () => getWorkScoreSummary(params),
    retry: false,
  })
}

export function useWorkScoreDetailQuery(selectedId?: string) {
  return useQuery({
    queryKey: workScoreKeys.detail(selectedId ?? ''),
    queryFn: () => getWorkScore(selectedId!),
    enabled: Boolean(selectedId),
    retry: false,
  })
}

export function useWorkScoreRulesQuery(enabled = true) {
  return useQuery({
    queryKey: workScoreKeys.rules(),
    queryFn: listWorkScoreRules,
    enabled,
    retry: false,
  })
}

export function useUpsertWorkScoreRuleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: WorkScoreRuleInput) => upsertWorkScoreRule(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workScoreKeys.rules() })
    },
  })
}
