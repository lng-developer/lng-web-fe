import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  confirmCustomization,
  type CustomizationParams,
  type CustomizationRow,
  failCustomization,
  getCustomizationSummary,
  listCustomizations,
  retryCustomization,
} from '../api/customizationApi'
import { customizationKeys } from '../api/customizationKeys'

export function useCustomizationsQuery(params: CustomizationParams) {
  return useQuery({
    queryKey: customizationKeys.list(params),
    queryFn: () => listCustomizations(params),
    retry: false,
  })
}

export function useCustomizationSummaryQuery(params: CustomizationParams = { blockedOnly: true }) {
  return useQuery({
    queryKey: customizationKeys.summary(params),
    queryFn: () => getCustomizationSummary(params),
    retry: false,
  })
}

export function useCustomizationActionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      kind,
      row,
      failureReason,
    }: {
      kind: 'retry' | 'confirm' | 'fail'
      row: CustomizationRow
      failureReason?: string
    }) => {
      if (kind === 'retry') return retryCustomization(row.id)
      if (kind === 'confirm') return confirmCustomization(row.id)
      return failCustomization(row.id, failureReason?.trim() ?? '')
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customizationKeys.all })
    },
  })
}
