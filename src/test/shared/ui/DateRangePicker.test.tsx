import { render, screen } from '@testing-library/react'
import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'

import { DateRangePicker, serializeDateRange } from '@/shared/ui/DateRangePicker'

describe('DateRangePicker', () => {
  it('renders UTC filter boundaries as local calendar dates', () => {
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
