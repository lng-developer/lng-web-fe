import { I18nextProvider } from 'react-i18next'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { Modal } from 'antd'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import i18n from '@/shared/i18n/i18n'
import { THEME_STORAGE_KEY } from '@/shared/theme/theme'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
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

    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked()
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

    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Appearance' })).getByText('Dark'),
    )

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('centers application modals by default', () => {
    render(
      <ThemeProvider>
        <Modal open title="Centered modal" />
      </ThemeProvider>,
    )

    expect(screen.getByRole('dialog').closest('.ant-modal-wrap')).toHaveClass('ant-modal-centered')
  })
})
