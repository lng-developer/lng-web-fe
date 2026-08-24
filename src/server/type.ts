export type Paginated<T> = {
  items: T[]
  pagination: { total: number; page: number; limit: number }
}

export type Page<T> = {
  items: T[]
  pagination?: { page: number; limit: number; total: number; totalPages: number }
}

export type ApiResponse<T> = { success: boolean; data: T }
