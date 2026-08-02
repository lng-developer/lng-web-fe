import type { ImgHTMLAttributes } from 'react'

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
  ...imageProps
}: AuthenticatedMediaImageProps) {
  const { url } = useAuthenticatedMediaUrl(downloadUrl)

  return <img {...imageProps} alt={alt} src={url ?? fallback} />
}
