import { describe, expect, it } from 'vitest'

import { formatScheduleSubtitle } from '@/features/portal/integrations/components/extensionHelpers'

describe('formatScheduleSubtitle', () => {
  const dummyT = (_key: string, opts?: Record<string, unknown>) => {
    if (opts?.defaultValue) {
      let str = opts.defaultValue as string
      if (opts.times) str = str.replace('{{times}}', String(opts.times))
      if (opts.hours !== undefined) str = str.replace('{{hours}}', String(opts.hours))
      if (opts.time) str = str.replace('{{time}}', String(opts.time))
      return str
    }
    return ''
  }

  it('returns Not scheduled when schedule is null or disabled', () => {
    expect(formatScheduleSubtitle(null, dummyT)).toBe('Not scheduled')
    expect(formatScheduleSubtitle({ enabled: false }, dummyT)).toBe('Not scheduled')
  })

  it('formats fixed times schedule with custom run times', () => {
    const subtitle = formatScheduleSubtitle(
      {
        enabled: true,
        scheduleType: 'FIXED_TIMES',
        fixedTimes: ['10:00', '17:00'],
        nextRunAt: '2026-11-04T10:00:00.000Z',
      },
      dummyT,
    )
    expect(subtitle).toContain('Daily at 10:00, 17:00 (UTC+7)')
    expect(subtitle).toContain('Next:')
  })

  it('formats interval schedule with interval hours', () => {
    const subtitle = formatScheduleSubtitle(
      {
        enabled: true,
        scheduleType: 'INTERVAL',
        intervalMinutes: 120,
        nextRunAt: '2026-11-04T12:00:00.000Z',
      },
      dummyT,
      120,
    )
    expect(subtitle).toContain('Every 2h')
    expect(subtitle).toContain('Next:')
  })

  it('supports special interval notes for transactions and settlements', () => {
    const note = 'Daily · Last 3 completed days (UTC+7) · Initial 30 days in 7-day batches'
    const subtitle = formatScheduleSubtitle(
      {
        enabled: true,
        scheduleType: 'INTERVAL',
        intervalMinutes: 1440,
        nextRunAt: '2026-11-04T00:00:00.000Z',
      },
      dummyT,
      1440,
      note,
    )
    expect(subtitle).toContain(note)
    expect(subtitle).toContain('Next:')
  })
})
