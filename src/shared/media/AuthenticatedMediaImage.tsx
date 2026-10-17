import type { ImgHTMLAttributes } from 'react'
import { useEffect } from 'react'

import { useAuthenticatedMediaUrl } from './useAuthenticatedMediaUrl'

export type AuthenticatedMediaImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  alt: string
  downloadUrl?: string | null
  fallback?: string
}

export function AuthenticatedMediaImage({
  downloadUrl,
  fallback,
  alt,
  onError,
  ...imageProps
}: AuthenticatedMediaImageProps) {
  const { url, error } = useAuthenticatedMediaUrl(downloadUrl)
  const resolvedSrc = url ?? fallback

  useEffect(() => {
    if (error && onError) {
      onError({} as React.SyntheticEvent<HTMLImageElement, Event>)
    }
  }, [error, onError])

  return (
    <img
      {...imageProps}
      alt={alt}
      src={resolvedSrc}
      onError={(e) => {
        if (resolvedSrc && onError) {
          onError(e)
        }
      }}
    />
  )
}
