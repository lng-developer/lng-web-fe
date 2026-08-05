import type { ShopListParams } from './shopApi'

export const shopKeys = {
  all: ['portal', 'shops'] as const,
  list: (params: ShopListParams) => [...shopKeys.all, 'list', params] as const,
  detail: (shopId: string) => [...shopKeys.all, 'detail', shopId] as const,
}
