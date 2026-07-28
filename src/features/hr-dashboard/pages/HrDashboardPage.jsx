import { useState } from 'react'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Button, Skeleton, TextField, Typography } from '@mui/material'

import { OperationsHeader, OperationsPageShell, OperationsToolbar } from '@/components/operations'

import { useHrDashboardQuery } from '../api/hrDashboard.queries.js'

function todayDateKey() {
  return new Date().toLocaleDateString('en-CA')
}

export default function HrDashboardPage() {
  const [dateKey, setDateKey] = useState(todayDateKey)
  const query = useHrDashboardQuery(dateKey)
  const employees = query.data?.employees || {}
  const attendance = query.data?.attendance || {}
  const approvals = query.data?.approvals || {}

  return (
    <OperationsPageShell
      header={
        <OperationsHeader
          title="HR dashboard"
          subtitle="Daily workforce, attendance, and approval evidence."
        />
      }
      toolbar={
        <OperationsToolbar>
          <div className="flex flex-wrap items-end gap-3">
            <TextField
              size="small"
              type="date"
              label="Work date"
              value={dateKey}
              onChange={(event) => setDateKey(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button
              variant="text"
              startIcon={<RefreshIcon />}
              disabled={query.isFetching}
              onClick={() => query.refetch()}
            >
              Refresh
            </Button>
          </div>
        </OperationsToolbar>
      }
    >
      <div className="h-full overflow-auto pb-4">
        {query.isError ? (
          <Alert severity="error" className="mb-3">
            {query.error.message || 'Could not load HR dashboard'}
          </Alert>
        ) : null}
        {query.isPending ? <Skeleton variant="rectangular" height={280} /> : null}
        {!query.isPending ? (
          <div className="grid gap-3 xl:grid-cols-3">
            <section className="border border-border bg-surface p-4">
              <Typography variant="subtitle1" className="font-semibold text-ink-strong">
                Employees
              </Typography>
              <Typography variant="caption" className="text-ink-muted">
                {query.data?.date || dateKey}
              </Typography>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <dt className="text-xs text-ink-muted">Total</dt>
                  <dd className="text-lg font-semibold text-ink-strong">{employees.total ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Active</dt>
                  <dd className="text-lg font-semibold text-ink-strong">{employees.active ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Probation</dt>
                  <dd className="text-lg font-semibold text-ink-strong">
                    {employees.probation ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">On leave</dt>
                  <dd className="text-lg font-semibold text-ink-strong">
                    {employees.onLeave ?? 0}
                  </dd>
                </div>
              </dl>
            </section>
            <section className="border border-border bg-surface p-4">
              <Typography variant="subtitle1" className="font-semibold text-ink-strong">
                Attendance
              </Typography>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <dt className="text-xs text-ink-muted">Expected</dt>
                  <dd className="text-lg font-semibold text-ink-strong">
                    {attendance.expectedEmployees ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Records</dt>
                  <dd className="text-lg font-semibold text-ink-strong">
                    {attendance.records ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Present</dt>
                  <dd className="text-lg font-semibold text-ink-strong">
                    {attendance.present ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Late</dt>
                  <dd className="text-lg font-semibold text-ink-strong">{attendance.late ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Absent</dt>
                  <dd className="text-lg font-semibold text-ink-strong">
                    {attendance.absent ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">On leave</dt>
                  <dd className="text-lg font-semibold text-ink-strong">
                    {attendance.onLeave ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Missing checkout</dt>
                  <dd className="text-lg font-semibold text-ink-strong">
                    {attendance.missingCheckOuts ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Coverage</dt>
                  <dd className="text-lg font-semibold text-ink-strong">
                    {attendance.coverageRate ?? 0}%
                  </dd>
                </div>
              </dl>
            </section>
            <section className="border border-border bg-surface p-4">
              <Typography variant="subtitle1" className="font-semibold text-ink-strong">
                Approvals
              </Typography>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <dt className="text-xs text-ink-muted">Pending leave</dt>
                  <dd className="text-lg font-semibold text-ink-strong">
                    {approvals.pendingLeaves ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Pending overtime</dt>
                  <dd className="text-lg font-semibold text-ink-strong">
                    {approvals.pendingOvertimes ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Total pending</dt>
                  <dd className="text-lg font-semibold text-ink-strong">
                    {approvals.totalPending ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Approved overtime today</dt>
                  <dd className="text-lg font-semibold text-ink-strong">
                    {approvals.approvedOvertimesToday ?? 0}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        ) : null}
      </div>
    </OperationsPageShell>
  )
}
