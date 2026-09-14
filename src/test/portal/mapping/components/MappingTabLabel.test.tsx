import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MappingTabLabel } from '@/features/portal/mapping/components/MappingTabLabel'
import styles from '@/features/portal/mapping/pages/MappingWorkspacePage.module.scss'

describe('MappingTabLabel', () => {
  it('renders label text correctly', () => {
    render(<MappingTabLabel label="SKU cleanup rules" />)
    expect(screen.getByText('SKU cleanup rules')).toBeInTheDocument()
  })

  it('renders step number with aria-hidden', () => {
    render(<MappingTabLabel label="Product mapping" step={2} />)
    const stepEl = screen.getByText('2')
    expect(stepEl).toBeInTheDocument()
    expect(stepEl).toHaveAttribute('aria-hidden', 'true')
    expect(stepEl).toHaveClass(styles.tabStep)
  })

  it('renders active step number style when active is true', () => {
    render(<MappingTabLabel active label="Product mapping" step={2} />)
    const stepEl = screen.getByText('2')
    expect(stepEl).toHaveClass(styles.tabStepActive)
  })

  it('renders icon with aria-hidden when provided', () => {
    render(
      <MappingTabLabel
        icon={<span data-testid="workbench-icon">icon</span>}
        label="Mapping workbench"
      />,
    )
    expect(screen.getByTestId('workbench-icon')).toBeInTheDocument()
  })

  it('renders count badge when count is greater than 0', () => {
    render(<MappingTabLabel count={5} label="Input semantics" step={3} />)
    const badgeEl = screen.getByText('5')
    expect(badgeEl).toBeInTheDocument()
    expect(badgeEl).toHaveAttribute('aria-hidden', 'true')
    expect(badgeEl).toHaveClass(styles.tabCountBadge)
  })

  it('renders active count badge when active is true', () => {
    render(<MappingTabLabel active count={12} label="Value aliases" step={4} />)
    const badgeEl = screen.getByText('12')
    expect(badgeEl).toHaveClass(styles.tabCountBadgeActive)
  })

  it('displays 99+ when count exceeds 99', () => {
    render(<MappingTabLabel count={150} label="Vendor routing" step={5} />)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('does not render count badge when count is 0 or undefined', () => {
    const { rerender } = render(<MappingTabLabel count={0} label="Test" />)
    expect(screen.queryByText('0')).not.toBeInTheDocument()

    rerender(<MappingTabLabel label="Test" />)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
