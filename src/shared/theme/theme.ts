import { theme, type ThemeConfig } from 'antd'

export type Appearance = 'light' | 'dark' | 'system'
export type ResolvedAppearance = Exclude<Appearance, 'system'>

export const THEME_STORAGE_KEY = 'lng-web-appearance'

export function resolveAppearance(
  appearance: Appearance,
  systemIsDark: boolean,
): ResolvedAppearance {
  return appearance === 'system' ? (systemIsDark ? 'dark' : 'light') : appearance
}

export function createAppTheme(resolved: ResolvedAppearance): ThemeConfig {
  const isDark = resolved === 'dark'

  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#E83B4A',
      colorBgLayout: isDark ? '#111318' : '#F6F7F9',
      colorText: isDark ? '#F3F4F6' : '#171A1F',
      borderRadius: 8,
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    components: {
      Table: { headerBg: isDark ? '#1C2027' : '#F6F7F9' },
    },
  }
}
