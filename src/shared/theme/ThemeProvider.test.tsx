import { I18nextProvider } from 'react-i18next'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import i18n from '@/shared/i18n/i18n'

import { THEME_STORAGE_KEY } from './theme'
import { ThemeProvider } from './ThemeProvider'
import { ThemeSwitch } from './ThemeSwitch'

describe('ThemeProvider', () => {
  beforeEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('en')
  })

  it('persists an explicit appearance', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <ThemeSwitch />
        </ThemeProvider>
      </I18nextProvider>,
    )

    fireEvent.click(screen.getByText('Dark'))

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
