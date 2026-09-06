import { useTranslation } from 'react-i18next'
import { DatePicker } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

export type DateRangeValue = {
  dateFrom?: string
  dateTo?: string
}

export interface DateRangePickerProps {
  readonly value?: DateRangeValue
  readonly onChange?: (value: DateRangeValue) => void
  readonly allowClear?: boolean
  readonly disabled?: boolean
  readonly placeholder?: [string, string]
  readonly style?: React.CSSProperties
  readonly 'aria-label'?: string
}

type DayjsRange = [Dayjs | null, Dayjs | null] | null

// eslint-disable-next-line react-refresh/only-export-components -- exported for deterministic date-boundary tests
export function getDateRangePreset(days: 1 | 7 | 30, today = dayjs()): [Dayjs, Dayjs] {
  return [today.subtract(days - 1, 'day').startOf('day'), today.endOf('day')]
}

// eslint-disable-next-line react-refresh/only-export-components -- exported for deterministic date-boundary tests
export function serializeDateRange(value: DayjsRange): DateRangeValue {
  if (!value?.[0] || !value[1]) return {}
  return {
    dateFrom: value[0].startOf('day').toISOString(),
    dateTo: value[1].endOf('day').toISOString(),
  }
}

export function DateRangePicker({ value, onChange, style, ...props }: DateRangePickerProps) {
  const { t } = useTranslation()
  const pickerValue: DayjsRange =
    value?.dateFrom || value?.dateTo
      ? [value.dateFrom ? dayjs(value.dateFrom) : null, value.dateTo ? dayjs(value.dateTo) : null]
      : null
  const placeholder = props.placeholder ?? [
    t('foundation.controls.startDate'),
    t('foundation.controls.endDate'),
  ]

  return (
    <DatePicker.RangePicker
      {...props}
      allowClear
      format="DD/MM/YYYY"
      presets={[
        { label: t('foundation.controls.today'), value: getDateRangePreset(1) },
        { label: t('foundation.controls.last7Days'), value: getDateRangePreset(7) },
        { label: t('foundation.controls.last30Days'), value: getDateRangePreset(30) },
      ]}
      placeholder={placeholder}
      style={{ width: '100%', maxWidth: 280, ...style }}
      value={pickerValue}
      onChange={(nextValue) => onChange?.(serializeDateRange(nextValue))}
    />
  )
}
