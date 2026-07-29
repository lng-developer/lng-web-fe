import { useState } from 'react'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import { Button, Drawer, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'

import { StatusBadge } from '@/components/operations'

import { useCreatePayrollAdjustmentMutation, useEmailPayrollMutation, useMarkPayrollPaidMutation } from '../api/hrPayroll.mutations.js'
import { formatVnd, usePayrollResultQuery } from '../api/hrPayroll.queries.js'
import { buildMarkPaidPayload } from '../utils/hrPayrollApi.js'

const earnings = [
  ['Base salary', 'salaryFromWork'], ['Overtime', 'overtimePay'], ['Allowances', 'totalAllowances'], ['Adjustments', 'adjustmentEarnings'],
]
const deductions = [
  ['Insurance', 'insurance.total'], ['Income tax', 'personalIncomeTax'], ['Adjustments', 'adjustmentDeductions'],
]

function amount(result, path) { return path.split('.').reduce((value, key) => value?.[key], result) || 0 }

function Breakdown({ title, rows, result }) {
  return <section className="rounded-lg border border-border-subtle bg-surface p-4"><Typography variant="subtitle2" className="mb-3 font-bold">{title}</Typography><Stack spacing={1.25}>{rows.map(([label, path]) => <div key={path} className="flex justify-between gap-3"><Typography variant="body2" className="text-ink-muted">{label}</Typography><Typography variant="body2" className="font-medium">{formatVnd(amount(result, path))}</Typography></div>)}</Stack></section>
}

export default function PayrollResultDrawer({ resultId, onClose }) {
  const { enqueueSnackbar } = useSnackbar()
  const query = usePayrollResultQuery(resultId)
  const markPaid = useMarkPayrollPaidMutation()
  const email = useEmailPayrollMutation()
  const adjustment = useCreatePayrollAdjustmentMutation()
  const [adjustmentForm, setAdjustmentForm] = useState({ type: 'EARNING', code: 'BONUS', name: '', amount: '' })
  const result = query.data
  return <Drawer anchor="right" open={Boolean(resultId)} onClose={onClose} PaperProps={{ className: 'w-full lg:w-[560px]' }}><div className="flex h-full flex-col gap-5 overflow-auto p-5">
    <div className="flex items-start justify-between gap-3"><div><Typography variant="h6" className="font-bold">Payroll details</Typography><Typography variant="body2" className="text-ink-muted">{result?.employeeName || 'Loading payroll result'}</Typography></div>{result ? <StatusBadge>{result.status}</StatusBadge> : null}</div>
    {result ? <><div className="grid grid-cols-2 gap-3"><Breakdown title="Earnings" rows={earnings} result={result} /><Breakdown title="Deductions" rows={deductions} result={result} /></div><section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"><Typography variant="caption" className="text-ink-muted">Net pay</Typography><Typography variant="h4" className="font-bold text-emerald-700">{formatVnd(result.netIncome)}</Typography></section><section className="rounded-lg border border-border-subtle p-4"><Typography variant="subtitle2" className="mb-2 font-bold">Attendance inputs</Typography><Typography variant="body2">Work days: {result.workDays} / {result.standardWorkDays}</Typography><Typography variant="body2">Approved overtime: {Math.round((result.overtimeBreakdown || []).reduce((total, item) => total + (item.approvedMinutes || 0), 0) / 60)}h</Typography></section>{result.status === 'DRAFT' ? <section className="rounded-lg border border-border-subtle p-4"><Typography variant="subtitle2" className="mb-3 font-bold">Add adjustment</Typography><Stack spacing={2}><TextField select size="small" label="Type" value={adjustmentForm.type} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, type: event.target.value })}>{['EARNING', 'ALLOWANCE', 'DEDUCTION'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField><TextField size="small" label="Description" value={adjustmentForm.name} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, name: event.target.value })} /><TextField size="small" type="number" label="Amount (VND)" value={adjustmentForm.amount} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, amount: event.target.value })} /><Button disabled={!adjustmentForm.name || !adjustmentForm.amount || adjustment.isPending} onClick={async () => { try { await adjustment.mutateAsync({ profileId: result.profileId, month: result.period?.month, year: result.period?.year, ...adjustmentForm, amount: Number(adjustmentForm.amount) }); enqueueSnackbar('Adjustment added and draft refreshed', { variant: 'success' }); query.refetch() } catch (error) { enqueueSnackbar(error.message || 'Could not add adjustment', { variant: 'error' }) } }}>Add adjustment</Button></Stack></section> : <Typography variant="caption" className="text-ink-muted">Finalized payroll adjustments require the payroll correction workflow.</Typography>}<Stack direction="row" spacing={1}>{result.capabilities?.markPaid ? <Button variant="contained" startIcon={<PaymentsOutlinedIcon />} disabled={markPaid.isPending} onClick={async () => { try { await markPaid.mutateAsync({ payrollRunId: result.payrollRunId, payload: buildMarkPaidPayload([result.id], result.version) }); enqueueSnackbar('Payroll marked paid', { variant: 'success' }); query.refetch() } catch (error) { enqueueSnackbar(error.message || 'Could not mark payroll paid', { variant: 'error' }) } }}>Mark paid</Button> : null}<Button variant="outlined" startIcon={<SendOutlinedIcon />} disabled={email.isPending || result.status === 'DRAFT'} onClick={async () => { try { await email.mutateAsync(result.payrollRunId); enqueueSnackbar('Payslip delivery queued', { variant: 'success' }) } catch (error) { enqueueSnackbar(error.message || 'Could not queue payslip delivery', { variant: 'error' }) } }}>Send payslip</Button></Stack></> : <Typography variant="body2">Loading…</Typography>}
  </div></Drawer>
}
