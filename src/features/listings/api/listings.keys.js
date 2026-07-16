export const listingsKeys = {
  all: ['listings'],
  lists: () => [...listingsKeys.all, 'list'],
  list: (query = {}) => [...listingsKeys.lists(), query],
  summary: (query = {}) => [...listingsKeys.all, 'summary', query],
  shops: (query = {}) => [...listingsKeys.all, 'shops', query],
  productTypes: (query = {}) => [...listingsKeys.all, 'product-types', query],
  productTypeGroups: (query = {}) => [...listingsKeys.all, 'product-type-groups', query],
  internalTemplates: (query = {}) => [...listingsKeys.all, 'internal-templates', query],
}
