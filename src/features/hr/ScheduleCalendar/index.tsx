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

export const ScheduleCalendarPage = ({ teamId }: { readonly teamId?: string }) => {
  const { t } = useTranslation()
  const [
    {
      month,
      editor,
      assignments,
      locationsShifts,
      holidaysOverrides,
      saturdayRotation,
      metrics,
      rotationTeamId,
    },
    { setMonth },
  ] = useScheduleCalendar(teamId)

  const rotationTab = {
    key: 'saturday-rotation',
    label: (
      <span>
        <CalendarOutlined style={{ marginRight: 6 }} />
        {t('hrOperations.schedule.saturday')}
      </span>
    ),
    children: <SaturdayRotation model={saturdayRotation} />,
  }
  const tabItems = rotationTeamId
    ? [rotationTab]
    : [
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
        rotationTab,
      ]

  return (
    <section className={styles.page}>
      <PageHeader
        actions={<MonthPicker value={month} onChange={(value) => value && setMonth(value)} />}
      />

      {!rotationTeamId && <ScheduleMetrics model={metrics} />}

      <Tabs
        items={tabItems}
        defaultActiveKey={rotationTeamId ? 'saturday-rotation' : 'assignments'}
      />

      <ScheduleEditor model={editor} />
    </section>
  )
}
