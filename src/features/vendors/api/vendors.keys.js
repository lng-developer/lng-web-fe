export const vendorsKeys = {
  all: ['vendors'],
  lists: () => [...vendorsKeys.all, 'list'],
  list: (query = {}) => [...vendorsKeys.lists(), query],
  products: () => [...vendorsKeys.all, 'products'],
  productList: (query = {}) => [...vendorsKeys.products(), query],
  costCenters: (productId) => [...vendorsKeys.products(), productId, 'cost-centers'],
  costCenterList: (productId, query = {}) => [...vendorsKeys.costCenters(productId), query],
  productTypes: (query = {}) => [...vendorsKeys.all, 'product-types', query],
}
