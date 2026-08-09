import type { CSSProperties } from 'react'
import { DatePicker, type DatePickerProps, TimePicker } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

import { serializeDateTimeValue } from './dateTimeValue'

export type DateTimePickerMode = 'date' | 'time' | 'datetime'

export interface DateTimePickerProps {
  mode?: DateTimePickerMode
  value?: string | null
  onChange?: (value: string | null) => void
  allowClear?: boolean
  className?: string
  disabled?: boolean
  id?: string
  placeholder?: string
  style?: CSSProperties
  'aria-label'?: string
}

const formats = {
  date: 'DD/MM/YYYY',
  time: 'HH:mm',
  datetime: 'DD/MM/YYYY HH:mm',
} as const

function parseValue(value: string | null | undefined, mode: DateTimePickerMode) {
  if (!value) return null
  return mode === 'time' ? dayjs(`2000-01-01T${value}`) : dayjs(value)
}

export function DateTimePicker({
  mode = 'datetime',
  onChange,
  style,
  value,
  ...props
}: DateTimePickerProps) {
  const pickerValue = parseValue(value, mode)
  const pickerStyle = { width: '100%', maxWidth: 220, ...style }
  const handleChange = (nextValue: Dayjs | null) =>
    onChange?.(serializeDateTimeValue(nextValue, mode))

  if (mode === 'time') {
    return (
      <TimePicker
        {...props}
        format={formats.time}
        value={pickerValue}
        onChange={handleChange}
        style={pickerStyle}
      />
    )
  }

  return (
    <DatePicker
      {...props}
      format={formats[mode]}
      showTime={mode === 'datetime' ? { format: formats.time } : false}
      value={pickerValue}
      onChange={handleChange}
      style={pickerStyle}
    />
  )
}

type MonthPickerProps = Omit<DatePickerProps, 'picker' | 'value' | 'defaultValue' | 'onChange'> & {
  value?: Dayjs | null
  defaultValue?: Dayjs
  onChange?: (value: Dayjs | null, dateString: string | string[]) => void
}

export function MonthPicker({ onChange, style, ...props }: MonthPickerProps) {
  return (
    <DatePicker
      {...props}
      picker="month"
      format="MM/YYYY"
      multiple={false}
      style={{ width: '100%', maxWidth: 160, ...style }}
      onChange={(value, dateString) =>
        onChange?.(Array.isArray(value) ? (value[0] ?? null) : value, dateString ?? '')
      }
    />
  )
}

export function YearPicker({ onChange, style, ...props }: MonthPickerProps) {
  return (
    <DatePicker
      {...props}
      picker="year"
      format="YYYY"
      multiple={false}
      style={{ width: '100%', maxWidth: 140, ...style }}
      onChange={(value, dateString) =>
        onChange?.(Array.isArray(value) ? (value[0] ?? null) : value, dateString ?? '')
      }
    />
  )
}
