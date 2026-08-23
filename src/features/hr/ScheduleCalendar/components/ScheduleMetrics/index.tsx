import { useTranslation } from 'react-i18next'
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CompassOutlined,
  TeamOutlined,
} from '@ant-design/icons'

import { MetricCard } from '@/shared/ui'

import styles from './ScheduleMetrics.module.scss'

export type ScheduleMetricsModel = {
  locationCount: number
  shiftCount: number
  assignmentCount: number
  holidayCount: number
  loading: {
    locations: boolean
    shifts: boolean
    assignments: boolean
    holidays: boolean
  }
}

type ScheduleMetricsProps = {
  model: ScheduleMetricsModel
}

export function ScheduleMetrics({ model }: ScheduleMetricsProps) {
  const { t } = useTranslation()

  return (
    <div className={styles.metrics}>
      <MetricCard
        icon={<CompassOutlined />}
        variant="neutral"
        label={t('hrOperations.schedule.metrics.locations')}
        value={model.locationCount}
        loading={model.loading.locations}
      />
      <MetricCard
        icon={<ClockCircleOutlined />}
        variant="info"
        label={t('hrOperations.schedule.metrics.shifts')}
        value={model.shiftCount}
        loading={model.loading.shifts}
      />
      <MetricCard
        icon={<TeamOutlined />}
        variant="success"
        label={t('hrOperations.schedule.metrics.assignments')}
        value={model.assignmentCount}
        loading={model.loading.assignments}
      />
      <MetricCard
        icon={<CalendarOutlined />}
        variant="warning"
        label={t('hrOperations.schedule.metrics.holidays')}
        value={model.holidayCount}
        loading={model.loading.holidays}
      />
    </div>
  )
}
