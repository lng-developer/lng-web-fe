import { expect, it } from 'vitest'

import { getEtsyPurchasedDetails } from '@/features/portal/orders/components/etsyPurchasedPresentation'

it('separates purchased options from personalization without repeating parsed inputs', () => {
  const result = getEtsyPurchasedDetails(
    'SIZES: 8in, Border Color: Red, Personalization: Aiden/Alabama',
    [
      { type: 'TEXT', label: 'Personalization', value: 'Aiden/Alabama' },
      {
        type: 'TEXT',
        label: 'Personalization',
        value: 'SIZES: 8in Border Color: Red Personalization: Aiden/Alabama',
      },
      { type: 'OPTION', label: 'SIZES', value: '8in' },
      { type: 'OPTION', label: 'Border Color', value: 'Red' },
    ],
  )
  expect(result.options).toEqual([
    { label: 'SIZES', value: '8in' },
    { label: 'Border Color', value: 'Red' },
  ])
  expect(result.personalizations).toEqual(['Aiden/Alabama'])
  expect(result.originals).toContain(
    'Personalization: SIZES: 8in Border Color: Red Personalization: Aiden/Alabama',
  )
})

it('keeps commas, colons and newlines in the buyers personalization', () => {
  const value = 'Aiden, Alabama\nMessage: Size: XL, Color: Blue'
  expect(
    getEtsyPurchasedDetails(`Size: 8in, Personalization: ${value}`, []).personalizations,
  ).toEqual([value])
})

it('preserves unknown variation formats in original details instead of guessing', () => {
  const result = getEtsyPurchasedDetails('Engraving style / Custom option, text: hello', [])
  expect(result.options).toEqual([])
  expect(result.originals).toEqual(['Engraving style / Custom option, text: hello'])
})

it('prefers parsed inputs over conflicting raw variations', () => {
  const result = getEtsyPurchasedDetails('Size: 8in, Personalization: Aiden', [
    { type: 'TEXT', label: 'Personalization', value: 'Alex' },
    { type: 'OPTION', label: 'Width', value: '8in' },
  ])
  expect(result.personalizations).toEqual(['Alex'])
  expect(result.options).toEqual([{ label: 'Width', value: '8in' }])
})

it('does not append raw trailing options to parsed personalization', () => {
  const value = 'Engaged  Kristin & Malcolm  10.23.2026'
  const result = getEtsyPurchasedDetails(
    `Sizes: 4.8x4.8 INCHES, Quantity: Pack 30pcs, Personalization: ${value}, Text Colors: Black, Print Placement: Square`,
    [
      { type: 'TEXT', label: 'Personalization', value },
      { type: 'OPTION', label: 'Sizes', value: '4.8x4.8 INCHES' },
      { type: 'OPTION', label: 'Quantity', value: 'Pack 30pcs' },
      { type: 'OPTION', label: 'Text Colors', value: 'Black' },
      { type: 'OPTION', label: 'Print Placement', value: 'Square' },
    ],
  )
  expect(result.personalizations).toEqual([value])
  expect(result.options).toEqual([
    { label: 'Sizes', value: '4.8x4.8 INCHES' },
    { label: 'Quantity', value: 'Pack 30pcs' },
    { label: 'Text Colors', value: 'Black' },
    { label: 'Print Placement', value: 'Square' },
  ])
})

it('preserves punctuation and newlines in parsed personalization', () => {
  const value = 'Aiden, Alabama\nMessage: Size: XL, Color: Blue'
  expect(
    getEtsyPurchasedDetails('Personalization: stale text', [
      { type: 'TEXT', label: 'Personalization', value },
    ]).personalizations,
  ).toEqual([value])
})

it('handles missing values without fabricated options', () => {
  expect(getEtsyPurchasedDetails(null, [])).toEqual({
    options: [],
    personalizations: [],
    originals: [],
  })
})

it('does not truncate a variation value that contains a comma', () => {
  const raw = 'Size: 8in, Border Color: Red, White'
  const result = getEtsyPurchasedDetails(raw, [])
  expect(result.options).toEqual([])
  expect(result.originals).toEqual([raw])
})
