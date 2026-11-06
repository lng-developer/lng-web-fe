import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckOutlined, CopyOutlined, KeyOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import { Alert, Button, Form, Input, Modal, Select, Space } from 'antd'

import type { ExtensionTokenInput } from '@/features/auth/extension-tokens/api/extensionTokensApi'

export interface ExtensionTokenModalProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly form: FormInstance<ExtensionTokenInput>
  readonly shopOptions: Array<{ label: string; value: string }>
  readonly onCreateToken: (values: ExtensionTokenInput) => void
  readonly isCreatingToken: boolean
  readonly createdToken?: string
  readonly onClearCreatedToken: () => void
}

export function ExtensionTokenModal({
  open,
  onClose,
  form,
  shopOptions,
  onCreateToken,
  isCreatingToken,
  createdToken,
  onClearCreatedToken,
}: ExtensionTokenModalProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    form.resetFields()
    onClearCreatedToken()
    onClose()
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={
        <Space>
          <KeyOutlined />
          <span>
            {t('portal.extensions.tokens.modalTitle', {
              defaultValue: 'Generate Extension Bot Token',
            })}
          </span>
        </Space>
      }
      footer={
        createdToken ? (
          <Button type="primary" onClick={handleClose}>
            {t('common.done', { defaultValue: 'Done' })}
          </Button>
        ) : (
          <Space>
            <Button onClick={handleClose}>{t('common.cancel', { defaultValue: 'Cancel' })}</Button>
            <Button type="primary" loading={isCreatingToken} onClick={() => form.submit()}>
              {t('portal.extensions.tokens.generate', { defaultValue: 'Generate Token' })}
            </Button>
          </Space>
        )
      }
      destroyOnHidden
    >
      {createdToken ? (
        <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 12 }}>
          <Alert
            type="success"
            showIcon
            message={t('portal.extensions.tokens.createdSuccess', {
              defaultValue: 'Token created successfully!',
            })}
            description={t('portal.extensions.tokens.copyNotice', {
              defaultValue:
                'Copy this token now. It will not be shown again for security reasons. Paste it into the LNG Extension settings on the bot client machine.',
            })}
          />
          <Input.Password
            value={createdToken}
            readOnly
            addonAfter={
              <Button
                type="text"
                size="small"
                icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                onClick={handleCopy}
              >
                {copied
                  ? t('common.copied', { defaultValue: 'Copied' })
                  : t('common.copy', { defaultValue: 'Copy' })}
              </Button>
            }
          />
        </Space>
      ) : (
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
          initialValues={{
            environment: 'production',
          }}
          onFinish={(values) => {
            onCreateToken(values)
          }}
        >
          <Form.Item
            name="shopId"
            label={t('portal.extensions.tokens.shop', { defaultValue: 'Target Shop' })}
            rules={[{ required: true, message: 'Please select a shop' }]}
          >
            <Select
              options={shopOptions}
              placeholder={t('portal.extensions.tokens.shopPlaceholder', {
                defaultValue: 'Select shop to bind extension to',
              })}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item
            name="name"
            label={t('portal.extensions.tokens.clientLabel', {
              defaultValue: 'Client PC / VM Name',
            })}
            rules={[{ required: true, message: 'Please enter client name or label' }]}
          >
            <Input placeholder="e.g. Bot-PC-Amazon-01, VM-Etsy-Worker-02" />
          </Form.Item>
          <Form.Item
            name="environment"
            label={t('portal.extensions.tokens.environment', { defaultValue: 'Environment' })}
          >
            <Select
              options={[
                { value: 'production', label: 'Production (Default)' },
                { value: 'development', label: 'Development' },
                { value: 'local', label: 'Local (Testing)' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="expiresInDays"
            label={t('portal.extensions.tokens.validity', { defaultValue: 'Validity (Days)' })}
            initialValue={365}
          >
            <Select
              options={[
                { value: 30, label: '30 Days' },
                { value: 90, label: '90 Days' },
                { value: 180, label: '180 Days' },
                { value: 365, label: '1 Year (Recommended)' },
                { value: 0, label: 'Never Expires' },
              ]}
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}
