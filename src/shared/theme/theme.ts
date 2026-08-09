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
      colorBgBase: isDark ? '#0B0F14' : '#F9FAFB',
      colorBgContainer: isDark ? '#141A22' : '#FFFFFF',
      colorBgElevated: isDark ? '#111827' : '#FFFFFF',
      colorBgLayout: isDark ? '#0B0F14' : '#F3F4F6',
      colorText: isDark ? '#E5E7EB' : '#111827',
      colorTextSecondary: isDark ? '#9CA3AF' : '#374151',
      colorTextTertiary: isDark ? '#6B7280' : '#6B7280',
      colorBorder: isDark ? '#374151' : '#D1D5DB',
      colorBorderSecondary: isDark ? '#273244' : '#E5E7EB',
      colorSplit: isDark ? '#1F2937' : '#E5E7EB',
      borderRadius: 8,
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    components: {
      Table: {
        headerBg: isDark ? '#0F172A' : '#F3F4F6',
      },
      Menu: {
        itemBg: isDark ? '#141A22' : '#FFFFFF',
        itemSelectedBg: isDark ? '#1F2937' : '#E5E7EB',
        itemColor: isDark ? '#E5E7EB' : '#111827',
        itemSelectedColor: isDark ? '#F9FAFB' : '#111827',
      },
    },
  }
}
