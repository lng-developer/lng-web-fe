import { useState, type ImgHTMLAttributes } from 'react'

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
  const { url } = useAuthenticatedMediaUrl(downloadUrl)
  const [failedSrc, setFailedSrc] = useState<string | undefined>()

  const src = url ?? fallback
  if (!src || failedSrc === src) return null

  return (
    <img
      {...imageProps}
      alt={alt}
      src={src}
      onError={(event) => {
        setFailedSrc(src)
        onError?.(event)
      }}
    />
  )
}
