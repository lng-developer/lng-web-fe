import type { ImgHTMLAttributes } from 'react'
import { useEffect, useRef, useState } from 'react'

import { useAuthenticatedMediaUrl } from './useAuthenticatedMediaUrl'

export type AuthenticatedMediaImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  alt: string
  downloadUrl?: string | null
  fallback?: string
  lazy?: boolean
}

export function AuthenticatedMediaImage({
  downloadUrl,
  fallback,
  alt,
  onError,
  lazy = true,
  ...imageProps
}: AuthenticatedMediaImageProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [isInView, setIsInView] = useState(
    () => !lazy || typeof IntersectionObserver === 'undefined',
  )

  useEffect(() => {
    if (isInView || !lazy || !imageRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px 0px' },
    )
    observer.observe(imageRef.current)
    return () => observer.disconnect()
  }, [isInView, lazy])

  const effectiveDownloadUrl = isInView ? downloadUrl : null
  const { url, error } = useAuthenticatedMediaUrl(effectiveDownloadUrl)
  const resolvedSrc = url ?? fallback

  useEffect(() => {
    if (error && onError) {
      onError({} as React.SyntheticEvent<HTMLImageElement, Event>)
    }
  }, [error, onError])

  return (
    <img
      ref={imageRef}
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
