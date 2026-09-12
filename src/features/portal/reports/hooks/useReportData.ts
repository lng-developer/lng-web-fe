import { useMutation, useQuery } from '@tanstack/react-query'

import {
  exportReportCsv,
  getReportFilterOptions,
  listAdsDaily,
  listAdsSellerDaily,
  listChannelPerformance,
  listFinanceBySeller,
  listFinanceByTeam,
  listFinanceCoverage,
  listFinanceOrderProfitability,
  listFinanceSellerDaily,
  type ReportFilters,
} from '../api/reportApi'

export type TabKey =
  | 'overview'
  | 'sales'
  | 'operations'
  | 'order-cost'
  | 'ads-employee'
  | 'sales-profit'
export type ProfitabilityView = 'summary' | 'daily'

export interface UseReportDataParams {
  filters: ReportFilters
  activeTab: TabKey
  profitabilityView: ProfitabilityView
  operationalScope: boolean
}

export const useReportData = ({
  filters,
  activeTab,
  profitabilityView,
  operationalScope,
}: UseReportDataParams) => {
  const options = useQuery({
    queryKey: ['reports', 'filter-options'],
    queryFn: getReportFilterOptions,
  })

  const sellers = useQuery({
    queryKey: ['reports', 'sellers', filters],
    queryFn: () => listFinanceBySeller(filters),
    enabled: activeTab === 'overview' && profitabilityView === 'summary',
  })

  const coverage = useQuery({
    queryKey: ['reports', 'coverage', filters],
    queryFn: () => listFinanceCoverage(filters),
    enabled: activeTab === 'overview',
  })

  const sellerDaily = useQuery({
    queryKey: ['reports', 'seller-daily', filters],
    queryFn: () => listFinanceSellerDaily(filters),
    enabled:
      (activeTab === 'overview' && profitabilityView === 'daily') || activeTab === 'sales-profit',
  })

  const orderProfitability = useQuery({
    queryKey: ['reports', 'order-profitability', filters],
    queryFn: () => listFinanceOrderProfitability(filters),
    enabled: activeTab === 'order-cost',
  })

  const adsSellerDaily = useQuery({
    queryKey: ['reports', 'ads-seller-daily', filters],
    queryFn: () => listAdsSellerDaily(filters),
    enabled: activeTab === 'ads-employee',
  })

  const teams = useQuery({
    queryKey: ['reports', 'teams', filters],
    queryFn: () => listFinanceByTeam(filters),
    enabled: activeTab === 'operations',
  })

  const channels = useQuery({
    queryKey: ['reports', 'channels', filters],
    queryFn: () => listChannelPerformance(filters),
    enabled: activeTab === 'sales' && operationalScope,
  })

  const adsDaily = useQuery({
    queryKey: ['reports', 'ads-daily', filters],
    queryFn: () => listAdsDaily(filters),
    enabled: activeTab === 'sales' && operationalScope,
  })

  const exportCsv = useMutation({
    mutationFn: () => exportReportCsv(filters),
    onSuccess: (result) => {
      const url = URL.createObjectURL(result)
      const link = document.createElement('a')
      link.href = url
      link.download = 'reports.csv'
      link.click()
      URL.revokeObjectURL(url)
    },
  })

  return {
    options,
    sellers,
    coverage,
    sellerDaily,
    orderProfitability,
    adsSellerDaily,
    teams,
    channels,
    adsDaily,
    exportCsv,
  }
}
