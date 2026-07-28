import { useSearchParams } from 'react-router-dom'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Button, MenuItem, TextField, Typography } from '@mui/material'

import {
  OperationsHeader,
  OperationsPageShell,
  OperationsPagination,
  OperationsTable,
  OperationsToolbar,
  StatusBadge,
} from '@/components/operations'

import { formatVnd, useMyPayslipsQuery } from '../api/hrPayroll.queries.js'

const pageSize = 20
const columns = [
  { key: 'period', label: 'Period', width: '120px' },
  { key: 'grossIncome', label: 'Gross income', width: '170px', align: 'right' },
  { key: 'totalDeductions', label: 'Deductions', width: '170px', align: 'right' },
  { key: 'netIncome', label: 'Net pay', width: '180px', align: 'right' },
  { key: 'workDays', label: 'Workdays', width: '120px', align: 'right' },
  { key: 'status', label: 'Status', width: '120px' },
]

export default function MyPayslipsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)
  const month = searchParams.get('month') || ''
  const year = searchParams.get('year') || ''
  const query = useMyPayslipsQuery({ page, limit: pageSize, month, year })
  const rows = query.data?.items || []
  const pagination = query.data?.pagination || { page, limit: pageSize, total: 0 }

  function updateSearch(key, value, resetPage = false) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value === '') next.delete(key)
        else next.set(key, String(value))
        if (resetPage) next.set('page', '1')
        return next
      },
      { replace: true },
    )
  }

  function renderCell(row, column) {
    if (column.key === 'period') {
      const period = row.inputSnapshot?.period || row.period
      return period?.month && period?.year
        ? `${String(period.month).padStart(2, '0')}/${period.year}`
        : '-'
    }
    if (column.key === 'status') return <StatusBadge tone={row.status === 'PAID' ? 'success' : 'info'}>{row.status}</StatusBadge>
    if (column.key === 'workDays') return row.workDays ?? '-'
    if (['grossIncome', 'totalDeductions', 'netIncome'].includes(column.key)) {
      return (
        <Typography variant="body2" className={column.key === 'netIncome' ? 'font-bold text-ink-strong' : ''}>
          {formatVnd(row[column.key])}
        </Typography>
      )
    }
    return '-'
  }

  return (
    <OperationsPageShell
      header={
        <OperationsHeader
          title="My payslips"
          subtitle="Your finalized payroll records with gross income, deductions, and net pay in VND."
        />
      }
      toolbar={
        <OperationsToolbar>
          <div className="flex flex-wrap items-start gap-3">
            <TextField
              select
              size="small"
              className="w-36"
              label="Month"
              value={month}
              onChange={(event) => updateSearch('month', event.target.value, true)}
            >
              <MenuItem value="">All</MenuItem>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                <MenuItem key={value} value={value}>{String(value).padStart(2, '0')}</MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              type="number"
              label="Year"
              value={year}
              inputProps={{ min: 2000, max: 2100 }}
              onChange={(event) => updateSearch('year', event.target.value, true)}
            />
            <Button variant="text" startIcon={<RefreshIcon />} disabled={query.isFetching} onClick={() => query.refetch()}>
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
          onPageChange={(value) => updateSearch('page', value)}
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
        emptyTitle="No payslips yet"
        emptyDescription="Finalized payroll records will appear here automatically."
      />
    </OperationsPageShell>
  )
}
