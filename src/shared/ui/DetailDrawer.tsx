import type { ReactNode } from 'react'
import { Drawer } from 'antd'

export interface DetailDrawerProps {
  readonly open: boolean
  readonly title: ReactNode
  readonly children: ReactNode
  readonly onClose: () => void
  readonly footer?: ReactNode
  readonly width?: number
}

export function DetailDrawer({
  open,
  title,
  children,
  onClose,
  footer,
  width = 560,
}: DetailDrawerProps) {
  return (
    <Drawer
      open={open}
      title={title}
      onClose={onClose}
      footer={footer}
      size={width}
      destroyOnHidden
    >
      {children}
    </Drawer>
  )
}
