import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'

import {
  IconActionButton,
  OperationsHeader,
  OperationsPageShell,
  OperationsPagination,
  OperationsTable,
  OperationsToolbar,
  StatusBadge,
} from '@/components/operations'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { hasAnyPermission } from '@/features/auth/utils/authz.js'
import { useEmployeeProfilesQuery } from '@/features/hr-time/api/hrTime.queries.js'
import { useAuthStore } from '@/store/useAuthStore'

import {
  useEmailPayrollMutation,
  useFinalizePayrollMutation,
  useRunPayrollMutation,
} from '../api/hrPayroll.mutations.js'
import { usePayrollRunsQuery } from '../api/hrPayroll.queries.js'
import PayrollActionDialog from '../components/PayrollActionDialog.jsx'
import PayrollAdjustmentsPanel from '../components/PayrollAdjustmentsPanel.jsx'
import PayrollReviewDrawer from '../components/PayrollReviewDrawer.jsx'
import PayrollRunDialog from '../components/PayrollRunDialog.jsx'

const pageSize = 20
const columns = [
  { key: 'period', label: 'Period', width: '150px' },
  { key: 'formulaVersion', label: 'Formula', width: '160px' },
  { key: 'resultCount', label: 'Employees', width: '130px', align: 'right' },
  { key: 'status', label: 'Status', width: '130px' },
  { key: 'updatedAt', label: 'Last update', width: '190px' },
  { key: 'actions', label: 'Actions', width: '180px', align: 'center' },
]

function statusTone(status) {
  if (status === 'PAID') return 'success'
  if (status === 'FINALIZED') return 'info'
  return 'warning'
}

function RunMetric({ icon, label, value, detail, tone = 'default' }) {
  const iconClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-primary-light text-primary'
  return (
    <section className="flex min-h-32 items-center gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconClass}`}>
        {icon}
      </span>
      <div>
        <Typography variant="body2" className="font-semibold text-ink-muted">
          {label}
        </Typography>
        <Typography variant="h5" className="mt-1 font-extrabold text-ink-strong">
          {value}
        </Typography>
        <Typography variant="caption" className="mt-1 block text-ink-muted">
          {detail}
        </Typography>
      </div>
    </section>
  )
}

