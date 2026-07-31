import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import styles from '@/shared/ui/sharedUi.module.scss'
import { UiTabs } from '@/shared/ui/UiTabs'

describe('UiTabs', () => {
  it('renders the active tab with the product underline class', () => {
    render(
      <UiTabs
        activeKey="roles"
        items={[{ key: 'roles', label: 'Roles', children: <div>Role catalog</div> }]}
      />,
    )

    expect(screen.getByRole('tablist').closest(`.${styles.uiTabs}`)).not.toBeNull()
    expect(screen.getByRole('tab', { name: 'Roles', selected: true })).toBeVisible()
    expect(screen.getByText('Role catalog')).toBeVisible()
  })
})
