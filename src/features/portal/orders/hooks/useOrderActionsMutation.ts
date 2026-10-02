import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  addOrderCaseComment,
  cancelOrderCase,
  cancelOrderItem,
  createOrderCase,
  createOrderItemReplacement,
  createOrderReplacement,
  markOrderItemFulfillmentReady,
  overrideShippingAddress,
  recheckMapping,
  recheckProduction,
  requestOrderItemPsd,
  resolveOrderCase,
  retryCustomizationAssets,
  updateOrderBuyer,
  updateOrderCase,
  updateOrderItemCsNote,
  updateShippingAddress,
  updateShippingService,
  validateShippingAddress,
} from '../api/orderApi'
import { orderKeys } from '../api/orderKeys'
import { designKeys } from '../../design/api/designKeys'
import type { OrderAction } from '../components/orderTypes'

type UseOrderActionsMutationOptions = {
  readonly orderId: string
  readonly onSuccess?: (result: unknown, action: OrderAction) => void
  readonly onError?: (error: unknown) => void
}

export function useOrderActionsMutation({
  orderId,
  onSuccess,
  onError,
}: UseOrderActionsMutationOptions) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (action: OrderAction) => {
      if (action.kind === 'address') return updateShippingAddress(orderId, action.address)
      if (action.kind === 'customer') return updateOrderBuyer(orderId, action.buyer)
      if (action.kind === 'shipping') return updateShippingService(orderId, action.shipping)
      if (action.kind === 'validate-address') return validateShippingAddress(orderId)
      if (action.kind === 'override-address') return overrideShippingAddress(orderId, action.reason)
      if (action.kind === 'note') return updateOrderItemCsNote(action.itemId, action.note)
      if (action.kind === 'recheck-mapping') return recheckMapping(action.itemId)
      if (action.kind === 'recheck-production') return recheckProduction(action.itemId)
      if (action.kind === 'request-psd') return requestOrderItemPsd(action.itemId)
      if (action.kind === 'retry-customization-assets')
        return retryCustomizationAssets(action.itemId)
      if (action.kind === 'ready') return markOrderItemFulfillmentReady(action.itemId)
      if (action.kind === 'cancel') return cancelOrderItem(action.itemId, action.reason)
      if (action.kind === 'replacement') {
        return createOrderItemReplacement(action.itemId, {
          reason: action.reason,
          quantity: action.quantity,
        })
      }
      if (action.kind === 'order-replacement') {
        return createOrderReplacement(orderId, { reason: action.reason, items: action.items })
      }
      if (action.kind === 'case-save') {
        if (!action.orderCase) return createOrderCase(action.input)
        const { caseType, severity, title, description } = action.input
        return updateOrderCase(action.orderCase.id, { caseType, severity, title, description })
      }
      if (action.kind === 'case-resolve') return resolveOrderCase(action.orderCase.id, action.note)
      if (action.kind === 'case-cancel') return cancelOrderCase(action.orderCase.id, action.note)
      if (action.kind === 'case-comment')
        return addOrderCaseComment(action.orderCase.id, action.body)
      return Promise.reject(new Error('Unsupported order action'))
    },
    onSuccess: async (result, action) => {
      if (action.kind === 'case-comment') {
        await queryClient.invalidateQueries({
          queryKey: orderKeys.caseDetail(action.orderCase.id),
        })
        onSuccess?.(result, action)
        return
      }

      // Targeted cache invalidation
      if (
        action.kind === 'case-save' ||
        action.kind === 'case-resolve' ||
        action.kind === 'case-cancel'
      ) {
        await queryClient.invalidateQueries({ queryKey: orderKeys.cases(orderId) })
        if (action.orderCase?.id) {
          await queryClient.invalidateQueries({
            queryKey: orderKeys.caseDetail(action.orderCase.id),
          })
        }
      } else if (
        action.kind === 'note' ||
        action.kind === 'ready' ||
        action.kind === 'cancel' ||
        action.kind === 'replacement'
      ) {
        await queryClient.invalidateQueries({
          queryKey: orderKeys.timeline(orderId, action.itemId),
        })
        await queryClient.invalidateQueries({ queryKey: orderKeys.timeline(orderId) })
      } else {
        await queryClient.invalidateQueries({ queryKey: orderKeys.timeline(orderId) })
      }

      // Invalidate active workbench and summary queries without clearing unrelated orders' caches
      await queryClient.invalidateQueries({ queryKey: [...orderKeys.all, 'workbench'] })
      await queryClient.invalidateQueries({ queryKey: [...orderKeys.all, 'summary'] })
      if (action.kind === 'request-psd') {
        await queryClient.invalidateQueries({ queryKey: designKeys.requests() })
      }

      onSuccess?.(result, action)
    },
    onError: (error) => {
      onError?.(error)
    },
  })
}

export default useOrderActionsMutation
