import { createContext, useContext } from 'react'

import type { Appearance, ResolvedAppearance } from './theme'

export type ThemePreference = {
  appearance: Appearance
  resolved: ResolvedAppearance
  setAppearance: (value: Appearance) => void
}

export const ThemePreferenceContext = createContext<ThemePreference | null>(null)

export function useThemePreference() {
  const preference = useContext(ThemePreferenceContext)
  if (!preference) throw new Error('useThemePreference must be used within ThemeProvider')
  return preference
}
