import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Button, Typography } from '@mui/material'

import {
  IconActionButton,
  OperationsHeader,
  OperationsPageShell,
  StatusBadge,
} from '@/components/operations'
import { resolveCurrentUser } from '@/features/auth/utils/currentUser'
import { useAuthStore } from '@/store/useAuthStore'

import { useHomeDashboardQuery } from '../api/home.queries'
import DashboardManagementLinks from '../components/DashboardManagementLinks'
import DashboardQueueTable from '../components/DashboardQueueTable'

function AttentionList({ items }) {
  const { t } = useTranslation()

  if (!items.length) return null

  return (
    <section>
      <Typography variant="h6" className="font-bold text-ink-strong">
        {t('home.dashboard.attention.title')}
      </Typography>
      <div className="mt-2 divide-y divide-border border-y border-border">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            className="flex items-center justify-between gap-3 py-3 text-inherit no-underline hover:bg-surface-subtle"
          >
            <div className="min-w-0">
              <Typography className="font-semibold text-ink-strong">{t(item.labelKey)}</Typography>
              <Typography variant="body2" className="mt-1 text-ink-muted">
                {t('home.dashboard.attention.openQueue')}
              </Typography>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge tone={item.tone}>
                {t(`home.dashboard.priority.${item.tone}`)}
              </StatusBadge>
              <Typography className="font-bold text-ink-strong">{item.count}</Typography>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function HomePage() {
  const { t } = useTranslation()
  const storedCurrentUser = useAuthStore((state) => state.currentUser)
  const user = resolveCurrentUser(storedCurrentUser)
  const { data, failedSources, isError, isPending, refetch } = useHomeDashboardQuery(user)

  return (
    <OperationsPageShell
      className="overflow-y-auto"
      header={
        <OperationsHeader
          title={t('home.dashboard.title')}
          subtitle={t('home.dashboard.totalOpen', { count: data.totalCount })}
          actions={
            <IconActionButton
              label={t('home.dashboard.actions.refresh')}
              loading={isPending}
              onClick={() => refetch()}
            >
              <RefreshIcon fontSize="small" />
            </IconActionButton>
          }
        />
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto pb-6">
        {isError ? (
          <Alert
            severity="warning"
            action={
              <Button color="inherit" size="small" onClick={() => refetch()}>
                {t('home.dashboard.actions.retry')}
              </Button>
            }
          >
            {t('home.dashboard.partialData', { count: failedSources.length })}
          </Alert>
        ) : null}

        <DashboardQueueTable loading={isPending} queues={data.queues} />
        <AttentionList items={data.attention} />
        <DashboardManagementLinks links={data.managementLinks} />
      </div>
    </OperationsPageShell>
  )
}
