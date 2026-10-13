import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  LockOutlined,
  ReloadOutlined,
  StopOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Input, Typography } from 'antd'

import { AccessDeniedResult } from '@/shared/auth/AccessDeniedResult'
import { hasAnyPermission } from '@/shared/auth/permissions'
import {
  ConfirmDangerModal,
  FeedbackAlert,
  LoadingState,
  PageHeader,
  SectionCard,
  useFeedbackToast,
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
  const showFeedbackToast = useFeedbackToast()
  const [passwordForm] = Form.useForm<{ password: string }>()
  const [pendingAction, setPendingAction] = useState<SecurityAction>()
  const canWrite = hasAnyPermission(['AUTH:WRITE'], { globalOnly: true })
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
      showFeedbackToast('success', t('actionFeedback.saved'))
      await invalidate()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const revokeMutation = useMutation({
    mutationFn: () => revokeAccountSessions(accountId),
    onSuccess: async () => {
      setPendingAction(undefined)
      showFeedbackToast('success', t('actionFeedback.saved'))
      await invalidate()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const statusMutation = useMutation({
    mutationFn: () => updateAccountStatus(accountId, 'inactive'),
    onSuccess: async () => {
      setPendingAction(undefined)
      showFeedbackToast('success', t('actionFeedback.deactivated'))
      await invalidate()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const archiveMutation = useMutation({
    mutationFn: () => archiveAccount(accountId),
    onSuccess: async () => {
      setPendingAction(undefined)
      showFeedbackToast('success', t('actionFeedback.deleted'))
      await invalidate()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })

  if (!canWrite) return <AccessDeniedResult />
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
        actions={
          <Button icon={<ArrowLeftOutlined aria-hidden />}>
            <Link to={`/auth/accounts/${data.account.id}`}>
              {t('auth.accountSecurity.backToAccount')}
            </Link>
          </Button>
        }
      />
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
        <div className={styles.dangerZone}>
          <div className={styles.dangerZoneTitle}>
            {t('auth.accountSecurity.dangerZone', 'Danger Zone')}
          </div>
          {/* Revoke sessions */}
          <div className={styles.dangerAction}>
            <span className={`${styles.dangerActionIcon} ${styles.dangerActionIconSession}`}>
              <SyncOutlined />
            </span>
            <div className={styles.dangerActionText}>
              <span className={styles.dangerActionLabel}>
                {t('auth.accountSecurity.revokeSessions')}
              </span>
              <span className={styles.dangerActionDescription}>
                {t(
                  'auth.accountSecurity.revokeSessionsDescription',
                  'Immediately terminates all active login sessions.',
                )}
              </span>
            </div>
            <Button
              className={styles.dangerActionBtn}
              icon={<SyncOutlined aria-hidden />}
              onClick={() => setPendingAction('revoke-sessions')}
            >
              {t('auth.accountSecurity.revokeSessions')}
            </Button>
          </div>
          {/* Deactivate */}
          {data.account.status === 'active' ? (
            <div className={styles.dangerAction}>
              <span className={`${styles.dangerActionIcon} ${styles.dangerActionIconDeactivate}`}>
                <StopOutlined />
              </span>
              <div className={styles.dangerActionText}>
                <span className={styles.dangerActionLabel}>
                  {t('auth.accountSecurity.deactivate')}
                </span>
                <span className={styles.dangerActionDescription}>
                  {t(
                    'auth.accountSecurity.deactivateDescription',
                    'Prevents login while preserving all data and assignments.',
                  )}
                </span>
              </div>
              <Button
                danger
                className={styles.dangerActionBtn}
                icon={<StopOutlined aria-hidden />}
                onClick={() => setPendingAction('deactivate')}
              >
                {t('auth.accountSecurity.deactivate')}
              </Button>
            </div>
          ) : null}
          {/* Archive */}
          <div className={styles.dangerAction}>
            <span className={`${styles.dangerActionIcon} ${styles.dangerActionIconArchive}`}>
              <DeleteOutlined />
            </span>
            <div className={styles.dangerActionText}>
              <span className={styles.dangerActionLabel}>{t('auth.accountSecurity.archive')}</span>
              <span className={styles.dangerActionDescription}>
                {t(
                  'auth.accountSecurity.archiveDescription',
                  'Permanently archives the account. This action cannot be undone.',
                )}
              </span>
            </div>
            <Button
              danger
              className={styles.dangerActionBtn}
              icon={<DeleteOutlined aria-hidden />}
              onClick={() => setPendingAction('archive')}
            >
              {t('auth.accountSecurity.archive')}
            </Button>
          </div>
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
