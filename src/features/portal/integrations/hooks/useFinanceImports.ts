import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  listAdsUnassignedRows,
  listImportBatches,
  upsertAdsShopMapping,
} from '@/features/portal/finance/api/financeApi'
import { useFeedbackToast } from '@/shared/ui'

import { integrationKeys } from '../api/integrationKeys'

export type FinanceImportSourceType = 'ADS' | 'TRANSACTIONS' | 'SETTLEMENTS'

export const ADS_IMPORT_STATUSES = ['PROCESSING', 'COMPLETED', 'PARTIAL_FAILED', 'FAILED'] as const

export interface UseFinanceImportBatchesParams {
  sourceType: FinanceImportSourceType
  salesChannelCode?: string
  marketplaceCode?: string
  page: number
  pageSize?: number
  shopId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  enabled: boolean
}

export function useFinanceImportBatches({
  sourceType,
  salesChannelCode = 'AMAZON',
  marketplaceCode = sourceType === 'ADS' ? 'US' : 'AMAZON',
  page,
  pageSize = 20,
  shopId,
  status,
  dateFrom,
  dateTo,
  enabled,
}: UseFinanceImportBatchesParams) {
  const dates = {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  }

  return useQuery({
    queryKey: [
      ...integrationKeys.all,
      `${sourceType.toLowerCase()}-imports`,
      { page, shopId, status, ...dates },
    ],
    queryFn: () =>
      listImportBatches({
        page,
        limit: pageSize,
        sourceType,
        salesChannelCode,
        marketplaceCode,
        shopId,
        status,
        ...dates,
      }),
    enabled,
    retry: false,
  })
}

export function useAdsUnassignedRows(enabled: boolean) {
  return useQuery({
    queryKey: [...integrationKeys.all, 'ads-unassigned-rows'],
    queryFn: () => listAdsUnassignedRows({ status: 'PENDING', page: 1, limit: 100 }),
    enabled,
    retry: false,
  })
}

export function useSaveAdsMappingMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()

  return useMutation({
    mutationFn: upsertAdsShopMapping,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...integrationKeys.all, 'ads-unassigned-rows'],
      })
      showFeedbackToast(
        'success',
        'Mapping saved. The unread Amazon email will retry on the next scan.',
      )
      onSuccess?.()
    },
  })
}
