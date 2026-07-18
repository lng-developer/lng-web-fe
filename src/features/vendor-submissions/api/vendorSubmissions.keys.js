export const vendorSubmissionsKeys = {
  all: ['vendor-submissions'],
  lists: () => [...vendorSubmissionsKeys.all, 'list'],
  list: (query = {}) => [...vendorSubmissionsKeys.lists(), query],
  summary: (query = {}) => [...vendorSubmissionsKeys.all, 'summary', query],
  detail: (id) => [...vendorSubmissionsKeys.all, 'detail', id],
  payloadPreview: (id) => [...vendorSubmissionsKeys.detail(id), 'payload-preview'],
}
