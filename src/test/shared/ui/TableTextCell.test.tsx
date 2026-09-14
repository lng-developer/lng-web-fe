import { render, screen } from '@testing-library/react'
import { App } from 'antd'
import { describe, expect, it } from 'vitest'

import { TableTextCell } from '@/shared/ui'
import styles from '@/shared/ui/TableTextCell.module.scss'

describe('TableTextCell', () => {
  it('renders fallback when value is empty or null', () => {
    render(
      <App>
        <TableTextCell value={null} fallback="—" />
      </App>,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders short text normally without longBadge class', () => {
    render(
      <App>
        <TableTextCell value="Amazon US" />
      </App>,
    )
    expect(screen.getByText('Amazon US')).toBeInTheDocument()
    expect(screen.queryByText('Amazon US')?.closest(`.${styles.longBadge}`)).toBeNull()
  })

  it('renders long text with longBadge styling and tooltip support', () => {
    const longText = 'Amazon extension report / US marketplace final bulk sync 2026'
    render(
      <App>
        <TableTextCell value={longText} maxChars={20} />
      </App>,
    )
    expect(screen.getByText(longText)).toBeInTheDocument()
    expect(screen.getByText(longText).closest(`.${styles.longBadge}`)).toBeInTheDocument()
  })
})
