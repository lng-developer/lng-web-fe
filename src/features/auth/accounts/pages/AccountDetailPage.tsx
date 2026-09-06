import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { LockOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Result,
  Typography,
} from 'antd'
import dayjs from 'dayjs'

import { hasAnyPermission } from '@/shared/auth/permissions'
import {
  FeedbackAlert,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  loadAccount,
  updateAccountEmail,
  updateAccountOperatingCost,
} from '../api/accountManagementApi'
import styles from './AccountDetailPage.module.scss'

export function AccountDetailPage() {
  const { t } = useTranslation()
  const { accountId = '' } = useParams()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [emailForm] = Form.useForm<{ email: string }>()
  const [costForm] = Form.useForm<{ amount: number; startedAt: dayjs.Dayjs | null }>()
  const canRead = hasAnyPermission(['AUTH:READ', 'AUTH:WRITE'], { globalOnly: true })
  const canWrite = hasAnyPermission(['AUTH:WRITE'], { globalOnly: true })
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['auth-account', accountId],
    queryFn: () => loadAccount(accountId),
    enabled: Boolean(accountId),
  })
  const emailMutation = useMutation({
    mutationFn: (email: string) => updateAccountEmail(accountId, email),
    onSuccess: async () => {
      showFeedbackToast('success', t('actionFeedback.saved'))
      await queryClient.invalidateQueries({ queryKey: ['auth-account', accountId] })
      await queryClient.invalidateQueries({ queryKey: ['access-accounts'] })
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const operatingCostMutation = useMutation({
    mutationFn: ({ amount, startedAt }: { amount: number; startedAt: dayjs.Dayjs | null }) =>
      updateAccountOperatingCost(
        accountId,
        Math.round(amount * 100),
        startedAt?.toISOString() || null,
      ),
    onSuccess: async () => {
      showFeedbackToast('success', t('actionFeedback.saved'))
      await queryClient.invalidateQueries({ queryKey: ['auth-account', accountId] })
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })

  useEffect(() => {
    if (data?.account.email) emailForm.setFieldValue('email', data.account.email)
  }, [data?.account.email, emailForm])
  useEffect(() => {
    if (data?.account)
      costForm.setFieldsValue({
        amount: (data.account.operatingCostAmount || 0) / 100,
        startedAt: data.account.operatingCostStartedAt
          ? dayjs(data.account.operatingCostStartedAt)
          : null,
      })
  }, [data?.account, costForm])

  if (!canRead) return <Result status="403" title="403" />
  if (isLoading) return <LoadingState variant="page" />

  if (error || !data) {
    return (
      <FeedbackAlert
        type="error"
        title={t('auth.accountDetail.unavailable')}
        action={
          <Button type="link" icon={<ReloadOutlined aria-hidden />} onClick={() => void refetch()}>
            {t('auth.accessExplorer.retry')}
          </Button>
        }
      />
    )
  }

  const { account } = data

  return (
    <section className={styles.page}>
      <PageHeader
        title={account.email}
        description={t('auth.accountDetail.description')}
        actions={
          <StatusTag status={account.status === 'active' ? 'operational' : 'draft'}>
            {account.status ?? t('auth.accessExplorer.unknown')}
          </StatusTag>
        }
      />
      <SectionCard title={t('auth.accountDetail.profile')}>
        <Descriptions
          column={{ xs: 1, sm: 2 }}
          items={[
            { key: 'email', label: t('auth.accountDetail.email'), children: account.email },
            {
              key: 'status',
              label: t('auth.accessExplorer.status'),
              children: account.status ?? t('auth.accessExplorer.unknown'),
            },
          ]}
        />
        <Form
          form={emailForm}
          layout="vertical"
          onFinish={({ email }) => emailMutation.mutate(email)}
        >
          <Form.Item
            label={t('auth.accountDetail.email')}
            name="email"
            rules={[{ required: true, type: 'email' }]}
          >
            <Input disabled={!canWrite} />
          </Form.Item>
          {canWrite ? (
            <Button htmlType="submit" loading={emailMutation.isPending}>
              {t('auth.accountDetail.saveEmail')}
            </Button>
          ) : null}
        </Form>
      </SectionCard>
      <SectionCard title="Operating cost">
        <Typography.Paragraph type="secondary">
          Daily cost is charged from the start date through the account deactivation date.
        </Typography.Paragraph>
        <Form
          form={costForm}
          layout="vertical"
          onFinish={(values) => operatingCostMutation.mutate(values)}
        >
          <Form.Item label="Daily cost (USD)" name="amount" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} prefix="$" disabled={!canWrite} />
          </Form.Item>
          <Form.Item label="Start date" name="startedAt">
            <DatePicker disabled={!canWrite} />
          </Form.Item>
          <Descriptions
            column={1}
            items={[
              {
                key: 'end',
                label: 'End date',
                children: account.deactivatedAt
                  ? new Date(account.deactivatedAt).toLocaleDateString()
                  : 'Active account',
              },
            ]}
          />
          {canWrite ? (
            <Button htmlType="submit" loading={operatingCostMutation.isPending}>
              Save operating cost
            </Button>
          ) : null}
        </Form>
      </SectionCard>
      <SectionCard title={t('auth.accountDetail.workspaces')}>
        <Typography.Paragraph type="secondary">
          {t('auth.accountDetail.workspacesDescription')}
        </Typography.Paragraph>
        <div className={styles.actions}>
          {canWrite ? (
            <>
              <Button type="primary" icon={<SafetyCertificateOutlined aria-hidden />}>
                <Link to={`/auth/accounts/${account.id}/access`}>
                  {t('auth.accessExplorer.manageAccess')}
                </Link>
              </Button>
              <Button icon={<LockOutlined aria-hidden />}>
                <Link to={`/auth/accounts/${account.id}/security`}>
                  {t('auth.accountDetail.security')}
                </Link>
              </Button>
            </>
          ) : null}
        </div>
      </SectionCard>
    </section>
  )
}
