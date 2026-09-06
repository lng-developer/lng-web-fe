import { useMutation, useQuery } from '@tanstack/react-query'

import {
  exportReportCsv,
  getReportFilterOptions,
  listAdsDaily,
  listChannelPerformance,
  listFinanceBySeller,
  listFinanceByTeam,
  listFinanceSellerDaily,
  type ReportFilters,
} from '../api/reportApi'

export type TabKey = 'overview' | 'sales' | 'operations'
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

  const sellerDaily = useQuery({
    queryKey: ['reports', 'seller-daily', filters],
    queryFn: () => listFinanceSellerDaily(filters),
    enabled: activeTab === 'overview' && profitabilityView === 'daily',
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
    sellerDaily,
    teams,
    channels,
    adsDaily,
    exportCsv,
  }
}
