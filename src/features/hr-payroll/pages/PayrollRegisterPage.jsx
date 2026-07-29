import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material'

import { IconActionButton, OperationsHeader, OperationsPageShell, OperationsPagination, OperationsTable, OperationsToolbar, StatusBadge } from '@/components/operations'
import { ENDPOINTS } from '@/services/endpoints'

import { formatVnd, usePayrollResultsQuery } from '../api/hrPayroll.queries.js'
import PayrollResultDrawer from '../components/PayrollResultDrawer.jsx'
import { buildPayrollResultExportUrl } from '../utils/hrPayrollApi.js'

const pageSize = 20
const columns = [
  { key: 'employee', label: 'Employee', width: '230px' },
  { key: 'salaryFromWork', label: 'Base salary', width: '145px', align: 'right' },
  { key: 'overtimePay', label: 'OT', width: '120px', align: 'right' },
  { key: 'totalDeductions', label: 'Deductions', width: '145px', align: 'right' },
  { key: 'grossIncome', label: 'Gross', width: '145px', align: 'right' },
  { key: 'netIncome', label: 'Net pay', width: '150px', align: 'right' },
  { key: 'status', label: 'Status', width: '125px' },
  { key: 'actions', label: '', width: '72px', align: 'center' },
]

function tone(status) { return status === 'PAID' ? 'success' : status === 'FINALIZED' ? 'info' : 'warning' }

export default function PayrollRegisterPage() {
  const [params, setParams] = useSearchParams()
  const [selected, setSelected] = useState(null)
  const page = Number(params.get('page') || 1)
  const filters = { month: params.get('month') || '', year: params.get('year') || '', status: params.get('status') || '', q: params.get('q') || '', page, limit: pageSize }
  const query = usePayrollResultsQuery(filters, { enabled: Boolean(filters.month && filters.year) })
  const rows = query.data?.items || []
  const pagination = query.data?.pagination || { page, limit: pageSize, total: 0 }
  const update = (key, value) => setParams((current) => { const next = new URLSearchParams(current); value ? next.set(key, value) : next.delete(key); if (key !== 'page') next.set('page', '1'); return next }, { replace: true })
  return <OperationsPageShell
    header={<OperationsHeader title="Payroll register" subtitle="Review employee payroll results and payment readiness." actions={<Button component="a" href={`${ENDPOINTS.HR.PAYROLL_RESULTS_EXPORT}${buildPayrollResultExportUrl(filters).split(ENDPOINTS.HR.PAYROLL_RESULTS_EXPORT)[1] || ''}`} startIcon={<DownloadOutlinedIcon />}>Export CSV</Button>} />}
    toolbar={<OperationsToolbar><div className="flex flex-wrap gap-3"><TextField size="small" label="Month" type="number" value={filters.month} onChange={(e) => update('month', e.target.value)} /><TextField size="small" label="Year" type="number" value={filters.year} onChange={(e) => update('year', e.target.value)} /><TextField select size="small" label="Status" value={filters.status} onChange={(e) => update('status', e.target.value)}><MenuItem value="">All</MenuItem>{['DRAFT', 'FINALIZED', 'PAID'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField><TextField size="small" label="Search employee" value={filters.q} onChange={(e) => update('q', e.target.value)} /></div></OperationsToolbar>}
    pagination={<OperationsPagination page={pagination.page} pageSize={pagination.limit} total={pagination.total} onPageChange={(value) => update('page', String(value))} />}
  >
    {query.error ? <Alert severity="error">{query.error.message}</Alert> : null}
    <OperationsTable columns={columns} rows={rows} loading={query.isPending} getRowKey={(row) => row.id} minWidth="1120px" emptyTitle="Select a payroll period" emptyDescription="Choose a month and year to load authorized payroll results." renderCell={(row, column) => {
      if (column.key === 'employee') return <Stack><Typography variant="body2" className="font-semibold">{row.employeeName}</Typography><Typography variant="caption">{row.employeeCode}</Typography></Stack>
      if (column.key === 'status') return <StatusBadge tone={tone(row.status)}>{row.status}</StatusBadge>
      if (column.key === 'actions') return <IconActionButton label="View payroll details" onClick={() => setSelected(row)}><VisibilityOutlinedIcon fontSize="small" /></IconActionButton>
      return formatVnd(row[column.key])
    }} />
    <PayrollResultDrawer resultId={selected?.id} onClose={() => setSelected(null)} />
  </OperationsPageShell>
}
