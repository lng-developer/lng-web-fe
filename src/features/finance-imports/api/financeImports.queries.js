import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { financeImportsKeys } from './financeImports.keys'

function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

function buildImportFormData({
  dryRun,
  file,
  marketplaceCode,
  salesChannelCode,
  shopId,
  sourceRef,
}) {
  const formData = new FormData()

  formData.append('file', file)
  formData.append('shopId', shopId)
  formData.append('salesChannelCode', salesChannelCode)
  formData.append('marketplaceCode', marketplaceCode)
  if (sourceRef) formData.append('sourceRef', sourceRef)
  formData.append('dryRun', String(dryRun))

  return formData
}

function getImportEndpoint(sourceType) {
  if (sourceType === 'ADS') return ENDPOINTS.FINANCE.IMPORT_ADS
  if (sourceType === 'SETTLEMENTS') return ENDPOINTS.FINANCE.IMPORT_SETTLEMENTS
  return ENDPOINTS.FINANCE.IMPORT_TRANSACTIONS
}

export function useFinanceImportBatchesQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: financeImportsKeys.batches(query),
    queryFn: () => apiClient.get(ENDPOINTS.FINANCE.IMPORT_BATCHES, { params: query }).then(unwrapApiData),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useFinanceImportBatchQuery(batchId, options = {}) {
  return useQuery({
    queryKey: financeImportsKeys.batch(batchId),
    queryFn: () => apiClient.get(ENDPOINTS.FINANCE.IMPORT_BATCH(batchId)).then(unwrapApiData),
    enabled: Boolean(batchId),
    ...options,
  })
}

export function useFinanceImportedDataQuery(sourceType, query = {}, options = {}) {
  return useQuery({
    queryKey: financeImportsKeys.importedData(sourceType, query),
    queryFn: () =>
      apiClient.get(ENDPOINTS.FINANCE.IMPORTED_DATA(sourceType.toLowerCase()), { params: query }).then(unwrapApiData),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useFinanceImportMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sourceType, ...payload }) =>
      apiClient
        .post(getImportEndpoint(sourceType), buildImportFormData(payload), {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(unwrapApiData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeImportsKeys.all }),
  })
}

export function useFinanceImportBatchReprocessMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (batchId) => apiClient.post(ENDPOINTS.FINANCE.IMPORT_BATCH_REPROCESS(batchId)).then(unwrapApiData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeImportsKeys.all }),
  })
}
