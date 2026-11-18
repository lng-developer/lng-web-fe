import { ApiResponse } from '@/server/type'
import { apiClient } from '@/shared/api'

export type MediaAssetStatus = 'ACTIVE' | 'DISCARDED'
export type MediaMimeGroup = 'IMAGE' | 'DOCUMENT' | 'ARCHIVE' | 'OTHER'
export type MediaAsset = {
  id: string
  originalFilename: string | null
  mimeType: string | null
  size: number | null
  provider: string | null
  resourceType: string | null
  ownerType: string | null
  status: MediaAssetStatus
  downloadUrl: string | null
  publicUrl?: string | null
  secureUrl?: string | null
  createdAt: string
}

export function getMediaAssetUrl(asset: MediaAsset): string {
  if (asset.secureUrl && /^https?:\/\//i.test(asset.secureUrl)) {
    return asset.secureUrl
  }
  if (asset.publicUrl && /^https?:\/\//i.test(asset.publicUrl)) {
    return asset.publicUrl
  }
  if (asset.publicUrl) {
    return typeof window !== 'undefined'
      ? `${window.location.origin}${asset.publicUrl}`
      : asset.publicUrl
  }
  if (asset.id) {
    return typeof window !== 'undefined'
      ? `${window.location.origin}/api/media/public/assets/${asset.id}/download`
      : `/api/media/public/assets/${asset.id}/download`
  }
  return ''
}
export type MediaAssetListParams = {
  q?: string
  mimeGroup?: MediaMimeGroup
  provider?: string
  resourceType?: string
  ownerType?: string
  status?: MediaAssetStatus
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}
export type MediaAssetPage = {
  items: MediaAsset[]
  pagination: { total: number; page: number; limit: number }
}

const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

export async function listMediaAssets(params: MediaAssetListParams = {}) {
  const q = params.q?.trim()
  const clean = Object.fromEntries(
    Object.entries({ ...params, q: q || undefined }).filter(([, value]) => value !== undefined),
  )
  return unwrap<MediaAssetPage>(await apiClient.get('/api/media/assets', { params: clean }))
}

export async function uploadMediaAsset(file: File) {
  const form = new FormData()
  form.append('file', file)
  return unwrap<MediaAsset>(await apiClient.post('/api/media/assets', form))
}
