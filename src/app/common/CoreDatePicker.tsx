import type { CSSProperties, ReactNode } from 'react'
import { useContext, useState } from 'react'
import { DatePicker } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

import { ThemePreferenceContext } from '@/shared/theme/themeContext'

import {
  CorePickerPanelHeader,
  CorePickerTheme,
  getCorePickerPopupStyle,
  getCorePickerRootStyle,
} from './CorePickerHelpers'

export type CoreDatePickerProps = Readonly<{
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

export function CoreDatePicker({ onChange, style, value, ...props }: CoreDatePickerProps) {
  // Giữ pickerValue riêng để header vẫn điều hướng được khi chưa chọn ngày.
  const [pickerValue, setPickerValue] = useState(() => (value ? dayjs(value) : dayjs()))
  const isDark = useContext(ThemePreferenceContext)?.resolved === 'dark'

  return (
    <CorePickerTheme>
      <DatePicker
        {...props}
        classNames={{ root: 'core-picker', popup: { root: 'core-picker-popup core-picker-popup--compact-calendar core-picker-popup--custom-header' } }}
        format="DD/MM/YYYY"
        panelRender={(originPanel: ReactNode) => (
          <>
            <CorePickerPanelHeader value={pickerValue} onChange={setPickerValue} />
            {originPanel}
          </>
        )}
        pickerValue={pickerValue}
        showToday={false}
        suffixIcon={null}
        superNextIcon={null}
        superPrevIcon={null}
        styles={{ root: getCorePickerRootStyle(isDark), popup: { root: getCorePickerPopupStyle(isDark) } }}
        style={{ width: '100%', ...style }}
        value={value ? dayjs(value) : null}
        onChange={(nextValue: Dayjs | null) => {
          if (nextValue) setPickerValue(nextValue)
          onChange?.(nextValue?.format('YYYY-MM-DD') ?? null)
        }}
        onPanelChange={(nextValue: Dayjs) => setPickerValue(nextValue)}
      />
    </CorePickerTheme>
  )
}
