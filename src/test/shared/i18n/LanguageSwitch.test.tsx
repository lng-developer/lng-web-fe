import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import i18n, { LANGUAGE_STORAGE_KEY } from '@/shared/i18n/i18n'
import { LanguageSwitch } from '@/shared/i18n/LanguageSwitch'
import languageSwitchStyles from '@/shared/i18n/LanguageSwitch.module.scss'

describe('LanguageSwitch', () => {
  beforeEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('en')
  })

  afterEach(cleanup)

  it('shows the active language in one styled button and toggles to Vietnamese', async () => {
    render(<LanguageSwitch />)

    const languageButton = screen.getByRole('button', { name: 'Language' })
    expect(languageButton).toHaveClass(languageSwitchStyles.button)
    expect(languageButton).toHaveTextContent('EN')

    fireEvent.click(languageButton)

    await waitFor(() => expect(i18n.resolvedLanguage).toBe('vi'))
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('vi')
    expect(screen.getByRole('button', { name: 'Ngôn ngữ' })).toHaveTextContent('VI')
  })
})
