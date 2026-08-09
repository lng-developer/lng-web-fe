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
export function serializeDateRange(value: DayjsRange): DateRangeValue {
  if (!value?.[0] || !value[1]) return {}
  return {
    dateFrom: value[0].startOf('day').toISOString(),
    dateTo: value[1].endOf('day').toISOString(),
  }
}

export function DateRangePicker({ value, onChange, style, ...props }: DateRangePickerProps) {
  const pickerValue: DayjsRange =
    value?.dateFrom || value?.dateTo
      ? [value.dateFrom ? dayjs(value.dateFrom) : null, value.dateTo ? dayjs(value.dateTo) : null]
      : null

  return (
    <DatePicker.RangePicker
      {...props}
      allowClear
      format="DD/MM/YYYY"
      style={{ width: '100%', maxWidth: 280, ...style }}
      value={pickerValue}
      onChange={(nextValue) => onChange?.(serializeDateRange(nextValue))}
    />
  )
}
