import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RuleInventoryPanel } from '@/features/portal/mapping/components/RuleInventoryPanel'
import i18n from '@/shared/i18n/i18n'

describe('RuleInventoryPanel', () => {
  afterEach(cleanup)
  beforeEach(() => void i18n.changeLanguage('en'))

  it('uses readable references and exposes row actions', async () => {
    const rule = {
      id: 'rule-1',
      configCode: 'TS1S',
      productTypeGroupId: 'group-1',
      internalTemplateId: 'template-1',
      status: 'ACTIVE' as const,
      priority: 10,
    }
    const onSelect = vi.fn()
    const onToggleStatus = vi.fn()

    render(
      <RuleInventoryPanel
        canWrite
        type="skuConfig"
        rules={[rule]}
        references={{
          productGroups: { 'group-1': 'T-shirt · TS' },
          templates: { 'template-1': 'Default shirt' },
        }}
        search=""
        onCreate={vi.fn()}
        onHistory={vi.fn()}
        onSearchChange={vi.fn()}
        onSelect={onSelect}
        onStatusChange={vi.fn()}
        onToggleStatus={onToggleStatus}
      />,
    )

    expect(screen.getByText('T-shirt · TS')).toBeInTheDocument()
    expect(screen.queryByText('group-1')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('TS1S').closest('tr')!)
    expect(onSelect).toHaveBeenCalledWith(rule)

    fireEvent.click(screen.getByRole('switch'))
    expect(onToggleStatus).toHaveBeenCalledWith(rule)
  })
})
