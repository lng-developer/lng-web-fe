import type { ReactNode } from 'react'
import { Button, Typography } from 'antd'

import { PopupModal, type PopupModalAnchor, type PopupModalProps } from './PopupModal'

export interface ConfirmDangerModalProps extends Omit<
  PopupModalProps,
  'open' | 'children' | 'title'
> {
  readonly confirmIcon?: ReactNode
  readonly open: boolean
  readonly title: string
  readonly description: string
  readonly confirmLabel: string
  readonly cancelLabel?: string
  readonly loading?: boolean
  readonly anchor?: PopupModalAnchor | null
  readonly anchorRect?: PopupModalAnchor | null
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

export function ConfirmDangerModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  loading = false,
  confirmIcon,
  anchor,
  anchorRect,
  onConfirm,
  onCancel,
  ...props
}: ConfirmDangerModalProps) {
  return (
    <PopupModal
      open={open}
      anchor={anchor}
      anchorRect={anchorRect}
      title={title}
      aria-label={title}
      onCancel={onCancel}
      {...props}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {cancelLabel}
        </Button>,
        <Button
          key="confirm"
          danger
          type="primary"
          icon={confirmIcon}
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>,
      ]}
    >
      <Typography.Paragraph>{description}</Typography.Paragraph>
    </PopupModal>
  )
}
