import {
  attendanceCode,
  attendanceTimes,
  primaryState,
  stateClasses,
} from './attendanceDayCellUtils.js'

export default function AttendanceDayCell({ cell, onCellOpen }) {
  const state = primaryState(cell)
  const times = attendanceTimes(cell)
  const lateMinutes = Number(cell?.lateMinutes || 0)
  const label = `${cell?.dateKey || ''}: ${state.replaceAll('_', ' ')}${lateMinutes ? `, late ${lateMinutes} minutes` : ''}${times.length ? `, ${times.join(' - ')}` : ''}`

  return (
    <button
      type="button"
      title={label}
      onClick={() => onCellOpen?.(cell)}
      aria-label={label}
      className={`flex min-h-[46px] w-full min-w-[34px] flex-col items-center justify-center rounded-sm px-0.5 text-[9px] font-bold border hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-all ${
        stateClasses[state] || stateClasses.NO_RECORD
      }`}
    >
      <span className="max-w-full truncate">{attendanceCode(state)}</span>
      {lateMinutes ? <span className="text-[8px] leading-none text-amber-600">L</span> : null}
      {times.length ? (
        <span className="mt-0.5 flex max-w-full flex-col text-[8px] font-normal leading-tight">
          {times.map((time) => (
            <span key={time}>{time}</span>
          ))}
        </span>
      ) : null}
    </button>
  )
}
