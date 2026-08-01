import { apiClient } from '@/shared/api'

type ApiResponse<T> = { success: boolean; data: T }

export type ShopStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export type Shop = {
  id: string
  name: string
  currency: string
  status: ShopStatus
  createdAt: string
  updatedAt: string
}

export type ShopListParams = {
  page: number
  limit: number
  search?: string
  status?: ShopStatus
}

export type PaginatedShops = {
  items: Shop[]
  pagination: { total: number; page: number; limit: number }
}

export type CreateShopInput = Pick<Shop, 'name'> & { currency?: string }

function unwrap<T>(response: unknown): T {
  return (response as ApiResponse<T>).data
}

function toParams({ search, status, ...params }: ShopListParams) {
  return {
    ...params,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
  }
}

export const listShops = async (params: ShopListParams): Promise<PaginatedShops> =>
  unwrap(await apiClient.get('/api/shops', { params: toParams(params) }))

export const createShop = async (input: CreateShopInput): Promise<Shop> =>
  unwrap(await apiClient.post('/api/shops', input))

export const getShop = async (shopId: string): Promise<Shop> =>
  unwrap(await apiClient.get(`/api/shops/${shopId}`))

export const updateShopStatus = async (shopId: string, status: ShopStatus): Promise<Shop> =>
  unwrap(await apiClient.patch(`/api/shops/${shopId}/status`, { status }))
