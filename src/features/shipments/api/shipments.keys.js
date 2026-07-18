export const shipmentsKeys = {
  all: ['shipments'],
  lists: () => [...shipmentsKeys.all, 'list'],
  list: (query = {}) => [...shipmentsKeys.lists(), query],
  summary: (query = {}) => [...shipmentsKeys.all, 'summary', query],
  detail: (id) => [...shipmentsKeys.all, 'detail', id],
  webhookLogs: (query = {}) => [...shipmentsKeys.all, 'webhook-logs', query],
}
