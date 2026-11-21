import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useFeedbackToast } from '@/shared/ui'

import {
  exportFinanceSnapshotsCsv,
  type FinanceParams,
  recalculateOrder,
  recalculateOrders,
  recalculateOrderItem,
} from '../api/financeApi'
import { financeKeys } from '../api/financeKeys'

export const useFinanceMutations = (queryParams: FinanceParams = {}) => {
  const { t } = useTranslation()
  const client = useQueryClient()
  const toast = useFeedbackToast()

  const recalculate = useMutation({
    mutationFn: recalculateOrder,
    onSuccess: async (_, orderId) => {
      toast('success', t('finance.feedback.recalculated'))
      await Promise.all([
        client.invalidateQueries({ queryKey: financeKeys.orderDetail(orderId) }),
        client.invalidateQueries({ queryKey: financeKeys.snapshots() }),
      ])
    },
    onError: (error: Error) => toast('error', t('finance.feedback.failed'), error.message),
  })

  const recalculateItem = useMutation({
    mutationFn: recalculateOrderItem,
    onSuccess: async (_, itemId) => {
      toast('success', t('finance.feedback.recalculated'))
      await Promise.all([
        client.invalidateQueries({ queryKey: financeKeys.orderItemDetail(itemId) }),
        client.invalidateQueries({ queryKey: financeKeys.orders() }),
        client.invalidateQueries({ queryKey: financeKeys.snapshots() }),
      ])
    },
    onError: (error: Error) => toast('error', t('finance.feedback.failed'), error.message),
  })

  const recalculateBulk = useMutation({
    mutationFn: recalculateOrders,
    onSuccess: async (data) => {
      if (data.failureCount === 0) {
        toast(
          'success',
          t('finance.feedback.bulkRecalculatedSuccess', {
            count: data.successCount,
            defaultValue: `Đã tính lại tài chính cho ${data.successCount} đơn hàng`,
          }),
        )
      } else if (data.successCount > 0) {
        toast(
          'warning',
          t('finance.feedback.bulkRecalculatedPartial', {
            successCount: data.successCount,
            failureCount: data.failureCount,
            defaultValue: `Đã tính lại ${data.successCount} đơn hàng, thất bại ${data.failureCount} đơn`,
          }),
        )
      } else {
        toast(
          'error',
          t('finance.feedback.bulkRecalculatedFailed', {
            defaultValue: 'Không thể tính lại tài chính cho các đơn đã chọn',
          }),
        )
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: financeKeys.all }),
        client.invalidateQueries({ queryKey: ['reports'] }),
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
    recalculateBulk,
    recalculateItem,
    exportCsv,
  }
}
