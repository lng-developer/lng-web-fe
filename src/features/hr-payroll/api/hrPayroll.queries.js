import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import {
  mapPayrollAdjustment,
  mapPayrollResult,
  mapPayrollRun,
  normalizePayrollQuery,
  unwrapPayrollResponse,
} from '../utils/hrPayrollApi.js'

export {
  buildMarkPaidPayload,
  formatVnd,
  mapPayrollAdjustment,
  mapPayrollResult,
  mapPayrollRun,
  normalizePayrollQuery,
  unwrapPayrollResponse,
} from '../utils/hrPayrollApi.js'

export const hrPayrollKeys = {
  all: ['hr-payroll'],
  runs: (query) => [...hrPayrollKeys.all, 'runs', query],
  results: (query) => [...hrPayrollKeys.all, 'results', query],
  result: (id) => [...hrPayrollKeys.all, 'result', id],
  run: (id) => [...hrPayrollKeys.all, 'run', id],
  mine: (query) => [...hrPayrollKeys.all, 'mine', query],
  adjustments: (query) => [...hrPayrollKeys.all, 'adjustments', query],
}

function mapCollection(payload, mapper) {
  if (!payload || !Array.isArray(payload.items)) return payload
  return { ...payload, items: payload.items.map(mapper) }
}

export function usePayrollRunsQuery(params, options = {}) {
  const query = normalizePayrollQuery(params)
  return useQuery({
    queryKey: hrPayrollKeys.runs(query),
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.HR.PAYROLLS, { params: query })
        .then(unwrapPayrollResponse)
        .then((payload) => mapCollection(payload, mapPayrollRun)),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function usePayrollRunQuery(id, options = {}) {
  return useQuery({
    queryKey: hrPayrollKeys.run(id),
    queryFn: () =>
      apiClient.get(ENDPOINTS.HR.PAYROLL_RUN(id)).then(unwrapPayrollResponse).then(mapPayrollRun),
    enabled: Boolean(id) && options.enabled !== false,
    ...options,
  })
}

export function usePayrollResultsQuery(params, options = {}) {
  const query = normalizePayrollQuery(params)
  return useQuery({
    queryKey: hrPayrollKeys.results(query),
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.HR.PAYROLL_RESULTS, { params: query })
        .then(unwrapPayrollResponse)
        .then((payload) => mapCollection(payload, mapPayrollResult)),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function usePayrollResultQuery(id, options = {}) {
  return useQuery({
    queryKey: hrPayrollKeys.result(id),
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.HR.PAYROLL_RESULT(id))
        .then(unwrapPayrollResponse)
        .then(mapPayrollResult),
    enabled: Boolean(id) && options.enabled !== false,
    ...options,
  })
}

export function useMyPayslipsQuery(params, options = {}) {
  const query = normalizePayrollQuery(params)
  return useQuery({
    queryKey: hrPayrollKeys.mine(query),
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.HR.MY_PAYROLLS, { params: query })
        .then(unwrapPayrollResponse)
        .then((payload) => mapCollection(payload, mapPayrollResult)),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function usePayrollAdjustmentsQuery(params, options = {}) {
  const query = normalizePayrollQuery(params)
  return useQuery({
    queryKey: hrPayrollKeys.adjustments(query),
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.HR.PAYROLL_ADJUSTMENTS, { params: query })
        .then(unwrapPayrollResponse)
        .then((payload) => mapCollection(payload, mapPayrollAdjustment)),
    placeholderData: keepPreviousData,
    ...options,
  })
}
