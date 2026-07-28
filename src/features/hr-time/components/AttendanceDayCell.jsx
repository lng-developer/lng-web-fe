import { Tooltip } from '@mui/material'

const stateClasses = {
  ABSENT: 'bg-danger-bg text-danger',
  HALF_DAY: 'bg-warning-bg text-warning-strong',
  HOLIDAY: 'bg-info-bg text-info-strong',
  MIXED_LEAVE: 'bg-warning-bg text-warning-strong',
  NO_RECORD: 'bg-surface-subtle text-ink-muted',
  PAID_LEAVE: 'bg-info-bg text-info-strong',
  PRESENT: 'bg-success-bg text-success-strong',
  REST_DAY: 'bg-surface-subtle text-ink-secondary',
  UNASSIGNED: 'bg-surface-subtle text-ink-muted',
  UNPAID_LEAVE: 'bg-warning-bg text-warning-strong',
}

function primaryState(cell = {}) {
  return cell.status || cell.emptyReason || 'NO_RECORD'
}

function compactTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  )
}

function secondaryLabel(cell = {}) {
  const checkIn = compactTime(cell.checkInAt)
  const checkOut = compactTime(cell.checkOutAt)
  if (checkIn || checkOut) return `${checkIn || '--'}–${checkOut || '--'}`
  if (cell.leavePortion) return cell.leavePortion
  if (cell.overtimeMinutes) return `${cell.overtimeMinutes}m OT`
  return cell.shift?.name || cell.plannedShift?.name || cell.shiftLabel || ''
}

export default function AttendanceDayCell({ cell, onCellOpen }) {
  const state = primaryState(cell)
  const secondary = secondaryLabel(cell)
  const label = `${cell?.dateKey || ''}: ${state.replaceAll('_', ' ')}${secondary ? `, ${secondary}` : ''}`

  return (
    <Tooltip title={label}>
      <button
        type="button"
        onClick={() => onCellOpen?.(cell)}
        aria-label={label}
        className={`flex min-h-12 w-full min-w-[72px] flex-col items-center justify-center rounded-md px-1 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          stateClasses[state] || stateClasses.NO_RECORD
        }`}
      >
        <span className="max-w-full truncate">{state.replaceAll('_', ' ')}</span>
        {secondary ? (
          <span className="max-w-full truncate text-[10px] font-normal">{secondary}</span>
        ) : null}
      </button>
    </Tooltip>
  )
}
