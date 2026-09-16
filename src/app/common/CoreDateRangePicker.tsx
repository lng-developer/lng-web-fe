import type { CSSProperties } from 'react'
import { useContext, useMemo } from 'react'
import { DatePicker } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'

import {
  CorePickerTheme,
  getCorePickerPopupStyle,
  getCorePickerRootStyle,
} from './CorePickerHelpers'

import { ThemePreferenceContext } from '@/shared/theme/themeContext'

export type CoreDateRangeValue = Readonly<{
  dateFrom?: string
  dateTo?: string
}>

export type CoreDateRangePickerProps = Readonly<{
  value?: CoreDateRangeValue
  onChange?: (value: CoreDateRangeValue) => void
  allowClear?: boolean
  disabled?: boolean
  placeholder?: [string, string]
  style?: CSSProperties
  'aria-label'?: string
}>

type DayjsRange = [Dayjs | null, Dayjs | null] | null

function getDateRangePreset(days: 1 | 7 | 30): [Dayjs, Dayjs] {
  // Tạo khoảng thời gian từ đầu ngày đầu tiên đến cuối ngày hôm nay.
  const today = dayjs()
  return [today.subtract(days - 1, 'day').startOf('day'), today.endOf('day')]
}

function serializeDateRange(value: DayjsRange): CoreDateRangeValue {
  // Chuẩn hóa giá trị Ant Design thành format request dùng chung của ứng dụng.
  if (!value?.[0] || !value[1]) return {}

  return {
    dateFrom: value[0].startOf('day').toISOString(),
    dateTo: value[1].endOf('day').toISOString(),
  }
}

export function CoreDateRangePicker({
  allowClear = true,
  onChange,
  placeholder: customPlaceholder,
  style,
  value,
  ...props
}: CoreDateRangePickerProps) {
  // Lấy theme hiện tại để input và popup đồng bộ với giao diện ứng dụng.
  const { t } = useTranslation()
  const isDark = useContext(ThemePreferenceContext)?.resolved === 'dark'
  const pickerValue: DayjsRange =
    value?.dateFrom || value?.dateTo
      ? [value.dateFrom ? dayjs(value.dateFrom) : null, value.dateTo ? dayjs(value.dateTo) : null]
      : null
  const placeholder: [string, string] =
    customPlaceholder ?? [t('foundation.controls.startDate'), t('foundation.controls.endDate')]
  const presets = useMemo(
    () => [
      { label: t('foundation.controls.today'), value: getDateRangePreset(1) },
      { label: t('foundation.controls.last7Days'), value: getDateRangePreset(7) },
      { label: t('foundation.controls.last30Days'), value: getDateRangePreset(30) },
    ],
    [t],
  )

  return (
    <CorePickerTheme>
      <DatePicker.RangePicker
        {...props}
        allowClear={allowClear}
        classNames={{ root: 'core-picker', popup: { root: 'core-picker-popup' } }}
        format="DD/MM/YYYY"
        placeholder={placeholder}
        presets={presets}
        showToday={false}
        suffixIcon={null}
        superNextIcon={null}
        superPrevIcon={null}
        styles={{ root: getCorePickerRootStyle(isDark), popup: { root: getCorePickerPopupStyle(isDark) } }}
        style={{ width: '100%', ...style }}
        value={pickerValue}
        onChange={(nextValue: DayjsRange) => onChange?.(serializeDateRange(nextValue))}
      />
    </CorePickerTheme>
  )
}
