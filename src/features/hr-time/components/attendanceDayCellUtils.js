export const stateClasses = {
  ABSENT:
    'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/50',
  HALF_DAY:
    'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
  ERROR:
    'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/50',
  HOLIDAY:
    'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/50',
  MIXED_LEAVE:
    'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50',
  NO_RECORD: 'bg-transparent text-ink-muted border-border border-dashed',
  PAID_LEAVE:
    'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
  PRESENT:
    'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  REST_DAY: 'bg-neutral-100 dark:bg-neutral-800/50 text-ink-secondary border-transparent',
  UNASSIGNED: 'bg-transparent text-ink-muted border-border border-dashed',
  UNPAID_LEAVE:
    'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50',
}

export function primaryState(cell = {}) {
  return cell.status || cell.emptyReason || 'NO_RECORD'
}

export function compactTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  )
}

export function attendanceCode(state) {
  if (['PAID_LEAVE', 'UNPAID_LEAVE', 'MIXED_LEAVE'].includes(state)) return 'L'
  if (state === 'HALF_DAY' || state === 'ABSENT' || state === 'NO_RECORD') return 'M'
  if (state === 'REST_DAY' || state === 'UNASSIGNED') return 'R'
  if (state === 'HOLIDAY') return 'H'
  if (state === 'PRESENT') return 'P'
  if (state === 'ERROR') return 'E'
  return state === 'OVERTIME' ? 'OT' : state.slice(0, 2)
}

export function attendanceTimes(cell = {}) {
  return [compactTime(cell.checkInAt), compactTime(cell.checkOutAt)].filter(Boolean)
}

export function secondaryLabel(cell = {}) {
  const checkIn = compactTime(cell.checkInAt)
  const checkOut = compactTime(cell.checkOutAt)
  if (checkIn || checkOut) return `${checkIn || '--'}–${checkOut || '--'}`
  if (cell.leavePortion) return cell.leavePortion
  if (cell.overtimeMinutes) return `${cell.overtimeMinutes}m OT`
  return cell.shift?.name || cell.plannedShift?.name || cell.shiftLabel || ''
}
