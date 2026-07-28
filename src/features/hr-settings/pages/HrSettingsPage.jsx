import { useState } from 'react'
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
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
        <section className="mx-auto max-w-5xl rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Typography variant="h6">SQL attendance sync</Typography>
                {status ? (
                  <StatusBadge tone={status.status === 'SUCCESS' ? 'success' : status.status === 'FAILED' ? 'danger' : status.status === 'RUNNING' ? 'info' : 'neutral'}>
                    {status.status}
                  </StatusBadge>
                ) : null}
              </div>
              <Typography variant="body2" className="mt-1 text-ink-muted">
                Cursor-backed import status and the latest employee-punch reconciliation result.
              </Typography>
            </div>
            <div className="flex flex-wrap items-start gap-2">
              <TextField
                id="sql-attendance-limit"
                size="small"
                type="number"
                label="Page limit"
                value={limit}
                inputProps={{ min: 1, max: 5000 }}
                helperText="Optional, 1–5000"
                onChange={(event) => setLimit(event.target.value)}
              />
              <Button
                variant="contained"
                startIcon={<PlayArrowOutlinedIcon />}
                disabled={sync.isPending || status?.status === 'RUNNING'}
                onClick={() => sync.mutate(limit)}
              >
                Start sync
              </Button>
              <Button variant="text" startIcon={<RefreshIcon />} disabled={statusQuery.isFetching} onClick={() => statusQuery.refetch()}>
                Refresh
              </Button>
            </div>
          </div>
          {statusQuery.isPending || sync.isPending ? <LinearProgress className="mt-4" /> : null}
          {statusQuery.error ? <Alert severity="error" className="mt-4">{statusQuery.error.message}</Alert> : null}
          {sync.error ? <Alert severity="error" className="mt-4">{sync.error.message}</Alert> : null}
          {sync.data ? <Alert severity="info" className="mt-4">Sync job {sync.data.jobId} is {sync.data.status?.toLowerCase()}.</Alert> : null}
          {status ? (
            <>
              <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Last started', dateTime(status.lastStartedAt)],
                  ['Last finished', dateTime(status.lastFinishedAt)],
                  ['Cursor timestamp', dateTime(status.lastSourceTimestamp)],
                  ['Cursor event', status.lastSourceEventId || '-'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border bg-surface-subtle p-4">
                    <Typography component="dt" variant="caption" className="uppercase tracking-wide text-ink-muted">{label}</Typography>
                    <Typography component="dd" variant="body2" className="mt-1 break-words font-semibold text-ink-strong">{value}</Typography>
                  </div>
                ))}
              </dl>
              <div className="mt-5">
                <Typography variant="subtitle2">Last import result</Typography>
                {lastResult ? (
                  <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {['fetched', 'inserted', 'updated', 'unchanged', 'failed'].map((key) => (
                      <div key={key} className="rounded-lg border border-border p-3 text-center">
                        <Typography component="dd" variant="h6">{lastResult[key] || 0}</Typography>
                        <Typography component="dt" variant="caption" className="capitalize text-ink-muted">{key}</Typography>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <Typography variant="body2" className="mt-2 text-ink-muted">No completed SQL attendance import is recorded yet.</Typography>
                )}
              </div>
              {status.errorMessage ? <Alert severity="error" className="mt-5">{status.errorMessage}</Alert> : null}
            </>
          ) : null}
        </section>
      </div>
    </OperationsPageShell>
  )
}
