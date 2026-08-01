import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RuleEditorPanel } from '@/features/portal/mapping/components/RuleEditorPanel'
import i18n from '@/shared/i18n/i18n'

describe('RuleEditorPanel', () => {
  afterEach(cleanup)
  beforeEach(() => void i18n.changeLanguage('en'))

  it('requires preview and overlap acknowledgement before saving', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <RuleEditorPanel
        canWrite
        type="skuConfig"
        onDirtyChange={vi.fn()}
        onPreview={vi.fn().mockResolvedValue({ items: [{ sku: 'J2501-TS1S-01' }] })}
        onConflicts={vi.fn().mockResolvedValue({ warnings: [{ severity: 'WARNING' }] })}
        onSave={onSave}
      />,
    )

    fireEvent.change(screen.getByLabelText('Config code'), { target: { value: 'TS1S' } })
    fireEvent.change(screen.getByLabelText('Product group'), { target: { value: 'group-1' } })
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
        onDirtyChange={vi.fn()}
        onPreview={vi.fn().mockResolvedValue({ items: [] })}
        onConflicts={vi.fn().mockResolvedValue({ hasExactConflict: true })}
        onSave={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText('Config code'), { target: { value: 'TS1S' } })
    fireEvent.change(screen.getByLabelText('Product group'), { target: { value: 'group-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }))

    await screen.findByText('An exact-scope rule already exists.')
    expect(screen.getByRole('button', { name: 'Save rule' })).toBeDisabled()
  })
})
