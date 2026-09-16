import dayjs from 'dayjs'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { CoreDatePicker } from '@/app/common/CoreDatePicker'
import { CoreDateRangePicker } from '@/app/common/CoreDateRangePicker'
import { CoreDateTimePicker } from '@/app/common/CoreDateTimePicker'
import { CoreTimePicker } from '@/app/common/CoreTimePicker'
import { CorePickerPanelHeader, createCorePickerTheme } from '@/app/common/CorePickerHelpers'
import i18n from '@/shared/i18n/i18n'
import { ThemePreferenceContext } from '@/shared/theme/themeContext'

describe('Core date pickers', () => {
  beforeEach(() => i18n.changeLanguage('en'))

  it('uses the GXON field frame for date input', () => {
    render(<CoreDatePicker aria-label="Date" />)

    const picker = screen.getByLabelText('Date').closest('.ant-picker')

    expect(picker).toHaveClass('core-picker')
    expect(picker).toHaveStyle({
      borderColor: '#E8EBF1',
      borderRadius: '6px',
      minHeight: '40px',
    })
    expect(picker).not.toHaveAttribute('style', expect.stringContaining('max-width'))
  })

  it('uses dark colors when the application theme is dark', () => {
    render(
      <ThemePreferenceContext value={{ appearance: 'dark', resolved: 'dark', setAppearance: () => undefined }}>
        <CoreDatePicker aria-label="Dark date" />
      </ThemePreferenceContext>,
    )

    const picker = screen.getByLabelText('Dark date').closest('.ant-picker')

    expect(picker).toHaveStyle({
      backgroundColor: '#141A22',
      borderColor: '#3A3B4D',
    })
  })

  it('uses dark range tokens for the dark date range picker', () => {
    const darkTheme = createCorePickerTheme(true)
    const datePickerTheme = darkTheme.components?.DatePicker

    expect(datePickerTheme).toMatchObject({
      cellActiveWithRangeBg: '#1F2937',
      cellHoverBg: '#1F2937',
      cellHoverWithRangeBg: '#1F2937',
    })
  })

  it('omits the Ant Design Today footer from the GXON date picker', () => {
    render(<CoreDatePicker aria-label="Date" />)

    fireEvent.mouseDown(screen.getByLabelText('Date'))

    expect(document.querySelector('.ant-picker-today-btn')).not.toBeInTheDocument()
  })

  it('uses GXON month and year selectors in the calendar header', () => {
    render(<CorePickerPanelHeader value={dayjs('2026-09-11')} onChange={() => undefined} />)

    expect(screen.getByRole('combobox', { name: 'Month' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Year' })).toBeInTheDocument()
  })

  it('renders a date and datetime using the UI date formats', () => {
    render(
      <>
        <CoreDatePicker aria-label="Date" value="2026-07-31" />
        <CoreDateTimePicker aria-label="Date time" value="2026-07-31T13:45:00" />
        <CoreTimePicker aria-label="Time" value="13:45:00" />
      </>,
    )

    expect(screen.getByLabelText('Date')).toHaveValue('31/07/2026')
    expect(screen.getByLabelText('Date time')).toHaveValue('31/07/2026 13:45')
    expect(screen.getByLabelText('Time')).toHaveValue('13:45')
  })

  it('renders a date range with start and end values', () => {
    render(
      <CoreDateRangePicker
        value={{ dateFrom: '2026-07-05', dateTo: '2026-07-07' }}
        placeholder={['Start date', 'End date']}
      />,
    )

    expect(screen.getByPlaceholderText('Start date')).toHaveValue('05/07/2026')
    expect(screen.getByPlaceholderText('End date')).toHaveValue('07/07/2026')
  })
})
