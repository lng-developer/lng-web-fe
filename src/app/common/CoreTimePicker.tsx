import type { CSSProperties } from 'react'
import { useContext } from 'react'
import { TimePicker } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

import {
  CorePickerTheme,
  getCorePickerPopupStyle,
  getCorePickerRootStyle,
} from './CorePickerHelpers'

import { ThemePreferenceContext } from '@/shared/theme/themeContext'

export type CoreTimePickerProps = Readonly<{
  value?: string | null
  onChange?: (value: string | null) => void
  allowClear?: boolean
  className?: string
  disabled?: boolean
  id?: string
  placeholder?: string
  style?: CSSProperties
  'aria-label'?: string
}>

export function CoreTimePicker({ onChange, style, value, ...props }: CoreTimePickerProps) {
  // Dùng cùng theme và style với các picker ngày để giao diện nhất quán.
  const isDark = useContext(ThemePreferenceContext)?.resolved === 'dark'

  return (
    <CorePickerTheme>
      <TimePicker
        {...props}
        classNames={{ root: 'core-picker', popup: { root: 'core-picker-popup core-time-picker-popup' } }}
        format="HH:mm"
        suffixIcon={null}
        styles={{ root: getCorePickerRootStyle(isDark), popup: { root: getCorePickerPopupStyle(isDark) } }}
        style={{ width: '100%', ...style }}
        value={value ? dayjs(`2000-01-01T${value}`) : null}
        onChange={(nextValue: Dayjs | null) => onChange?.(nextValue?.format('HH:mm') ?? null)}
      />
    </CorePickerTheme>
  )
}
