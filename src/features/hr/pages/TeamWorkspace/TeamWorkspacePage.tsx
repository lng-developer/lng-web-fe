import { TeamOutlined } from '@ant-design/icons'
import { Button } from 'antd'

import { FeedbackAlert, MetricCard } from '@/shared/ui'

import styles from '../HrOperationsPage.module.scss'
import { type TeamWorkspaceView, useTeamWorkspace } from './useTeamWorkspace'

export function TeamWorkspacePage({ view = 'dashboard' }: { view?: TeamWorkspaceView }) {
  const [
    {
      t,
      data,
      presentCount,
      exceptions,
      approvalsCount,
      attendanceCard,
      approvalsCard,
      directoryCard,
    },
    { workspace },
  ] = useTeamWorkspace(view)

  return (
    <section className={styles.page}>
      {workspace.isError && (
        <FeedbackAlert
          type="error"
          title={t('hrOperations.messages.loadFailed')}
          description={workspace.error.message}
          action={
            <Button type="link" onClick={() => void workspace.refetch()}>
              {t('hrOperations.retry')}
            </Button>
          }
        />
      )}

      {view === 'dashboard' && (
        <div className={styles.metrics}>
          <MetricCard
            icon={<TeamOutlined />}
            label={t('hrOperations.team.members')}
            value={String(data?.profiles.items.length ?? 0)}
          />
          <MetricCard label={t('hrOperations.team.present')} value={String(presentCount)} />
          <MetricCard label={t('hrOperations.team.exceptions')} value={String(exceptions)} />
          <MetricCard
            label={t('hrOperations.team.pendingApproval')}
            value={String(approvalsCount)}
          />
        </div>
      )}

      {view === 'dashboard' && (
        <div className={styles.split}>
          {attendanceCard}
          {approvalsCard}
        </div>
      )}

      {view === 'approvals' && approvalsCard}

      {(view === 'dashboard' || view === 'members') && directoryCard}
    </section>
  )
}
