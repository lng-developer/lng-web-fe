import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { ConfigProvider } from 'antd'

import { type Appearance, createAppTheme, resolveAppearance, THEME_STORAGE_KEY } from './theme'
import { ThemePreferenceContext } from './themeContext'

type ThemeProviderProps = Readonly<{ children: ReactNode }>

const appearances: Appearance[] = ['light', 'dark', 'system']

function getStoredAppearance(): Appearance {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return appearances.includes(stored as Appearance) ? (stored as Appearance) : 'system'
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [appearance, setAppearance] = useState<Appearance>(getStoredAppearance)
  const [systemIsDark, setSystemIsDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  )
  const resolved = resolveAppearance(appearance, systemIsDark)

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

  const preference = useMemo(
    () => ({ appearance, resolved, setAppearance }),
    [appearance, resolved],
  )
  const appTheme = useMemo(() => createAppTheme(resolved), [resolved])

  return (
    <ThemePreferenceContext value={preference}>
      <ConfigProvider modal={{ centered: true }} theme={appTheme}>
        {children}
      </ConfigProvider>
    </ThemePreferenceContext>
  )
}
