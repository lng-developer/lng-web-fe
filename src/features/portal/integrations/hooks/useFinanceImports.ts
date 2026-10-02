import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  listAdsUnassignedRows,
  listImportBatches,
  listImportedFinanceData,
  reprocessImportBatch,
  upsertAdsShopMapping,
} from '@/features/portal/finance/api/financeApi'
import { useFeedbackToast } from '@/shared/ui'

import { integrationKeys } from '../api/integrationKeys'
import { isFinanceImportBatchActive } from './useFinanceImportPolling'

export type FinanceImportSourceType = 'ADS' | 'TRANSACTIONS' | 'SETTLEMENTS'

export const ADS_IMPORT_STATUSES = [
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'PARTIAL_FAILED',
  'FAILED',
] as const

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
  marketplaceCode = 'US',
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
    refetchInterval: (query) =>
      query.state.data?.items.some((batch) => isFinanceImportBatchActive(batch)) ? 5_000 : false,
    refetchIntervalInBackground: false,
  })
}

export function useImportedFinanceData(
  sourceType: FinanceImportSourceType,
  importBatchId: string | undefined,
  query: Record<string, unknown>,
  enabled: boolean,
) {
  const source = sourceType.toLowerCase() as 'ads' | 'transactions' | 'settlements'

  return useQuery({
    queryKey: [...integrationKeys.all, 'imported-data', source, importBatchId, query],
    queryFn: () =>
      listImportedFinanceData(source, {
        importBatchId,
        ...Object.fromEntries(
          Object.entries(query).filter(([, value]) => value !== undefined && value !== ''),
        ),
      }),
    enabled: enabled && Boolean(importBatchId),
    retry: false,
  })
}

export function useReprocessFinanceImportMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()

  return useMutation({
    mutationFn: (batchId: string) => reprocessImportBatch(batchId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: integrationKeys.all })
      showFeedbackToast('success', 'Import batch reprocessed')
      onSuccess?.()
    },
    onError: (error) => showFeedbackToast('error', 'Import batch reprocess failed', error.message),
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
