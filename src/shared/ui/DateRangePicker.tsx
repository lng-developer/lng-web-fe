import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DatePicker } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
dayjs.extend(utc)
dayjs.extend(timezone)

export type DateRangeValue = {
  dateFrom?: string
  dateTo?: string
}

export interface DateRangePickerProps {
  readonly timeZone?: string
  readonly value?: DateRangeValue
  readonly onChange?: (value: DateRangeValue) => void
  readonly allowClear?: boolean
  readonly disabled?: boolean
  readonly placeholder?: [string, string]
  readonly style?: React.CSSProperties
  readonly className?: string
  readonly 'aria-label'?: string
}

type DayjsRange = [Dayjs | null, Dayjs | null] | null

// eslint-disable-next-line react-refresh/only-export-components -- exported for deterministic date-boundary tests
export function getDateRangePreset(days: 1 | 7 | 30, today = dayjs()): [Dayjs, Dayjs] {
  return [today.subtract(days - 1, 'day').startOf('day'), today.endOf('day')]
}

// eslint-disable-next-line react-refresh/only-export-components -- exported for deterministic date-boundary tests
export function serializeDateRange(value: DayjsRange, timeZone?: string): DateRangeValue {
  if (!value?.[0] || !value[1]) return {}
  return {
    dateFrom: (timeZone ? dayjs.tz(value[0].format('YYYY-MM-DD'), timeZone) : value[0])
      .startOf('day')
      .toISOString(),
    dateTo: (timeZone ? dayjs.tz(value[1].format('YYYY-MM-DD'), timeZone) : value[1])
      .endOf('day')
      .toISOString(),
  }
}

// eslint-disable-next-line react-refresh/only-export-components -- exported for default date filtering across modules
export function getDefaultDateRange(
  days: 1 | 7 | 30 = 7,
  today = dayjs(),
  timeZone?: string,
): DateRangeValue {
  return serializeDateRange(
    getDateRangePreset(days, timeZone ? today.tz(timeZone) : today),
    timeZone,
  )
}

export const DateRangePicker = memo(function DateRangePicker({
  value,
  timeZone,
  onChange,
  style,
  ...props
}: DateRangePickerProps) {
  const { t } = useTranslation()

  const pickerValue: DayjsRange = useMemo(
    () =>
      value?.dateFrom || value?.dateTo
        ? [
            value.dateFrom
              ? timeZone
                ? value.dateFrom.length === 10
                  ? dayjs.tz(value.dateFrom, timeZone)
                  : dayjs(value.dateFrom).tz(timeZone)
                : dayjs(value.dateFrom)
              : null,
            value.dateTo
              ? timeZone
                ? value.dateTo.length === 10
                  ? dayjs.tz(value.dateTo, timeZone)
                  : dayjs(value.dateTo).tz(timeZone)
                : dayjs(value.dateTo)
              : null,
          ]
        : null,
    [value?.dateFrom, value?.dateTo, timeZone],
  )

  const placeholder: [string, string] = useMemo(
    (): [string, string] =>
      props.placeholder ?? [t('foundation.controls.startDate'), t('foundation.controls.endDate')],
    [props.placeholder, t],
  )

  const presets = useMemo(
    () => [
      {
        label: t('foundation.controls.today'),
        value: getDateRangePreset(1, timeZone ? dayjs().tz(timeZone) : dayjs()),
      },
      {
        label: t('foundation.controls.last7Days'),
        value: getDateRangePreset(7, timeZone ? dayjs().tz(timeZone) : dayjs()),
      },
      {
        label: t('foundation.controls.last30Days'),
        value: getDateRangePreset(30, timeZone ? dayjs().tz(timeZone) : dayjs()),
      },
    ],
    [t, timeZone],
  )

  const pickerStyle = useMemo(() => ({ width: '100%', maxWidth: 280, ...style }), [style])

  const handleChange = useCallback(
    (nextValue: DayjsRange) => onChange?.(serializeDateRange(nextValue, timeZone)),
    [onChange, timeZone],
  )

  return (
    <DatePicker.RangePicker
      {...props}
      allowClear
      format="DD/MM/YYYY"
      presets={presets}
      placeholder={placeholder}
      style={pickerStyle}
      value={pickerValue}
      onChange={handleChange}
    />
  )
})
