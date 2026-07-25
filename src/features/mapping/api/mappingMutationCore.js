import { ENDPOINTS } from '../../../services/endpoints.js'
import { mappingKeys } from './mapping.keys.js'
import {
  getMappingFlowInvalidationKeys,
  getMappingRuleInvalidationKeys,
} from './mappingInvalidation.js'

function request(client, unwrap, method, path, body) {
  const response = body === undefined ? client[method](path) : client[method](path, body)
  return response.then(unwrap)
}

export function getMappingRuleSaveBody(body, id) {
  if (!id) return body
  const patch = { ...body }
  delete patch.shopId
  return patch
}

export function requestMappingRulePreview(client, unwrap, body) {
  return request(client, unwrap, 'post', ENDPOINTS.MAPPING.RULE_PREVIEW, body)
}

export function requestMappingRuleConflicts(client, unwrap, body) {
  return request(client, unwrap, 'post', ENDPOINTS.MAPPING.RULE_CONFLICTS, body)
}

export function requestMappingRuleHistory(client, unwrap, type, id) {
  return request(client, unwrap, 'get', ENDPOINTS.MAPPING.RULE_HISTORY(type, id))
}

export function requestMappingVendorCandidates(client, unwrap, { body, orderItemId }) {
  return request(
    client,
    unwrap,
    'post',
    ENDPOINTS.MAPPING.ORDER_ITEM_VENDOR_CANDIDATES_SEARCH(orderItemId),
    body,
  )
}

export function requestMappingVendorRoutingReorder(client, unwrap, body) {
  return request(client, unwrap, 'patch', ENDPOINTS.MAPPING.VENDOR_ROUTING_REORDER, body)
}

function getOrderItemId(variables) {
  return typeof variables === 'string' ? variables : variables?.orderItemId
}

export function invalidateMappingMutation(queryClient, data, variables, options = {}) {
  if (options.skipInvalidate) return

  if (options.refreshFlow) {
    for (const queryKey of getMappingFlowInvalidationKeys(getOrderItemId(variables))) {
      queryClient.invalidateQueries({ queryKey })
    }
    return
  }

  if (options.refreshRuleType && variables?.type) {
    for (const queryKey of getMappingRuleInvalidationKeys(
      variables.type,
      variables.id || data?.id,
    )) {
      queryClient.invalidateQueries({ queryKey })
    }
    return
  }

  queryClient.invalidateQueries({ queryKey: mappingKeys.all })
}
