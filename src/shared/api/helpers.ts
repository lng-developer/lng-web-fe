import type { ApiResponse } from '@/server/type'

/**
 * Loại bỏ các thuộc tính có giá trị null, undefined hoặc chuỗi rỗng ("") khỏi params object
 */
export function compactParams<T extends object>(params: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value != null),
  )
}

/**
 * Trích xuất payload dữ liệu từ API response theo định dạng chuẩn { success: boolean, data: T }
 * hoặc trả về trực tiếp nếu response đã được unwrap ở interceptor.
 */
export function unwrapResponse<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as ApiResponse<T>).data
  }
  return response as T
}
