import {
  abortMultipartUpload,
  completeMultipartUpload,
  initiateMultipartUpload,
  type MultipartAsset,
  type MultipartPart,
  type MultipartPurpose,
  presignMultipartParts,
} from './mediaApi'

type Options = {
  assetPurpose: MultipartPurpose
  signal?: AbortSignal
  onProgress?: (percent: number) => void
}

const groupsOf = <T>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  )

function putPartWithXhr(
  url: string,
  body: Blob,
  signal?: AbortSignal,
  onProgress?: (loaded: number) => void,
) {
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest()
    const abort = () => request.abort()
    const cleanup = () => signal?.removeEventListener('abort', abort)

    request.open('PUT', url)
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded)
    }
    request.onload = () => {
      cleanup()
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(`Part upload failed with HTTP ${request.status}`))
        return
      }
      const etag = request.getResponseHeader('etag')
      if (!etag) {
        reject(new Error('Wasabi did not expose the ETag response header'))
        return
      }
      resolve(etag)
    }
    request.onerror = () => {
      cleanup()
      reject(new Error('Part upload failed'))
    }
    request.onabort = () => {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) {
      request.abort()
      return
    }
    request.send(body)
  })
}

async function putPart(
  url: string,
  body: Blob,
  signal?: AbortSignal,
  onProgress?: (loaded: number) => void,
) {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    try {
      onProgress?.(0)
      if (typeof XMLHttpRequest !== 'undefined') {
        return await putPartWithXhr(url, body, signal, onProgress)
      }
      const response = await fetch(url, { method: 'PUT', body, signal })
      if (!response.ok) throw new Error(`Part upload failed with HTTP ${response.status}`)
      const etag = response.headers.get('etag')
      if (!etag) throw new Error('Wasabi did not expose the ETag response header')
      return etag
    } catch (error) {
      lastError = error
      if (signal?.aborted || attempt === 2) throw error
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)))
    }
  }
  throw lastError
}

export async function uploadMultipartAsset(file: File, options: Options): Promise<MultipartAsset> {
  const session = await initiateMultipartUpload({
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    assetPurpose: options.assetPurpose,
  })
  try {
    const partNumbers = Array.from({ length: session.totalParts }, (_, index) => index + 1)
    const signed = (
      await Promise.all(
        groupsOf(partNumbers, 20).map((batch) => presignMultipartParts(session.assetId, batch)),
      )
    ).flat()
    const urls = new Map(signed.map(({ partNumber, url }) => [partNumber, url]))
    const completed: MultipartPart[] = []
    const partProgress = new Map<number, number>()

    const reportProgress = (partNumber: number, loaded: number) => {
      partProgress.set(partNumber, loaded)
      const uploadedBytes = [...partProgress.values()].reduce((sum, value) => sum + value, 0)
      options.onProgress?.(Math.round((uploadedBytes / file.size) * 100))
    }

    for (const batch of groupsOf(partNumbers, 3)) {
      const parts = await Promise.all(
        batch.map(async (partNumber) => {
          const start = (partNumber - 1) * session.partSize
          const body = file.slice(start, Math.min(start + session.partSize, file.size))
          const url = urls.get(partNumber)
          if (!url) throw new Error(`Missing signed URL for part ${partNumber}`)
          const etag = await putPart(url, body, options.signal, (loaded) =>
            reportProgress(partNumber, loaded),
          )
          reportProgress(partNumber, body.size)
          return { partNumber, etag }
        }),
      )
      completed.push(...parts)
    }
    return await completeMultipartUpload(
      session.assetId,
      completed.sort((left, right) => left.partNumber - right.partNumber),
    )
  } catch (error) {
    await abortMultipartUpload(session.assetId).catch(() => undefined)
    throw error
  }
}
