import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import {
  mapPayrollAdjustment,
  mapPayrollEmailOutcome,
  mapPayrollRun,
} from '../utils/hrPayrollApi.js'
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
    apiClient
      .post(`${ENDPOINTS.HR.PAYROLLS}/run`, payload)
      .then(unwrapPayrollResponse)
      .then(mapPayrollRun),
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
    apiClient
      .post(ENDPOINTS.HR.PAYROLL_MARK_PAID(payrollRunId), payload)
      .then(unwrapPayrollResponse),
  )
}

export function useEmailPayrollMutation() {
  return usePayrollMutation((payrollRunId) =>
    apiClient
      .post(ENDPOINTS.HR.PAYROLL_EMAIL(payrollRunId), {})
      .then(unwrapPayrollResponse)
      .then(mapPayrollEmailOutcome),
  )
}

function usePayrollAdjustmentMutation(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    retry: false,
    onSuccess: (adjustment) => {
      queryClient.invalidateQueries({ queryKey: [...hrPayrollKeys.all, 'adjustments'] })
      if (adjustment.draftPayrollRefreshed)
        queryClient.invalidateQueries({ queryKey: [...hrPayrollKeys.all, 'runs'] })
    },
  })
}

export function useCreatePayrollAdjustmentMutation() {
  return usePayrollAdjustmentMutation((payload) =>
    apiClient
      .post(ENDPOINTS.HR.PAYROLL_ADJUSTMENTS, payload)
      .then(unwrapPayrollResponse)
      .then(mapPayrollAdjustment),
  )
}

export function useUpdatePayrollAdjustmentMutation() {
  return usePayrollAdjustmentMutation(({ adjustmentId, payload }) =>
    apiClient
      .patch(ENDPOINTS.HR.PAYROLL_ADJUSTMENT(adjustmentId), payload)
      .then(unwrapPayrollResponse)
      .then(mapPayrollAdjustment),
  )
}

export function useCancelPayrollAdjustmentMutation() {
  return usePayrollAdjustmentMutation(({ adjustmentId, expectedVersion }) =>
    apiClient
      .delete(ENDPOINTS.HR.PAYROLL_ADJUSTMENT(adjustmentId), { data: { expectedVersion } })
      .then(unwrapPayrollResponse)
      .then(mapPayrollAdjustment),
  )
}
