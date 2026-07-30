import { Button, Modal, Typography } from 'antd'

export interface ConfirmDangerModalProps {
  readonly open: boolean
  readonly title: string
  readonly description: string
  readonly confirmLabel: string
  readonly cancelLabel?: string
  readonly loading?: boolean
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
  onConfirm,
  onCancel,
}: ConfirmDangerModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      aria-label={title}
      transitionName=""
      maskTransitionName=""
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {cancelLabel}
        </Button>,
        <Button key="confirm" danger type="primary" loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>,
      ]}
    >
      <Typography.Paragraph>{description}</Typography.Paragraph>
    </Modal>
  )
}
