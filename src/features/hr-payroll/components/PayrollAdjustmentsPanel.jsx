import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'

import AnimatedDialog from '@/components/common/AnimatedDialog'
import {
  IconActionButton,
  OperationsPagination,
  OperationsTable,
  OperationsToolbar,
  StatusBadge,
} from '@/components/operations'
import { useEmployeeProfilesQuery } from '@/features/hr-time/api/hrTime.queries.js'

import {
  useCancelPayrollAdjustmentMutation,
  useCreatePayrollAdjustmentMutation,
  useUpdatePayrollAdjustmentMutation,
} from '../api/hrPayroll.mutations.js'
import { usePayrollAdjustmentsQuery } from '../api/hrPayroll.queries.js'
import { formatVnd } from '../utils/hrPayrollApi.js'
import PayrollAdjustmentDialog, {
  payrollAdjustmentConflictMessage,
} from './PayrollAdjustmentDialog.jsx'

const pageSize = 20
const columns = [
  { key: 'employee', label: 'Employee', width: '180px' },
  { key: 'period', label: 'Period', width: '120px' },
  { key: 'type', label: 'Type', width: '130px' },
  { key: 'name', label: 'Adjustment', width: '200px' },
  { key: 'amount', label: 'Amount (VND)', width: '160px', align: 'right' },
  { key: 'status', label: 'Status', width: '130px' },
  { key: 'actions', label: 'Actions', width: '120px', align: 'center' },
]

