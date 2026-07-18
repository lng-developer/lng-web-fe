export const mappingKeys = {
  all: ['mapping'],
  internalTemplates: (query = {}) => [...mappingKeys.all, 'internal-templates', query],
  unmatchedOrderItems: (query = {}) => [...mappingKeys.all, 'unmatched-order-items', query],
  plan: (orderItemId) => [...mappingKeys.all, 'plan', orderItemId],
  rules: (type, query = {}) => [...mappingKeys.all, 'rules', type, query],
  workbench: (query = {}) => [...mappingKeys.all, 'workbench', query],
}
