import { useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material'

import {
  IconActionButton,
  OperationsHeader,
  OperationsPageShell,
  OperationsPagination,
  OperationsTable,
  OperationsToolbar,
  StatusBadge,
} from '@/components/operations'
import { ROUTES } from '@/constants/routes'
import { ENDPOINTS } from '@/services/endpoints'

import { formatVnd, usePayrollResultsQuery } from '../api/hrPayroll.queries.js'
import PayrollResultDrawer from '../components/PayrollResultDrawer.jsx'
import { buildPayrollResultExportUrl } from '../utils/hrPayrollApi.js'

const pageSize = 20
const columns = [
  { key: 'employee', label: 'Employee', width: '230px' },
  { key: 'team', label: 'Team', width: '150px' },
  { key: 'salaryFromWork', label: 'Base salary', width: '145px', align: 'right' },
  { key: 'overtimePay', label: 'OT', width: '120px', align: 'right' },
  { key: 'totalDeductions', label: 'Deductions', width: '145px', align: 'right' },
  { key: 'grossIncome', label: 'Gross', width: '145px', align: 'right' },
  { key: 'netIncome', label: 'Net pay', width: '150px', align: 'right' },
  { key: 'status', label: 'Status', width: '125px' },
  { key: 'actions', label: '', width: '72px', align: 'center' },
]

function tone(status) {
  return status === 'PAID' ? 'success' : status === 'FINALIZED' ? 'info' : 'warning'
}

function PayrollMetric({ icon, label, value, detail, tone: metricTone = 'default' }) {
  const valueClass =
    metricTone === 'success'
      ? 'text-emerald-700'
      : metricTone === 'warning'
        ? 'text-amber-700'
        : 'text-ink-strong'
  const iconClass =
    metricTone === 'success'
      ? 'bg-emerald-50 text-emerald-700'
      : metricTone === 'warning'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-primary-light text-primary'
  return (
    <section className="flex min-h-28 items-center gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
      >
        {icon}
      </span>
      <div>
        <Typography
          variant="caption"
          className="font-semibold uppercase tracking-wide text-ink-muted"
        >
          {label}
        </Typography>
        <Typography variant="h5" className={`mt-1 font-extrabold ${valueClass}`}>
          {value}
        </Typography>
        <Typography variant="caption" className="mt-1 block text-ink-muted">
          {detail}
        </Typography>
      </div>
    </section>
  )
}

export default function PayrollRegisterPage() {
  const [params, setParams] = useSearchParams()
  const [selected, setSelected] = useState(null)
  const page = Number(params.get('page') || 1)
  const filters = {
    month: params.get('month') || '',
    year: params.get('year') || '',
    status: params.get('status') || '',
    q: params.get('q') || '',
    page,
    limit: pageSize,
  }
  const query = usePayrollResultsQuery(filters, { enabled: Boolean(filters.month && filters.year) })
  const rows = query.data?.items || []
  const pagination = query.data?.pagination || { page, limit: pageSize, total: 0 }
  const hasPeriod = Boolean(filters.month && filters.year)
  const summary = query.data?.summary
  const draftCount = summary?.statusCounts?.DRAFT || 0
  const finalizedCount = summary?.statusCounts?.FINALIZED || 0
  const update = (key, value) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        value ? next.set(key, value) : next.delete(key)
        if (key !== 'page') next.set('page', '1')
        return next
      },
      { replace: true },
    )
  return (
    <OperationsPageShell
      header={
        <OperationsHeader
          title="Payroll register"
          subtitle="Review employee payroll results and payment readiness."
          actions={
            <Stack direction="row" spacing={1}>
              <Button
                component={RouterLink}
                to={ROUTES.HR_PAYROLL_RUN_HISTORY}
                startIcon={<HistoryOutlinedIcon />}
              >
                Manage payroll runs
              </Button>
              <Button
                component="a"
                href={`${ENDPOINTS.HR.PAYROLL_RESULTS_EXPORT}${buildPayrollResultExportUrl(filters)}`}
                startIcon={<DownloadOutlinedIcon />}
              >
                Export CSV
              </Button>
            </Stack>
          }
        />
      }
      toolbar={
        <OperationsToolbar>
          <div className="flex flex-wrap gap-3">
            <TextField
              size="small"
              label="Month"
              type="number"
              value={filters.month}
              onChange={(e) => update('month', e.target.value)}
            />
            <TextField
              size="small"
              label="Year"
              type="number"
              value={filters.year}
              onChange={(e) => update('year', e.target.value)}
            />
            <TextField
              select
              size="small"
              label="Status"
              value={filters.status}
              onChange={(e) => update('status', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {['DRAFT', 'FINALIZED', 'PAID'].map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Search employee"
              value={filters.q}
              onChange={(e) => update('q', e.target.value)}
            />
          </div>
        </OperationsToolbar>
      }
      pagination={
        <OperationsPagination
          page={pagination.page}
          pageSize={pagination.limit}
          total={pagination.total}
          onPageChange={(value) => update('page', String(value))}
        />
      }
    >
      {query.error ? <Alert severity="error">{query.error.message}</Alert> : null}
      <section aria-label="Payroll overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PayrollMetric
          icon={<GroupsOutlinedIcon />}
          label="Employees"
          value={hasPeriod ? summary?.total || 0 : '—'}
          detail="Authorized results in the selected period"
        />
        <PayrollMetric
          icon={<AccountBalanceWalletOutlinedIcon />}
          label="Net payroll"
          value={hasPeriod ? formatVnd(summary?.amounts?.netIncome) : '—'}
          detail="Total net pay for the selected period"
        />
        <PayrollMetric
          icon={<PendingActionsOutlinedIcon />}
          label="Requires review"
          value={hasPeriod ? draftCount : '—'}
          detail="Draft results that still need review"
          tone="warning"
        />
        <PayrollMetric
          icon={<CheckCircleOutlineOutlinedIcon />}
          label="Awaiting payment"
          value={hasPeriod ? finalizedCount : '—'}
          detail="Finalized results not yet paid"
          tone="warning"
        />
      </section>
      <OperationsTable
        columns={columns}
        rows={rows}
        loading={query.isPending}
        getRowKey={(row) => row.id}
        minWidth="1120px"
        emptyTitle="Select a payroll period"
        emptyDescription="Choose a month and year to load authorized payroll results."
        renderCell={(row, column) => {
          if (column.key === 'employee')
            return (
              <Stack>
                <Typography variant="body2" className="font-semibold">
                  {row.employeeName}
                </Typography>
                <Typography variant="caption">{row.employeeCode}</Typography>
              </Stack>
            )
          if (column.key === 'status')
            return <StatusBadge tone={tone(row.status)}>{row.status}</StatusBadge>
          if (column.key === 'team') return row.employeeTeam
          if (column.key === 'actions')
            return (
              <IconActionButton label="View payroll details" onClick={() => setSelected(row)}>
                <VisibilityOutlinedIcon fontSize="small" />
              </IconActionButton>
            )
          return formatVnd(row[column.key])
        }}
      />
      <PayrollResultDrawer resultId={selected?.id} onClose={() => setSelected(null)} />
    </OperationsPageShell>
  )
}
