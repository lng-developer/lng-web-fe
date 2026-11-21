import { useState } from 'react'
import { Alert, Button, Form, Input, Modal, Space, Typography } from 'antd'
import { createExtensionCommand } from '@/features/portal/integrations/api/integrationApi'

function resolveCarrier(trackingNumber: string, carrier: string) {
  return carrier.trim().toUpperCase() === 'VIETTEL_POST' && /^(92|42)/.test(trackingNumber.trim())
    ? 'USPS'
    : carrier.trim()
}

type Values = { orderId: string; trackingNumber: string; carrier: string }

export function EtsyTrackingCommandModal({
  shopId,
  agentId,
  onClose,
}: {
  shopId: string
  agentId: string
  onClose: () => void
}) {
  const [form] = Form.useForm<Values>()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const submit = async (values: Values) => {
    setSaving(true)
    setError(undefined)
    try {
      await createExtensionCommand({
        type: 'UPLOAD_TRACKING',
        shopId,
        agentId,
        items: [{ ...values, carrier: resolveCarrier(values.trackingNumber, values.carrier) }],
      })
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
    <Modal open title="Push one Etsy tracking" onCancel={onClose} footer={null} destroyOnHidden>
      <Typography.Paragraph type="secondary">
        Create one command for one Etsy order. Viettel Post USPS-format tracking is changed to USPS.
      </Typography.Paragraph>
      {error ? <Alert type="error" showIcon message={error} /> : null}
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item
          label="Etsy order ID"
          name="orderId"
          rules={[{ required: true, pattern: /^\d+$/ }]}
        >
          <Input inputMode="numeric" placeholder="4231418315" />
        </Form.Item>
        <Form.Item label="Tracking number" name="trackingNumber" rules={[{ required: true }]}>
          <Input placeholder="9214490374008505076402" />
        </Form.Item>
        <Form.Item label="Carrier (optional)" name="carrier">
          <Input placeholder="USPS" />
        </Form.Item>
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button htmlType="submit" type="primary" loading={saving}>
            Create command
          </Button>
        </Space>
      </Form>
    </Modal>
  )
}
