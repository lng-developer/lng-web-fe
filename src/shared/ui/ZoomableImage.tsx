import type { CSSProperties, MouseEventHandler } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Image } from 'antd'

import { useAuthenticatedMediaUrl } from '@/shared/media'

export type ZoomableImageProps = {
  alt: string
  className?: string
  downloadUrl?: string | null
  fallback?: string
  height?: number | string
  lazy?: boolean
  loading?: 'eager' | 'lazy'
  onClick?: MouseEventHandler<HTMLElement>
  src?: string | null
  style?: CSSProperties
  width?: number | string
}

export function ZoomableImage({
  alt,
  className,
  downloadUrl,
  fallback,
  height,
  lazy,
  loading,
  onClick,
  src,
  style,
  width,
}: ZoomableImageProps) {
  const isLazy = lazy ?? loading !== 'eager'
  const containerRef = useRef<HTMLSpanElement>(null)
  const [isInView, setIsInView] = useState(
    () => !isLazy || typeof IntersectionObserver === 'undefined',
  )

  useEffect(() => {
    if (isInView || !isLazy || !containerRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '150px 0px' },
    )
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [isInView, isLazy])

  const effectiveDownloadUrl = isInView ? downloadUrl : null
  const { url } = useAuthenticatedMediaUrl(effectiveDownloadUrl)
  const effectiveSrc = isInView ? src : null
  const resolvedSrc = url ?? effectiveSrc ?? (isInView ? fallback : null)

  if (!downloadUrl && !src && !fallback) return null

  if (!isInView || !resolvedSrc) {
    return (
      <span
        ref={isInView ? undefined : containerRef}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width,
          height,
          minWidth: width ? undefined : (style?.minWidth ?? 32),
          minHeight: height ? undefined : (style?.minHeight ?? 32),
          ...style,
        }}
        aria-hidden="true"
      />
    )
  }

  return (
    <Image
      alt={alt}
      className={className}
      fallback={fallback}
      height={height}
      loading={loading}
      onClick={onClick}
      preview={{ mask: null }}
      src={resolvedSrc}
      style={style}
      width={width}
    />
  )
}
