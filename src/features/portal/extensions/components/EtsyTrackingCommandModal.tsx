import { useMemo, useState } from 'react'
import { Alert, Button, Input, Modal, Space, Typography } from 'antd'
import { createExtensionCommand } from '@/features/portal/integrations/api/integrationApi'

function resolveCarrier(trackingNumber: string, carrier: string) {
  return carrier.trim().toUpperCase() === 'VIETTEL_POST' && /^(92|42)/.test(trackingNumber.trim())
    ? 'USPS'
    : carrier.trim()
}

export function EtsyTrackingCommandModal({
  shopId,
  agentId,
  onClose,
}: {
  shopId: string
  agentId: string
  onClose: () => void
}) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const rows = useMemo(
    () =>
      value
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
          const [orderId = '', trackingNumber = '', carrier = ''] = line
            .split(/[\t,]/)
            .map((cell) => cell.trim())
          return { orderId, trackingNumber, carrier: resolveCarrier(trackingNumber, carrier) }
        }),
    [value],
  )
  const invalid = rows.filter((row) => !/^\d+$/.test(row.orderId) || !row.trackingNumber)
  const submit = async () => {
    if (!rows.length || invalid.length)
      return setError('Each row needs a numeric Etsy order ID and tracking number.')
    setSaving(true)
    setError(undefined)
    try {
      await createExtensionCommand({ type: 'UPLOAD_TRACKING', shopId, agentId, items: rows })
      onClose()
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : 'Could not create Etsy tracking command.',
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal open title="Push Etsy tracking" onCancel={onClose} footer={null} destroyOnHidden>
      <Typography.Paragraph type="secondary">
        Paste one row per line: <code>orderId, trackingNumber, carrier</code>. Viettel Post
        USPS-format tracking is changed to USPS.
      </Typography.Paragraph>
      <Input.TextArea
        aria-label="Etsy tracking rows"
        rows={10}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="4231418315, 9214490374008505076402, VIETTEL_POST"
      />
      <Typography.Paragraph>
        {rows.length} rows ready{invalid.length ? ` · ${invalid.length} invalid` : ''}
      </Typography.Paragraph>
      {error ? <Alert type="error" showIcon message={error} /> : null}
      <Space style={{ marginTop: 16 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="primary"
          loading={saving}
          disabled={!rows.length || Boolean(invalid.length)}
          onClick={submit}
        >
          Create command
        </Button>
      </Space>
    </Modal>
  )
}
