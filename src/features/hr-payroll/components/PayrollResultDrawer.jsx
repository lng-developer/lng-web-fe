import { useState } from 'react'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined'
import { Button, Drawer, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'

import { StatusBadge } from '@/components/operations'

import {
  useCreatePayrollAdjustmentMutation,
  useEmailPayrollMutation,
  useMarkPayrollPaidMutation,
} from '../api/hrPayroll.mutations.js'
import { formatVnd, usePayrollResultQuery } from '../api/hrPayroll.queries.js'
import { buildMarkPaidPayload } from '../utils/hrPayrollApi.js'

const earnings = [
  ['Base salary', 'salaryFromWork'],
  ['Overtime', 'overtimePay'],
  ['Allowances', 'totalAllowances'],
  ['Adjustments', 'adjustmentEarnings'],
]
const deductions = [
  ['Insurance', 'insurance.total'],
  ['Income tax', 'personalIncomeTax'],
  ['Adjustments', 'adjustmentDeductions'],
]

function amount(result, path) {
  return path.split('.').reduce((value, key) => value?.[key], result) || 0
}

function Breakdown({ title, rows, result }) {
  const total = rows.reduce((value, [, path]) => value + amount(result, path), 0)
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
        <Typography variant="subtitle2" className="font-bold">
          {title}
        </Typography>
        <Typography variant="subtitle2" className="font-bold">
          {formatVnd(total)}
        </Typography>
      </div>
      <Stack spacing={1.25}>
        {rows.map(([label, path]) => (
          <div key={path} className="flex justify-between gap-3">
            <Typography variant="body2" className="text-ink-muted">
              {label}
            </Typography>
            <Typography variant="body2" className="font-medium">
              {formatVnd(amount(result, path))}
            </Typography>
          </div>
        ))}
      </Stack>
    </section>
  )
}

function InputMetric({ icon, label, value, detail }) {
  return (
    <section className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 text-ink-muted">
        {icon}
        <Typography variant="caption">{label}</Typography>
      </div>
      <Typography variant="h6" className="mt-2 font-bold text-ink-strong">
        {value}
      </Typography>
      <Typography variant="caption" className="text-ink-muted">
        {detail}
      </Typography>
    </section>
  )
}

function statusTone(status) {
  return status === 'PAID' ? 'success' : status === 'FINALIZED' ? 'info' : 'warning'
}

