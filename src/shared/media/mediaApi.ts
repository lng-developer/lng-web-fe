import { ApiResponse } from '@/server/type'
import { apiClient } from '@/shared/api'
import { env } from '@/shared/config/env'

const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

export type MultipartPurpose = 'PSD_TEMPLATE' | 'DESIGN_PACKAGE' | 'PRINT_READY'
export type MultipartPart = { partNumber: number; etag: string }
export type MultipartAsset = { id: string; uploadStatus: 'READY' | 'ABORTED' | string }
export type MultipartInitiateResult = { assetId: string; partSize: number; totalParts: number }
export type MediaDownload = { downloadUrl: string; filename?: string | null }

type MediaDisposition = 'attachment' | 'inline'

const withDisposition = (downloadUrl: string, disposition: MediaDisposition) => {
  const url = new URL(downloadUrl, env.apiBaseUrl || window.location.origin)
  url.searchParams.set('disposition', disposition)
  return url.pathname + url.search
}

const withSignedUrlRequest = (downloadUrl: string, disposition: MediaDisposition) => {
  const url = new URL(downloadUrl, env.apiBaseUrl || window.location.origin)
  url.searchParams.set('disposition', disposition)
  url.searchParams.set('redirect', 'false')
  return url.pathname + url.search
}

function uniqueArchiveEntryName(
  filename: string | null | undefined,
  index: number,
  used: Set<string>,
) {
  const original = filename?.trim().split(/[\\/]/).at(-1) || `customer-image-${index + 1}`
  const extensionIndex = original.lastIndexOf('.')
  const stem = extensionIndex > 0 ? original.slice(0, extensionIndex) : original
  const extension = extensionIndex > 0 ? original.slice(extensionIndex) : ''
  let suffix = 1
  let candidate = original
  while (used.has(candidate)) candidate = `${stem}-${++suffix}${extension}`
  used.add(candidate)
  return candidate
}

export async function fetchMediaBlob(
  downloadUrl: string,
  signal?: AbortSignal,
  disposition: MediaDisposition = 'inline',
) {
  if (!downloadUrl.trim()) throw new Error('Media download URL is required')

  const targetUrl = downloadUrl.includes('/avatar')
    ? downloadUrl
    : withDisposition(downloadUrl, disposition)

  return (await apiClient.get(targetUrl, {
    responseType: 'blob',
    signal,
  })) as Blob
}

export async function downloadMediaAsset(downloadUrl: string, filename?: string) {
  if (!downloadUrl.trim()) throw new Error('Media download URL is required')

  const anchor = document.createElement('a')
  const response = await apiClient
    .get(withSignedUrlRequest(downloadUrl, 'attachment'), { responseType: 'blob' })
    .catch(() => null)
  const signed =
    response instanceof Blob && response.type.includes('application/json')
      ? await response
          .text()
          .then((body) => JSON.parse(body).data?.url as string | undefined)
          .catch(() => null)
      : response && !(response instanceof Blob)
        ? unwrap<{ url: string }>(response).url
        : null
  const blob = signed
    ? null
    : response instanceof Blob
      ? response
      : await fetchMediaBlob(downloadUrl, undefined, 'attachment')
  const objectUrl = blob ? URL.createObjectURL(blob) : null

  try {
    anchor.href = signed || objectUrl!
    if (filename) anchor.download = filename
    document.body.append(anchor)
    anchor.click()
  } finally {
    anchor.remove()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}

export async function downloadMediaAssets(
  assets: MediaDownload[],
  archiveFilename = 'customer-images.zip',
) {
  const uniqueAssets = assets.filter(
    (asset, index) =>
      asset.downloadUrl.trim() &&
      assets.findIndex((candidate) => candidate.downloadUrl === asset.downloadUrl) === index,
  )
  if (!uniqueAssets.length) throw new Error('Media download URL is required')
  if (uniqueAssets.length === 1) {
    await downloadMediaAsset(uniqueAssets[0].downloadUrl, uniqueAssets[0].filename ?? undefined)
    return
  }

  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const filenames = new Set<string>()
  for (const [index, asset] of uniqueAssets.entries()) {
    zip.file(
      uniqueArchiveEntryName(asset.filename, index, filenames),
      await fetchMediaBlob(asset.downloadUrl, undefined, 'attachment'),
    )
  }
  const objectUrl = URL.createObjectURL(await zip.generateAsync({ type: 'blob' }))
  const anchor = document.createElement('a')
  try {
    anchor.href = objectUrl
    anchor.download = archiveFilename
    document.body.append(anchor)
    anchor.click()
  } finally {
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
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
