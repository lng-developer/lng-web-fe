import { I18nextProvider } from 'react-i18next'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Modal } from 'antd'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import i18n from '@/shared/i18n/i18n'
import { THEME_STORAGE_KEY } from '@/shared/theme/theme'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import { PopupModal } from '@/shared/ui'
import { ThemeSwitch } from '@/shared/theme/ThemeSwitch'

describe('ThemeProvider', () => {
  beforeEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('en')
  })

  afterEach(cleanup)

  it('defaults to light appearance', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <ThemeSwitch />
        </ThemeProvider>
      </I18nextProvider>,
    )

    expect(screen.getByRole('switch', { name: 'Appearance' })).not.toBeChecked()
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('persists an explicit appearance', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <ThemeSwitch />
        </ThemeProvider>
      </I18nextProvider>,
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Appearance' }))

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('places application modals near the top by default', () => {
    render(
      <ThemeProvider>
        <Modal open title="Application modal" />
      </ThemeProvider>,
    )

    expect(screen.getByRole('dialog').closest('.ant-modal-wrap')).not.toHaveClass(
      'ant-modal-centered',
    )
    expect(screen.getByRole('dialog').closest('.ant-modal')).toHaveStyle({ top: '6vh' })
    expect(screen.getByRole('dialog').querySelector('.ant-modal-body')).toHaveStyle({
      maxHeight: 'calc(94dvh - 160px)',
      overflowY: 'auto',
    })
  })

  it('places shared popup modals near the top', async () => {
    render(
      <ThemeProvider>
        <PopupModal open title="Shared popup" onCancel={() => undefined} />
      </ThemeProvider>,
    )

    const dialog = await screen.findByRole('dialog')
    expect(dialog.closest('.ant-modal-wrap')).not.toHaveClass('ant-modal-centered')
    expect(dialog.closest('.ant-modal')).toHaveStyle({ top: '6vh' })
    expect(dialog.querySelector('.ant-modal-body')).toHaveStyle({
      maxHeight: 'calc(94dvh - 160px)',
      overflowY: 'auto',
    })
  })
})