export default function PayrollAdjustmentsPanel({ canWrite }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [editing, setEditing] = useState(null)
  const [canceling, setCanceling] = useState(null)
  const [actionError, setActionError] = useState('')
  const [outcome, setOutcome] = useState(null)
  const page = Math.max(Number(searchParams.get('adjustmentPage')) || 1, 1)
  const profileId = searchParams.get('adjustmentProfileId') || ''
  const month = searchParams.get('adjustmentMonth') || ''
  const year = searchParams.get('adjustmentYear') || ''
  const status = searchParams.get('adjustmentStatus') || ''
  const type = searchParams.get('adjustmentType') || ''
  const query = usePayrollAdjustmentsQuery({
    profileId,
    month,
    year,
    status,
    type,
    page,
    limit: pageSize,
  })
  const profilesQuery = useEmployeeProfilesQuery({ page: 1, limit: 100, status: 'ACTIVE' })
  const create = useCreatePayrollAdjustmentMutation()
  const update = useUpdatePayrollAdjustmentMutation()
  const cancel = useCancelPayrollAdjustmentMutation()
  const rows = query.data?.items || []
  const pagination = query.data?.pagination || { page, limit: pageSize, total: 0 }
  const profiles = profilesQuery.data?.items || []
  const profileNames = new Map(profiles.map((profile) => [profile.id, profile.fullName]))

  function updateSearch(updates, resetPage = false) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        Object.entries(updates).forEach(([key, value]) => {
          const param = `adjustment${key[0].toUpperCase()}${key.slice(1)}`
          if (value === '') next.delete(param)
          else next.set(param, value)
        })
        if (resetPage) next.set('adjustmentPage', '1')
        return next
      },
      { replace: true },
    )
  }

  async function submitAdjustment(payload) {
    setActionError('')
    try {
      const result = editing
        ? await update.mutateAsync({ adjustmentId: editing.id, payload })
        : await create.mutateAsync(payload)
      setOutcome(result)
      setEditing(null)
    } catch (error) {
      if (error?.status === 409) {
        await query.refetch()
        setActionError(payrollAdjustmentConflictMessage)
      } else setActionError(error.message || 'Could not save adjustment')
    }
  }

  async function confirmCancel() {
    setActionError('')
    try {
      setOutcome(
        await cancel.mutateAsync({
          adjustmentId: canceling.id,
          expectedVersion: canceling.version,
        }),
      )
      setCanceling(null)
    } catch (error) {
      if (error?.status === 409) {
        await query.refetch()
        setActionError(payrollAdjustmentConflictMessage)
      } else setActionError(error.message || 'Could not cancel adjustment')
    }
  }

  function renderCell(row, column) {
    if (column.key === 'employee') return profileNames.get(row.profileId) || row.profileId
    if (column.key === 'period') return `${String(row.month).padStart(2, '0')}/${row.year}`
    if (column.key === 'type') return `${row.type} · ${row.code}`
    if (column.key === 'name') return row.name
    if (column.key === 'amount') return formatVnd(row.amount)
    if (column.key === 'status')
      return (
        <StatusBadge tone={row.status === 'CANCELLED' ? 'default' : 'success'}>
          {row.status}
        </StatusBadge>
      )
    if (column.key === 'actions')
      return canWrite ? (
        <Stack direction="row" spacing={0.25} justifyContent="center">
          <IconActionButton
            label="Edit adjustment"
            onClick={() => {
              setActionError('')
              setEditing(row)
            }}
          >
            <EditOutlinedIcon fontSize="small" />
          </IconActionButton>
          {row.status !== 'CANCELLED' ? (
            <IconActionButton
              label="Cancel adjustment"
              tone="danger"
              onClick={() => {
                setActionError('')
                setCanceling(row)
              }}
            >
              <CancelOutlinedIcon fontSize="small" />
            </IconActionButton>
          ) : null}
        </Stack>
      ) : (
        '-'
      )
    return '-'
  }

  return (
    <section className="mt-8 space-y-4">
      <div>
        <Typography variant="h6">Payroll adjustments</Typography>
        <Typography variant="body2" color="text.secondary">
          Manage approved earnings, allowances, and deductions without deleting payroll evidence.
        </Typography>
      </div>
      <OperationsToolbar>
        <div className="flex flex-wrap items-start gap-3">
          <TextField
            select
            size="small"
            className="w-52"
            label="Employee"
            value={profileId}
            onChange={(event) => updateSearch({ profileId: event.target.value }, true)}
          >
            <MenuItem value="">All</MenuItem>
            {profiles.map((profile) => (
              <MenuItem key={profile.id} value={profile.id}>
                {profile.fullName}
              </MenuItem>
            ))}
          </TextField>
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
            className="w-40"
            label="Status"
            value={status}
            onChange={(event) => updateSearch({ status: event.target.value }, true)}
          >
            <MenuItem value="">All</MenuItem>
            {['APPROVED', 'CANCELLED'].map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            className="w-40"
            label="Type"
            value={type}
            onChange={(event) => updateSearch({ type: event.target.value }, true)}
          >
            <MenuItem value="">All</MenuItem>
            {['EARNING', 'ALLOWANCE', 'DEDUCTION'].map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            disabled={!canWrite}
            onClick={() => {
              setActionError('')
              setEditing({})
            }}
          >
            Create adjustment
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
      {query.error ? <Alert severity="error">{query.error.message}</Alert> : null}
      {outcome ? (
        <Alert
          severity={outcome.requiresReview ? 'warning' : 'success'}
          onClose={() => setOutcome(null)}
        >
          {outcome.requiresReview
            ? 'Payroll is finalized. Review this adjustment before payroll can reflect it.'
            : outcome.draftPayrollRefreshed
              ? 'Draft payroll refreshed from this adjustment.'
              : 'Adjustment saved.'}
        </Alert>
      ) : null}
      <OperationsTable
        columns={columns}
        rows={rows}
        loading={query.isPending}
        getRowKey={(row) => row.id}
        renderCell={renderCell}
        minWidth="1040px"
        emptyTitle="No payroll adjustments"
        emptyDescription="Adjust the period, employee, status, or type filters to find an adjustment."
      />
      <OperationsPagination
        page={pagination.page || page}
        pageSize={pagination.limit || pageSize}
        total={pagination.total || 0}
        onPageChange={(value) => updateSearch({ page: String(value) })}
      />
      {editing ? (
        <PayrollAdjustmentDialog
          key={editing.id || 'create'}
          open
          adjustment={editing.id ? editing : null}
          profiles={profiles}
          loading={create.isPending || update.isPending}
          error={actionError}
          onClose={() => setEditing(null)}
          onSubmit={submitAdjustment}
        />
      ) : null}
      <AnimatedDialog
        open={Boolean(canceling)}
        onClose={cancel.isPending ? undefined : () => setCanceling(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Cancel adjustment?</DialogTitle>
        <DialogContent>
          <Typography>
            This keeps the adjustment record and removes it from active payroll calculation.
          </Typography>
          {actionError ? (
            <Alert severity="error" className="mt-3">
              {actionError}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCanceling(null)} disabled={cancel.isPending}>
            Keep adjustment
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmCancel}
            disabled={cancel.isPending}
          >
            Cancel adjustment
          </Button>
        </DialogActions>
      </AnimatedDialog>
    </section>
  )
}
