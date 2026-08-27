import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
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

  it('keeps a comfortable gap between adjacent tabs', () => {
    const source = readFileSync('src/shared/ui/sharedUi.module.scss', 'utf8')
    expect(source).toMatch(/\.ant-tabs-tab \+ \.ant-tabs-tab\)\s*\{\s*margin-left: 12px;/)
  })
})
