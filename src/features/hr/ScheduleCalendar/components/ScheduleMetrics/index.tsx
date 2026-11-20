import { useTranslation } from 'react-i18next'
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CompassOutlined,
  TeamOutlined,
} from '@ant-design/icons'

import { CompactStatBar } from '@/shared/ui'

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
    <CompactStatBar
      items={[
        {
          key: 'locations',
          icon: <CompassOutlined />,
          variant: 'neutral',
          label: t('hrOperations.schedule.metrics.locations'),
          value: `${model.locationCount} ${t('hrOperations.schedule.metrics.locationUnit', 'địa điểm')}`,
          loading: model.loading.locations,
        },
        {
          key: 'shifts',
          icon: <ClockCircleOutlined />,
          variant: 'info',
          label: t('hrOperations.schedule.metrics.shifts'),
          value: `${model.shiftCount} ${t('hrOperations.schedule.metrics.shiftUnit', 'ca')}`,
          loading: model.loading.shifts,
        },
        {
          key: 'assignments',
          icon: <TeamOutlined />,
          variant: 'success',
          label: t('hrOperations.schedule.metrics.assignments'),
          value: `${model.assignmentCount} ${t('hrOperations.schedule.metrics.assignmentUnit', 'phân ca')}`,
          loading: model.loading.assignments,
        },
        {
          key: 'holidays',
          icon: <CalendarOutlined />,
          variant: 'warning',
          label: t('hrOperations.schedule.metrics.holidays'),
          value: `${model.holidayCount} ${t('hrOperations.schedule.metrics.holidayUnit', 'ngày')}`,
          loading: model.loading.holidays,
        },
      ]}
    />
  )
}
