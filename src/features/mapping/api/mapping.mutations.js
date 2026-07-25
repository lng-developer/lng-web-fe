import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { getMappingRuleType, unwrapApiData } from './mapping.queries'
import {
  invalidateMappingMutation,
  requestMappingRuleConflicts,
  requestMappingRulePreview,
  requestMappingVendorCandidates,
  requestMappingVendorRoutingReorder,
} from './mappingMutationCore'

function post(path, body = {}) {
  return apiClient.post(path, body).then(unwrapApiData)
}

function patch(path, body = {}) {
  return apiClient.patch(path, body).then(unwrapApiData)
}

function useMappingMutation(mutationFn, options = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) =>
      invalidateMappingMutation(queryClient, data, variables, options),
  })
}

export function useMappingPreviewMutation() {
  return useMappingMutation((orderItemId) =>
    post(ENDPOINTS.MAPPING.ORDER_ITEM_PREVIEW(orderItemId)),
  )
}

export function useMappingRulePreviewMutation() {
  return useMappingMutation((body) => requestMappingRulePreview(apiClient, unwrapApiData, body), {
    skipInvalidate: true,
  })
}

export function useMappingRuleConflictsMutation() {
  return useMappingMutation((body) => requestMappingRuleConflicts(apiClient, unwrapApiData, body), {
    skipInvalidate: true,
  })
}

export function useMappingVendorCandidatesMutation() {
  return useMappingMutation(
    (variables) => requestMappingVendorCandidates(apiClient, unwrapApiData, variables),
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
  return useMappingMutation(
    ({ body, id, type }) => {
      const ruleType = getMappingRuleType(type)
      return id ? patch(ruleType.detailEndpoint(id), body) : post(ruleType.listEndpoint, body)
    },
    { refreshRuleType: true },
  )
}

export function useMappingToggleRuleStatusMutation() {
  return useMappingMutation(
    ({ id, nextStatus, type }) => {
      const ruleType = getMappingRuleType(type)
      return patch(ruleType.detailEndpoint(id), { status: nextStatus })
    },
    { refreshRuleType: true },
  )
}

export function useMappingReorderVendorRoutingMutation() {
  return useMappingMutation((body) =>
    requestMappingVendorRoutingReorder(apiClient, unwrapApiData, body),
  )
}
