import type React from 'react'
import { Image } from 'antd'

import { useAuthenticatedMediaUrl } from '@/shared/media'

export type ZoomableImageProps = {
  alt: string
  className?: string
  downloadUrl?: string | null
  fallback?: string
  height?: number | string
  loading?: 'eager' | 'lazy'
  onClick?: React.MouseEventHandler<HTMLElement>
  src?: string | null
  width?: number | string
}

export function ZoomableImage({
  alt,
  className,
  downloadUrl,
  fallback,
  height,
  loading,
  onClick,
  src,
  width,
}: ZoomableImageProps) {
  const { url } = useAuthenticatedMediaUrl(downloadUrl)
  const resolvedSrc = url ?? src ?? fallback
  if (!resolvedSrc) return null

  return (
    <Image
      alt={alt}
      className={className}
      height={height}
      loading={loading}
      onClick={onClick}
      preview={{ mask: null }}
      src={resolvedSrc}
      width={width}
    />
  )
}
