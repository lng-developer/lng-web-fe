import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Spin, Tag, Tooltip } from 'antd'
import dayjs from 'dayjs'

import type { Attendance } from '../../api/hrTimeApi'
import styles from './AttendancePage.module.scss'

export type CalendarDayItem = {
  date: dayjs.Dayjs
  dateKey: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  record?: Attendance
}

interface AttendanceCalendarGridProps {
  month: dayjs.Dayjs
  records: Attendance[]
  loading?: boolean
  selectedDateKey?: string | null
  onSelectDay: (day: CalendarDayItem) => void
}

const DAY_LABELS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const DAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const AttendanceCalendarGrid = memo(
  ({
    month,
    records,
    loading = false,
    selectedDateKey,
    onSelectDay,
  }: AttendanceCalendarGridProps) => {
    const { t, i18n } = useTranslation()
    const dayLabels = i18n.language.startsWith('vi') ? DAY_LABELS_VI : DAY_LABELS_EN

    const recordMap = useMemo(() => {
      const map = new Map<string, Attendance>()
      records.forEach((rec) => {
        if (rec.workDateKey) {
          map.set(rec.workDateKey, rec)
        }
      })
      return map
    }, [records])

    const calendarDays = useMemo(() => {
      const startOfMonth = month.startOf('month')
      const daysInMonth = month.daysInMonth()
      const todayKey = dayjs().format('YYYY-MM-DD')

      // ISO week starts on Monday: 0 (Sun) -> 6, 1 (Mon) -> 0, ..., 6 (Sat) -> 5
      const startDayOfWeek = (startOfMonth.day() + 6) % 7

      const days: CalendarDayItem[] = []

      // Previous month padding
      for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const prevDate = startOfMonth.subtract(i + 1, 'day')
        const dateKey = prevDate.format('YYYY-MM-DD')
        const dayOfWeek = prevDate.day()
        days.push({
          date: prevDate,
          dateKey,
          dayNumber: prevDate.date(),
          isCurrentMonth: false,
          isToday: dateKey === todayKey,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          record: recordMap.get(dateKey),
        })
      }

      // Current month days
      for (let d = 1; d <= daysInMonth; d++) {
        const date = month.date(d)
        const dateKey = date.format('YYYY-MM-DD')
        const dayOfWeek = date.day()
        days.push({
          date,
          dateKey,
          dayNumber: d,
          isCurrentMonth: true,
          isToday: dateKey === todayKey,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          record: recordMap.get(dateKey),
        })
      }

      // Next month padding to fill rows of 7
      const remaining = (7 - (days.length % 7)) % 7
      const endOfMonth = month.endOf('month')
      for (let i = 1; i <= remaining; i++) {
        const nextDate = endOfMonth.add(i, 'day')
        const dateKey = nextDate.format('YYYY-MM-DD')
        const dayOfWeek = nextDate.day()
        days.push({
          date: nextDate,
          dateKey,
          dayNumber: nextDate.date(),
          isCurrentMonth: false,
          isToday: dateKey === todayKey,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          record: recordMap.get(dateKey),
        })
      }

      return days
    }, [month, recordMap])

    const formatTimeOnly = (isoString?: string | null) => {
      if (!isoString) return ''
      return dayjs(isoString).format('HH:mm')
    }

    return (
      <div className={styles.calendarContainer}>
        {/* Day of Week Headers */}
        <div className={styles.calendarWeekdays}>
          {dayLabels.map((label, idx) => (
            <div
              key={label}
              className={`${styles.weekdayCell} ${idx >= 5 ? styles.weekdayWeekend : ''}`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Days Matrix */}
        <Spin spinning={loading}>
          <div className={styles.calendarGrid}>
            {calendarDays.map((day) => {
              const rec = day.record
              const isSelected = selectedDateKey === day.dateKey
              const hasLate = (rec?.lateMinutes ?? 0) > 0
              const hasEarly = (rec?.earlyLeaveMinutes ?? 0) > 0
              const isPresent = rec?.status === 'PRESENT'
              const isHalfDay = rec?.status === 'HALF_DAY'
              const isLeave =
                rec?.status === 'PAID_LEAVE' ||
                rec?.status === 'UNPAID_LEAVE' ||
                rec?.status === 'ANNUAL_LEAVE'
              const isMissingCheckout = rec && rec.checkInAt && !rec.checkOutAt

              const inTime = formatTimeOnly(rec?.checkInAt)
              const outTime = formatTimeOnly(rec?.checkOutAt)

              return (
                <div
                  key={day.dateKey}
                  className={`
                    ${styles.dayCell}
                    ${!day.isCurrentMonth ? styles.dayCellOutside : ''}
                    ${day.isToday ? styles.dayCellToday : ''}
                    ${isSelected ? styles.dayCellSelected : ''}
                    ${day.isWeekend ? styles.dayCellWeekend : ''}
                  `}
                  onClick={() => onSelectDay(day)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelectDay(day)
                  }}
                >
                  {/* Top Bar: Date Number + Status Badges */}
                  <div className={styles.dayTopBar}>
                    <span
                      className={`
                        ${styles.dayNumber}
                        ${day.isToday ? styles.dayNumberToday : ''}
                      `}
                    >
                      {day.dayNumber}
                    </span>

                    {/* Status indicator dots */}
                    <div className={styles.statusDots}>
                      {hasLate && (
                        <Tooltip
                          title={t('hrOperations.attendance.lateTag', { count: rec?.lateMinutes })}
                        >
                          <span className={`${styles.statusDot} ${styles.dotLate}`} />
                        </Tooltip>
                      )}
                      {hasEarly && (
                        <Tooltip
                          title={t('hrOperations.attendance.earlyTag', {
                            count: rec?.earlyLeaveMinutes,
                          })}
                        >
                          <span className={`${styles.statusDot} ${styles.dotEarly}`} />
                        </Tooltip>
                      )}
                      {isPresent && !hasLate && (
                        <Tooltip title={t('hrOperations.attendance.statuses.PRESENT')}>
                          <span className={`${styles.statusDot} ${styles.dotPresent}`} />
                        </Tooltip>
                      )}
                      {isLeave && (
                        <Tooltip title={t('hrOperations.attendance.statuses.LEAVE')}>
                          <span className={`${styles.statusDot} ${styles.dotLeave}`} />
                        </Tooltip>
                      )}
                      {isMissingCheckout && (
                        <Tooltip title={t('hrOperations.attendance.missingCheckout')}>
                          <span className={`${styles.statusDot} ${styles.dotMissing}`} />
                        </Tooltip>
                      )}
                    </div>
                  </div>

                  {/* Day Content */}
                  <div className={styles.dayBody}>
                    {rec ? (
                      <>
                        {/* Swipe time display */}
                        <div className={styles.swipeTimes}>
                          {inTime && (
                            <span className={styles.timeTag}>
                              <span className={styles.timeIn}>{inTime}</span>
                              <span className={styles.timeSep}>-</span>
                              <span className={outTime ? styles.timeOut : styles.timeMissing}>
                                {outTime || '--:--'}
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Work Value & Status Tag */}
                        <div className={styles.workTagRow}>
                          {isPresent && (
                            <Tag color="success" className={styles.microTag}>
                              {rec.workDayValue ?? 1.0} {t('hrOperations.attendance.workDayUnit')}
                            </Tag>
                          )}
                          {isHalfDay && (
                            <Tag color="warning" className={styles.microTag}>
                              0.5 {t('hrOperations.attendance.workDayUnit')}
                            </Tag>
                          )}
                          {isLeave && (
                            <Tag color="purple" className={styles.microTag}>
                              {t('hrOperations.attendance.statuses.LEAVE')}
                            </Tag>
                          )}
                          {hasLate && (
                            <Tag color="error" className={styles.microTag}>
                              {t('hrOperations.attendance.lateTag', { count: rec.lateMinutes })}
                            </Tag>
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </Spin>

        {/* Legend */}
        <div className={styles.calendarLegend}>
          <div className={styles.legendItem}>
            <span className={`${styles.statusDot} ${styles.dotPresent}`} />
            <span>{t('hrOperations.attendance.legendFullDay', 'Đủ công')}</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.statusDot} ${styles.dotEarly}`} />
            <span>{t('hrOperations.attendance.legendHalfDay', 'Nửa công / Về sớm')}</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.statusDot} ${styles.dotLate}`} />
            <span>{t('hrOperations.attendance.late', 'Đi muộn')}</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.statusDot} ${styles.dotMissing}`} />
            <span>{t('hrOperations.attendance.missingCheckout', 'Thiếu check-out')}</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.statusDot} ${styles.dotLeave}`} />
            <span>{t('hrOperations.attendance.statuses.LEAVE', 'Nghỉ phép')}</span>
          </div>
        </div>
      </div>
    )
  },
)

AttendanceCalendarGrid.displayName = 'AttendanceCalendarGrid'
