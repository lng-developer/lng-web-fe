import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  exportShipmentsCsv,
  getShipment,
  listShipments,
  listWebhookLogs,
  recheckShipment,
  recheckSubmittedShipments,
  type Shipment,
  type ShipmentParams,
  type ShipmentStatusInput,
  type ShipmentTrackingInput,
  summarizeShipments,
  updateShipmentStatus,
  updateShipmentTracking,
} from '../api/shipmentApi'
import { shipmentKeys } from '../api/shipmentKeys'

export interface UseShipmentsQueryParams extends ShipmentParams {
  readonly enabled?: boolean
}

export function useShipmentsQuery(params: UseShipmentsQueryParams) {
  const { enabled = true, ...queryParams } = params

  return useQuery({
    queryKey: shipmentKeys.list(queryParams),
    queryFn: () => listShipments(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled,
  })
}

export function useShipmentSummaryQuery(
  params: Omit<ShipmentParams, 'page' | 'limit'>,
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: shipmentKeys.summary(params),
    queryFn: () => summarizeShipments(params),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export function useShipmentDetailQuery(id?: string, options?: { readonly enabled?: boolean }) {
  return useQuery({
    queryKey: shipmentKeys.detail(id ?? ''),
    queryFn: () => getShipment(id!),
    enabled: Boolean(id) && (options?.enabled ?? true),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useShipmentLogsQuery(
  vendorSubmissionId?: string,
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: shipmentKeys.logs(vendorSubmissionId ?? ''),
    queryFn: () =>
      listWebhookLogs({
        page: 1,
        limit: 20,
        vendorSubmissionId: vendorSubmissionId!,
      }),
    enabled: Boolean(vendorSubmissionId) && (options?.enabled ?? true),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useRecheckShipmentMutation(options?: {
  readonly onSuccess?: (data: Shipment, shipmentId: string) => void | Promise<void>
  readonly onError?: (error: unknown) => void
}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: recheckShipment,
    onSuccess: async (data, shipmentId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: shipmentKeys.all }),
        queryClient.invalidateQueries({ queryKey: shipmentKeys.detail(shipmentId) }),
      ])
      await options?.onSuccess?.(data, shipmentId)
    },
    onError: options?.onError,
  })
}

export function useUpdateShipmentTrackingMutation(options?: {
  readonly onSuccess?: (
    data: Shipment,
    variables: { id: string; input: ShipmentTrackingInput },
  ) => void | Promise<void>
  readonly onError?: (error: unknown) => void
}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ShipmentTrackingInput }) =>
      updateShipmentTracking(id, input),
    onSuccess: async (data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: shipmentKeys.all }),
        queryClient.invalidateQueries({ queryKey: shipmentKeys.detail(variables.id) }),
      ])
      await options?.onSuccess?.(data, variables)
    },
    onError: options?.onError,
  })
}

export function useUpdateShipmentStatusMutation(options?: {
  readonly onSuccess?: (
    data: Shipment,
    variables: { id: string; input: ShipmentStatusInput },
  ) => void | Promise<void>
  readonly onError?: (error: unknown) => void
}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ShipmentStatusInput }) =>
      updateShipmentStatus(id, input),
    onSuccess: async (data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: shipmentKeys.all }),
        queryClient.invalidateQueries({ queryKey: shipmentKeys.detail(variables.id) }),
      ])
      await options?.onSuccess?.(data, variables)
    },
    onError: options?.onError,
  })
}

export function useBatchRecheckShipmentsMutation(options?: {
  readonly onSuccess?: () => void | Promise<void>
  readonly onError?: (error: unknown) => void
}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input?: { provider?: string; shopId?: string; limit?: number }) =>
      recheckSubmittedShipments(input ?? { limit: 100 }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: shipmentKeys.all })
      await options?.onSuccess?.()
    },
    onError: options?.onError,
  })
}

export function useExportShipmentsCsvMutation(options?: {
  readonly onSuccess?: (data: Blob) => void
  readonly onError?: (error: unknown) => void
}) {
  return useMutation({
    mutationFn: (params: ShipmentParams) => exportShipmentsCsv(params),
    onSuccess: (result) => {
      const url = URL.createObjectURL(result)
      const link = document.createElement('a')
      link.href = url
      link.download = 'shipments.csv'
      link.click()
      URL.revokeObjectURL(url)
      options?.onSuccess?.(result)
    },
    onError: options?.onError,
  })
}
