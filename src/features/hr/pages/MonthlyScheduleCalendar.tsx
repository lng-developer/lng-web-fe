import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlusOutlined } from '@ant-design/icons'
import { Button, Calendar, Skeleton, Space, Tag, Typography } from 'antd'
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

const visibleRequest = (status: string) => status === 'APPROVED' || status === 'PENDING'
const time = (value: string | null) => (value ? dayjs(value).format('HH:mm') : '--:--')

export function MonthlyScheduleCalendar({
  days,
  loading,
  month,
}: {
  days: CalendarDay[]
  loading: boolean
  month: Dayjs
}) {
  const { t } = useTranslation()
  const [selectedDateKey, setSelectedDateKey] = useState(month.format('YYYY-MM-DD'))
  const [editor, setEditor] = useState<TimeRequestKind>()
  const permissions = new Set(getPermissions())
  const daysByKey = useMemo(() => new Map(days.map((day) => [day.workDateKey, day])), [days])
  const selectedDay = daysByKey.get(selectedDateKey) ?? days[0]

  const events = (day?: CalendarDay): CalendarEvent[] => {
    if (!day) return []
    const items: CalendarEvent[] = []
    if (day.status === 'HOLIDAY')
      items.push({
        kind: 'holiday',
        label: day.calendarOverride?.name || t('hrOperations.calendar.holiday'),
      })
    if (day.attendance?.checkInAt || day.attendance?.checkOutAt)
      items.push({
        kind: 'attendance',
        label: `${time(day.attendance.checkInAt)} - ${time(day.attendance.checkOutAt)}`,
      })
    if ((day.attendance?.lateMinutes ?? 0) > 0)
      items.push({
        kind: 'late',
        label: t('hrOperations.calendar.lateMinutes', { minutes: day.attendance?.lateMinutes }),
      })
    day.leave
      .filter((item) => visibleRequest(item.status))
      .forEach((item) =>
        items.push({
          kind: 'leave',
          label: `${t(`hrOperations.calendar.leaveTypes.${item.leaveType}`, { defaultValue: t('hrOperations.requests.leave') })}${item.status === 'PENDING' ? ` (${t('hrOperations.self.pending')})` : ''}`,
        }),
      )
    day.overtime
      .filter((item) => visibleRequest(item.status))
      .forEach((item) =>
        items.push({
          kind: 'overtime',
          label: `OT ${item.approvedMinutes ?? item.requestedMinutes} min${item.status === 'PENDING' ? ` (${t('hrOperations.self.pending')})` : ''}`,
        }),
      )
    return items
  }

  if (loading) return <Skeleton active={false} paragraph={{ rows: 12 }} />

  return (
    <div className={styles.calendarWorkspace} aria-label={t('hrOperations.calendar.label')}>
      <div className={styles.calendarMain}>
        <div className={styles.calendarLegend}>
          {(['attendance', 'late', 'leave', 'overtime', 'holiday'] as const).map((kind) => (
            <span className={styles[`event_${kind}`]} key={kind}>
              {t(`hrOperations.calendar.legend.${kind}`)}
            </span>
          ))}
        </div>
        <Calendar
          value={month}
          headerRender={() => null}
          disabledDate={(date) => !date.isSame(month, 'month')}
          onSelect={(date) => setSelectedDateKey(date.format('YYYY-MM-DD'))}
          fullCellRender={(date) => {
            const isCurrentMonth = date.isSame(month, 'month')
            const day = daysByKey.get(date.format('YYYY-MM-DD'))
            const dayEvents = events(day)
            const selectDay = () => isCurrentMonth && setSelectedDateKey(date.format('YYYY-MM-DD'))
            return (
              <div
                role="button"
                tabIndex={isCurrentMonth ? 0 : -1}
                aria-label={date.format('DD/MM/YYYY')}
                onClick={selectDay}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') selectDay()
                }}
                className={`${styles.calendarCell} ${selectedDateKey === day?.workDateKey ? styles.calendarCellSelected : ''}`}
              >
                <div className={styles.calendarDate}>
                  <span>{date.date()}</span>
                  {day?.isWorkingDay && day.shift?.startTime && (
                    <small>{day.shift.startTime}</small>
                  )}
                </div>
                <div className={styles.calendarEvents}>
                  {dayEvents.slice(0, 3).map((event, index) => (
                    <span className={styles[`event_${event.kind}`]} key={`${event.kind}-${index}`}>
                      {event.label}
                    </span>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className={styles.calendarMore}>+{dayEvents.length - 3}</span>
                  )}
                </div>
              </div>
            )
          }}
        />
      </div>
      <aside className={styles.calendarDetail} aria-live="polite">
        <div className={styles.calendarDetailHeader}>
          <Typography.Text type="secondary">
            {t('hrOperations.calendar.selectedDay')}
          </Typography.Text>
          <Typography.Title level={4} style={{ marginTop: 4, marginBottom: 0 }}>
            {selectedDay ? dayjs(selectedDay.workDateKey).format('DD/MM/YYYY') : '-'}
          </Typography.Title>
        </div>
        {selectedDay && (
          <>
            <Tag
              color={
                selectedDay.status === 'HOLIDAY'
                  ? 'red'
                  : selectedDay.status === 'SCHEDULE_UNRESOLVED'
                    ? 'orange'
                    : selectedDay.isWorkingDay
                      ? 'green'
                      : 'default'
              }
              className={styles.calendarStatusTag}
            >
              {selectedDay.status === 'HOLIDAY'
                ? t('hrOperations.calendar.holiday')
                : selectedDay.status === 'SCHEDULE_UNRESOLVED'
                  ? t('hrOperations.calendar.unresolved')
                  : selectedDay.isWorkingDay
                    ? t('hrOperations.self.workingDay')
                    : t('hrOperations.self.restDay')}
            </Tag>
            <div className={styles.calendarDetailBlock}>
              <Typography.Text type="secondary">{t('hrOperations.schedule.shift')}</Typography.Text>
              <strong>
                {selectedDay.shift
                  ? `${selectedDay.shift.name} (${selectedDay.shift.startTime}-${selectedDay.shift.endTime})`
                  : '-'}
              </strong>
              <Typography.Text>{selectedDay.workLocation?.name ?? '-'}</Typography.Text>
            </div>
            <div className={styles.calendarDetailEvents}>
              {events(selectedDay).map((event, index) => (
                <span className={styles[`event_${event.kind}`]} key={`${event.kind}-${index}`}>
                  {event.label}
                </span>
              ))}
              {events(selectedDay).length === 0 && (
                <Typography.Text type="secondary">
                  {t('hrOperations.calendar.noRecords')}
                </Typography.Text>
              )}
            </div>
            <Space className={styles.calendarQuickActions} orientation="vertical">
              {permissions.has('HR_LEAVE:WRITE') && (
                <Button block icon={<PlusOutlined />} onClick={() => setEditor('leave')}>
                  {t('hrOperations.requests.requestLeave')}
                </Button>
              )}
              {permissions.has('HR_OVERTIME:WRITE') && (
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
          </>
        )}
      </aside>
      <TimeRequestEditorModal
        dateKey={selectedDateKey}
        kind={editor}
        onClose={() => setEditor(undefined)}
      />
    </div>
  )
}

export default MonthlyScheduleCalendar
