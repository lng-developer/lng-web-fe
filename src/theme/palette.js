import { THEME_MODES } from '@/constants/app'

/*
 * Design tokens lấy từ Figma "LNG v2" > Design System > 1. Color Tokens (Light/Dark).
 * Đồng bộ với @theme + .dark{} trong src/styles/tailwind.css. Khi đổi giá trị ở đây,
 * nhớ cập nhật cả tailwind.css để Tailwind utilities và MUI theme luôn khớp nhau.
 */
export const colorTokens = {
  [THEME_MODES.LIGHT]: {
    bg: { page: '#F8F9FA' },
    surface: { card: '#FFFFFF', subtle: '#F9FAFB', elevated: '#FFFFFF' },
    border: { default: '#E5E7EB', strong: '#D1D5DB' },
    text: {
      primary: '#1A1A1A',
      strong: '#111827',
      detail: '#1F242E',
      action: '#374151',
      secondary: '#4B5563',
      muted: '#9CA3AF',
    },
    brand: {
      primary: '#E63946',
      primaryHover: '#B91C1C',
      tint10: '#FDECEE',
      subtle: '#FFFBFB',
    },
    success: { main: '#16A34A', soft: '#D1FAE5', bg: '#DCFCE7', strong: '#065F46' },
    warning: { main: '#F59E0B', bg: '#FEF3C7', strong: '#B45309', deep: '#92400E' },
    danger: { main: '#DC2626', bg: '#FEE2E2' },
    info: { main: '#2563EB', bg: '#DBEAFE', strong: '#1D4ED8' },
    purple: { main: '#8B5CF6', bg: '#EDE9FE' },
    neutral: { bg: '#F3F4F6' },
    link: { blue: '#406BD1' },
    sky: { soft: '#F0F9FF', border: '#BAE6FD' },
    teal: { main: '#0D9488' },
    violet: { bg: '#EDE9FE', strong: '#5B21B6' },
    pink: { bg: '#FCE7F3', strong: '#9D174D' },
  },
  [THEME_MODES.DARK]: {
    bg: { page: '#121417' },
    surface: { card: '#1C1F23', subtle: '#202328', elevated: '#23262B' },
    border: { default: '#2D3036', strong: '#3A3E45' },
    text: {
      primary: '#F3F4F6',
      strong: '#F9FAFB',
      detail: '#E5E7EB',
      action: '#D1D5DB',
      secondary: '#C9CDD3',
      muted: '#8A8F98',
    },
    brand: {
      primary: '#FF6B6B',
      primaryHover: '#E63946',
      tint10: '#3A1518',
      subtle: '#2A1416',
    },
    success: { main: '#4ADE80', soft: '#123524', bg: '#14301F', strong: '#86EFAC' },
    warning: { main: '#FBBF24', bg: '#3A2E0E', strong: '#FBBF24', deep: '#FDE68A' },
    danger: { main: '#F87171', bg: '#3A1518' },
    info: { main: '#60A5FA', bg: '#15243A', strong: '#93C5FD' },
    purple: { main: '#A78BFA', bg: '#2A2440' },
    neutral: { bg: '#25282D' },
    link: { blue: '#93C5FD' },
    sky: { soft: '#10283B', border: '#1D4ED8' },
    teal: { main: '#5EEAD4' },
    violet: { bg: '#2A2440', strong: '#C4B5FD' },
    pink: { bg: '#3A1730', strong: '#F9A8D4' },
  },
}

export function buildPalette(mode) {
  const tokens = colorTokens[mode]

  return {
    mode,
    primary: {
      main: tokens.brand.primary,
      dark: tokens.brand.primaryHover,
      light: tokens.brand.tint10,
    },
    secondary: {
      main: tokens.purple.main,
      light: tokens.purple.bg,
    },
    success: { main: tokens.success.main, light: tokens.success.bg },
    warning: { main: tokens.warning.main, light: tokens.warning.bg },
    error: { main: tokens.danger.main, light: tokens.danger.bg },
    info: { main: tokens.info.main, light: tokens.info.bg },
    background: {
      default: tokens.bg.page,
      paper: tokens.surface.card,
    },
    text: {
      primary: tokens.text.primary,
      secondary: tokens.text.secondary,
      disabled: tokens.text.muted,
    },
    action: {
      disabled: tokens.text.muted,
      disabledBackground: tokens.border.default,
    },
    divider: tokens.border.default,
    // Token mở rộng, không thuộc shape chuẩn của MUI - dùng qua theme.palette.tokens.*
    tokens: {
      primarySubtle: tokens.brand.subtle,
      surfaceSubtle: tokens.surface.subtle,
      surfaceElevated: tokens.surface.elevated,
      borderStrong: tokens.border.strong,
      inkStrong: tokens.text.strong,
      inkDetail: tokens.text.detail,
      inkAction: tokens.text.action,
      successSoft: tokens.success.soft,
      successStrong: tokens.success.strong,
      warningStrong: tokens.warning.strong,
      warningDeep: tokens.warning.deep,
      infoStrong: tokens.info.strong,
      neutralBg: tokens.neutral.bg,
      linkBlue: tokens.link.blue,
      skySoft: tokens.sky.soft,
      skyBorder: tokens.sky.border,
      teal: tokens.teal.main,
      violetBg: tokens.violet.bg,
      violetStrong: tokens.violet.strong,
      pinkBg: tokens.pink.bg,
      pinkStrong: tokens.pink.strong,
    },
  }
}
