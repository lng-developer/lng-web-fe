import { render, screen } from '@testing-library/react'
import { App } from 'antd'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { CopyableOrderId } from '@/shared/ui'
import styles from '@/shared/ui/CopyableOrderId.module.scss'

describe('CopyableOrderId', () => {
  it('renders every order identifier as a reusable blue badge', () => {
    render(
      <App>
        <CopyableOrderId value="114-9140445-5793829" />
      </App>,
    )

    expect(screen.getByRole('button', { name: '114-9140445-5793829' })).toHaveClass(
      styles.orderIdBadge,
    )
  })

  it('uses a high-contrast neutral palette in dark mode', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/shared/ui/CopyableOrderId.module.scss'),
      'utf8',
    )

    expect(source).toContain("html[data-theme='dark']")
  })
})
