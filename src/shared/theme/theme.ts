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
      colorInfo: '#1677FF',
      colorSuccess: '#16A34A',
      colorWarning: '#D97706',
      colorError: '#DC2626',
      colorBgBase: isDark ? '#0B0F14' : '#EEF1F5',
      colorBgContainer: isDark ? '#141A22' : '#F7F8FA',
      colorBgElevated: isDark ? '#111827' : '#FBFCFD',
      colorBgLayout: isDark ? '#0B0F14' : '#E5EAF0',
      colorFillQuaternary: isDark ? '#182131' : '#E8EDF3',
      colorText: isDark ? '#E5E7EB' : '#111827',
      colorTextSecondary: isDark ? '#CBD5E1' : '#374151',
      colorTextTertiary: isDark ? '#94A3B8' : '#64748B',
      colorBorder: isDark ? '#334155' : '#CBD5E1',
      colorBorderSecondary: isDark ? '#263244' : '#E2E8F0',
      colorSplit: isDark ? '#1F2937' : '#E5E7EB',
      borderRadius: 8,
      borderRadiusLG: 10,
      boxShadowSecondary: isDark
        ? '0 18px 44px rgb(0 0 0 / 34%)'
        : '0 18px 44px rgb(15 23 42 / 10%)',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    components: {
      Button: { controlHeight: 36 },
      Card: { headerBg: 'transparent' },
      Drawer: { paddingLG: 20 },
      Input: { controlHeight: 36 },
      Table: {
        cellPaddingBlock: 10,
        cellPaddingInline: 12,
        headerBg: isDark ? '#0F172A' : '#E8EDF3',
        rowHoverBg: isDark ? '#182131' : '#EDF1F5',
      },
      Menu: {
        itemBorderRadius: 8,
        itemHeight: 38,
        itemBg: isDark ? '#141A22' : '#F7F8FA',
        itemSelectedBg: isDark ? '#1F2937' : '#EDF1F5',
        itemColor: isDark ? '#E5E7EB' : '#111827',
        itemSelectedColor: isDark ? '#F9FAFB' : '#111827',
      },
    },
  }
}
