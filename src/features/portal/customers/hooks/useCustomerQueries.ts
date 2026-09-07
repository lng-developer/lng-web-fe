import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addCustomerNote,
  type CustomerCareStatus,
  type CustomerListParams,
  exportCustomersCsv,
  getCustomer,
  getCustomerSummary,
  getCustomerTimeline,
  listCustomers,
  updateCustomerCareStatus,
} from '../api/customerApi'
import { customerKeys } from '../api/customerKeys'

export function useCustomersQuery(params: CustomerListParams) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => listCustomers(params),
    placeholderData: keepPreviousData,
  })
}

export function useCustomerSummaryQuery(params: Partial<CustomerListParams>) {
  return useQuery({
    queryKey: customerKeys.summary(params),
    queryFn: () => getCustomerSummary(params),
  })
}

export function useCustomerDetailQuery(customerId: string | null) {
  return useQuery({
    queryKey: customerId
      ? customerKeys.detail(customerId)
      : (['customers', 'detail', 'empty'] as const),
    queryFn: () => getCustomer(customerId as string),
    enabled: Boolean(customerId),
  })
}

export function useCustomerTimelineQuery(customerId: string | null) {
  return useQuery({
    queryKey: customerId
      ? customerKeys.timeline(customerId)
      : (['customers', 'timeline', 'empty'] as const),
    queryFn: () => getCustomerTimeline(customerId as string),
    enabled: Boolean(customerId),
  })
}

export function useUpdateCustomerCareStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CustomerCareStatus }) =>
      updateCustomerCareStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.all })
    },
  })
}

export function useAddCustomerNoteMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => addCustomerNote(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.all })
    },
  })
}

export function useExportCustomersCsvMutation(params: CustomerListParams) {
  return useMutation({
    mutationFn: () => exportCustomersCsv(params),
    onSuccess: (result) => {
      const url = URL.createObjectURL(result)
      const link = document.createElement('a')
      link.href = url
      link.download = 'customers.csv'
      link.click()
      URL.revokeObjectURL(url)
    },
  })
}
