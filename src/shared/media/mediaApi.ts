import { apiClient } from '@/shared/api'
import { env } from '@/shared/config/env'

type ApiResponse<T> = { success: boolean; data: T }
const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

export type MultipartPurpose = 'PSD_TEMPLATE' | 'DESIGN_PACKAGE' | 'PRINT_READY'
export type MultipartPart = { partNumber: number; etag: string }
export type MultipartAsset = { id: string; uploadStatus: 'READY' | 'ABORTED' | string }
export type MultipartInitiateResult = { assetId: string; partSize: number; totalParts: number }

type MediaDisposition = 'attachment' | 'inline'

const withDisposition = (downloadUrl: string, disposition: MediaDisposition) => {
  const url = new URL(downloadUrl, env.apiBaseUrl || window.location.origin)
  url.searchParams.set('disposition', disposition)
  return url.pathname + url.search
}

const withDispositionHref = (downloadUrl: string, disposition: MediaDisposition) => {
  const url = new URL(downloadUrl, env.apiBaseUrl || window.location.origin)
  url.searchParams.set('disposition', disposition)
  return url.href
}

const withSignedUrlRequest = (downloadUrl: string, disposition: MediaDisposition) => {
  const url = new URL(downloadUrl, env.apiBaseUrl || window.location.origin)
  url.searchParams.set('disposition', disposition)
  url.searchParams.set('redirect', 'false')
  return url.pathname + url.search
}

export async function fetchMediaBlob(
  downloadUrl: string,
  signal?: AbortSignal,
  disposition: MediaDisposition = 'inline',
) {
  if (!downloadUrl.trim()) throw new Error('Media download URL is required')

  return (await apiClient.get(withDisposition(downloadUrl, disposition), {
    responseType: 'blob',
    signal,
  })) as Blob
}

export async function downloadMediaAsset(downloadUrl: string, filename?: string) {
  if (!downloadUrl.trim()) throw new Error('Media download URL is required')

  const anchor = document.createElement('a')
  const signed = await apiClient
    .get(withSignedUrlRequest(downloadUrl, 'attachment'))
    .then((response) => unwrap<{ url: string }>(response).url)
    .catch(() => null)

  try {
    anchor.href = signed || withDispositionHref(downloadUrl, 'attachment')
    if (filename) anchor.download = filename
    document.body.append(anchor)
    anchor.click()
  } finally {
    anchor.remove()
  }
}

export const initiateMultipartUpload = async (input: {
  filename: string
  mimeType: string
  size: number
  assetPurpose: MultipartPurpose
}) => unwrap<MultipartInitiateResult>(await apiClient.post('/api/media/multipart/initiate', input))

export const presignMultipartParts = async (assetId: string, partNumbers: number[]) =>
  unwrap<{ parts: Array<{ partNumber: number; url: string }> }>(
    await apiClient.post(`/api/media/multipart/${assetId}/presign-parts`, { partNumbers }),
  ).parts

export const completeMultipartUpload = async (assetId: string, parts: MultipartPart[]) =>
  unwrap<MultipartAsset>(
    await apiClient.post(`/api/media/multipart/${assetId}/complete`, { parts }),
  )

export const abortMultipartUpload = async (assetId: string) =>
  unwrap<MultipartAsset>(await apiClient.delete(`/api/media/multipart/${assetId}`))
