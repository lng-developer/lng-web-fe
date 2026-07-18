import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { Button, Skeleton, Typography } from '@mui/material'

import { OperationsTable, StatusBadge } from '@/components/operations'

const columns = [
  { key: 'queue', labelKey: 'home.dashboard.table.queue', width: '26%' },
  { key: 'count', labelKey: 'home.dashboard.table.count', align: 'center', width: '12%' },
  { key: 'priority', labelKey: 'home.dashboard.table.priority', width: '18%' },
  { key: 'description', labelKey: 'home.dashboard.table.description', width: '28%' },
  { key: 'action', labelKey: 'home.dashboard.table.action', align: 'right', width: '16%' },
]

function QueueAction({ href }) {
  const { t } = useTranslation()

  return (
    <Button component={Link} to={href} size="small" endIcon={<ArrowForwardIcon fontSize="small" />}>
      {t('home.dashboard.actions.openQueue')}
    </Button>
  )
}

function QueueRow({ queue }) {
  const { t } = useTranslation()

  return (
    <article className="border-t border-border py-3 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Typography className="font-semibold text-ink-strong">{t(queue.labelKey)}</Typography>
          <Typography variant="body2" className="mt-1 text-ink-muted">
            {t(queue.descriptionKey)}
          </Typography>
        </div>
        <Typography className="shrink-0 text-lg font-bold text-ink-strong">
          {queue.count}
        </Typography>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <StatusBadge tone={queue.tone}>{t(`home.dashboard.priority.${queue.tone}`)}</StatusBadge>
        <QueueAction href={queue.href} />
      </div>
    </article>
  )
}

export default function DashboardQueueTable({ loading, queues }) {
  const { t } = useTranslation()

  return (
    <section className="min-h-0">
      <div className="mb-3">
        <Typography variant="h6" className="font-bold text-ink-strong">
          {t('home.dashboard.myWork')}
        </Typography>
        <Typography variant="body2" className="mt-1 text-ink-muted">
          {t('home.dashboard.myWorkDescription')}
        </Typography>
      </div>

      <div className="hidden md:block">
        <OperationsTable
          columns={columns.map((column) => ({ ...column, label: t(column.labelKey) }))}
          rows={queues}
          loading={loading}
          getRowKey={(queue) => queue.id}
          renderCell={(queue, column) => {
            if (column.key === 'queue') return t(queue.labelKey)
            if (column.key === 'count') return queue.count
            if (column.key === 'priority') {
              return (
                <StatusBadge tone={queue.tone}>
                  {t(`home.dashboard.priority.${queue.tone}`)}
                </StatusBadge>
              )
            }
            if (column.key === 'description') return t(queue.descriptionKey)
            if (column.key === 'action') return <QueueAction href={queue.href} />
            return null
          }}
          emptyTitle={t('home.dashboard.empty.title')}
          emptyDescription={t('home.dashboard.empty.description')}
          minWidth="720px"
        />
      </div>

      <div className="border-y border-border md:hidden">
        {loading
          ? Array.from({ length: 3 }, (_, index) => <Skeleton key={index} height={88} />)
          : queues.map((queue) => <QueueRow key={queue.id} queue={queue} />)}
        {!loading && queues.length === 0 ? (
          <Typography variant="body2" className="py-8 text-center text-ink-muted">
            {t('home.dashboard.empty.description')}
          </Typography>
        ) : null}
      </div>
    </section>
  )
}
