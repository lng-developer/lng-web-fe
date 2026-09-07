import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SaveOutlined } from '@ant-design/icons'
import { Button, Input, Space } from 'antd'

type OrderItemNoteEditorProps = {
  readonly canWrite: boolean
  readonly initialNote: string
  readonly pending: boolean
  readonly onSave: (note: string) => void
}

export const OrderItemNoteEditor = memo(function OrderItemNoteEditor({
  canWrite,
  initialNote,
  pending,
  onSave,
}: OrderItemNoteEditorProps) {
  const { t } = useTranslation()
  const [note, setNote] = useState(initialNote)

  return (
    <>
      <Input.TextArea
        value={note}
        placeholder={t('orders.fields.noNote')}
        onChange={(event) => setNote(event.target.value)}
        readOnly={!canWrite}
        autoSize={{ minRows: 2, maxRows: 3 }}
      />
      {canWrite ? (
        <Space wrap>
          <Button icon={<SaveOutlined />} loading={pending} onClick={() => onSave(note)}>
            {t('orders.actions.saveNote')}
          </Button>
        </Space>
      ) : null}
    </>
  )
})

export default OrderItemNoteEditor
