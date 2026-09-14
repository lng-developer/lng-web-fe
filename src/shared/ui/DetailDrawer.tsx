import type { CSSProperties, ReactNode } from 'react'
import { Modal } from 'antd'

export interface DetailDrawerProps {
  readonly open: boolean
  readonly title: ReactNode
  readonly children: ReactNode
  readonly onClose: () => void
  readonly footer?: ReactNode
  readonly width?: number | string
  readonly style?: CSSProperties
}

export function DetailDrawer({
  open,
  title,
  children,
  onClose,
  footer,
  width = 'min(1280px, 90vw)',
  style,
}: DetailDrawerProps) {
  return (
    <Modal
      open={open}
      title={title}
      onCancel={onClose}
      footer={footer ?? null}
      width={width}
      style={{ top: 40, ...style }}
      destroyOnClose
    >
      {children}
    </Modal>
  )
}
