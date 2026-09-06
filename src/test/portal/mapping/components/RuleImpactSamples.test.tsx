import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { RuleImpactSamples } from '@/features/portal/mapping/components/RuleImpactSamples'
import i18n from '@/shared/i18n/i18n'

describe('RuleImpactSamples', () => {
  afterEach(cleanup)
  beforeEach(() => void i18n.changeLanguage('en'))

  it('shows every parsed field from a composite semantic preview', () => {
    render(
      <RuleImpactSamples
        preview={{
          samples: [
            {
              input: 'Unisex T-Shirt/Black',
              output: 'UNISEX T-SHIRT / BLACK',
              matched: true,
              parsedInputs: [
                { semanticRole: 'PRODUCT_TYPE', value: 'UNISEX T-SHIRT' },
                { semanticRole: 'COLOR', value: 'BLACK' },
              ],
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('PRODUCT_TYPE: UNISEX T-SHIRT')).toBeInTheDocument()
    expect(screen.getByText('COLOR: BLACK')).toBeInTheDocument()
  })

  it('labels the matched semantic alias separately from parsed values', () => {
    render(
      <RuleImpactSamples
        preview={{
          samples: [
            {
              input: 'Select Size',
              output: 'SIZE',
              matched: true,
              semanticRole: 'SIZE',
              matchValue: 'Select Size',
              matchTarget: 'LABEL',
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('Matched label alias: Select Size')).toBeInTheDocument()
    expect(screen.getByText('Semantic role: SIZE')).toBeInTheDocument()
  })
})
