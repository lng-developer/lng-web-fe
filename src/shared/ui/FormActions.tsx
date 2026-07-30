import type { ReactNode } from 'react'
import { Button, Space } from 'antd'

export interface FormActionsProps {
  readonly dirty: boolean
  readonly submitLabel: string
  readonly cancelLabel: string
  readonly saving?: boolean
  readonly onCancel?: () => void
  readonly extra?: ReactNode
}

export function FormActions({
  dirty,
  submitLabel,
  cancelLabel,
  saving = false,
  onCancel,
  extra,
}: FormActionsProps) {
  return (
    <Space>
      {extra}
      <Button onClick={onCancel}>{cancelLabel}</Button>
      <Button type="primary" htmlType="submit" disabled={!dirty} loading={saving}>
        {submitLabel}
      </Button>
    </Space>
  )
}
