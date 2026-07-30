import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  LockOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Input, Typography } from 'antd'

import {
  ConfirmDangerModal,
  FeedbackAlert,
  LoadingState,
  PageHeader,
  SectionCard,
} from '@/shared/ui'

import {
  archiveAccount,
  loadAccount,
  resetAccountPassword,
  revokeAccountSessions,
  updateAccountStatus,
} from '../api/accountManagementApi'
import styles from './AccountSecurityPage.module.scss'

type SecurityAction = 'archive' | 'deactivate' | 'revoke-sessions'

export function AccountSecurityPage() {
  const { t } = useTranslation()
  const { accountId = '' } = useParams()
  const queryClient = useQueryClient()
  const [passwordForm] = Form.useForm<{ password: string }>()
  const [pendingAction, setPendingAction] = useState<SecurityAction>()
  const [notice, setNotice] = useState<'error' | 'success'>()
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['auth-account', accountId],
    queryFn: () => loadAccount(accountId),
    enabled: Boolean(accountId),
  })
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['auth-account', accountId] })
    await queryClient.invalidateQueries({ queryKey: ['access-accounts'] })
  }
  const passwordMutation = useMutation({
    mutationFn: (password: string) => resetAccountPassword(accountId, password),
    onSuccess: async () => {
      passwordForm.resetFields()
      setNotice('success')
      await invalidate()
    },
    onError: () => setNotice('error'),
  })
  const revokeMutation = useMutation({
    mutationFn: () => revokeAccountSessions(accountId),
    onSuccess: async () => {
      setPendingAction(undefined)
      setNotice('success')
      await invalidate()
    },
    onError: () => setNotice('error'),
  })
  const statusMutation = useMutation({
    mutationFn: () => updateAccountStatus(accountId, 'inactive'),
    onSuccess: async () => {
      setPendingAction(undefined)
      setNotice('success')
      await invalidate()
    },
    onError: () => setNotice('error'),
  })
  const archiveMutation = useMutation({
    mutationFn: () => archiveAccount(accountId),
    onSuccess: async () => {
      setPendingAction(undefined)
      setNotice('success')
      await invalidate()
    },
    onError: () => setNotice('error'),
  })

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

  const actionLoading =
    revokeMutation.isPending || statusMutation.isPending || archiveMutation.isPending
  const actionCopy =
    pendingAction === 'archive'
      ? {
          confirm: t('auth.accountSecurity.archive'),
          description: t('auth.accountSecurity.archiveDescription'),
          title: t('auth.accountSecurity.archiveTitle'),
        }
      : pendingAction === 'deactivate'
        ? {
            confirm: t('auth.accountSecurity.deactivate'),
            description: t('auth.accountSecurity.deactivateDescription'),
            title: t('auth.accountSecurity.deactivateTitle'),
          }
        : {
            confirm: t('auth.accountSecurity.revokeSessions'),
            description: t('auth.accountSecurity.revokeSessionsDescription'),
            title: t('auth.accountSecurity.revokeSessionsTitle'),
          }

  function confirmAction() {
    if (pendingAction === 'archive') archiveMutation.mutate()
    if (pendingAction === 'deactivate') statusMutation.mutate()
    if (pendingAction === 'revoke-sessions') revokeMutation.mutate()
  }

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('auth.accountSecurity.title')}
        description={t('auth.accountSecurity.description')}
        actions={
          <Button icon={<ArrowLeftOutlined aria-hidden />}>
            <Link to={`/auth/accounts/${data.account.id}`}>
              {t('auth.accountSecurity.backToAccount')}
            </Link>
          </Button>
        }
      />
      {notice ? <FeedbackAlert type={notice} title={t(`auth.accountSecurity.${notice}`)} /> : null}
      <SectionCard title={t('auth.accountSecurity.password')}>
        <Typography.Paragraph type="secondary">
          {t('auth.accountSecurity.passwordDescription')}
        </Typography.Paragraph>
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={({ password }) => passwordMutation.mutate(password)}
        >
          <Form.Item
            label={t('auth.accountSecurity.newPassword')}
            name="password"
            rules={[{ min: 6, required: true }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button
            htmlType="submit"
            type="primary"
            icon={<LockOutlined aria-hidden />}
            loading={passwordMutation.isPending}
          >
            {t('auth.accountSecurity.resetPassword')}
          </Button>
        </Form>
      </SectionCard>
      <SectionCard title={t('auth.accountSecurity.sessionAndAccess')}>
        <Typography.Paragraph type="secondary">
          {t('auth.accountSecurity.sessionAndAccessDescription')}
        </Typography.Paragraph>
        <div className={styles.dangerActions}>
          <Button
            icon={<ReloadOutlined aria-hidden />}
            onClick={() => setPendingAction('revoke-sessions')}
          >
            {t('auth.accountSecurity.revokeSessions')}
          </Button>
          {data.account.status === 'active' ? (
            <Button
              danger
              icon={<StopOutlined aria-hidden />}
              onClick={() => setPendingAction('deactivate')}
            >
              {t('auth.accountSecurity.deactivate')}
            </Button>
          ) : null}
          <Button
            danger
            icon={<DeleteOutlined aria-hidden />}
            onClick={() => setPendingAction('archive')}
          >
            {t('auth.accountSecurity.archive')}
          </Button>
        </div>
      </SectionCard>
      <ConfirmDangerModal
        open={Boolean(pendingAction)}
        title={actionCopy.title}
        description={actionCopy.description}
        confirmLabel={actionCopy.confirm}
        cancelLabel={t('auth.accessEditor.cancel')}
        confirmIcon={pendingAction === 'archive' ? <DeleteOutlined aria-hidden /> : undefined}
        loading={actionLoading}
        onConfirm={confirmAction}
        onCancel={() => setPendingAction(undefined)}
      />
    </section>
  )
}
