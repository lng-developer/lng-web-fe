import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ResolveQueuePanel } from '@/features/portal/mapping/components/ResolveQueuePanel'
import styles from '@/features/portal/mapping/pages/MappingWorkspacePage.module.scss'
import i18n from '@/shared/i18n/i18n'

const item = {
  id: 'item-1',
  externalOrderId: 'order-1',
  sku: 'J2501-TS1S-01',
  asin: 'ASIN-1',
  blockingReasons: ['MISSING_SKU_CONFIG'],
  recommendedFixTypes: ['CREATE_SKU_CONFIG_RULE'],
}

describe('ResolveQueuePanel', () => {
  afterEach(cleanup)
  beforeEach(() => void i18n.changeLanguage('en'))

  it('selects the item and opens its recommended pipeline stage', () => {
    const onSelect = vi.fn()
    const onRecommendedStage = vi.fn()
    render(
      <ResolveQueuePanel
        items={[item]}
        search=""
        onBlockerChange={vi.fn()}
        onSearchChange={vi.fn()}
        onSelect={onSelect}
        onRecommendedStage={onRecommendedStage}
      />,
    )

    fireEvent.click(screen.getByText('J2501-TS1S-01').closest('[role="button"]')!)

    expect(onSelect).toHaveBeenCalledWith(item)
    expect(onRecommendedStage).toHaveBeenCalledWith('PRODUCT_MAPPING')
  })

  it('does not trigger data callbacks while scrolling', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <ResolveQueuePanel
        items={[item]}
        search=""
        onBlockerChange={vi.fn()}
        onSearchChange={vi.fn()}
        onSelect={onSelect}
        onRecommendedStage={vi.fn()}
      />,
    )

    fireEvent.scroll(container.firstElementChild!)

    expect(onSelect).not.toHaveBeenCalled()
  })

  it('keeps the filters outside the independently scrollable queue list', () => {
    const { container } = render(
      <ResolveQueuePanel
        items={[item]}
        search=""
        onBlockerChange={vi.fn()}
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
        onRecommendedStage={vi.fn()}
      />,
    )

    expect(container.firstElementChild).toHaveClass(styles.queuePanel)
    expect(container.querySelector(`.${styles.queueList}`)).toBeInTheDocument()
  })

  it('shows the full order ID as a copyable badge', () => {
    render(
      <ResolveQueuePanel
        items={[item]}
        search=""
        onBlockerChange={vi.fn()}
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
        onRecommendedStage={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'order-1' })).toBeVisible()
  })
})
