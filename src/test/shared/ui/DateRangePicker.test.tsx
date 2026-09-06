import { render, screen } from '@testing-library/react'
import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'

import i18n from '@/shared/i18n/i18n'
import {
  DateRangePicker,
  getDateRangePreset,
  serializeDateRange,
} from '@/shared/ui/DateRangePicker'

describe('DateRangePicker', () => {
  it('provides inclusive one, seven, and thirty-day presets', () => {
    const today = dayjs('2026-09-06T12:00:00')

    expect(getDateRangePreset(1, today).map((date) => date.format('YYYY-MM-DD'))).toEqual([
      '2026-09-06',
      '2026-09-06',
    ])
    expect(getDateRangePreset(7, today).map((date) => date.format('YYYY-MM-DD'))).toEqual([
      '2026-08-31',
      '2026-09-06',
    ])
    expect(getDateRangePreset(30, today).map((date) => date.format('YYYY-MM-DD'))).toEqual([
      '2026-08-08',
      '2026-09-06',
    ])
  })

  it('renders UTC filter boundaries as local calendar dates', async () => {
    await i18n.changeLanguage('en')
    render(
      <DateRangePicker
        aria-label="Created range"
        value={{
          dateFrom: dayjs('2026-07-05').startOf('day').toISOString(),
          dateTo: dayjs('2026-07-07').endOf('day').toISOString(),
        }}
      />,
    )

    expect(screen.getByPlaceholderText('Start date')).toHaveValue('05/07/2026')
    expect(screen.getByPlaceholderText('End date')).toHaveValue('07/07/2026')
  })

  it('serializes selected local days to inclusive UTC boundaries', () => {
    const result = serializeDateRange([dayjs('2026-07-05T12:00:00'), dayjs('2026-07-07T12:00:00')])

    expect(dayjs(result.dateFrom).format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2026-07-05 00:00:00.000')
    expect(dayjs(result.dateTo).format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2026-07-07 23:59:59.999')
  })
})
