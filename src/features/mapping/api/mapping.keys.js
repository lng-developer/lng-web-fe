export const mappingKeys = {
  all: ['mapping'],
  internalTemplates: (query = {}) => [...mappingKeys.all, 'internal-templates', query],
  unmatchedOrderItems: (query = {}) => [...mappingKeys.all, 'unmatched-order-items', query],
  plan: (orderItemId) => [...mappingKeys.all, 'plan', orderItemId],
  ruleType: (type) => [...mappingKeys.all, 'rules', type],
  ruleHistory: (type, id) => [...mappingKeys.ruleType(type), id, 'history'],
  rules: (type, query = {}) => [...mappingKeys.ruleType(type), query],
  workbench: (query = {}) => [...mappingKeys.all, 'workbench', query],
}
