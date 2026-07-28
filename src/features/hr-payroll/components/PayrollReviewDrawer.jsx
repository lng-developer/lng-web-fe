import { useState } from 'react'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import {
  Alert,
  Button,
  Checkbox,
  Drawer,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'

import { OperationsTable, StatusBadge } from '@/components/operations'

import { useMarkPayrollPaidMutation } from '../api/hrPayroll.mutations.js'
import {
  buildMarkPaidPayload,
  formatVnd,
  usePayrollRunQuery,
} from '../api/hrPayroll.queries.js'
import PayrollActionDialog from './PayrollActionDialog.jsx'

const columns = [
  { key: 'select', label: '', width: '52px' },
  { key: 'employee', label: 'Employee', width: '190px' },
  { key: 'grossIncome', label: 'Gross', width: '145px', align: 'right' },
  { key: 'deductions', label: 'Deductions', width: '145px', align: 'right' },
  { key: 'netIncome', label: 'Net pay', width: '150px', align: 'right' },
  { key: 'status', label: 'Status', width: '115px' },
]

export default function PayrollReviewDrawer({ run, onClose }) {
  const query = usePayrollRunQuery(run?.id)
  const mutation = useMarkPayrollPaidMutation()
  const [selectedIds, setSelectedIds] = useState([])
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [outcome, setOutcome] = useState(null)
  const results = query.data?.results || []
  const eligible = results.filter((result) => result.capabilities?.markPaid)

  function toggle(id) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  }

  async function markPaid() {
    const expectedVersion = results.find((result) => selectedIds.includes(result.id))?.version
    setError('')
    try {
      const result = await mutation.mutateAsync({
        payrollRunId: run.id,
        payload: buildMarkPaidPayload(selectedIds, expectedVersion),
      })
      setOutcome(result)
    } catch (requestError) {
      setError(requestError.message || 'Could not mark payroll results paid')
    }
  }

  function renderCell(result, column) {
    if (column.key === 'select') {
      return result.capabilities?.markPaid ? (
        <Checkbox
          size="small"
          checked={selectedIds.includes(result.id)}
          inputProps={{ 'aria-label': `Select ${result.employeeName}` }}
          onChange={() => toggle(result.id)}
        />
      ) : null
    }
    if (column.key === 'employee') {
      return (
        <div>
          <Typography variant="body2" className="font-semibold text-ink-strong">
            {result.employeeName}
          </Typography>
          <Typography variant="caption" className="text-ink-muted">
            {result.employeeCode}
          </Typography>
        </div>
      )
    }
    if (column.key === 'deductions') return formatVnd(result.totalDeductions)
    if (column.key === 'status') return <StatusBadge>{result.status}</StatusBadge>
    if (['grossIncome', 'netIncome'].includes(column.key)) return formatVnd(result[column.key])
    return '-'
  }

  return (
    <Drawer
      anchor="right"
      open={Boolean(run)}
      onClose={mutation.isPending ? undefined : onClose}
      PaperProps={{ className: 'w-full lg:w-[820px]' }}
    >
      <div className="flex h-full min-h-0 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Typography variant="h6">Payroll review · {run?.month}/{run?.year}</Typography>
            <Typography variant="body2" className="text-ink-muted">
              Review immutable VND calculations before recording payment.
            </Typography>
          </div>
          {run?.capabilities?.markPaid && eligible.length ? (
            <Button
              variant="contained"
              startIcon={<PaymentsOutlinedIcon />}
              disabled={!selectedIds.length}
              onClick={() => setConfirming(true)}
            >
              Mark paid ({selectedIds.length})
            </Button>
          ) : null}
        </div>
        {query.error ? <Alert severity="error">{query.error.message}</Alert> : null}
        {query.isPending ? <LinearProgress /> : null}
        <div className="min-h-0 flex-1 overflow-auto">
          <OperationsTable
            columns={columns}
            rows={results}
            loading={query.isPending}
            getRowKey={(result) => result.id}
            renderCell={renderCell}
            minWidth="797px"
            emptyTitle="No payroll results"
          />
        </div>
        <Stack direction="row" justifyContent="flex-end">
          <Button onClick={onClose}>Close</Button>
        </Stack>
      </div>
      <PayrollActionDialog
        open={confirming}
        title="Confirm payment records"
        confirmLabel="Confirm mark paid"
        preview={`${selectedIds.length} payroll result${selectedIds.length === 1 ? '' : 's'} will be marked paid. This action is recorded in the audit trail.`}
        loading={mutation.isPending}
        error={error}
        outcome={outcome}
        onClose={() => {
          setConfirming(false)
          setOutcome(null)
        }}
        onConfirm={markPaid}
      />
    </Drawer>
  )
}
