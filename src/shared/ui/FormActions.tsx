import type { ReactNode } from 'react'
import { Button, Space } from 'antd'

export interface FormActionsProps {
  readonly dirty: boolean
  readonly submitLabel: string
  readonly cancelLabel: string
  readonly saving?: boolean
  readonly onCancel?: () => void
  readonly extra?: ReactNode
  readonly form?: string
  readonly onSubmit?: () => void
}

export function FormActions({
  dirty,
  submitLabel,
  cancelLabel,
  saving = false,
  onCancel,
  extra,
  form,
  onSubmit,
}: FormActionsProps) {
  return (
    <Space>
      {extra}
      <Button onClick={onCancel}>{cancelLabel}</Button>
      <Button
        type="primary"
        htmlType={onSubmit ? 'button' : 'submit'}
        form={form}
        disabled={!dirty}
        loading={saving}
        onClick={onSubmit}
      >
        {submitLabel}
      </Button>
    </Space>
  )
}
