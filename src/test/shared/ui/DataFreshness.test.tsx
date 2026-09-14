import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DataFreshness } from '@/shared/ui'

describe('DataFreshness', () => {
  it('renders null when timestamp is not provided and no onRefresh', () => {
    const { container } = render(<DataFreshness />)
    expect(container.firstChild).toBeNull()
  })

  it('renders formatted time string when timestamp is provided', () => {
    const testDate = new Date('2026-09-14T10:31:35.000Z')
    render(<DataFreshness timestamp={testDate} />)
    const expectedTime = testDate.toLocaleTimeString()
    expect(screen.getByText(new RegExp(expectedTime))).toBeInTheDocument()
  })

  it('renders refresh button and calls onRefresh when clicked', () => {
    const handleRefresh = vi.fn()
    const testDate = new Date('2026-09-14T10:31:35.000Z')
    render(<DataFreshness timestamp={testDate} onRefresh={handleRefresh} />)

    const button = screen.getByRole('button', { name: /refresh/i })
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(handleRefresh).toHaveBeenCalledTimes(1)
  })

  it('disables refresh button when loading', () => {
    const handleRefresh = vi.fn()
    render(<DataFreshness timestamp={Date.now()} onRefresh={handleRefresh} loading />)

    const button = screen.getByRole('button', { name: /refresh/i })
    expect(button).toBeDisabled()
  })
})
