import { listShops, type PaginatedShops } from '@/features/portal/shops/api/shopApi'

export async function listAllActiveShops(): Promise<PaginatedShops> {
  const items: PaginatedShops['items'] = []
  let page = 1
  let total = 0
  do {
    const result = await listShops({ page, limit: 100, status: 'ACTIVE' })
    items.push(...result.items)
    total = result.pagination.total
    page += 1
  } while ((page - 1) * 100 < total)
  return { items, pagination: { total, page: 1, limit: 100 } }
}
