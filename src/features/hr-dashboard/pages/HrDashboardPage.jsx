import { useState } from 'react'
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import {
  Alert,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'

import DatePicker from '@/components/form/DatePicker'
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

  const coverageRate = attendance.coverageRate ?? 0
  const coverageColor = coverageRate >= 90 ? 'success' : coverageRate >= 75 ? 'warning' : 'error'

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
          <div className="flex flex-wrap items-center justify-between w-full gap-4">
            <div className="flex gap-2">
              <Button
                size="small"
                variant="outlined"
                startIcon={<FactCheckOutlinedIcon />}
                href="/hr/requests"
              >
                Approve Requests
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AccessTimeOutlinedIcon />}
                href="/hr/my-time"
              >
                Log Time
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <DatePicker
                size="small"
                label="Work date"
                value={dateKey}
                onChange={(val) => setDateKey(val)}
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
        {query.isPending ? (
          <Skeleton variant="rectangular" height={280} className="rounded-lg" />
        ) : null}
        {!query.isPending ? (
          <div className="grid gap-6 xl:grid-cols-3">
            {/* EMPLOYEES */}
            <section className="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <GroupsOutlinedIcon fontSize="small" />
                  </div>
                  <Typography variant="subtitle1" className="font-semibold text-ink-strong">
                    Workforce
                  </Typography>
                </div>
                <Typography variant="caption" className="font-medium text-ink-muted">
                  {query.data?.date || dateKey}
                </Typography>
              </div>

              <div className="flex items-baseline gap-2 mb-6">
                <Typography variant="h3" className="font-bold text-ink-strong tracking-tight">
                  {employees.total ?? 0}
                </Typography>
                <Typography variant="body2" className="text-ink-muted font-medium">
                  total employees
                </Typography>
              </div>

              <Divider className="mb-4" />

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <Typography
                    variant="caption"
                    className="text-ink-muted uppercase tracking-wider font-semibold text-[10px]"
                  >
                    Active
                  </Typography>
                  <Typography variant="body1" className="font-semibold text-ink-strong">
                    {employees.active ?? 0}
                  </Typography>
                </div>
                <div className="flex flex-col gap-1 border-l border-border pl-4">
                  <Typography
                    variant="caption"
                    className="text-ink-muted uppercase tracking-wider font-semibold text-[10px]"
                  >
                    Probation
                  </Typography>
                  <Typography variant="body1" className="font-semibold text-ink-strong">
                    {employees.probation ?? 0}
                  </Typography>
                </div>
                <div className="flex flex-col gap-1 border-l border-border pl-4">
                  <Typography
                    variant="caption"
                    className="text-ink-muted uppercase tracking-wider font-semibold text-[10px]"
                  >
                    On Leave
                  </Typography>
                  <Typography variant="body1" className="font-semibold text-ink-strong">
                    {employees.onLeave ?? 0}
                  </Typography>
                </div>
              </div>
            </section>

            {/* ATTENDANCE */}
            <section className="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
                    <CheckCircleOutlinedIcon fontSize="small" />
                  </div>
                  <Typography variant="subtitle1" className="font-semibold text-ink-strong">
                    Attendance
                  </Typography>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                  <Typography variant="body2" className="font-medium text-ink-strong">
                    Coverage Rate
                  </Typography>
                  <div className="flex items-baseline gap-1">
                    <Typography variant="h4" className="font-bold text-ink-strong tracking-tight">
                      {coverageRate}%
                    </Typography>
                    <TrendingUpIcon fontSize="inherit" color={coverageColor} className="text-sm" />
                  </div>
                </div>
                <LinearProgress
                  variant="determinate"
                  value={coverageRate}
                  color={coverageColor}
                  className="h-2 rounded-full"
                />
                <Typography variant="caption" className="text-ink-muted mt-2 block">
                  {attendance.present ?? 0} present out of {attendance.expectedEmployees ?? 0}{' '}
                  expected
                </Typography>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-auto">
                <div className="flex items-center justify-between rounded-md bg-emerald-50/50 dark:bg-emerald-900/10 px-3 py-2 border border-emerald-100 dark:border-emerald-800/30">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <CheckCircleOutlinedIcon fontSize="inherit" className="text-[1rem]" />
                    <span className="text-xs font-semibold">Present</span>
                  </div>
                  <span className="font-bold text-emerald-800 dark:text-emerald-300">
                    {attendance.present ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-amber-50/50 dark:bg-amber-900/10 px-3 py-2 border border-amber-100 dark:border-amber-800/30">
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                    <WarningAmberIcon fontSize="inherit" className="text-[1rem]" />
                    <span className="text-xs font-semibold">Late</span>
                  </div>
                  <span className="font-bold text-amber-800 dark:text-amber-300">
                    {attendance.late ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-rose-50/50 dark:bg-rose-900/10 px-3 py-2 border border-rose-100 dark:border-rose-800/30">
                  <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                    <ErrorOutlinedIcon fontSize="inherit" className="text-[1rem]" />
                    <span className="text-xs font-semibold">Absent</span>
                  </div>
                  <span className="font-bold text-rose-800 dark:text-rose-300">
                    {attendance.absent ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-indigo-50/50 dark:bg-indigo-900/10 px-3 py-2 border border-indigo-100 dark:border-indigo-800/30">
                  <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                    <BeachAccessOutlinedIcon fontSize="inherit" className="text-[1rem]" />
                    <span className="text-xs font-semibold">On Leave</span>
                  </div>
                  <span className="font-bold text-indigo-800 dark:text-indigo-300">
                    {attendance.onLeave ?? 0}
                  </span>
                </div>
              </div>
            </section>

            {/* APPROVALS */}
            <section className="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                    <BadgeOutlinedIcon fontSize="small" />
                  </div>
                  <Typography variant="subtitle1" className="font-semibold text-ink-strong">
                    Approvals
                  </Typography>
                </div>
                {approvals.totalPending > 0 && (
                  <Chip
                    label={`${approvals.totalPending} Pending`}
                    size="small"
                    color="error"
                    className="h-6 font-semibold"
                  />
                )}
              </div>

              <Stack spacing={3} className="mt-2">
                <div className="flex items-center justify-between group cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors">
                  <div className="flex flex-col">
                    <Typography variant="body2" className="font-semibold text-ink-strong">
                      Leave Requests
                    </Typography>
                    <Typography variant="caption" className="text-ink-muted">
                      Awaiting your approval
                    </Typography>
                  </div>
                  <div className="flex items-center gap-3">
                    <Typography variant="h6" className="font-bold text-ink-strong">
                      {approvals.pendingLeaves ?? 0}
                    </Typography>
                  </div>
                </div>

                <Divider />

                <div className="flex items-center justify-between group cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors">
                  <div className="flex flex-col">
                    <Typography variant="body2" className="font-semibold text-ink-strong">
                      Overtime Requests
                    </Typography>
                    <Typography variant="caption" className="text-ink-muted">
                      Awaiting your approval
                    </Typography>
                  </div>
                  <div className="flex items-center gap-3">
                    <Typography variant="h6" className="font-bold text-ink-strong">
                      {approvals.pendingOvertimes ?? 0}
                    </Typography>
                  </div>
                </div>

                <Divider />

                <div className="flex items-center justify-between p-2 -mx-2">
                  <div className="flex flex-col">
                    <Typography variant="body2" className="font-semibold text-ink-strong">
                      Approved Today
                    </Typography>
                    <Typography variant="caption" className="text-ink-muted">
                      Overtime successfully processed
                    </Typography>
                  </div>
                  <Typography
                    variant="h6"
                    className="font-bold text-emerald-600 dark:text-emerald-400"
                  >
                    {approvals.approvedOvertimesToday ?? 0}
                  </Typography>
                </div>
              </Stack>
            </section>
          </div>
        ) : null}
      </div>
    </OperationsPageShell>
  )
}
