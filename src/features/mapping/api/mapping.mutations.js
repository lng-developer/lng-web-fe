import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { mappingKeys } from './mapping.keys'
import { getMappingRuleType, unwrapApiData } from './mapping.queries'
import { getMappingFlowInvalidationKeys } from './mappingInvalidation'

function post(path, body = {}) {
  return apiClient.post(path, body).then(unwrapApiData)
}

function patch(path, body = {}) {
  return apiClient.patch(path, body).then(unwrapApiData)
}

function getOrderItemId(variables) {
  return typeof variables === 'string' ? variables : variables?.orderItemId
}

function invalidateMappingFlow(queryClient, orderItemId) {
  for (const queryKey of getMappingFlowInvalidationKeys(orderItemId)) {
    queryClient.invalidateQueries({ queryKey })
  }
}

function useMappingMutation(mutationFn, options = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: (_data, variables) => {
      if (options.skipInvalidate) return

      if (options.refreshFlow) {
        invalidateMappingFlow(queryClient, getOrderItemId(variables))
        return
      }

      queryClient.invalidateQueries({ queryKey: mappingKeys.all })
    },
  })
}

export function useMappingPreviewMutation() {
  return useMappingMutation((orderItemId) =>
    post(ENDPOINTS.MAPPING.ORDER_ITEM_PREVIEW(orderItemId)),
  )
}

export function useMappingVendorCandidatesMutation() {
  return useMappingMutation(
    ({ body, orderItemId }) =>
      post(ENDPOINTS.MAPPING.ORDER_ITEM_VENDOR_CANDIDATES_SEARCH(orderItemId), body),
    { skipInvalidate: true },
  )
}

export function useMappingResolveMutation() {
  return useMappingMutation(
    (orderItemId) => post(ENDPOINTS.MAPPING.ORDER_ITEM_RESOLVE(orderItemId)),
    { refreshFlow: true },
  )
}

export function useMappingRecheckMutation() {
  return useMappingMutation(
    (orderItemId) => post(ENDPOINTS.MAPPING.ORDER_ITEM_RECHECK(orderItemId)),
    { refreshFlow: true },
  )
}

export function useMappingRecheckUnmatchedMutation() {
  return useMappingMutation((body) => post(ENDPOINTS.MAPPING.RECHECK_UNMATCHED, body), {
    refreshFlow: true,
  })
}

export function useMappingSelectMutation() {
  return useMappingMutation(
    ({ body, orderItemId }) => post(ENDPOINTS.MAPPING.ORDER_ITEM_SELECT(orderItemId), body),
    { refreshFlow: true },
  )
}

export function useMappingConfirmMutation() {
  return useMappingMutation(
    ({ body, orderItemId }) => post(ENDPOINTS.MAPPING.ORDER_ITEM_CONFIRM(orderItemId), body),
    { refreshFlow: true },
  )
}

export function useMappingSaveRuleMutation() {
  return useMappingMutation(({ body, id, type }) => {
    const ruleType = getMappingRuleType(type)
    return id ? patch(ruleType.detailEndpoint(id), body) : post(ruleType.listEndpoint, body)
  })
}

export function useMappingToggleRuleStatusMutation() {
  return useMappingMutation(({ id, nextStatus, type }) => {
    const ruleType = getMappingRuleType(type)
    return patch(ruleType.detailEndpoint(id), { status: nextStatus })
  })
}

export function useMappingReorderVendorRoutingMutation() {
  return useMappingMutation((body) => patch(ENDPOINTS.MAPPING.VENDOR_ROUTING_REORDER, body))
}
