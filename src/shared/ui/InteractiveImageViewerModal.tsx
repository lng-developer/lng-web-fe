import { memo } from 'react'
import { Image } from 'antd'

import { useAuthenticatedMediaUrl } from '@/shared/media'

import type { PopupModalAnchor } from './PopupModal'

export type InteractiveImageViewerModalProps = {
  readonly open: boolean
  readonly anchor?: PopupModalAnchor
  readonly imageUrl?: string | null
  readonly images?: string[]
  readonly alt?: string
  readonly onClose: () => void
  readonly onSelectImage?: (url: string) => void
}

function PreviewImage({ alt, downloadUrl }: { alt: string; downloadUrl: string }) {
  const { url } = useAuthenticatedMediaUrl(downloadUrl)

  return <Image alt={alt} src={url ?? undefined} />
}

export const InteractiveImageViewerModal = memo(function InteractiveImageViewerModal({
  open,
  imageUrl,
  images = [],
  alt,
  onClose,
  onSelectImage,
}: InteractiveImageViewerModalProps) {
  const sources = Array.from(
    new Set([imageUrl, ...images].filter((value): value is string => Boolean(value))),
  )
  if (!open || !sources.length) return null

  const currentImageIndex = Math.max(0, sources.indexOf(imageUrl ?? ''))
  const imageAlt = alt ?? ''

  return (
    <Image.PreviewGroup
      preview={{
        current: currentImageIndex,
        onChange: (index) => onSelectImage?.(sources[index]),
        onOpenChange: (visible) => !visible && onClose(),
        open,
      }}
    >
      <div style={{ display: 'none' }}>
        {sources.map((source) => (
          <PreviewImage key={source} alt={imageAlt} downloadUrl={source} />
        ))}
      </div>
    </Image.PreviewGroup>
  )
})

export default InteractiveImageViewerModal
