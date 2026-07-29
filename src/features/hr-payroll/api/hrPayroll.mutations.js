import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { hrPayrollKeys, unwrapPayrollResponse } from './hrPayroll.queries.js'

function usePayrollMutation(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hrPayrollKeys.all }),
  })
}

export function useRunPayrollMutation() {
  return usePayrollMutation((payload) =>
    apiClient.post(`${ENDPOINTS.HR.PAYROLLS}/run`, payload).then(unwrapPayrollResponse),
  )
}

export function useFinalizePayrollMutation() {
  return usePayrollMutation(({ payrollRunId, expectedVersion }) =>
    apiClient
      .post(ENDPOINTS.HR.PAYROLL_FINALIZE(payrollRunId), { expectedVersion })
      .then(unwrapPayrollResponse),
  )
}

export function useMarkPayrollPaidMutation() {
  return usePayrollMutation(({ payrollRunId, payload }) =>
    apiClient.post(ENDPOINTS.HR.PAYROLL_MARK_PAID(payrollRunId), payload).then(unwrapPayrollResponse),
  )
}

export function useEmailPayrollMutation() {
  return usePayrollMutation((payrollRunId) =>
    apiClient.post(ENDPOINTS.HR.PAYROLL_EMAIL(payrollRunId), {}).then(unwrapPayrollResponse),
  )
}

export function useCreatePayrollAdjustmentMutation() {
  return usePayrollMutation((payload) => apiClient.post(ENDPOINTS.HR.PAYROLL_ADJUSTMENTS, payload).then(unwrapPayrollResponse))
}