export default function PayrollResultDrawer({ resultId, onClose }) {
  const { enqueueSnackbar } = useSnackbar()
  const query = usePayrollResultQuery(resultId)
  const markPaid = useMarkPayrollPaidMutation()
  const email = useEmailPayrollMutation()
  const adjustment = useCreatePayrollAdjustmentMutation()
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'EARNING',
    code: 'BONUS',
    name: '',
    amount: '',
  })
  const result = query.data
  const overtimeHours = Math.round(
    (result?.overtimeBreakdown || []).reduce(
      (total, item) => total + (item.approvedMinutes || 0),
      0,
    ) / 60,
  )

  async function submitAdjustment() {
    try {
      await adjustment.mutateAsync({
        profileId: result.profileId,
        month: result.period?.month,
        year: result.period?.year,
        ...adjustmentForm,
        amount: Number(adjustmentForm.amount),
      })
      enqueueSnackbar('Adjustment added and draft refreshed', { variant: 'success' })
      query.refetch()
    } catch (error) {
      enqueueSnackbar(error.message || 'Could not add adjustment', { variant: 'error' })
    }
  }

  async function submitMarkPaid() {
    try {
      await markPaid.mutateAsync({
        payrollRunId: result.payrollRunId,
        payload: buildMarkPaidPayload([result.id], result.version),
      })
      enqueueSnackbar('Payroll marked paid', { variant: 'success' })
      query.refetch()
    } catch (error) {
      enqueueSnackbar(error.message || 'Could not mark payroll paid', { variant: 'error' })
    }
  }

  async function submitEmail() {
    try {
      await email.mutateAsync(result.payrollRunId)
      enqueueSnackbar('Payslip delivery queued', { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(error.message || 'Could not queue payslip delivery', { variant: 'error' })
    }
  }

  return (
    <Drawer
      anchor="right"
      open={Boolean(resultId)}
      onClose={onClose}
      PaperProps={{ className: 'w-full lg:w-[640px]' }}
    >
      <div className="flex h-full flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <Typography variant="h6" className="font-bold">
            Payroll details
          </Typography>
          <IconButton aria-label="Close payroll details" onClick={onClose}>
            <CloseOutlinedIcon />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-5">
          {result ? (
            <>
              <section className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <Typography variant="h6" className="font-bold text-ink-strong">
                    {result.employeeName}
                  </Typography>
                  <Typography variant="body2" className="mt-1 text-ink-muted">
                    Employee code: {result.employeeCode}
                  </Typography>
                  <Typography variant="body2" className="text-ink-muted">
                    Team: {result.employeeTeam}
                  </Typography>
                </div>
                <div className="text-right">
                  <StatusBadge tone={statusTone(result.status)}>{result.status}</StatusBadge>
                  <Typography
                    variant="caption"
                    className="mt-2 flex items-center gap-1 text-ink-muted"
                  >
                    <CalendarMonthOutlinedIcon sx={{ fontSize: 14 }} />
                    {result.period?.month}/{result.period?.year}
                  </Typography>
                </div>
              </section>
              <div className="grid grid-cols-2 gap-3">
                <Breakdown title="Earnings" rows={earnings} result={result} />
                <Breakdown title="Deductions" rows={deductions} result={result} />
              </div>
              <section className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <Typography variant="caption" className="text-ink-muted">
                  Net pay
                </Typography>
                <Typography variant="h4" className="font-bold text-emerald-700">
                  {formatVnd(result.netIncome)}
                </Typography>
              </section>
              <section className="mt-4 rounded-xl border border-info bg-info-bg p-4">
                <div className="flex items-center gap-2">
                  <InfoOutlinedIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" className="font-bold">
                    Calculation note
                  </Typography>
                </div>
                <Typography variant="body2" className="mt-2 text-ink-muted">
                  Payroll is calculated from approved attendance, leave, overtime, adjustments, and
                  company policy. All amounts are in VND.
                </Typography>
              </section>
              <Typography variant="subtitle2" className="mt-5 font-bold">
                Attendance inputs
              </Typography>
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <InputMetric
                  icon={<TimerOutlinedIcon fontSize="small" />}
                  label="Approved overtime"
                  value={`${overtimeHours}h`}
                  detail="Approved requests"
                />
                <InputMetric
                  icon={<CalendarMonthOutlinedIcon fontSize="small" />}
                  label="Work days"
                  value={`${result.workDays} / ${result.standardWorkDays}`}
                  detail="Actual / scheduled"
                />
                <InputMetric
                  icon={<GroupsOutlinedIcon fontSize="small" />}
                  label="Allowances"
                  value={formatVnd(result.totalAllowances)}
                  detail="Eligible allowances"
                />
                <InputMetric
                  icon={<PaymentsOutlinedIcon fontSize="small" />}
                  label="Formula"
                  value={result.formulaVersion || '-'}
                  detail="Payroll calculation"
                />
              </div>
              {result.status === 'DRAFT' ? (
                <section className="mt-4 rounded-xl border border-border p-4">
                  <Typography variant="subtitle2" className="mb-3 font-bold">
                    Add adjustment
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      select
                      size="small"
                      label="Type"
                      value={adjustmentForm.type}
                      onChange={(event) =>
                        setAdjustmentForm({ ...adjustmentForm, type: event.target.value })
                      }
                    >
                      {['EARNING', 'ALLOWANCE', 'DEDUCTION'].map((value) => (
                        <MenuItem key={value} value={value}>
                          {value}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      size="small"
                      label="Description"
                      value={adjustmentForm.name}
                      onChange={(event) =>
                        setAdjustmentForm({ ...adjustmentForm, name: event.target.value })
                      }
                    />
                    <TextField
                      size="small"
                      type="number"
                      label="Amount (VND)"
                      value={adjustmentForm.amount}
                      onChange={(event) =>
                        setAdjustmentForm({ ...adjustmentForm, amount: event.target.value })
                      }
                    />
                    <Button
                      disabled={
                        !adjustmentForm.name || !adjustmentForm.amount || adjustment.isPending
                      }
                      onClick={submitAdjustment}
                    >
                      Add adjustment
                    </Button>
                  </Stack>
                </section>
              ) : null}
            </>
          ) : (
            <Typography variant="body2">Loadingâ€¦</Typography>
          )}
        </div>
        {result ? (
          <Stack direction="row" spacing={1} className="border-t border-border bg-surface p-4">
            {result.capabilities?.markPaid ? (
              <Button
                variant="contained"
                startIcon={<PaymentsOutlinedIcon />}
                disabled={markPaid.isPending}
                onClick={submitMarkPaid}
              >
                Mark paid
              </Button>
            ) : null}
            <Button
              variant="outlined"
              startIcon={<SendOutlinedIcon />}
              disabled={email.isPending || result.status === 'DRAFT'}
              onClick={submitEmail}
            >
              Send payslip
            </Button>
          </Stack>
        ) : null}
      </div>
    </Drawer>
  )
}
