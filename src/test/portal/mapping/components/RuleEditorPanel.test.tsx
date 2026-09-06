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

  it('checks and saves a safe rule with one save action', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <RuleEditorPanel
        canWrite
        type="skuConfig"
        productTypeGroups={[{ id: 'group-1', name: 'T-shirt', code: 'TS' }]}
        onDirtyChange={vi.fn()}
        onPreview={vi.fn().mockResolvedValue({ items: [{ sku: 'J2501-TS1S-01' }] })}
        onConflicts={vi.fn().mockResolvedValue({ conflicts: [] })}
        onSave={onSave}
      />,
    )

    fireEvent.change(screen.getByLabelText('Config code'), { target: { value: 'TS1S' } })
    chooseProductGroup()
    fireEvent.click(screen.getByRole('button', { name: 'Save rule' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ configCode: 'TS1S' })),
    )
  })

  it('shows a sample value and preview action for product mapping', () => {
    render(
      <RuleEditorPanel
        canWrite
        type="skuConfig"
        productTypeGroups={[{ id: 'group-1', name: 'T-shirt', code: 'TS' }]}
        onDirtyChange={vi.fn()}
        onPreview={vi.fn()}
        onConflicts={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Sample value')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preview changes' })).toBeInTheDocument()
  })

  it('previews SKU cleanup against a sample SKU without saving the rule', async () => {
    const onPreview = vi.fn().mockResolvedValue({ samples: [] })
    const onSave = vi.fn()
    render(
      <RuleEditorPanel
        canWrite
        type="skuNormalize"
        rule={{
          id: '',
          segmentIndex: 2,
          segmentRole: 'SIZE',
          appliesWhenValues: ['TS1S'],
          outputAction: 'REMOVE_SEGMENT',
        }}
        onDirtyChange={vi.fn()}
        onPreview={onPreview}
        onConflicts={vi.fn().mockResolvedValue({ conflicts: [] })}
        onSave={onSave}
      />,
    )

    fireEvent.change(screen.getByLabelText('Sample SKU'), { target: { value: 'J2605-TS1S-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }))

    await waitFor(() =>
      expect(onPreview).toHaveBeenCalledWith(expect.anything(), ['J2605-TS1S-01']),
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows sample value previews for input semantics and value aliases', () => {
    const props = {
      canWrite: true,
      onDirtyChange: vi.fn(),
      onPreview: vi.fn(),
      onConflicts: vi.fn(),
      onSave: vi.fn(),
    }
    const { unmount } = render(
      <RuleEditorPanel
        {...props}
        type="semanticRules"
        rule={{ id: '', semanticRole: 'COLOR', matchValue: 'Select Color' }}
      />,
    )

    expect(screen.getByLabelText('Sample label')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preview changes' })).toBeInTheDocument()

    unmount()
    render(
      <RuleEditorPanel
        {...props}
        type="valueAliases"
        rule={{ id: '', semanticRole: 'COLOR', matchValue: 'Black', normalizedValue: 'BLACK' }}
      />,
    )

    expect(screen.getByLabelText('Sample value')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preview changes' })).toBeInTheDocument()
  })

  it('suggests a composite value format for product type and color parsing', () => {
    render(
      <RuleEditorPanel
        canWrite
        type="semanticRules"
        rule={{
          id: '',
          semanticRole: 'PRODUCT_TYPE_COLOR',
          matchValues: ['Select Product Type & Color'],
        }}
        onDirtyChange={vi.fn()}
        onPreview={vi.fn()}
        onConflicts={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Sample label')).toHaveAttribute(
      'placeholder',
      'Example: Select Product Type & Color',
    )
  })

  it('distinguishes semantic label aliases from the sample option value', () => {
    render(
      <RuleEditorPanel
        canWrite
        type="semanticRules"
        rule={{ id: '', semanticRole: 'SIZE', matchValues: ['Select Size'] }}
        onDirtyChange={vi.fn()}
        onPreview={vi.fn()}
        onConflicts={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Option label aliases')).toBeInTheDocument()
    expect(screen.getByLabelText('Sample label')).toHaveAttribute(
      'placeholder',
      'Example: Select Size',
    )
    expect(screen.getByText('Enter an option label to test this rule.')).toBeInTheDocument()
  })

  it('submits several input aliases as one semantic rule', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <RuleEditorPanel
        canWrite
        type="semanticRules"
        rule={{ id: '', semanticRole: 'SIZE', matchValues: ['Select Size', 'SizeKey'] }}
        onDirtyChange={vi.fn()}
        onPreview={vi.fn().mockResolvedValue({ items: [] })}
        onConflicts={vi.fn().mockResolvedValue({ conflicts: [] })}
        onSave={onSave}
      />,
    )

    expect(screen.getByLabelText('Option label aliases')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save rule' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          matchValues: ['Select Size', 'SizeKey'],
        }),
      ),
    )
  })

  it('blocks saving when an exact conflict exists', async () => {
    const onSave = vi.fn()
    render(
      <RuleEditorPanel
        canWrite
        type="skuConfig"
        productTypeGroups={[{ id: 'group-1', name: 'T-shirt', code: 'TS' }]}
        onDirtyChange={vi.fn()}
        onPreview={vi.fn().mockResolvedValue({ items: [] })}
        onConflicts={vi.fn().mockResolvedValue({ hasExactConflict: true })}
        onSave={onSave}
      />,
    )
    fireEvent.change(screen.getByLabelText('Config code'), { target: { value: 'TS1S' } })
    chooseProductGroup()
    fireEvent.click(screen.getByRole('button', { name: 'Save rule' }))

    await screen.findByText('An exact-scope rule already exists.')
    expect(screen.getByRole('button', { name: 'Save rule' })).toBeEnabled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('preserves exact matching when staff saves a semantic label rule', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <RuleEditorPanel
        canWrite
        type="semanticRules"
        rule={{ id: '', semanticRole: 'COLOR', matchValues: ['Color'], matchType: 'EXACT' }}
        onDirtyChange={vi.fn()}
        onPreview={vi.fn().mockResolvedValue({ items: [] })}
        onConflicts={vi.fn().mockResolvedValue({ conflicts: [] })}
        onSave={onSave}
      />,
    )

    expect(screen.getByLabelText('Match type')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save rule' }))
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ matchType: 'EXACT' })),
    )
  })

  it('keeps product mapping create and update forms to their required fields', () => {
    render(
      <RuleEditorPanel
        canWrite
        type="skuConfig"
        rule={{
          id: 'config-rule-1',
          configCode: 'TS1S',
          productTypeGroupId: 'group-1',
          platformProductType: 'Unisex T-Shirt',
          countryCode: 'US',
          priority: 10,
          status: 'INACTIVE',
        }}
        productTypeGroups={[{ id: 'group-1', name: 'T-shirt', code: 'TS' }]}
        onDirtyChange={vi.fn()}
        onPreview={vi.fn()}
        onConflicts={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Config code')).toBeInTheDocument()
    expect(screen.getByLabelText('Product group')).toBeInTheDocument()
    expect(screen.queryByLabelText('Platform product type')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Country code')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Internal template')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Priority')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument()
  })

  it('keeps vendor routing conditions collapsed until needed', () => {
    render(
      <RuleEditorPanel
        canWrite
        type="vendorRouting"
        productTypeGroups={[{ id: 'group-1', name: 'T-shirt', code: 'TS' }]}
        vendors={[{ id: 'vendor-1', name: 'Vendor A' }]}
        onDirtyChange={vi.fn()}
        onPreview={vi.fn()}
        onConflicts={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Product group')).toBeInTheDocument()
    expect(screen.getByLabelText('Vendor')).toBeInTheDocument()
    expect(screen.queryByLabelText('ASIN')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Additional conditions'))
    expect(screen.getByLabelText('ASIN')).toBeInTheDocument()
    expect(screen.getByLabelText('Config code')).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: 'Save rule' }))

    await waitFor(() =>
      expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ shopId: 'shop-1' }), []),
    )
  })
})
