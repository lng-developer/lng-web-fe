import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material'
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

import { useFinalizePayrollMutation } from '../api/hrPayroll.mutations.js'
import { usePayrollRunsQuery } from '../api/hrPayroll.queries.js'
import PayrollActionDialog from '../components/PayrollActionDialog.jsx'
import PayrollReviewDrawer from '../components/PayrollReviewDrawer.jsx'

const pageSize = 20
const columns = [
  { key: 'period', label: 'Period', width: '150px' },
  { key: 'formulaVersion', label: 'Formula', width: '160px' },
  { key: 'resultCount', label: 'Employees', width: '130px', align: 'right' },
  { key: 'status', label: 'Status', width: '130px' },
  { key: 'updatedAt', label: 'Last update', width: '190px' },
  { key: 'actions', label: 'Actions', width: '120px', align: 'center' },
]

function statusTone(status) {
  if (status === 'PAID') return 'success'
  if (status === 'FINALIZED') return 'info'
  return 'warning'
}

export default function PayrollRunsPage() {
  const { enqueueSnackbar } = useSnackbar()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)
  const month = searchParams.get('month') || ''
  const year = searchParams.get('year') || ''
  const status = searchParams.get('status') || ''
  const [reviewRun, setReviewRun] = useState(null)
  const [finalizeRun, setFinalizeRun] = useState(null)
  const [actionError, setActionError] = useState('')
  const query = usePayrollRunsQuery({ page, limit: pageSize, month, year, status })
  const finalize = useFinalizePayrollMutation()
  const rows = query.data?.items || []
  const pagination = query.data?.pagination || { page, limit: pageSize, total: 0 }

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
      await finalize.mutateAsync({ payrollRunId: finalizeRun.id, expectedVersion: finalizeRun.version })
      enqueueSnackbar('Payroll finalized', { variant: SNACKBAR_VARIANTS.SUCCESS })
      setFinalizeRun(null)
    } catch (error) {
      setActionError(error.message || 'Could not finalize payroll')
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
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </TextField>
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
      {query.error ? <Alert severity="error" className="mb-3">{query.error.message}</Alert> : null}
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
      {reviewRun ? <PayrollReviewDrawer run={reviewRun} onClose={() => setReviewRun(null)} /> : null}
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
    </OperationsPageShell>
  )
}