export default function PayrollRunsPage() {
  const { enqueueSnackbar } = useSnackbar()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)
  const month = searchParams.get('month') || ''
  const year = searchParams.get('year') || ''
  const status = searchParams.get('status') || ''
  const currentUser = useAuthStore((state) => state.currentUser)
  const canWrite = hasAnyPermission(currentUser, ['HR_PAYROLL:WRITE'])
  const [reviewRun, setReviewRun] = useState(null)
  const [runDialogOpen, setRunDialogOpen] = useState(false)
  const [persistPayload, setPersistPayload] = useState(null)
  const [finalizeRun, setFinalizeRun] = useState(null)
  const [emailRun, setEmailRun] = useState(null)
  const [actionError, setActionError] = useState('')
  const [emailOutcome, setEmailOutcome] = useState(null)
  const query = usePayrollRunsQuery({ page, limit: pageSize, month, year, status })
  const profilesQuery = useEmployeeProfilesQuery(
    { page: 1, limit: 100, status: 'ACTIVE' },
    { enabled: runDialogOpen && canWrite },
  )
  const run = useRunPayrollMutation()
  const finalize = useFinalizePayrollMutation()
  const email = useEmailPayrollMutation()
  const rows = query.data?.items || []
  const pagination = query.data?.pagination || { page, limit: pageSize, total: 0 }
  const draftRuns = rows.filter((row) => row.status === 'DRAFT').length
  const readyToFinalize = rows.filter((row) => row.capabilities?.finalize).length
  const paidRuns = rows.filter((row) => row.status === 'PAID').length
  const employeeResults = rows.reduce((total, row) => total + (row.resultCount || 0), 0)

  function updateSearch(updates, resetPage = false) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        Object.entries(updates).forEach(([key, value]) => {
          if (value === '') next.delete(key)
          else next.set(key, value)
        })
        if (resetPage) next.set('page', '1')
        return next
      },
      { replace: true },
    )
  }

  async function confirmFinalize() {
    setActionError('')
    try {
      await finalize.mutateAsync({
        payrollRunId: finalizeRun.id,
        expectedVersion: finalizeRun.version,
      })
      enqueueSnackbar('Payroll finalized', { variant: SNACKBAR_VARIANTS.SUCCESS })
      setFinalizeRun(null)
    } catch (error) {
      setActionError(error.message || 'Could not finalize payroll')
    }
  }

  async function previewPayroll(payload) {
    setActionError('')
    try {
      return await run.mutateAsync(payload)
    } catch (error) {
      setActionError(error.message || 'Could not preview payroll')
      return null
    }
  }

  function requestPersistPayroll(payload) {
    setActionError('')
    setPersistPayload(payload)
    setRunDialogOpen(false)
  }

  async function confirmPersistPayroll() {
    setActionError('')
    try {
      await run.mutateAsync(persistPayload)
      enqueueSnackbar('Payroll run saved', { variant: SNACKBAR_VARIANTS.SUCCESS })
      setPersistPayload(null)
    } catch (error) {
      setActionError(error.message || 'Could not run payroll')
    }
  }

  async function confirmEmailPayroll() {
    setActionError('')
    try {
      setEmailOutcome(await email.mutateAsync(emailRun.id))
    } catch (error) {
      setActionError(error.message || 'Could not queue payroll emails')
    }
  }

  function renderCell(row, column) {
    if (column.key === 'period') return `${String(row.month).padStart(2, '0')}/${row.year}`
    if (column.key === 'formulaVersion') return row.formulaVersion || '-'
    if (column.key === 'resultCount') return row.resultCount || 0
    if (column.key === 'status') {
      return <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
    }
    if (column.key === 'updatedAt') return new Date(row.updatedAt).toLocaleString()
    if (column.key === 'actions') {
      return (
        <Stack direction="row" spacing={0.25} justifyContent="center">
          <IconActionButton label="Review payroll" onClick={() => setReviewRun(row)}>
            <VisibilityOutlinedIcon fontSize="small" />
          </IconActionButton>
          {row.capabilities?.finalize ? (
            <IconActionButton
              label="Finalize payroll"
              tone="primary"
              onClick={() => {
                setActionError('')
                setFinalizeRun(row)
              }}
            >
              <LockOutlinedIcon fontSize="small" />
            </IconActionButton>
          ) : null}
          {row.capabilities?.email ? (
            <IconActionButton
              label="Email payroll"
              tone="primary"
              onClick={() => {
                setActionError('')
                setEmailOutcome(null)
                setEmailRun(row)
              }}
            >
              <EmailOutlinedIcon fontSize="small" />
            </IconActionButton>
          ) : null}
        </Stack>
      )
    }
    return '-'
  }

  return (
    <OperationsPageShell
      header={
        <OperationsHeader
          title="Payroll runs"
          subtitle="Review payroll calculations, finalize approved periods, and record payment outcomes."
        />
      }
      toolbar={
        <OperationsToolbar>
          <div className="flex flex-wrap items-start gap-3">
            <TextField
              size="small"
              type="number"
              label="Month"
              value={month}
              inputProps={{ min: 1, max: 12 }}
              onChange={(event) => updateSearch({ month: event.target.value }, true)}
            />
            <TextField
              size="small"
              type="number"
              label="Year"
              value={year}
              inputProps={{ min: 2000, max: 2100 }}
              onChange={(event) => updateSearch({ year: event.target.value }, true)}
            />
            <TextField
              select
              size="small"
              className="w-44"
              label="Status"
              value={status}
              onChange={(event) => updateSearch({ status: event.target.value }, true)}
            >
              <MenuItem value="">All</MenuItem>
              {['DRAFT', 'FINALIZED', 'PAID'].map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              startIcon={<PlayArrowOutlinedIcon />}
              disabled={!canWrite}
              onClick={() => {
                setActionError('')
                setRunDialogOpen(true)
              }}
            >
              Run payroll
            </Button>
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
      pagination={
        <OperationsPagination
          page={pagination.page || page}
          pageSize={pagination.limit || pageSize}
          total={pagination.total || 0}
          onPageChange={(value) => updateSearch({ page: String(value) })}
        />
      }
    >
      {query.error ? (
        <Alert severity="error" className="mb-3">
          {query.error.message}
        </Alert>
      ) : null}
      <section
        aria-label="Payroll run summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <RunMetric
          icon={<DescriptionOutlinedIcon />}
          label="Draft runs"
          value={draftRuns}
          detail="Periods in draft"
        />
        <RunMetric
          icon={<HourglassEmptyOutlinedIcon />}
          label="Ready to finalize"
          value={readyToFinalize}
          detail="Authorized actions on this page"
          tone="warning"
        />
        <RunMetric
          icon={<CheckCircleOutlineOutlinedIcon />}
          label="Paid runs"
          value={paidRuns}
          detail="Payment completed"
          tone="success"
        />
        <RunMetric
          icon={<AccountBalanceWalletOutlinedIcon />}
          label="Employee results"
          value={employeeResults}
          detail="Across loaded periods"
        />
      </section>
      <OperationsTable
        columns={columns}
        rows={rows}
        loading={query.isPending}
        getRowKey={(row) => row.id}
        renderCell={renderCell}
        minWidth="880px"
        emptyTitle="No payroll runs"
        emptyDescription="Adjust the period or status filters to find a payroll run."
      />
      <PayrollAdjustmentsPanel canWrite={canWrite} />
      {reviewRun ? (
        <PayrollReviewDrawer run={reviewRun} onClose={() => setReviewRun(null)} />
      ) : null}
      <PayrollRunDialog
        open={runDialogOpen}
        profiles={profilesQuery.data?.items || []}
        loading={run.isPending}
        error={actionError}
        onClose={() => setRunDialogOpen(false)}
        onPreview={previewPayroll}
        onPersist={requestPersistPayroll}
      />
      <PayrollActionDialog
        open={Boolean(persistPayload)}
        title="Run and persist payroll"
        confirmLabel="Confirm run and persist"
        preview={`This will save payroll for ${persistPayload?.month || '-'}/${persistPayload?.year || '-'} and create an audit record.`}
        loading={run.isPending}
        error={actionError}
        onClose={() => setPersistPayload(null)}
        onConfirm={confirmPersistPayroll}
      />
      <PayrollActionDialog
        open={Boolean(finalizeRun)}
        title="Finalize payroll run"
        confirmLabel="Confirm finalize"
        preview={`${finalizeRun?.resultCount || 0} employee results for ${finalizeRun?.month || '-'}/${finalizeRun?.year || '-'} will become immutable.`}
        loading={finalize.isPending}
        error={actionError}
        onClose={() => setFinalizeRun(null)}
        onConfirm={confirmFinalize}
      />
      <PayrollActionDialog
        open={Boolean(emailRun)}
        title="Queue payroll emails"
        confirmLabel="Confirm email delivery"
        preview={`${emailRun?.resultCount || 0} payroll result${emailRun?.resultCount === 1 ? '' : 's'} will be queued or reused for delivery.`}
        loading={email.isPending}
        error={actionError}
        outcome={emailOutcome}
        onClose={() => {
          setEmailRun(null)
          setEmailOutcome(null)
        }}
        onConfirm={confirmEmailPayroll}
      />
    </OperationsPageShell>
  )
}
