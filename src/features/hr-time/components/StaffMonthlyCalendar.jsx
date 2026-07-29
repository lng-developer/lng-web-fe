import { useTranslation } from 'react-i18next'
import { Typography } from '@mui/material'

import { buildMonthColumns } from '../utils/monthMatrix.js'

function byDate(records, dateKey) {
  return records.filter((record) => record.workDateKey === dateKey)
}

const stateClasses = {
  ABSENT:
    'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/50',
  HALF_DAY:
    'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
  HOLIDAY:
    'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/50',
  MIXED_LEAVE:
    'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50',
  PAID_LEAVE:
    'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
  PRESENT:
    'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  REST_DAY: 'bg-neutral-100 dark:bg-neutral-800/50 text-ink-secondary border-transparent',
  UNPAID_LEAVE:
    'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50',
  LEAVE:
    'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50',
  OT: 'bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-800/50',
}

export default function StaffMonthlyCalendar({ records = {}, month, onDayOpen }) {
  const { t } = useTranslation()
  const columns = buildMonthColumns(month.year, month.month)
  const attendance = records.attendance || []
  const leave = records.leave || []
  const overtime = records.overtime || []

  // Add Day Names Row (Sun, Mon, Tue...)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const firstDay = new Date(month.year, month.month - 1, 1).getDay()
  const offsetColumns = Array.from({ length: firstDay }).map((_, i) => ({
    dateKey: `empty-${i}`,
    empty: true,
  }))

  const legendItems = [
    {
      key: 'PRESENT',
      label: t('hrTime.legend.present', { defaultValue: 'Present (Có mặt)' }),
      class: stateClasses.PRESENT,
    },
    {
      key: 'LEAVE',
      label: t('hrTime.legend.leave', { defaultValue: 'Leave (Nghỉ phép)' }),
      class: stateClasses.LEAVE,
    },
    {
      key: 'OT',
      label: t('hrTime.legend.ot', { defaultValue: 'OT (Tăng ca)' }),
      class: stateClasses.OT,
    },
    {
      key: 'ABSENT',
      label: t('hrTime.legend.absent', { defaultValue: 'Absent (Vắng mặt)' }),
      class: stateClasses.ABSENT,
    },
    {
      key: 'REST_DAY',
      label: t('hrTime.legend.restDay', { defaultValue: 'Rest Day (Lịch nghỉ)' }),
      class: stateClasses.REST_DAY,
    },
    {
      key: 'HOLIDAY',
      label: t('hrTime.legend.holiday', { defaultValue: 'Holiday (Lễ)' }),
      class: stateClasses.HOLIDAY,
    },
  ]

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="grid grid-cols-7 gap-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center pb-2">
            <Typography
              variant="caption"
              className="font-bold uppercase tracking-wider text-ink-muted"
            >
              {day}
            </Typography>
          </div>
        ))}
        {offsetColumns.map((col) => (
          <div key={col.dateKey} className="min-h-32 rounded-xl bg-transparent" />
        ))}
        {columns.map((day) => {
          const dayAttendance = byDate(attendance, day.dateKey)[0]
          const dayLeave = byDate(leave, day.dateKey)[0]
          const dayOvertime = byDate(overtime, day.dateKey)[0]
          const state = dayAttendance?.status || (dayLeave ? 'LEAVE' : dayOvertime ? 'OT' : '—')
          const isWeekend = day.isWeekend
          const colorClass =
            stateClasses[state] ||
            (isWeekend
              ? stateClasses.REST_DAY
              : 'bg-transparent border-border hover:bg-black/5 dark:hover:bg-white/5')

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
              className={`min-h-32 flex flex-col items-start rounded-xl border p-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${colorClass}`}
            >
              <Typography
                variant="body2"
                className={`font-semibold ${isWeekend ? 'text-ink-muted' : 'text-ink-strong'} mb-1`}
              >
                {new Date(day.dateKey).getDate()}
              </Typography>
              {state !== '—' && (
                <div className="mt-auto w-full">
                  <span
                    className={`block w-full truncate text-[10px] font-bold uppercase rounded px-1.5 py-0.5 ${stateClasses[state] ? 'bg-white/50 dark:bg-black/20' : ''}`}
                  >
                    {state.replaceAll('_', ' ')}
                  </span>
                  {dayAttendance?.checkInAt ? (
                    <span className="mt-1 block text-[10px] font-medium opacity-80 pl-0.5">
                      {new Intl.DateTimeFormat(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(dayAttendance.checkInAt))}
                    </span>
                  ) : null}
                  {Number(dayAttendance?.lateMinutes) > 0 && (
                    <span className="mt-0.5 block text-[9px] font-bold text-amber-600 dark:text-amber-500 pl-0.5">
                      {t('hrTime.legend.late', { defaultValue: 'Muộn' })}{' '}
                      {dayAttendance.lateMinutes}p
                    </span>
                  )}
                  {Number(dayAttendance?.earlyLeaveMinutes) > 0 && (
                    <span className="mt-0.5 block text-[9px] font-bold text-rose-600 dark:text-rose-500 pl-0.5">
                      {t('hrTime.legend.early', { defaultValue: 'Sớm' })}{' '}
                      {dayAttendance.earlyLeaveMinutes}p
                    </span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 items-center">
        <Typography variant="caption" className="font-bold text-ink-muted uppercase mr-2">
          {t('common.legend', { defaultValue: 'Ghi chú:' })}
        </Typography>
        {legendItems.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5">
            <div
              className={`w-3.5 h-3.5 rounded border ${item.class.split(' ').slice(0, 3).join(' ')}`}
            />
            <Typography variant="caption" className="text-ink-strong font-medium">
              {item.label}
            </Typography>
          </div>
        ))}
      </div>
    </section>
  )
}
