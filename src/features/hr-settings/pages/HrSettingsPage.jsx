import { useState } from 'react'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import KeyIcon from '@mui/icons-material/Key'
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import RestoreIcon from '@mui/icons-material/Restore'
import { Alert, Button, LinearProgress, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { OperationsHeader, OperationsPageShell, StatusBadge } from '@/components/operations'
import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

const queryKey = ['hr-settings', 'sql-attendance']

function unwrap(response) {
  return response?.data ?? response
}

function dateTime(value) {
  return value ? new Date(value).toLocaleString() : 'Never'
}

export default function HrSettingsPage() {
  const queryClient = useQueryClient()
  const [limit, setLimit] = useState('')
  const statusQuery = useQuery({
    queryKey,
    queryFn: () => apiClient.get(ENDPOINTS.HR.SQL_ATTENDANCE_STATUS).then(unwrap),
    refetchInterval: (query) => (query.state.data?.status === 'RUNNING' ? 5_000 : false),
  })
  const sync = useMutation({
    mutationFn: (limit) =>
      apiClient
        .post(ENDPOINTS.HR.SQL_ATTENDANCE_SYNC, limit ? { limit: Number(limit) } : {})
        .then(unwrap),
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })
  const status = statusQuery.data
  const lastResult = status?.lastResult

  const statusIcons = [
    {
      icon: <PlayArrowOutlinedIcon fontSize="small" className="text-primary" />,
      color: 'bg-primary-50 dark:bg-primary-900/20 text-primary-700',
    },
    {
      icon: (
        <CheckCircleOutlinedIcon
          fontSize="small"
          className="text-emerald-600 dark:text-emerald-400"
        />
      ),
      color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700',
    },
    {
      icon: <RestoreIcon fontSize="small" className="text-amber-600 dark:text-amber-400" />,
      color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700',
    },
    {
      icon: <KeyIcon fontSize="small" className="text-purple-600 dark:text-purple-400" />,
      color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700',
    },
  ]

  return (
    <OperationsPageShell
      header={
        <OperationsHeader
          title="HR settings"
          subtitle="Monitor and trigger the authorized SQL attendance ingestion workflow."
        />
      }
    >
      <div className="h-full overflow-auto pb-5">
        <section className="mx-auto max-w-5xl rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="flex items-center gap-3">
                <Typography variant="h6" className="font-bold">
                  SQL attendance sync
                </Typography>
                {status ? (
                  <StatusBadge
                    tone={
                      status.status === 'SUCCESS'
                        ? 'success'
                        : status.status === 'FAILED'
                          ? 'danger'
                          : status.status === 'RUNNING'
                            ? 'info'
                            : 'neutral'
                    }
                  >
                    {status.status}
                  </StatusBadge>
                ) : null}
              </div>
              <Typography variant="body2" className="mt-1.5 text-ink-muted">
                Cursor-backed import status and the latest employee-punch reconciliation result.
              </Typography>
            </div>
            <div className="flex flex-wrap items-start gap-3">
              <TextField
                id="sql-attendance-limit"
                size="small"
                type="number"
                label="Page limit"
                value={limit}
                inputProps={{ min: 1, max: 5000 }}
                helperText="Optional, 1–5000"
                className="w-32"
                onChange={(event) => setLimit(event.target.value)}
              />
              <Button
                variant="contained"
                startIcon={<PlayArrowOutlinedIcon />}
                disabled={sync.isPending || status?.status === 'RUNNING'}
                onClick={() => sync.mutate(limit)}
                className="h-10 mt-0.5"
              >
                Start sync
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                disabled={statusQuery.isFetching}
                onClick={() => statusQuery.refetch()}
                className="h-10 mt-0.5"
              >
                Refresh
              </Button>
            </div>
          </div>
          {statusQuery.isPending || sync.isPending ? <LinearProgress className="mt-4" /> : null}
          {statusQuery.error ? (
            <Alert severity="error" className="mt-4 rounded-lg">
              {statusQuery.error.message}
            </Alert>
          ) : null}
          {sync.error ? (
            <Alert severity="error" className="mt-4 rounded-lg">
              {sync.error.message}
            </Alert>
          ) : null}
          {sync.data ? (
            <Alert severity="info" className="mt-4 rounded-lg">
              Sync job {sync.data.jobId} is {sync.data.status?.toLowerCase()}.
            </Alert>
          ) : null}
          {status ? (
            <>
              <dl className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Last started', dateTime(status.lastStartedAt), statusIcons[0]],
                  ['Last finished', dateTime(status.lastFinishedAt), statusIcons[1]],
                  ['Cursor timestamp', dateTime(status.lastSourceTimestamp), statusIcons[2]],
                  ['Cursor event', status.lastSourceEventId || '-', statusIcons[3]],
                ].map(([label, value, iconDef]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-border bg-surface hover:border-primary/30 transition-colors p-4 shadow-sm flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${iconDef.color}`}>{iconDef.icon}</div>
                      <Typography
                        component="dt"
                        variant="caption"
                        className="font-bold uppercase tracking-wider text-ink-muted"
                      >
                        {label}
                      </Typography>
                    </div>
                    <Typography
                      component="dd"
                      variant="body1"
                      className="break-words font-semibold text-ink-strong"
                    >
                      {value}
                    </Typography>
                  </div>
                ))}
              </dl>
              <div className="mt-8 p-5 bg-surface-subtle border border-border rounded-xl">
                <Typography
                  variant="subtitle2"
                  className="font-bold mb-4 uppercase tracking-wider text-ink-muted text-xs"
                >
                  Last import result
                </Typography>
                {lastResult ? (
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {['fetched', 'inserted', 'updated', 'unchanged', 'failed'].map((key) => (
                      <div
                        key={key}
                        className="rounded-xl border border-border bg-surface p-4 text-center hover:shadow-md transition-shadow"
                      >
                        <Typography
                          component="dd"
                          variant="h5"
                          className={`font-bold ${key === 'failed' && lastResult[key] > 0 ? 'text-rose-600' : key === 'inserted' || key === 'updated' ? 'text-primary-600 dark:text-primary-400' : 'text-ink-strong'}`}
                        >
                          {lastResult[key] || 0}
                        </Typography>
                        <Typography
                          component="dt"
                          variant="caption"
                          className="capitalize text-ink-muted font-medium mt-1 inline-block"
                        >
                          {key}
                        </Typography>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <Typography variant="body2" className="mt-2 text-ink-muted">
                    No completed SQL attendance import is recorded yet.
                  </Typography>
                )}
              </div>
              {status.errorMessage ? (
                <Alert severity="error" className="mt-5 rounded-lg">
                  {status.errorMessage}
                </Alert>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </OperationsPageShell>
  )
}
