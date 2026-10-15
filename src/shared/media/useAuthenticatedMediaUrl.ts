import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { env } from '@/shared/config/env'

import { fetchMediaBlob } from './mediaApi'

type AuthenticatedMediaUrlState = {
  url: string | null
  loading: boolean
  error: Error | null
}

const isDirectExternalUrl = (downloadUrl: string) => {
  if (!/^https?:\/\//i.test(downloadUrl)) return false
  try {
    const next = new URL(downloadUrl)
    const base = new URL(env.apiBaseUrl || window.location.origin)
    return next.host !== base.host
  } catch {
    return false
  }
}

export function useAuthenticatedMediaUrl(downloadUrl?: string | null): AuthenticatedMediaUrlState {
  const directUrl = downloadUrl && isDirectExternalUrl(downloadUrl) ? downloadUrl : null
  const mediaQuery = useQuery({
    queryKey: ['media-preview', downloadUrl],
    queryFn: ({ signal }) => fetchMediaBlob(downloadUrl!, signal),
    enabled: Boolean(downloadUrl && !directUrl),
    staleTime: Infinity,
    gcTime: 2 * 60 * 1000,
    retry: false,
  })
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null)

  useEffect(() => {
    if (!mediaQuery.data) return
    const url = URL.createObjectURL(mediaQuery.data)
    // The effect owns both allocation and cleanup, including StrictMode's setup replay.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Publish the browser resource allocated by this effect, never during render.
    setPreview({ blob: mediaQuery.data, url })
    return () => URL.revokeObjectURL(url)
  }, [mediaQuery.data])
  const objectUrl = preview?.blob === mediaQuery.data ? preview?.url : null

  if (!downloadUrl) return { url: null, loading: false, error: null }
  if (directUrl) return { url: directUrl, loading: false, error: null }
  if (mediaQuery.isError) return { url: null, loading: false, error: mediaQuery.error }
  if (mediaQuery.isPending || !objectUrl) return { url: null, loading: true, error: null }
  return {
    url: objectUrl,
    loading: false,
    error: null,
  }
}
