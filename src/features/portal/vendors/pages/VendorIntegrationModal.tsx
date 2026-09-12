import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ApiOutlined,
  CheckCircleOutlined,
  DisconnectOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Collapse,
  Descriptions,
  Divider,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Table,
  Tag,
} from 'antd'

import { modalQueryOptions } from '@/shared/query/modalQuery'
import { FeedbackAlert, FormActions, useFeedbackToast } from '@/shared/ui'

import {
  deleteVendorIntegrationConfig,
  getLenfulOrder,
  getVendorIntegrationConfig,
  type LenfulOrder,
  testVendorIntegrationConnection,
  updateVendorIntegrationConfig,
  type VendorIntegrationAuthType,
  type VendorIntegrationConfig,
  type VendorIntegrationConfigInput,
  type VendorIntegrationMode,
} from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'

const fieldsByAuthType = {
  API_KEY: ['accessToken'],
  ACCESS_REFRESH: ['accessToken', 'refreshToken'],
  LOGIN_PASSWORD: ['username', 'password'],
} as const
const secretFields = [
  'accessToken',
  'refreshToken',
  'username',
  'password',
  'apiKey',
  'apiSecret',
] as const
const providerOptions = [
  'BEEFUL',
  'GRABINK',
  'MERCHIZE',
  'PRINTWAY',
  'MANGOTEE',
  'MERCHFOX',
  'LENFUL',
  'SS88',
  'LUXURY_PRO',
  'MANGO_P76',
  'ZTB',
  'PGPRINT',
  'ONOSPOD',
  'LNG_GROUP',
].map((value) => ({ label: value, value }))
type VendorIntegrationFormValues = VendorIntegrationConfigInput & {
  mode: VendorIntegrationMode
}
type VendorIntegrationSaveResult = VendorIntegrationConfig | { deleted: boolean } | null

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
  const [form] = Form.useForm<VendorIntegrationFormValues>()
  const [orderNumber, setOrderNumber] = useState('')
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()

  const config = useQuery({
    enabled: open,
    queryKey: vendorKeys.integration(vendorId),
    queryFn: () => getVendorIntegrationConfig(vendorId),
    ...modalQueryOptions,
    retry: false,
  })

  const mode = Form.useWatch('mode', form) as VendorIntegrationMode | undefined
  const resolvedMode = mode ?? (config.data ? 'NATIVE' : 'MANUAL')
  const modeOptions = [
    { label: t('vendors.integrationModes.manual'), value: 'MANUAL' },
    { label: t('vendors.integrationModes.genericApi'), value: 'GENERIC_API' },
    { label: t('vendors.integrationModes.native'), value: 'NATIVE' },
  ]

  useEffect(() => {
    if (config.data) {
      const { authType, baseUrl, expiresAt, status } = config.data
      const integrationMode =
        config.data.mode ?? (config.data.providerKey === 'CUSTOM' ? 'GENERIC_API' : 'NATIVE')
      const providerKey = config.data.adapterKey ?? config.data.providerKey
      form.setFieldsValue({
        authType: authType ?? undefined,
        baseUrl: baseUrl ?? undefined,
        orderEndpointUrl: config.data.orderEndpointUrl ?? undefined,
        trackingEndpointUrl: config.data.trackingEndpointUrl ?? undefined,
        pushOrderEndpointUrl: config.data.pushOrderEndpointUrl ?? undefined,
        expiresAt: expiresAt ?? undefined,
        mode: integrationMode,
        providerKey: providerKey ?? undefined,
        status,
      })
      return
    }
    if (config.isSuccess) form.setFieldsValue({ mode: 'MANUAL' })
  }, [config.data, config.isSuccess, form])

  const authType = Form.useWatch('authType', form) as VendorIntegrationAuthType | undefined
  const selectedProviderKey = Form.useWatch('providerKey', form)
  const resolvedAuthType = authType ?? config.data?.authType
  const isMerchfox =
    resolvedMode === 'NATIVE' &&
    (selectedProviderKey || config.data?.adapterKey || config.data?.providerKey) === 'MERCHFOX'

  const save = useMutation<VendorIntegrationSaveResult, Error, VendorIntegrationFormValues>({
    mutationFn: (values: VendorIntegrationFormValues) => {
      if (values.mode === 'MANUAL') {
        return config.data ? deleteVendorIntegrationConfig(vendorId) : Promise.resolve(null)
      }
      const { mode: _mode, ...connectionValues } = values
      void _mode
      const allowedSecrets = new Set(
        isMerchfox ? ['apiKey', 'apiSecret'] : fieldsByAuthType[connectionValues.authType],
      )
      const input = Object.fromEntries(
        Object.entries({
          ...connectionValues,
          mode: values.mode,
          adapterKey: values.mode === 'NATIVE' ? connectionValues.providerKey : null,
          providerKey: values.mode === 'GENERIC_API' ? 'CUSTOM' : connectionValues.providerKey,
        }).filter(
          ([key, value]) =>
            !secretFields.includes(key as (typeof secretFields)[number]) ||
            (allowedSecrets.has(key as never) && Boolean(value)),
        ),
      ) as VendorIntegrationConfigInput
      return updateVendorIntegrationConfig(vendorId, input)
    },
    onSuccess: (result) => {
      if (!result || 'deleted' in result) {
        showFeedbackToast('success', t('vendors.manualModeSaved'))
        onCancel()
        return
      }
      void queryClient.invalidateQueries({ queryKey: vendorKeys.integration(vendorId) })
      showFeedbackToast('success', t('actionFeedback.saved'))
      onSaved(result)
    },
    onError: () => showFeedbackToast('error', t('vendors.integrationFailed')),
  })

  const testConnection = useMutation({
    mutationFn: () => testVendorIntegrationConnection(vendorId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorKeys.integration(vendorId) })
      showFeedbackToast('success', t('vendors.connectionTested'))
    },
    onError: () => showFeedbackToast('error', t('vendors.integrationFailed')),
  })

  const lenfulOrder = useMutation<LenfulOrder, Error, string>({
    mutationFn: (value) => getLenfulOrder(vendorId, value),
    onError: () => showFeedbackToast('error', t('vendors.orderLookupFailed')),
  })

  const close = onCancel

  const isConnected = config.data?.status === 'CONNECTED'
  const isLenful =
    resolvedMode === 'NATIVE' && (config.data?.adapterKey ?? config.data?.providerKey) === 'LENFUL'
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

        <Form.Item label={t('vendors.integrationMode')} name="mode" rules={[{ required: true }]}>
          <Select aria-label={t('vendors.integrationMode')} options={modeOptions} />
        </Form.Item>

        {resolvedMode === 'MANUAL' ? (
          <Alert title={t('vendors.manualModeHint')} type="info" showIcon />
        ) : (
          <>
            {resolvedMode === 'NATIVE' ? (
              <Form.Item
                label={t('vendors.providerKey')}
                name="providerKey"
                rules={[{ required: true, message: t('vendors.providerRequired') }]}
              >
                <Select
                  aria-label={t('vendors.providerKey')}
                  options={providerOptions}
                  placeholder={t('vendors.providerKey')}
                />
              </Form.Item>
            ) : (
              <Alert title={t('vendors.genericApiHint')} type="info" showIcon />
            )}

            <Form.Item
              label={t('vendors.baseUrl')}
              name="baseUrl"
              rules={[{ required: true }, { type: 'url' }]}
            >
              <Input placeholder="https://api.vendor.com/v1" />
            </Form.Item>

            {resolvedMode === 'NATIVE' &&
            (config.data?.adapterKey ?? config.data?.providerKey) === 'LENFUL' ? (
              <Form.Item
                label={t('vendors.orderEndpointUrl')}
                name="orderEndpointUrl"
                rules={[{ type: 'url' }]}
              >
                <Input placeholder="https://provider.example/api/order/list" />
              </Form.Item>
            ) : null}

            {resolvedMode === 'NATIVE' &&
            (config.data?.adapterKey ?? config.data?.providerKey) === 'MERCHIZE' ? (
              <>
                <Form.Item
                  label={t('vendors.trackingEndpointUrl')}
                  name="trackingEndpointUrl"
                  rules={[{ type: 'url' }]}
                >
                  <Input placeholder="https://provider.example/order/external/orders/tracking" />
                </Form.Item>
                <Form.Item
                  label={t('vendors.pushOrderEndpointUrl')}
                  name="pushOrderEndpointUrl"
                  rules={[{ type: 'url' }]}
                >
                  <Input placeholder="https://provider.example/order/external/orders" />
                </Form.Item>
              </>
            ) : null}

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

            {isMerchfox ? (
              <>
                <Form.Item label={t('vendors.apiKey')} name="apiKey">
                  <Input.Password aria-label={t('vendors.apiKey')} />
                </Form.Item>
                <Form.Item label={t('vendors.apiSecret')} name="apiSecret">
                  <Input.Password aria-label={t('vendors.apiSecret')} />
                </Form.Item>
              </>
            ) : (
              resolvedAuthType === 'API_KEY' && (
                <Form.Item label={t('vendors.accessToken')} name="accessToken">
                  <Input.Password placeholder="Enter new API Token (encrypted at rest)" />
                </Form.Item>
              )
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
          </>
        )}

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
                  ['apiKeyConfigured', config.data.apiKeyConfigured],
                  ['apiSecretConfigured', config.data.apiSecretConfigured],
                ] as const
              ).map(([key, configured]) => ({
                key,
                label: t(`vendors.${key}`),
                children: configuredLabel(Boolean(configured)),
              })),
            ]}
          />
        ) : null}

        {isLenful ? (
          <Collapse
            style={{ marginBottom: 20 }}
            items={[
              {
                key: 'order-lookup',
                label: t('vendors.orderLookup'),
                children: (
                  <>
                    <Input.Search
                      aria-label={t('vendors.orderNumber')}
                      enterButton={t('vendors.search')}
                      loading={lenfulOrder.isPending}
                      placeholder={t('vendors.orderNumber')}
                      value={orderNumber}
                      onChange={(event) => setOrderNumber(event.target.value)}
                      onSearch={(value) => {
                        const normalized = value.trim()
                        if (normalized) lenfulOrder.mutate(normalized)
                      }}
                    />
                    {lenfulOrder.data ? (
                      <>
                        <Descriptions
                          bordered
                          column={2}
                          size="small"
                          style={{ marginTop: 16 }}
                          items={[
                            {
                              key: 'orderNumber',
                              label: t('vendors.orderNumber'),
                              children: lenfulOrder.data.orderNumber,
                            },
                            {
                              key: 'status',
                              label: t('vendors.statusLabel'),
                              children: lenfulOrder.data.status ?? '—',
                            },
                            {
                              key: 'payment',
                              label: t('vendors.paymentStatus'),
                              children: lenfulOrder.data.paymentStatus ?? '—',
                            },
                            {
                              key: 'total',
                              label: t('vendors.total'),
                              children:
                                [lenfulOrder.data.totalPrice, lenfulOrder.data.currency]
                                  .filter(Boolean)
                                  .join(' ') || '—',
                            },
                            {
                              key: 'shipping',
                              label: t('vendors.shippingMethod'),
                              children: lenfulOrder.data.shippingMethod?.name ?? '—',
                            },
                            {
                              key: 'createdAt',
                              label: t('vendors.createdAt'),
                              children: lenfulOrder.data.createdAt ?? '—',
                            },
                          ]}
                        />
                        <Table
                          columns={[
                            {
                              dataIndex: 'productName',
                              key: 'productName',
                              title: t('vendors.product'),
                            },
                            {
                              key: 'variant',
                              title: t('vendors.variantSku'),
                              render: (_, item) => item.variant?.sku ?? item.variant?.name ?? '—',
                            },
                            {
                              dataIndex: 'quantity',
                              key: 'quantity',
                              title: t('vendors.quantity'),
                            },
                            {
                              dataIndex: 'fulfillment',
                              key: 'fulfillment',
                              title: t('vendors.fulfillment'),
                            },
                            { dataIndex: 'status', key: 'status', title: t('vendors.statusLabel') },
                          ]}
                          dataSource={lenfulOrder.data.items}
                          pagination={false}
                          rowKey="id"
                          size="small"
                          style={{ marginTop: 16 }}
                        />
                      </>
                    ) : null}
                  </>
                ),
              },
            ]}
          />
        ) : null}

        <Form.Item shouldUpdate noStyle>
          {() => (
            <FormActions
              cancelLabel={t('vendors.cancel')}
              dirty={form.isFieldsTouched()}
              extra={
                resolvedMode === 'NATIVE' && config.data ? (
                  <Button
                    icon={<ApiOutlined />}
                    disabled={!config.data?.providerKey}
                    loading={testConnection.isPending}
                    onClick={() => testConnection.mutate()}
                  >
                    {t('vendors.testConnection', { defaultValue: 'Test connection' })}
                  </Button>
                ) : null
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
