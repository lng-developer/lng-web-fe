import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ReloadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Descriptions, Form, Input, Modal, Radio, Select, Space } from 'antd'

import { FeedbackAlert, useFeedbackToast } from '@/shared/ui'

import {
  getVendorIntegrationConfig,
  refreshVendorIntegrationCredential,
  updateVendorIntegrationConfig,
  type VendorIntegrationAuthType,
  type VendorIntegrationConfig,
  type VendorIntegrationConfigInput,
} from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'

const fieldsByAuthType = {
  API_KEY: ['accessToken'],
  ACCESS_REFRESH: ['accessToken', 'refreshToken'],
  LOGIN_PASSWORD: ['username', 'password'],
} as const
const secretFields = ['accessToken', 'refreshToken', 'username', 'password'] as const

export interface VendorIntegrationModalProps {
  readonly open: boolean
  readonly vendorId: string
  readonly onCancel: () => void
  readonly onSaved: (config: VendorIntegrationConfig) => void
}

export function VendorIntegrationModal({
  open,
  vendorId,
  onCancel,
  onSaved,
}: VendorIntegrationModalProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'portal' })
  const [form] = Form.useForm<VendorIntegrationConfigInput>()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const config = useQuery({
    enabled: open,
    queryKey: vendorKeys.integration(vendorId),
    queryFn: () => getVendorIntegrationConfig(vendorId),
    retry: false,
  })
  useEffect(() => {
    if (!config.data) return
    const { authType, baseUrl, expiresAt, providerKey, status } = config.data
    form.setFieldsValue({ authType, baseUrl, expiresAt, providerKey, status })
  }, [config.data, form])
  const authType = Form.useWatch('authType', form) as VendorIntegrationAuthType | undefined
  const resolvedAuthType = authType ?? config.data?.authType
  const save = useMutation({
    mutationFn: (values: VendorIntegrationConfigInput) => {
      const allowedSecrets = new Set(fieldsByAuthType[values.authType])
      const input = Object.fromEntries(
        Object.entries(values).filter(
          ([key, value]) =>
            !secretFields.includes(key as (typeof secretFields)[number]) ||
            (allowedSecrets.has(key as never) && Boolean(value)),
        ),
      ) as VendorIntegrationConfigInput
      return updateVendorIntegrationConfig(vendorId, input)
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: vendorKeys.integration(vendorId) })
      showFeedbackToast('success', t('actionFeedback.saved'))
      onSaved(result)
    },
    onError: () => showFeedbackToast('error', t('vendors.integrationFailed')),
  })
  const refresh = useMutation({
    mutationFn: () =>
      refreshVendorIntegrationCredential(vendorId, { providerKey: config.data!.providerKey }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorKeys.integration(vendorId) })
      showFeedbackToast('success', t('vendors.refreshed'))
    },
    onError: () => showFeedbackToast('error', t('vendors.integrationFailed')),
  })
  const configuredItems = config.data
    ? (['accessToken', 'refreshToken', 'username', 'password'] as const).map((field) => ({
        key: field,
        label: t(`vendors.${field}Configured`),
        children: config.data[`${field}Configured`]
          ? t('vendors.configured')
          : t('vendors.notConfigured'),
      }))
    : []

  return (
    <Modal
      centered
      destroyOnHidden
      footer={null}
      open={open}
      title={t('vendors.integrationTitle')}
      onCancel={onCancel}
    >
      {config.isError ? (
        <FeedbackAlert
          type="error"
          title={t('vendors.integrationFailed')}
          action={
            <Button type="link" onClick={() => void config.refetch()}>
              {t('vendors.retry')}
            </Button>
          }
        />
      ) : null}
      <Form form={form} layout="vertical" onFinish={(values) => save.mutate(values)}>
        <Form.Item label={t('vendors.providerKey')} name="providerKey" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          label={t('vendors.baseUrl')}
          name="baseUrl"
          rules={[{ required: true, type: 'url' }, { max: 1000 }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label={t('vendors.authType')} name="authType" rules={[{ required: true }]}>
          <Radio.Group
            optionType="button"
            options={Object.keys(fieldsByAuthType).map((value) => ({ label: value, value }))}
            onChange={(event) => form.setFieldValue('authType', event.target.value)}
          />
        </Form.Item>
        {(resolvedAuthType ? fieldsByAuthType[resolvedAuthType] : []).map((field) => (
          <Form.Item
            key={field}
            label={t(`vendors.${field}`)}
            name={field}
            rules={[{ max: field === 'username' ? 320 : 8000 }]}
          >
            {field === 'username' ? (
              <Input autoComplete="username" />
            ) : (
              <Input.Password autoComplete="new-password" />
            )}
          </Form.Item>
        ))}
        <Form.Item label={t('vendors.statusLabel')} name="status">
          <Select
            options={['CONNECTED', 'DISCONNECTED'].map((value) => ({ label: value, value }))}
          />
        </Form.Item>
        {config.data ? (
          <Descriptions
            size="small"
            column={1}
            items={[
              {
                key: 'connection',
                label: t('vendors.connectionStatus'),
                children: config.data.status,
              },
              ...configuredItems,
              {
                key: 'expiry',
                label: t('vendors.expiresAt'),
                children: config.data.expiresAt ?? t('vendors.notSet'),
              },
              {
                key: 'checked',
                label: t('vendors.lastCheckedAt'),
                children: config.data.lastCheckedAt ?? t('vendors.notSet'),
              },
              {
                key: 'error',
                label: t('vendors.lastError'),
                children: config.data.lastError ?? t('vendors.none'),
              },
            ]}
          />
        ) : null}
        <Space>
          <Button onClick={onCancel}>{t('vendors.cancel')}</Button>
          <Button type="primary" htmlType="submit" loading={save.isPending}>
            {t('vendors.save')}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            disabled={!config.data?.providerKey || config.isError}
            loading={refresh.isPending}
            onClick={() => window.confirm(t('vendors.confirmRefresh')) && refresh.mutate()}
          >
            {t('vendors.refresh')}
          </Button>
        </Space>
      </Form>
    </Modal>
  )
}
