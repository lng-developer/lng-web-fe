import 'dayjs/locale/vi'

import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfigProvider } from 'antd'
import enUS from 'antd/locale/en_US'
import viVN from 'antd/locale/vi_VN'
import dayjs from 'dayjs'

import { type Appearance, createAppTheme, resolveAppearance, THEME_STORAGE_KEY } from './theme'
import { ThemePreferenceContext } from './themeContext'

type ThemeProviderProps = Readonly<{ children: ReactNode }>

const appearances: Appearance[] = ['light', 'dark', 'system']

function getStoredAppearance(): Appearance {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return appearances.includes(stored as Appearance) ? (stored as Appearance) : 'light'
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { i18n } = useTranslation()
  const [appearance, setAppearance] = useState<Appearance>(getStoredAppearance)
  const [systemIsDark, setSystemIsDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  )
  const resolved = resolveAppearance(appearance, systemIsDark)
  const language = i18n.resolvedLanguage === 'vi' ? 'vi' : 'en'

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!query) return

    const syncSystemAppearance = (event: MediaQueryListEvent) => setSystemIsDark(event.matches)
    query.addEventListener('change', syncSystemAppearance)
    return () => query.removeEventListener('change', syncSystemAppearance)
  }, [])

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, appearance)
    document.documentElement.dataset.theme = resolved
    document.documentElement.style.colorScheme = resolved
  }, [appearance, resolved])

  useEffect(() => {
    dayjs.locale(language)
  }, [language])

  const preference = useMemo(
    () => ({ appearance, resolved, setAppearance }),
    [appearance, resolved],
  )
  const appTheme = useMemo(() => createAppTheme(resolved), [resolved])
  const antdLocale = language === 'vi' ? viVN : enUS

  return (
    <ThemePreferenceContext value={preference}>
      <ConfigProvider
        locale={antdLocale}
        modal={{
          centered: false,
          style: { top: '6vh' },
          styles: {
            body: {
              maxHeight: 'calc(94dvh - 160px)',
              overflowY: 'auto',
            },
          },
        }}
        theme={appTheme}
      >
        {children}
      </ConfigProvider>
    </ThemePreferenceContext>
  )
}
