import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

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
  const directUrl =
    downloadUrl && (isDirectExternalUrl(downloadUrl) || /^(blob:|data:)/i.test(downloadUrl))
      ? downloadUrl
      : null
  const mediaQuery = useQuery({
    queryKey: ['media-preview', downloadUrl],
    queryFn: ({ signal }) => fetchMediaBlob(downloadUrl!, signal),
    enabled: Boolean(downloadUrl && !directUrl),
    staleTime: Infinity,
    gcTime: 2 * 60 * 1000,
    retry: false,
  })
  const objectUrl = useMemo(
    () => (mediaQuery.data ? URL.createObjectURL(mediaQuery.data) : null),
    [mediaQuery.data],
  )

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  if (!downloadUrl) return { url: null, loading: false, error: null }
  if (directUrl) return { url: directUrl, loading: false, error: null }
  if (mediaQuery.isPending || !objectUrl) return { url: null, loading: true, error: null }
  return {
    url: objectUrl,
    loading: false,
    error: mediaQuery.error instanceof Error ? mediaQuery.error : null,
  }
}
