import { type ReactNode, useState } from 'react'
import { Input, Modal } from 'antd'
import { useTranslation } from 'react-i18next'

const { TextArea } = Input

export interface ReasonModalProps {
  readonly open: boolean
  readonly title: ReactNode
  readonly description?: ReactNode
  readonly placeholder?: string
  readonly initialValue?: string
  readonly confirmText?: ReactNode
  readonly cancelText?: ReactNode
  readonly danger?: boolean
  readonly required?: boolean
  readonly loading?: boolean
  readonly rows?: number
  readonly maxLength?: number
  readonly onConfirm: (reason: string) => void | Promise<void>
  readonly onCancel: () => void
}

export function ReasonModal({
  open,
  title,
  description,
  placeholder,
  initialValue = '',
  confirmText,
  cancelText,
  danger = true,
  required = true,
  loading = false,
  rows = 3,
  maxLength = 500,
  onConfirm,
  onCancel,
}: ReasonModalProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const [prevOpen, setPrevOpen] = useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setValue(initialValue)
      setError(null)
    }
  }

  const handleConfirm = async () => {
    const trimmed = value.trim()
    if (required && !trimmed) {
      setError(t('portal.design.reasonRequired', 'Bắt buộc nhập lý do'))
      return
    }
    setError(null)
    await onConfirm(trimmed)
  }

  return (
    <Modal
      open={open}
      title={title}
      okText={confirmText ?? t('common.confirm', 'Xác nhận')}
      cancelText={cancelText ?? t('common.cancel', 'Hủy')}
      okButtonProps={{ danger, loading, disabled: loading }}
      cancelButtonProps={{ disabled: loading }}
      onOk={handleConfirm}
      onCancel={() => {
        if (!loading) onCancel()
      }}
      destroyOnClose
    >
      {description ? (
        <div style={{ marginBottom: 12, color: 'var(--text-secondary, #64748b)', fontSize: 13 }}>
          {description}
        </div>
      ) : null}
      <TextArea
        rows={rows}
        maxLength={maxLength}
        showCount
        placeholder={placeholder ?? t('common.enterReason', 'Nhập lý do...')}
        value={value}
        status={error ? 'error' : undefined}
        onChange={(e) => {
          setValue(e.target.value)
          if (error && e.target.value.trim()) {
            setError(null)
          }
        }}
        onPressEnter={(e) => {
          if (e.ctrlKey || e.metaKey) {
            void handleConfirm()
          }
        }}
      />
      {error ? <div style={{ marginTop: 4, color: '#cd1323', fontSize: 12 }}>{error}</div> : null}
    </Modal>
  )
}
