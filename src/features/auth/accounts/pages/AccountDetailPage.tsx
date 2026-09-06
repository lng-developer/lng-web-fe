import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowRightOutlined,
  LockOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  Avatar,
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
import { FeedbackAlert, LoadingState, PageHeader, SectionCard, StatusTag } from '@/shared/ui'

import {
  useAccountDetailQuery,
  useUpdateAccountEmailMutation,
  useUpdateAccountOperatingCostMutation,
} from '../hooks'
import styles from './AccountDetailPage.module.scss'

export function AccountDetailPage() {
  const { t } = useTranslation()
  const { accountId = '' } = useParams()
  const [emailForm] = Form.useForm<{ email: string }>()
  const [costForm] = Form.useForm<{ amount: number; startedAt: dayjs.Dayjs | null }>()
  const canRead = hasAnyPermission(['AUTH:READ', 'AUTH:WRITE'], { globalOnly: true })
  const canWrite = hasAnyPermission(['AUTH:WRITE'], { globalOnly: true })
  const { data, error, isLoading, refetch } = useAccountDetailQuery(accountId)
  const emailMutation = useUpdateAccountEmailMutation(accountId)
  const operatingCostMutation = useUpdateAccountOperatingCostMutation(accountId)

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
  const initials = account.email ? account.email.charAt(0).toUpperCase() : 'U'

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('auth.accountDetail.profile')}
        description={t('auth.accountDetail.description')}
      />

      {/* Profile Hero */}
      <div className={styles.profileHero}>
        <Avatar
          size={56}
          style={{ backgroundColor: 'var(--ant-color-primary)', flexShrink: 0 }}
          icon={<UserOutlined />}
        >
          {initials}
        </Avatar>
        <div className={styles.profileInfo}>
          <Typography.Text className={styles.profileEmail}>{account.email}</Typography.Text>
          <div className={styles.profileMeta}>
            <StatusTag status={account.status === 'active' ? 'operational' : 'draft'}>
              {account.status ?? t('auth.accessExplorer.unknown')}
            </StatusTag>
          </div>
        </div>
      </div>

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
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label={t('auth.accountDetail.email')}
            name="email"
            rules={[{ required: true, type: 'email' }]}
          >
            <Input disabled={!canWrite} />
          </Form.Item>
          {canWrite ? (
            <div className={styles.formActions}>
              <Button htmlType="submit" type="primary" loading={emailMutation.isPending}>
                {t('auth.accountDetail.saveEmail')}
              </Button>
            </div>
          ) : null}
        </Form>
      </SectionCard>

      <SectionCard title={t('auth.accountDetail.operatingCost', 'Operating cost')}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {t(
            'auth.accountDetail.operatingCostDescription',
            'Daily cost is charged from the start date through the account deactivation date.',
          )}
        </Typography.Paragraph>
        <Form
          form={costForm}
          layout="vertical"
          onFinish={(values) => operatingCostMutation.mutate(values)}
        >
          <div className={styles.costFields}>
            <Form.Item
              label={t('auth.accountDetail.dailyCost', 'Daily cost (USD)')}
              name="amount"
              rules={[{ required: true }]}
            >
              <InputNumber
                min={0}
                precision={2}
                prefix="$"
                disabled={!canWrite}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label={t('auth.accountDetail.startDate', 'Start date')} name="startedAt">
              <DatePicker disabled={!canWrite} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Descriptions
            column={1}
            style={{ marginBottom: 12 }}
            items={[
              {
                key: 'end',
                label: t('auth.accountDetail.endDate', 'End date'),
                children: account.deactivatedAt
                  ? new Date(account.deactivatedAt).toLocaleDateString()
                  : t('auth.accountDetail.activeAccount', 'Active account'),
              },
            ]}
          />
          {canWrite ? (
            <div className={styles.formActions}>
              <Button htmlType="submit" type="primary" loading={operatingCostMutation.isPending}>
                {t('auth.accountDetail.saveOperatingCost', 'Save operating cost')}
              </Button>
            </div>
          ) : null}
        </Form>
      </SectionCard>

      <SectionCard title={t('auth.accountDetail.workspaces')}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {t('auth.accountDetail.workspacesDescription')}
        </Typography.Paragraph>
        <div className={styles.workspaceLinks}>
          <Link
            to={`/auth/accounts/${account.id}/access`}
            className={styles.workspaceLink}
            aria-label={t('auth.accessExplorer.manageAccess', 'Manage access')}
          >
            <span className={`${styles.workspaceLinkIcon} ${styles.workspaceLinkIconPrimary}`}>
              <SafetyCertificateOutlined />
            </span>
            <div className={styles.workspaceLinkText}>
              <Typography.Text strong>
                {t('auth.accessExplorer.manageAccess', 'Manage access')}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t(
                  'auth.accountDetail.manageAccessHint',
                  'Roles, scoped permissions, validity windows',
                )}
              </Typography.Text>
            </div>
            <ArrowRightOutlined className={styles.workspaceLinkArrow} />
          </Link>
          <Link
            to={`/auth/accounts/${account.id}/security`}
            className={styles.workspaceLink}
            aria-label={t('auth.accountDetail.security')}
          >
            <span className={`${styles.workspaceLinkIcon} ${styles.workspaceLinkIconNeutral}`}>
              <LockOutlined />
            </span>
            <div className={styles.workspaceLinkText}>
              <Typography.Text strong>{t('auth.accountDetail.security')}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t(
                  'auth.accountDetail.securityHint',
                  'Password reset, session management, account archival',
                )}
              </Typography.Text>
            </div>
            <ArrowRightOutlined className={styles.workspaceLinkArrow} />
          </Link>
        </div>
      </SectionCard>
    </section>
  )
}
