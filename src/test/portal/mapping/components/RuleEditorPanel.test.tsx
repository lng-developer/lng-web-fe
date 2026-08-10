import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RuleEditorPanel } from '@/features/portal/mapping/components/RuleEditorPanel'
import i18n from '@/shared/i18n/i18n'

describe('RuleEditorPanel', () => {
  afterEach(cleanup)
  beforeEach(() => void i18n.changeLanguage('en'))

  const chooseProductGroup = () => {
    fireEvent.mouseDown(screen.getByLabelText('Product group'))
    fireEvent.click(screen.getByText('T-shirt · TS'))
  }

  it('requires preview and overlap acknowledgement before saving', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <RuleEditorPanel
        canWrite
        type="skuConfig"
        productTypeGroups={[{ id: 'group-1', name: 'T-shirt', code: 'TS' }]}
        onDirtyChange={vi.fn()}
        onPreview={vi.fn().mockResolvedValue({ items: [{ sku: 'J2501-TS1S-01' }] })}
        onConflicts={vi.fn().mockResolvedValue({ warnings: [{ severity: 'WARNING' }] })}
        onSave={onSave}
      />,
    )

    expect(
      screen.queryByText('These are sampled records, not an exact total.'),
    ).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Config code'), { target: { value: 'TS1S' } })
    chooseProductGroup()
    expect(screen.getByRole('button', { name: 'Save rule' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }))
    await screen.findByText('This rule overlaps a broader scope.')
    expect(screen.getByRole('button', { name: 'Save rule' })).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Acknowledge overlap' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save rule' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ configCode: 'TS1S' })),
    )
  })

  it('blocks saving when an exact conflict exists', async () => {
    render(
      <RuleEditorPanel
        canWrite
        type="skuConfig"
        productTypeGroups={[{ id: 'group-1', name: 'T-shirt', code: 'TS' }]}
        onDirtyChange={vi.fn()}
        onPreview={vi.fn().mockResolvedValue({ items: [] })}
        onConflicts={vi.fn().mockResolvedValue({ hasExactConflict: true })}
        onSave={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText('Config code'), { target: { value: 'TS1S' } })
    chooseProductGroup()
    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }))

    await screen.findByText('An exact-scope rule already exists.')
    expect(screen.getByRole('button', { name: 'Save rule' })).toBeDisabled()
  })

  it('keeps semantic matching defaults out of the staff form', () => {
    render(
      <RuleEditorPanel
        canWrite
        type="semanticRules"
        onDirtyChange={vi.fn()}
        onPreview={vi.fn()}
        onConflicts={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText('Match type')).not.toBeInTheDocument()
  })

  it('preserves the selected shop scope in submitted rule payloads', async () => {
    const onPreview = vi.fn().mockResolvedValue({ items: [] })
    render(
      <RuleEditorPanel
        canWrite
        type="skuConfig"
        rule={{ id: '', shopId: 'shop-1', configCode: 'TS1S' }}
        productTypeGroups={[{ id: 'group-1', name: 'T-shirt', code: 'TS' }]}
        onDirtyChange={vi.fn()}
        onPreview={onPreview}
        onConflicts={vi.fn().mockResolvedValue({ conflicts: [] })}
        onSave={vi.fn()}
      />,
    )

    chooseProductGroup()
    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }))

    await waitFor(() =>
      expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ shopId: 'shop-1' }), []),
    )
  })

  it.each([
    {
      type: 'semanticRules' as const,
      rule: { id: 'semantic-rule-1', semanticRole: 'COLOR', matchValue: 'Charcoal' },
    },
    {
      type: 'valueAliases' as const,
      rule: { id: 'alias-rule-1', semanticRole: 'SIZE', matchValue: 'Small', normalizedValue: 'S' },
    },
    {
      type: 'vendorRouting' as const,
      rule: {
        id: 'routing-rule-1',
        productTypeGroupId: 'group-1',
        vendorId: 'vendor-1',
        configCode: 'TS2S',
        normalizedSize: 'S',
      },
    },
    {
      type: 'skuNormalize' as const,
      rule: {
        id: 'normalize-rule-1',
        patternType: 'SEGMENT',
        segmentIndex: 0,
        segmentRole: 'CONFIG',
        appliesWhenValues: ['J2522'],
        outputAction: 'REPLACE_SEGMENT',
        replacementValue: 'J2542',
      },
    },
  ])('does not invent a sample for $type previews', async ({ type, rule }) => {
    const onPreview = vi.fn().mockResolvedValue({ items: [] })
    render(
      <RuleEditorPanel
        canWrite
        type={type}
        rule={rule}
        productTypeGroups={[{ id: 'group-1', name: 'T-shirt', code: 'TS' }]}
        vendors={[{ id: 'vendor-1', name: 'Vendor A' }]}
        onDirtyChange={vi.fn()}
        onPreview={onPreview}
        onConflicts={vi.fn().mockResolvedValue({ conflicts: [] })}
        onSave={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }))

    await waitFor(() => expect(onPreview).toHaveBeenCalledWith(expect.any(Object), []))
  })

  it('previews an explicitly entered sample SKU and shows preview failures', async () => {
    const onPreview = vi.fn().mockRejectedValue(new Error('Preview unavailable'))
    render(
      <RuleEditorPanel
        canWrite
        type="skuNormalize"
        rule={{
          id: 'rule-1',
          segmentIndex: 1,
          segmentRole: 'CONFIG',
          appliesWhenValues: ['TS'],
          outputAction: 'REPLACE_SEGMENT',
          replacementValue: 'TS2S',
        }}
        onDirtyChange={vi.fn()}
        onPreview={onPreview}
        onConflicts={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Sample SKU'), {
      target: { value: ' J2522-TS-1 ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }))

    await waitFor(() =>
      expect(onPreview).toHaveBeenCalledWith(
        expect.objectContaining({ replacementValue: 'TS2S' }),
        ['J2522-TS-1'],
      ),
    )
    expect(await screen.findByText('Preview unavailable')).toBeInTheDocument()
  })

  it('uses the user-entered sample for product mapping previews', async () => {
    const onPreview = vi.fn().mockResolvedValue({ items: [] })
    render(
      <RuleEditorPanel
        canWrite
        type="skuConfig"
        rule={{ id: 'config-rule-1', configCode: 'TS2S', productTypeGroupId: 'group-1' }}
        productTypeGroups={[{ id: 'group-1', name: 'T-shirt', code: 'TS' }]}
        onDirtyChange={vi.fn()}
        onPreview={onPreview}
        onConflicts={vi.fn().mockResolvedValue({ conflicts: [] })}
        onSave={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Sample SKU'), {
      target: { value: ' TS2S ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }))

    await waitFor(() => expect(onPreview).toHaveBeenCalledWith(expect.any(Object), ['TS2S']))
  })
})
