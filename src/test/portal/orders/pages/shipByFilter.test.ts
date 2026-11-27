import { describe, expect, it } from 'vitest'

import { getShipByRange } from '@/features/portal/orders/pages/shipByFilter'

describe('ship-by Pacific calendar dates', () => {
  it('uses the Amazon US date even when Vietnam is already on the next day', () => {
    expect(getShipByRange('today', new Date('2026-11-27T03:00:00Z'))).toEqual({
      shipByDateFrom: '2026-11-26T08:00:00.000Z',
      shipByDateTo: '2026-11-27T07:59:59.999Z',
    })
    expect(getShipByRange('tomorrow', new Date('2026-11-27T03:00:00Z'))).toEqual({
      shipByDateFrom: '2026-11-27T08:00:00.000Z',
      shipByDateTo: '2026-11-28T07:59:59.999Z',
    })
  })

  it.each([
    ['2026-03-07T20:00:00Z', '2026-03-08T08:00:00.000Z', '2026-03-09T06:59:59.999Z'],
    ['2026-10-31T20:00:00Z', '2026-11-01T07:00:00.000Z', '2026-11-02T07:59:59.999Z'],
  ])('handles daylight-saving boundaries from %s', (now, from, to) => {
    expect(getShipByRange('tomorrow', new Date(now))).toEqual({
      shipByDateFrom: from,
      shipByDateTo: to,
    })
  })

  it('does not restrict ship-by when all dates is selected', () => {
    expect(getShipByRange('all')).toEqual({})
  })
})
