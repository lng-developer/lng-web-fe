import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { reportsKeys } from './reports.keys'

function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

function useReportQuery(queryKey, path, query, options) {
  return useQuery({
    queryKey,
    queryFn: () => apiClient.get(path, { params: query }).then(unwrapApiData),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useFinanceDailyProfitQuery(query = {}, options = {}) {
  return useReportQuery(
    reportsKeys.dailyProfit(query),
    ENDPOINTS.REPORTS.FINANCE_DAILY_PROFIT,
    query,
    options,
  )
}

export function useFinanceBySellerQuery(query = {}, options = {}) {
  return useReportQuery(
    reportsKeys.bySeller(query),
    ENDPOINTS.REPORTS.FINANCE_BY_SELLER,
    query,
    options,
  )
}

export function useFinanceByTeamQuery(query = {}, options = {}) {
  return useReportQuery(
    reportsKeys.byTeam(query),
    ENDPOINTS.REPORTS.FINANCE_BY_TEAM,
    query,
    options,
  )
}
