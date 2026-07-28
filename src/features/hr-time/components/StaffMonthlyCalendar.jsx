import { buildMonthColumns } from '../utils/monthMatrix.js'

function byDate(records, dateKey) {
  return records.filter((record) => record.workDateKey === dateKey)
}

export default function StaffMonthlyCalendar({ records = {}, month, onDayOpen }) {
  const columns = buildMonthColumns(month.year, month.month)
  const attendance = records.attendance || []
  const leave = records.leave || []
  const overtime = records.overtime || []

  return (
    <section className="grid grid-cols-7 gap-2 rounded-xl border border-border bg-surface p-3">
      {columns.map((day) => {
        const dayAttendance = byDate(attendance, day.dateKey)[0]
        const dayLeave = byDate(leave, day.dateKey)[0]
        const dayOvertime = byDate(overtime, day.dateKey)[0]
        const state = dayAttendance?.status || (dayLeave ? 'LEAVE' : dayOvertime ? 'OT' : '—')
        return (
          <button
            key={day.dateKey}
            type="button"
            onClick={() =>
              onDayOpen?.({
                dateKey: day.dateKey,
                attendance: dayAttendance,
                leave: dayLeave,
                overtime: dayOvertime,
              })
            }
            className="min-h-24 rounded-lg border border-border p-2 text-left hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="block text-xs text-ink-muted">{day.label}</span>
            <span className="mt-2 block truncate text-xs font-semibold text-ink-strong">
              {state.replaceAll('_', ' ')}
            </span>
            {dayAttendance?.checkInAt ? (
              <span className="block text-[11px] text-ink-muted">Checked in</span>
            ) : null}
          </button>
        )
      })}
    </section>
  )
}
