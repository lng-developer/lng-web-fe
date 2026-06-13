/*
 * Design tokens lấy từ Figma "LNG v2" > Design System > 1. Color Tokens (Light/Dark).
 * Đồng bộ với @theme + .dark{} trong src/styles/tailwind.css. Khi đổi giá trị ở đây,
 * nhớ cập nhật cả tailwind.css để Tailwind utilities và MUI theme luôn khớp nhau.
 */
export const colorTokens = {
  light: {
    bg: { page: '#F8F9FA' },
    surface: { card: '#FFFFFF', elevated: '#FFFFFF' },
    border: { default: '#E5E7EB', strong: '#D1D5DB' },
    text: { primary: '#1A1A1A', secondary: '#4B5563', muted: '#9CA3AF' },
    brand: { primary: '#E63946', primaryHover: '#B91C1C', tint10: '#FDECEE' },
    success: { main: '#16A34A', bg: '#DCFCE7' },
    warning: { main: '#F59E0B', bg: '#FEF3C7' },
    danger: { main: '#DC2626', bg: '#FEE2E2' },
    info: { main: '#2563EB', bg: '#DBEAFE' },
    purple: { main: '#8B5CF6', bg: '#EDE9FE' },
  },
  dark: {
    bg: { page: '#121417' },
    surface: { card: '#1C1F23', elevated: '#23262B' },
    border: { default: '#2D3036', strong: '#3A3E45' },
    text: { primary: '#F3F4F6', secondary: '#C9CDD3', muted: '#8A8F98' },
    brand: { primary: '#FF6B6B', primaryHover: '#E63946', tint10: '#3A1518' },
    success: { main: '#4ADE80', bg: '#14301F' },
    warning: { main: '#FBBF24', bg: '#3A2E0E' },
    danger: { main: '#F87171', bg: '#3A1518' },
    info: { main: '#60A5FA', bg: '#15243A' },
    purple: { main: '#A78BFA', bg: '#2A2440' },
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
    divider: tokens.border.default,
    // Token mở rộng, không thuộc shape chuẩn của MUI - dùng qua theme.palette.tokens.*
    tokens: {
      surfaceElevated: tokens.surface.elevated,
      borderStrong: tokens.border.strong,
    },
  }
}
