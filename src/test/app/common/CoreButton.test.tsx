import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CoreButton } from '@/app/common/CoreButton'

describe('CoreButton', () => {
  it('runs its action from the primary operational button', () => {
    const onClick = vi.fn()

    render(<CoreButton onClick={onClick}>Save changes</CoreButton>)

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders the GXON outline variant with Ant Design', () => {
    render(<CoreButton variant="outlined">Cancel</CoreButton>)

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('ant-btn-variant-outlined')
  })

  it('renders the GXON subtle variant with Ant Design', () => {
    render(<CoreButton variant="subtle">Save draft</CoreButton>)

    expect(screen.getByRole('button', { name: 'Save draft' })).toHaveClass('ant-btn-variant-filled')
  })

  it('uses the subtle appearance for a rounded button by default', () => {
    render(<CoreButton variant="rounded">Filter</CoreButton>)

    expect(screen.getByRole('button', { name: 'Filter' })).toHaveClass(
      'ant-btn-round',
      'ant-btn-variant-filled',
    )
  })

  it.each([
    ['solid', '#2a5ad9', '#2755cc', '#ffffff'],
    ['outlined', '#316AFF', '#316AFF', '#ffffff'],
    ['subtle', '#316AFF', '#316AFF', '#ffffff'],
    ['rounded', '#316AFF', '#316AFF', '#ffffff'],
  ] as const)('matches GXON %s hover colors', (variant, backgroundColor, borderColor, color) => {
    render(<CoreButton variant={variant}>Primary</CoreButton>)

    const button = screen.getByRole('button', { name: 'Primary' })
    fireEvent.mouseEnter(button)

    expect(button).toHaveStyle({ backgroundColor, borderColor, color })
  })

  it('prevents duplicate actions while loading', () => {
    const onClick = vi.fn()

    render(
      <CoreButton loading onClick={onClick}>
        Save changes
      </CoreButton>,
    )

    const button = screen.getByRole('button', { name: 'loading Save changes' })
    fireEvent.click(button)

    expect(button).toBeDisabled()
    expect(onClick).not.toHaveBeenCalled()
  })
})
