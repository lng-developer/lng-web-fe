import { useEffect, useState } from 'react'

import { fetchMediaBlob } from './mediaApi'

type AuthenticatedMediaUrlState = {
  url: string | null
  loading: boolean
  error: Error | null
}

type LoadedMediaState = {
  source: string | null
  url: string | null
  error: Error | null
}

export function useAuthenticatedMediaUrl(downloadUrl?: string | null): AuthenticatedMediaUrlState {
  const [state, setState] = useState<LoadedMediaState>({
    source: null,
    url: null,
    error: null,
  })

  useEffect(() => {
    const controller = new AbortController()
    let objectUrl: string | null = null
    let active = true

    if (!downloadUrl) {
      return () => controller.abort()
    }

    void fetchMediaBlob(downloadUrl, controller.signal)
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setState({ source: downloadUrl, url: objectUrl, error: null })
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return
        setState({
          source: downloadUrl,
          url: null,
          error: error instanceof Error ? error : new Error('Media preview failed'),
        })
      })

    return () => {
      active = false
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [downloadUrl])

  if (!downloadUrl) return { url: null, loading: false, error: null }
  if (state.source !== downloadUrl) return { url: null, loading: true, error: null }
  return { url: state.url, loading: false, error: state.error }
}
