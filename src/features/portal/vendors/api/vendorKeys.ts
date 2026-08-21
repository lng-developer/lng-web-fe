import type { CostCenterListParams, ProductListParams, VendorListParams } from './vendorApi'

export const vendorKeys = {
  all: ['portal', 'vendors'] as const,
  lists: () => [...vendorKeys.all, 'list'] as const,
  vendors: (params: VendorListParams) => [...vendorKeys.lists(), params] as const,
  vendor: (vendorId: string) => [...vendorKeys.all, vendorId] as const,
  productsRoot: (vendorId: string) => [...vendorKeys.all, vendorId, 'products'] as const,
  products: (vendorId: string, params: ProductListParams) =>
    [...vendorKeys.productsRoot(vendorId), params] as const,
  product: (productId: string) => [...vendorKeys.all, 'products', productId] as const,
  costCentersRoot: (productId: string) =>
    [...vendorKeys.all, 'products', productId, 'cost-centers'] as const,
  costCenters: (productId: string, params: CostCenterListParams) =>
    [...vendorKeys.costCentersRoot(productId), params] as const,
  integration: (vendorId: string) => [...vendorKeys.all, vendorId, 'integration'] as const,
  migrationReview: (params: { page?: number; limit?: number; q?: string }) =>
    [...vendorKeys.all, 'migration-review', params] as const,
}
