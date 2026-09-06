import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  cancelVendorSubmission,
  exportVendorSubmissionsCsv,
  getVendorSubmission,
  getVendorSubmissionPayloadPreview,
  getVendorSubmissionSummary,
  listVendorSubmissions,
  markVendorSubmissionFailed,
  reconcileVendorSubmission,
  retryVendorSubmission,
  submitVendorSubmission,
  type VendorSubmission,
  type VendorSubmissionParams,
} from '../api/vendorSubmissionApi'
import { vendorSubmissionKeys } from '../api/vendorSubmissionKeys'

export interface UseVendorSubmissionsQueryParams extends VendorSubmissionParams {
  readonly enabled?: boolean
}

export function useVendorSubmissionsQuery(params: UseVendorSubmissionsQueryParams) {
  const { enabled = true, ...queryParams } = params

  return useQuery({
    queryKey: vendorSubmissionKeys.list(queryParams),
    queryFn: () => listVendorSubmissions(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled,
  })
}

export function useVendorSubmissionSummaryQuery(
  params: Partial<VendorSubmissionParams> = {},
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: vendorSubmissionKeys.summary(params),
    queryFn: () => getVendorSubmissionSummary(params),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export function useVendorSubmissionDetailQuery(
  id?: string,
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: vendorSubmissionKeys.detail(id ?? ''),
    queryFn: () => getVendorSubmission(id!),
    enabled: Boolean(id) && (options?.enabled ?? true),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useVendorSubmissionPayloadQuery(
  id?: string,
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: vendorSubmissionKeys.payload(id ?? ''),
    queryFn: () => getVendorSubmissionPayloadPreview(id!),
    enabled: Boolean(id) && (options?.enabled ?? true),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export interface VendorSubmissionActionVariables {
  readonly kind: 'submit' | 'retry' | 'found' | 'missing' | 'fail' | 'cancel'
  readonly row: VendorSubmission
  readonly externalId?: string
  readonly retryReason?: string
  readonly remoteMissingReason?: string
  readonly remoteFoundReason?: string
}

export function useVendorSubmissionActionMutation(options?: {
  readonly onSuccess?: (
    data: VendorSubmission,
    variables: VendorSubmissionActionVariables,
  ) => void | Promise<void>
  readonly onError?: (error: unknown) => void
}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      kind,
      row,
      externalId,
      retryReason = '',
      remoteMissingReason = '',
      remoteFoundReason = '',
    }: VendorSubmissionActionVariables) => {
      if (kind === 'submit') return submitVendorSubmission(row.id)
      if (kind === 'retry') return retryVendorSubmission(row.id, retryReason)
      if (kind === 'fail') return markVendorSubmissionFailed(row.id, externalId || '')
      if (kind === 'cancel') return cancelVendorSubmission(row.id, externalId || '')
      if (kind === 'missing') {
        return reconcileVendorSubmission(row.id, {
          outcome: 'REMOTE_NOT_FOUND',
          reason: remoteMissingReason,
        })
      }
      if (!externalId) throw new Error('External ID is required')
      return reconcileVendorSubmission(row.id, {
        outcome: 'REMOTE_FOUND',
        vendorExternalOrderId: externalId,
        reason: remoteFoundReason,
      })
    },
    onSuccess: async (data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: vendorSubmissionKeys.all }),
        queryClient.invalidateQueries({ queryKey: vendorSubmissionKeys.detail(variables.row.id) }),
      ])
      await options?.onSuccess?.(data, variables)
    },
    onError: options?.onError,
  })
}

export function useExportVendorSubmissionsCsvMutation(options?: {
  readonly onSuccess?: (data: Blob) => void
  readonly onError?: (error: unknown) => void
}) {
  return useMutation({
    mutationFn: (params: VendorSubmissionParams) => exportVendorSubmissionsCsv(params),
    onSuccess: (result) => {
      const url = URL.createObjectURL(result)
      const link = document.createElement('a')
      link.href = url
      link.download = 'vendor-submissions.csv'
      link.click()
      URL.revokeObjectURL(url)
      options?.onSuccess?.(result)
    },
    onError: options?.onError,
  })
}
