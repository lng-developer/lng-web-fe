function isProtectedMediaDownload(url) {
  return /^\/api\/media\/assets\/[^/]+\/download(?:\?.*)?$/.test(url || '')
}

export async function createQcPreviewImageSource(url, options = {}) {
  if (!isProtectedMediaDownload(url)) {
    return { url: url || '', revoke: () => {} }
  }

  const blob = await options.fetchBlob(url)
  if (!blob?.type?.startsWith('image/')) {
    return { url: '', revoke: () => {} }
  }

  const objectUrl = options.createObjectUrl(blob)
  return {
    url: objectUrl,
    revoke: () => options.revokeObjectUrl(objectUrl),
  }
}

export { isProtectedMediaDownload }
