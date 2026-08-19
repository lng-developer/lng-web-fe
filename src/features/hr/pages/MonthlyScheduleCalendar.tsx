import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppstoreOutlined,
  CalendarOutlined,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { Button, Skeleton, Space, Tag, Typography } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'

import { getPermissions } from '@/shared/auth/session'

import type { CalendarDay } from '../api/hrTimeApi'
import styles from './HrOperationsPage.module.scss'
import { TimeRequestEditorModal, type TimeRequestKind } from './TimeRequestEditorModal'

type CalendarEvent = {
  kind: 'attendance' | 'holiday' | 'late' | 'leave' | 'overtime'
  label: string
}
type EventFilter = 'all' | 'attendance' | 'leave' | 'overtime'
type ViewMode = 'month' | 'week' | 'timeline'

const visibleRequest = (status: string) => status === 'APPROVED' || status === 'PENDING'
const time = (value: string | null) => (value ? dayjs(value).format('HH:mm') : '--:--')

export function MonthlyScheduleCalendar({
  days,
  loading,
  month,
  onMonthChange,
}: {
  days: CalendarDay[]
  loading: boolean
  month: Dayjs
  onMonthChange?: (month: Dayjs) => void
}) {
  const { t } = useTranslation()
  const today = dayjs()
  const [selectedDateKey, setSelectedDateKey] = useState(today.format('YYYY-MM-DD'))
  const [eventFilter, setEventFilter] = useState<EventFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [editor, setEditor] = useState<TimeRequestKind>()
  const { canLeaveWrite, canOvertimeWrite } = useMemo(() => {
    const permissions = new Set(getPermissions())

    return {
      canLeaveWrite: permissions.has('HR_LEAVE:WRITE'),
      canOvertimeWrite: permissions.has('HR_OVERTIME:WRITE'),
    }
  }, [])
  const daysByKey = useMemo(() => new Map(days.map((day) => [day.workDateKey, day])), [days])
  const selectedDay = daysByKey.get(selectedDateKey)
  const selectedDate = dayjs(selectedDateKey)
  const weekdayShort = (date: Dayjs) =>
    t(`hrOperations.calendar.weekdaysShort.${date.day()}`, { defaultValue: date.format('ddd') })
  const weekdayLong = (date: Dayjs) =>
    t(`hrOperations.calendar.weekdaysLong.${date.day()}`, { defaultValue: date.format('dddd') })
  const monthLabel = (date: Dayjs) =>
    t('hrOperations.calendar.monthYear', {
      month: t(`hrOperations.calendar.months.${date.month()}`, {
        defaultValue: date.format('MMMM'),
      }),
      year: date.year(),
    })
  const visibleDays = useMemo(() => {
    const start = month.startOf('month').subtract(month.startOf('month').day(), 'day')
    return Array.from({ length: 42 }, (_, index) => start.add(index, 'day'))
  }, [month])
  const weekDays = useMemo(() => {
    const start = selectedDate.subtract(selectedDate.day(), 'day')
    return Array.from({ length: 7 }, (_, index) => start.add(index, 'day'))
  }, [selectedDate])

  const events = (day?: CalendarDay): CalendarEvent[] => {
    if (!day) return []
    const items: CalendarEvent[] = []
    if (day.status === 'HOLIDAY') {
      items.push({
        kind: 'holiday',
        label: day.calendarOverride?.name || t('hrOperations.calendar.holiday'),
      })
    }
    if (day.attendance?.checkInAt || day.attendance?.checkOutAt) {
      items.push({
        kind: 'attendance',
        label: `${time(day.attendance.checkInAt)} - ${time(day.attendance.checkOutAt)}`,
      })
    }
    if ((day.attendance?.lateMinutes ?? 0) > 0) {
      items.push({
        kind: 'late',
        label: t('hrOperations.calendar.lateMinutes', { minutes: day.attendance?.lateMinutes }),
      })
    }
    day.leave
      .filter((item) => visibleRequest(item.status))
      .forEach((item) =>
        items.push({
          kind: 'leave',
          label: `${t(`hrOperations.calendar.leaveTypes.${item.leaveType}`, {
            defaultValue: t('hrOperations.requests.leave'),
          })}${item.status === 'PENDING' ? ` (${t('hrOperations.self.pending')})` : ''}`,
        }),
      )
    day.overtime
      .filter((item) => visibleRequest(item.status))
      .forEach((item) =>
        items.push({
          kind: 'overtime',
          label: `${t('hrOperations.calendar.overtimeMinutes', {
            minutes: item.approvedMinutes ?? item.requestedMinutes,
          })}${item.status === 'PENDING' ? ` (${t('hrOperations.self.pending')})` : ''}`,
        }),
      )
    return items
  }

  const filteredEvents = (day?: CalendarDay) =>
    events(day).filter(
      (event) =>
        eventFilter === 'all' ||
        event.kind === eventFilter ||
        (eventFilter === 'attendance' && event.kind === 'late'),
    )

  const setMonth = (nextMonth: Dayjs) => {
    onMonthChange?.(nextMonth)
    setSelectedDateKey(
      nextMonth.isSame(today, 'month')
        ? today.format('YYYY-MM-DD')
        : nextMonth.format('YYYY-MM-DD'),
    )
  }

  const renderEventPills = (day?: CalendarDay, limit = 3) => {
    const dayEvents = filteredEvents(day)
    return (
      <>
        {dayEvents.slice(0, limit).map((event, index) => (
          <span className={styles[`event_${event.kind}`]} key={`${event.kind}-${index}`}>
            {event.label}
          </span>
        ))}
        {dayEvents.length > limit && (
          <span className={styles.calendarMore}>+{dayEvents.length - limit}</span>
        )}
      </>
    )
  }

  if (loading) return <Skeleton active={false} paragraph={{ rows: 12 }} />

  return (
    <div className={styles.calendarShell} aria-label={t('hrOperations.calendar.label')}>
      <div className={styles.calendarTopbar}>
        <Space>
          <Button icon={<LeftOutlined />} onClick={() => setMonth(month.subtract(1, 'month'))} />
          <Button onClick={() => setMonth(today)}>{t('hrOperations.calendar.today')}</Button>
          <Button icon={<RightOutlined />} onClick={() => setMonth(month.add(1, 'month'))} />
          <Typography.Title level={4}>{monthLabel(month)}</Typography.Title>
        </Space>
        <Space className={styles.calendarTabs}>
          {(['all', 'attendance', 'leave', 'overtime'] as const).map((filter) => (
            <Button
              key={filter}
              type={eventFilter === filter ? 'primary' : 'default'}
              onClick={() => setEventFilter(filter)}
            >
              {t(`hrOperations.calendar.filters.${filter}`)}
            </Button>
          ))}
          {(['month', 'week', 'timeline'] as const).map((mode) => (
            <Button
              key={mode}
              icon={
                mode === 'timeline' ? (
                  <UnorderedListOutlined />
                ) : mode === 'week' ? (
                  <CalendarOutlined />
                ) : (
                  <AppstoreOutlined />
                )
              }
              className={viewMode === mode ? styles.calendarViewActive : undefined}
              onClick={() => setViewMode(mode)}
            >
              {t(`hrOperations.calendar.views.${mode}`)}
            </Button>
          ))}
        </Space>
      </div>

      <div className={styles.calendarLegend}>
        {(['attendance', 'late', 'leave', 'overtime', 'holiday'] as const).map((kind) => (
          <span className={styles[`event_${kind}`]} key={kind}>
            {t(`hrOperations.calendar.legend.${kind}`)}
          </span>
        ))}
      </div>

      <div className={styles.calendarWorkspace}>
        <div className={styles.calendarMain}>
          {viewMode === 'month' && (
            <div className={styles.calendarMonthGrid}>
              {Array.from({ length: 7 }, (_, day) => (
                <div className={styles.calendarWeekday} key={day}>
                  {t(`hrOperations.calendar.weekdaysNarrow.${day}`)}
                </div>
              ))}
              {visibleDays.map((date) => {
                const dateKey = date.format('YYYY-MM-DD')
                return (
                  <button
                    type="button"
                    aria-label={date.format('DD/MM/YYYY')}
                    className={`${styles.calendarCell} ${
                      selectedDateKey === dateKey ? styles.calendarCellSelected : ''
                    } ${date.isSame(month, 'month') ? '' : styles.calendarCellMuted}`}
                    key={dateKey}
                    onClick={() => setSelectedDateKey(dateKey)}
                  >
                    <span className={styles.calendarDateBubble}>{date.date()}</span>
                    <div className={styles.calendarEvents}>
                      {renderEventPills(daysByKey.get(dateKey))}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {viewMode === 'week' && (
            <div className={styles.calendarWeekGrid}>
              {weekDays.map((date) => {
                const dateKey = date.format('YYYY-MM-DD')
                const day = daysByKey.get(dateKey)
                return (
                  <button
                    type="button"
                    className={`${styles.calendarWeekCard} ${
                      selectedDateKey === dateKey ? styles.calendarCellSelected : ''
                    }`}
                    key={dateKey}
                    onClick={() => setSelectedDateKey(dateKey)}
                  >
                    <strong>{weekdayShort(date)}</strong>
                    <span>{date.format('DD/MM')}</span>
                    {date.isSame(today, 'day') && (
                      <Tag color="blue">{t('hrOperations.calendar.today')}</Tag>
                    )}
                    <div className={styles.calendarEvents}>{renderEventPills(day)}</div>
                    {!day?.isWorkingDay && <em>{t('hrOperations.self.restDay')}</em>}
                  </button>
                )
              })}
            </div>
          )}

          {viewMode === 'timeline' && (
            <div className={styles.calendarTimeline}>
              {days.map((day) => (
                <button
                  type="button"
                  className={`${styles.calendarTimelineRow} ${
                    selectedDateKey === day.workDateKey ? styles.calendarCellSelected : ''
                  }`}
                  key={day.workDateKey}
                  onClick={() => setSelectedDateKey(day.workDateKey)}
                >
                  <span className={styles.calendarTimelineDate}>
                    <strong>{dayjs(day.workDateKey).format('D')}</strong>
                    <small>{weekdayShort(dayjs(day.workDateKey))}</small>
                  </span>
                  <strong>{dayjs(day.workDateKey).format('DD/MM/YYYY')}</strong>
                  <span>
                    {day.isWorkingDay ? day.shift?.name || '-' : t('hrOperations.self.restDay')}
                  </span>
                  <div className={styles.calendarEvents}>{renderEventPills(day, 2)}</div>
                  <Tag>
                    {day.isWorkingDay
                      ? t('hrOperations.self.workingDay')
                      : t('hrOperations.self.restDay')}
                  </Tag>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className={styles.calendarDetail} aria-live="polite">
          <div className={styles.calendarDetailHeader}>
            <Typography.Text type="secondary">
              {t('hrOperations.calendar.selectedDay')}
            </Typography.Text>
            <Typography.Title level={4} style={{ marginTop: 4, marginBottom: 0 }}>
              {selectedDate.format('DD/MM/YYYY')}
            </Typography.Title>
            <Typography.Text>{weekdayLong(selectedDate)}</Typography.Text>
          </div>
          <Tag
            color={
              selectedDay?.status === 'HOLIDAY'
                ? 'red'
                : selectedDay?.isWorkingDay
                  ? 'green'
                  : 'orange'
            }
            className={styles.calendarStatusTag}
          >
            {selectedDay?.status === 'HOLIDAY'
              ? t('hrOperations.calendar.holiday')
              : selectedDay?.isWorkingDay
                ? t('hrOperations.self.workingDay')
                : t('hrOperations.calendar.unresolved')}
          </Tag>
          <div className={styles.calendarDetailBlock}>
            <Typography.Text type="secondary">{t('hrOperations.schedule.shift')}</Typography.Text>
            <strong>
              {selectedDay?.shift
                ? `${selectedDay.shift.name} (${selectedDay.shift.startTime}-${selectedDay.shift.endTime})`
                : t('hrOperations.self.noShift')}
            </strong>
            <Typography.Text>
              {selectedDay?.workLocation?.name ?? t('hrOperations.calendar.workLocation')}
            </Typography.Text>
          </div>
          <div className={styles.calendarDetailBlock}>
            <Typography.Text type="secondary">
              {t('hrOperations.calendar.workingTimeline')}
            </Typography.Text>
            <div className={styles.calendarDetailEvents}>
              {renderEventPills(selectedDay, 6)}
              {filteredEvents(selectedDay).length === 0 && (
                <Typography.Text type="secondary" italic>
                  {t('hrOperations.calendar.noAttendanceRecords')}
                </Typography.Text>
              )}
            </div>
          </div>
          <div className={styles.calendarDetailBlock}>
            <Typography.Text type="secondary">{t('hrOperations.self.myRequests')}</Typography.Text>
            <Typography.Text>
              {selectedDay && [...selectedDay.leave, ...selectedDay.overtime].length
                ? t('hrOperations.calendar.hasRequests', {
                    count: [...selectedDay.leave, ...selectedDay.overtime].length,
                  })
                : t('hrOperations.calendar.noRecords')}
            </Typography.Text>
          </div>
          <Space className={styles.calendarQuickActions} orientation="vertical">
            {canLeaveWrite && (
              <Button block icon={<PlusOutlined />} onClick={() => setEditor('leave')}>
                {t('hrOperations.requests.requestLeave')}
              </Button>
            )}
            {canOvertimeWrite && (
              <Button
                block
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setEditor('overtime')}
              >
                {t('hrOperations.requests.requestOvertime')}
              </Button>
            )}
          </Space>
        </aside>
      </div>
      <TimeRequestEditorModal
        dateKey={selectedDateKey}
        kind={editor}
        onClose={() => setEditor(undefined)}
      />
    </div>
  )
}

export default MonthlyScheduleCalendar
