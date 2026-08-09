import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ApiOutlined,
  CheckCircleOutlined,
  DisconnectOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Descriptions, Divider, Form, Input, Modal, Radio, Switch, Tag } from 'antd'

import { modalQueryOptions } from '@/shared/query/modalQuery'
import { FeedbackAlert, FormActions, useFeedbackToast } from '@/shared/ui'

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
    ...modalQueryOptions,
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

  const close = () => {
    if (!form.isFieldsTouched()) return onCancel()
    Modal.confirm({
      title: t('actionFeedback.unsaved'),
      content: t('vendors.discardChanges'),
      okText: t('vendors.discard', { defaultValue: 'Discard' }),
      cancelText: t('vendors.cancel'),
      onOk: onCancel,
    })
  }

  const isConnected = config.data?.status === 'CONNECTED'
  const configuredLabel = (configured: boolean) =>
    t(configured ? 'vendors.configured' : 'vendors.notConfigured')

  return (
    <Modal
      centered
      destroyOnHidden
      footer={null}
      open={open}
      title={t('vendors.integrationTitle')}
      width="min(760px, calc(100vw - 32px))"
      onCancel={close}
    >
      {config.isLoading ? <div>Loading...</div> : null}
      {config.isError ? (
        <FeedbackAlert
          type="error"
          title={t('vendors.branchUnavailable')}
          action={
            <Button type="link" icon={<ReloadOutlined />} onClick={() => void config.refetch()}>
              {t('vendors.retry')}
            </Button>
          }
        />
      ) : null}

      <Form form={form} layout="vertical" onFinish={(values) => save.mutate(values)}>
        <Divider plain style={{ fontSize: 12, margin: '0 0 16px' }}>
          {t('vendors.sectionConnection', { defaultValue: 'Connection Settings' })}
        </Divider>

        <Form.Item label={t('vendors.providerKey')} name="providerKey" rules={[{ required: true }]}>
          <Input placeholder="e.g. PRINTWAY, MERCHIZE, LENFUL" />
        </Form.Item>

        <Form.Item
          label={t('vendors.baseUrl')}
          name="baseUrl"
          rules={[{ required: true }, { type: 'url' }]}
        >
          <Input placeholder="https://api.vendor.com/v1" />
        </Form.Item>

        <Divider plain style={{ fontSize: 12, margin: '16px 0' }}>
          {t('vendors.sectionAuth', { defaultValue: 'Authentication Type & Credentials' })}
        </Divider>

        <Form.Item label={t('vendors.authType')} name="authType" rules={[{ required: true }]}>
          <Radio.Group optionType="button" buttonStyle="solid">
            <Radio.Button value="API_KEY">API Key / Token</Radio.Button>
            <Radio.Button value="ACCESS_REFRESH">OAuth Access & Refresh</Radio.Button>
            <Radio.Button value="LOGIN_PASSWORD">Login & Password</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {resolvedAuthType === 'API_KEY' && (
          <Form.Item label={t('vendors.accessToken')} name="accessToken">
            <Input.Password placeholder="Enter new API Token (encrypted at rest)" />
          </Form.Item>
        )}

        {resolvedAuthType === 'ACCESS_REFRESH' && (
          <>
            <Form.Item label={t('vendors.accessToken')} name="accessToken">
              <Input.Password placeholder="Enter Access Token" />
            </Form.Item>
            <Form.Item label={t('vendors.refreshToken')} name="refreshToken">
              <Input.Password placeholder="Enter Refresh Token" />
            </Form.Item>
          </>
        )}

        {resolvedAuthType === 'LOGIN_PASSWORD' && (
          <>
            <Form.Item label={t('vendors.username')} name="username">
              <Input placeholder="Username or Email" />
            </Form.Item>
            <Form.Item label={t('vendors.password')} name="password">
              <Input.Password placeholder="Password" />
            </Form.Item>
          </>
        )}

        <Divider plain style={{ fontSize: 12, margin: '16px 0' }}>
          {t('vendors.sectionStatus', { defaultValue: 'Connection Status' })}
        </Divider>

        <Form.Item
          label={t('vendors.statusLabel')}
          name="status"
          valuePropName="checked"
          getValueFromEvent={(checked: boolean) => (checked ? 'CONNECTED' : 'DISCONNECTED')}
          getValueProps={(v) => ({ checked: v === 'CONNECTED' })}
        >
          <Switch
            checkedChildren={t('vendors.status.CONNECTED', { defaultValue: 'CONNECTED' })}
            unCheckedChildren={t('vendors.status.DISCONNECTED', { defaultValue: 'DISCONNECTED' })}
          />
        </Form.Item>

        {config.data ? (
          <Descriptions
            bordered
            size="small"
            column={2}
            style={{ marginBottom: 20 }}
            items={[
              {
                key: 'status',
                label: 'Current Status',
                children: isConnected ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    CONNECTED
                  </Tag>
                ) : (
                  <Tag color="default" icon={<DisconnectOutlined />}>
                    DISCONNECTED
                  </Tag>
                ),
              },
              {
                key: 'lastChecked',
                label: 'Last Checked',
                children: config.data.lastCheckedAt ?? '—',
              },
              ...(
                [
                  ['accessTokenConfigured', config.data.accessTokenConfigured],
                  ['refreshTokenConfigured', config.data.refreshTokenConfigured],
                  ['usernameConfigured', config.data.usernameConfigured],
                  ['passwordConfigured', config.data.passwordConfigured],
                ] as const
              ).map(([key, configured]) => ({
                key,
                label: t(`vendors.${key}`),
                children: configuredLabel(configured),
              })),
            ]}
          />
        ) : null}

        <Form.Item shouldUpdate noStyle>
          {() => (
            <FormActions
              cancelLabel={t('vendors.cancel')}
              dirty={form.isFieldsTouched()}
              extra={
                <Button
                  icon={<ApiOutlined />}
                  disabled={!config.data?.providerKey}
                  loading={refresh.isPending}
                  onClick={() => {
                    if (window.confirm(t('vendors.confirmRefresh'))) refresh.mutate()
                  }}
                >
                  {t('vendors.refresh')}
                </Button>
              }
              onCancel={close}
              saving={save.isPending}
              submitLabel={t('vendors.save')}
            />
          )}
        </Form.Item>
      </Form>
    </Modal>
  )
}
