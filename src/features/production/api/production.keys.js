export const productionKeys = {
  all: ['production'],
  tasks: (query = {}) => [...productionKeys.all, 'tasks', query],
  summary: (query = {}) => [...productionKeys.all, 'summary', query],
  taskByOrderItem: (orderItemId) => [...productionKeys.all, 'order-item', orderItemId],
  shops: (query = {}) => [...productionKeys.all, 'shops', query],
}
