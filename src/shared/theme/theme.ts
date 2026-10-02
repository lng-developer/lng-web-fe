import { theme, type ThemeConfig } from 'antd'

export type Appearance = 'light' | 'dark' | 'system'
export type ResolvedAppearance = Exclude<Appearance, 'system'>

export const THEME_STORAGE_KEY = 'lng-web-appearance'
export const APP_PRIMARY_COLOR = '#E83B4A'

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
      colorPrimary: APP_PRIMARY_COLOR,
      colorInfo: '#2D88FF',
      colorSuccess: '#10B981',
      colorWarning: '#F59E0B',
      colorError: '#EF4444',
      colorBgBase: isDark ? '#18191A' : '#FFFFFF',
      colorBgContainer: isDark ? '#242526' : '#FFFFFF',
      colorBgElevated: isDark ? '#242526' : '#FFFFFF',
      colorBgLayout: isDark ? '#18191A' : '#F8FAFC',
      colorFillQuaternary: isDark ? '#3A3B3C' : '#F8FAFC',
      colorText: isDark ? '#E4E6EB' : '#0F172A',
      colorTextSecondary: isDark ? '#B0B3B8' : '#475569',
      colorTextTertiary: isDark ? '#8A8D91' : '#94A3B8',
      colorBorder: isDark ? '#393A3B' : '#CBD5E1',
      colorBorderSecondary: isDark ? '#2F3031' : '#E2E8F0',
      colorSplit: isDark ? '#393A3B' : '#E2E8F0',
      borderRadius: 8,
      borderRadiusLG: 12,
      borderRadiusSM: 6,
      boxShadow: isDark
        ? '0 1px 3px 0 rgb(0 0 0 / 40%), 0 1px 2px -1px rgb(0 0 0 / 40%)'
        : '0 1px 3px 0 rgb(15 23 42 / 6%), 0 1px 2px -1px rgb(15 23 42 / 4%)',
      boxShadowSecondary: isDark
        ? '0 12px 32px -4px rgb(0 0 0 / 50%), 0 4px 12px -2px rgb(0 0 0 / 30%)'
        : '0 10px 25px -5px rgb(15 23 42 / 8%), 0 8px 10px -6px rgb(15 23 42 / 4%)',
      fontFamily:
        "'Plus Jakarta Sans', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    components: {
      Button: {
        controlHeight: 36,
        borderRadius: 8,
        fontWeight: 600,
      },
      Card: {
        headerBg: 'transparent',
      },
      Drawer: {
        paddingLG: 20,
      },
      Input: {
        controlHeight: 36,
        borderRadius: 8,
        colorBgContainer: isDark ? '#3A3B3C' : '#FFFFFF',
        colorBorder: isDark ? '#393A3B' : '#CBD5E1',
      },
      Select: {
        controlHeight: 36,
        borderRadius: 8,
        colorBgContainer: isDark ? '#3A3B3C' : '#FFFFFF',
        colorBorder: isDark ? '#393A3B' : '#CBD5E1',
      },
      DatePicker: {
        controlHeight: 36,
        borderRadius: 8,
        colorBgContainer: isDark ? '#3A3B3C' : '#FFFFFF',
        colorBorder: isDark ? '#393A3B' : '#CBD5E1',
      },
      Table: {
        cellPaddingBlock: 10,
        cellPaddingInline: 12,
        headerBg: isDark ? '#242526' : '#FAFBFC',
        headerColor: isDark ? '#E4E6EB' : '#334155',
        rowHoverBg: isDark ? '#2A2B2C' : '#F8FAFC',
        borderColor: isDark ? '#393A3B' : '#CBD5E1',
      },
      Menu: {
        itemBorderRadius: 8,
        itemHeight: 38,
        itemBg: isDark ? '#242526' : '#FFFFFF',
        itemSelectedBg: isDark ? 'rgba(232, 59, 74, 0.16)' : 'rgba(232, 59, 74, 0.08)',
        itemColor: isDark ? '#E4E6EB' : '#334155',
        itemSelectedColor: APP_PRIMARY_COLOR,
      },
      Tag: {
        borderRadiusSM: 6,
      },
      Segmented: {
        itemSelectedBg: APP_PRIMARY_COLOR,
        itemSelectedColor: '#FFFFFF',
        itemHoverColor: APP_PRIMARY_COLOR,
        itemColor: isDark ? '#B0B3B8' : '#475569',
        trackBg: isDark ? '#242526' : '#F1F5F9',
        trackPadding: 3,
        borderRadius: 8,
        borderRadiusSM: 6,
      },
    },
  }
}
