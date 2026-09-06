import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useFeedbackToast } from '@/shared/ui'

import {
  exportFinanceSnapshotsCsv,
  type FinanceParams,
  recalculateOrder,
  recalculateOrderItem,
} from '../api/financeApi'

export const useFinanceMutations = (queryParams: FinanceParams = {}) => {
  const { t } = useTranslation()
  const client = useQueryClient()
  const toast = useFeedbackToast()

  const recalculate = useMutation({
    mutationFn: recalculateOrder,
    onSuccess: async (_, orderId) => {
      toast('success', t('finance.feedback.recalculated'))
      await Promise.all([
        client.invalidateQueries({ queryKey: ['finance', 'orders', orderId] }),
        client.invalidateQueries({ queryKey: ['finance', 'snapshots'] }),
      ])
    },
    onError: (error: Error) => toast('error', t('finance.feedback.failed'), error.message),
  })

  const recalculateItem = useMutation({
    mutationFn: recalculateOrderItem,
    onSuccess: async (_, itemId) => {
      toast('success', t('finance.feedback.recalculated'))
      await Promise.all([
        client.invalidateQueries({ queryKey: ['finance', 'order-items', itemId] }),
        client.invalidateQueries({ queryKey: ['finance', 'orders'] }),
        client.invalidateQueries({ queryKey: ['finance', 'snapshots'] }),
      ])
    },
    onError: (error: Error) => toast('error', t('finance.feedback.failed'), error.message),
  })

  const exportCsv = useMutation({
    mutationFn: () => exportFinanceSnapshotsCsv(queryParams),
    onSuccess: (result) => {
      const url = URL.createObjectURL(result as unknown as Blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'finance-snapshots.csv'
      link.click()
      URL.revokeObjectURL(url)
    },
    onError: (error: Error) => toast('error', t('finance.feedback.failed'), error.message),
  })

  return {
    recalculate,
    recalculateItem,
    exportCsv,
  }
}
