import { memo, type MouseEvent, useState, type WheelEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  HolderOutlined,
  LeftOutlined,
  RightOutlined,
  SyncOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons'
import { Button, Space } from 'antd'

import { AuthenticatedMediaImage } from '@/shared/media'

import styles from './InteractiveImageViewerModal.module.scss'
import { PopupModal, type PopupModalAnchor } from './PopupModal'

export type InteractiveImageViewerModalProps = {
  readonly open: boolean
  readonly anchor?: PopupModalAnchor
  readonly imageUrl?: string | null
  readonly images?: string[]
  readonly alt?: string
  readonly onClose: () => void
  readonly onSelectImage?: (url: string) => void
}

export const InteractiveImageViewerModal = memo(function InteractiveImageViewerModal({
  open,
  anchor,
  imageUrl,
  images = [],
  alt,
  onClose,
  onSelectImage,
}: InteractiveImageViewerModalProps) {
  const { t } = useTranslation()
  const [imageZoom, setImageZoom] = useState(100)
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>()

  const resetImageView = () => {
    setImageZoom(100)
    setImageOffset({ x: 0, y: 0 })
    setDragStart(undefined)
  }

  const handleClose = () => {
    resetImageView()
    onClose()
  }

  const showImageAt = (nextIndex: number) => {
    const nextImage = images[nextIndex]
    if (!nextImage) return
    resetImageView()
    onSelectImage?.(nextImage)
  }

  const currentImageIndex = Math.max(0, images.indexOf(imageUrl ?? ''))
  const hasMultipleImages = images.length > 1

  const zoomByWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    setImageZoom((value) => Math.min(300, Math.max(75, value + (event.deltaY < 0 ? 15 : -15))))
  }

  const startDrag = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || imageZoom <= 100) return
    event.preventDefault()
    setDragStart({ x: event.clientX, y: event.clientY })
  }

  const moveDrag = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragStart) return
    setImageOffset((current) => ({
      x: current.x + event.clientX - dragStart.x,
      y: current.y + event.clientY - dragStart.y,
    }))
    setDragStart({ x: event.clientX, y: event.clientY })
  }

  const stopDrag = () => setDragStart(undefined)

  if (!open || !imageUrl) return null

  return (
    <PopupModal
      centered
      anchor={anchor}
      open={open}
      footer={null}
      width="min(82vw, 760px)"
      title={null}
      closeIcon={null}
      className={styles.imagePreviewModal}
      onCancel={handleClose}
      style={{ padding: 0 }}
      styles={{
        body: { padding: 0 },
        mask: { background: 'rgba(0, 0, 0, 0.52)' },
      }}
    >
      <div className={styles.viewerContainer}>
        <div
          role="button"
          aria-label={t('common.actions.zoomPan', { defaultValue: 'Image zoom and pan viewer' })}
          tabIndex={0}
          onWheel={zoomByWheel}
          onMouseDown={startDrag}
          onMouseMove={moveDrag}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          onKeyDown={(event) => event.key === 'Escape' && stopDrag()}
          className={styles.canvas}
          style={{
            cursor: imageZoom > 100 ? (dragStart ? 'grabbing' : 'grab') : 'default',
          }}
        >
          <AuthenticatedMediaImage
            downloadUrl={imageUrl}
            alt={alt || t('common.fields.image', { defaultValue: 'Image' })}
            draggable={false}
            className={styles.image}
            style={{
              transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${imageZoom / 100})`,
              transition: dragStart ? undefined : 'transform 120ms ease',
            }}
          />
        </div>
        <Space className={styles.toolbar} size={4}>
          <Button
            type="text"
            size="small"
            icon={<LeftOutlined />}
            disabled={!hasMultipleImages}
            onClick={() => showImageAt((currentImageIndex - 1 + images.length) % images.length)}
          />
          <Button type="text" size="small" icon={<HolderOutlined />} disabled />
          <Button
            type="text"
            size="small"
            icon={<RightOutlined />}
            disabled={!hasMultipleImages}
            onClick={() => showImageAt((currentImageIndex + 1) % images.length)}
          />
          <Button
            type="text"
            size="small"
            icon={<ZoomOutOutlined />}
            onClick={() => setImageZoom((value) => Math.max(75, value - 15))}
          />
          <Button
            type="text"
            size="small"
            icon={<ZoomInOutlined />}
            onClick={() => setImageZoom((value) => Math.min(300, value + 15))}
          />
          <Button type="text" size="small" icon={<SyncOutlined />} onClick={resetImageView} />
        </Space>
      </div>
    </PopupModal>
  )
})

export default InteractiveImageViewerModal
