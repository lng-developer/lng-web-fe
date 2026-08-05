import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { LockOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Descriptions, Form, Input, Tag, Typography } from 'antd'

import { FeedbackAlert, LoadingState, PageHeader, SectionCard, useFeedbackToast } from '@/shared/ui'

import { loadAccount, updateAccountEmail } from '../api/accountManagementApi'
import styles from './AccountDetailPage.module.scss'

export function AccountDetailPage() {
  const { t } = useTranslation()
  const { accountId = '' } = useParams()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [emailForm] = Form.useForm<{ email: string }>()
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

  useEffect(() => {
    if (data?.account.email) emailForm.setFieldValue('email', data.account.email)
  }, [data?.account.email, emailForm])

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
          <Tag color={account.status === 'active' ? 'success' : 'default'}>
            {account.status ?? t('auth.accessExplorer.unknown')}
          </Tag>
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
            <Input />
          </Form.Item>
          <Button htmlType="submit" loading={emailMutation.isPending}>
            {t('auth.accountDetail.saveEmail')}
          </Button>
        </Form>
      </SectionCard>
      <SectionCard title={t('auth.accountDetail.workspaces')}>
        <Typography.Paragraph type="secondary">
          {t('auth.accountDetail.workspacesDescription')}
        </Typography.Paragraph>
        <div className={styles.actions}>
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
        </div>
      </SectionCard>
    </section>
  )
}
