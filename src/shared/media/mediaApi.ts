import { apiClient } from '@/shared/api'

export async function fetchMediaBlob(downloadUrl: string, signal?: AbortSignal) {
  if (!downloadUrl.trim()) throw new Error('Media download URL is required')

  return (await apiClient.get(downloadUrl, {
    responseType: 'blob',
    signal,
  })) as Blob
}

export async function downloadMediaAsset(downloadUrl: string, filename?: string) {
  const blobUrl = URL.createObjectURL(await fetchMediaBlob(downloadUrl))
  const anchor = document.createElement('a')

  try {
    anchor.href = blobUrl
    if (filename) anchor.download = filename
    document.body.append(anchor)
    anchor.click()
  } finally {
    anchor.remove()
    URL.revokeObjectURL(blobUrl)
  }
}
