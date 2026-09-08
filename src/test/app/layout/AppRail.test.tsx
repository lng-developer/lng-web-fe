import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppRail } from '@/app/layout/AppRail'
import { AppProviders } from '@/app/providers/AppProviders'
import i18n from '@/shared/i18n/i18n'

describe('AppRail', () => {
  beforeEach(() => i18n.changeLanguage('en'))

  it('renders only available cores and switches by button', () => {
    const onCoreChange = vi.fn()
    render(
      <MemoryRouter>
        <AppProviders>
          <AppRail
            activeCore="hr"
            cores={[{ key: 'hr', labelKey: 'shell.cores.hr' }]}
            onCoreChange={onCoreChange}
          />
        </AppProviders>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'HR' }))
    expect(onCoreChange).toHaveBeenCalledWith('hr')
    expect(screen.queryByRole('button', { name: 'Portal' })).not.toBeInTheDocument()
  })

  it('uses work-area icons for Portal and HR while preserving the system settings icon', () => {
    const { container } = render(
      <MemoryRouter>
        <AppProviders>
          <AppRail
            activeCore="portal"
            cores={[
              { key: 'portal', labelKey: 'shell.cores.portal' },
              { key: 'hr', labelKey: 'shell.cores.hr' },
              { key: 'system', labelKey: 'shell.cores.system' },
            ]}
            onCoreChange={vi.fn()}
          />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Portal' })).toHaveClass('ant-btn')
    expect(container.querySelector('.anticon-shop')).toBeInTheDocument()
    expect(container.querySelector('.anticon-team')).toBeInTheDocument()
    expect(container.querySelector('.anticon-setting')).toBeInTheDocument()
  })
})
