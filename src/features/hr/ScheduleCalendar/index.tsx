import { useTranslation } from 'react-i18next'
import { CalendarOutlined, CompassOutlined, UserSwitchOutlined } from '@ant-design/icons'
import { Tabs } from 'antd'

import { MonthPicker, PageHeader } from '@/shared/ui'

import { ScheduleMetrics } from './components/ScheduleMetrics'
import { HolidaysOverrides } from './HolidaysOverrides'
import { LocationsShifts } from './LocationsShifts'
import { SaturdayRotation } from './SaturdayRotation'
import styles from './ScheduleCalendar.module.scss'
import { ScheduleEditor } from './ScheduleEditor'
import { ShiftAssignments } from './ShiftAssignments'
import { useScheduleCalendar } from './useScheduleCalendar'

export const ScheduleCalendarPage = () => {
  const { t } = useTranslation()
  const [
    { month, editor, assignments, locationsShifts, holidaysOverrides, saturdayRotation, metrics },
    { setMonth },
  ] = useScheduleCalendar()

  const tabItems = [
    {
      key: 'assignments',
      label: (
        <span>
          <UserSwitchOutlined style={{ marginRight: 6 }} />
          {t('hrOperations.schedule.tabs.assignments', {
            count: assignments.assignmentCount,
          })}
        </span>
      ),
      children: <ShiftAssignments model={assignments} />,
    },
    {
      key: 'locations-shifts',
      label: (
        <span>
          <CompassOutlined style={{ marginRight: 6 }} />
          {t('hrOperations.schedule.tabs.locationsShifts')}
        </span>
      ),
      children: <LocationsShifts model={locationsShifts} />,
    },
    {
      key: 'holidays-overrides',
      label: (
        <span>
          <CalendarOutlined style={{ marginRight: 6 }} />
          {t('hrOperations.schedule.tabs.holidaysOverrides')}
        </span>
      ),
      children: <HolidaysOverrides model={holidaysOverrides} />,
    },
    {
      key: 'saturday-rotation',
      label: (
        <span>
          <CalendarOutlined style={{ marginRight: 6 }} />
          {t('hrOperations.schedule.saturday')}
        </span>
      ),
      children: <SaturdayRotation model={saturdayRotation} />,
    },
  ]

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('hrOperations.schedule.title')}
        description={t('hrOperations.schedule.description')}
        actions={<MonthPicker value={month} onChange={(value) => value && setMonth(value)} />}
      />

      <ScheduleMetrics model={metrics} />

      <Tabs items={tabItems} defaultActiveKey="assignments" />

      <ScheduleEditor model={editor} />
    </section>
  )
}
