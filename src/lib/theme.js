import { alpha, createTheme } from '@mui/material/styles'

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

function buildPalette(mode) {
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

const fontFamily = ['Inter', 'Helvetica', 'Arial', 'sans-serif'].join(',')
const fontFamilyMono = ['"JetBrains Mono"', 'monospace'].join(',')

// Hệ số opacity dùng chung cho mọi state "disabled" (Button, Checkbox, Switch...).
const DISABLED_OPACITY = 0.5

// Focus/Ring (Component/Input, Component/Select...): viền glow 4px, alpha 12% theo màu trạng thái
// (brand/primary khi focus thường, error khi focus + lỗi).
const focusRing = (color) => `0 0 0 4px ${alpha(color, 0.12)}`

/**
 * Tạo MUI theme theo mode (light/dark). Typography lấy từ Figma "LNG v2" > Design System >
 * 2. Typography Scale, shape.borderRadius* lấy từ 3. Spacing & Radius.
 */
export function createAppTheme(mode = 'light') {
  return createTheme({
    palette: buildPalette(mode),
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1536,
      },
    },
    typography: {
      fontFamily,
      // Không thuộc API chuẩn của MUI - dùng qua theme.typography.fontFamilyMono cho
      // các giá trị dạng ID/mã (đơn hàng, mã tracking...).
      fontFamilyMono,
      h1: {
        fontSize: '1.5rem',
        fontWeight: 700,
        lineHeight: 1.3,
      },
      h2: {
        fontSize: '1rem',
        fontWeight: 600,
      },
      h3: {
        fontSize: '0.8125rem',
        fontWeight: 600,
        letterSpacing: '0.0385em',
        textTransform: 'uppercase',
      },
      body1: {
        fontSize: '0.875rem',
        fontWeight: 400,
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.8125rem',
        fontWeight: 400,
      },
      caption: {
        fontSize: '0.6875rem',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 8, // radius/input-button
      borderRadiusCard: 12, // radius/card
      borderRadiusPill: 999, // radius/pill, badge, tag
    },
    // styleOverrides bên dưới lấy từ Figma "LNG v2" > Design System >
    // 4. Components — Atoms & Molecules (Button, Input, Select, Checkbox, Toggle,
    // Avatar, Tooltip, Pagination...).
    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: theme.shape.borderRadius,
            textTransform: 'none',
            fontWeight: 600,
            gap: 8,
          }),
          sizeSmall: {
            height: 32,
            padding: '0 12px',
          },
          sizeMedium: {
            height: 40,
            padding: '0 16px',
          },
          sizeLarge: {
            height: 48,
            padding: '0 16px',
            fontSize: '1rem',
          },
          // variant="contained" (mặc định color="primary") -> Button/Primary
          containedPrimary: ({ theme }) => ({
            '&:hover': { backgroundColor: theme.palette.primary.dark },
            '&.Mui-disabled': {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.common.white,
              opacity: DISABLED_OPACITY,
            },
          }),
          // variant="contained" color="error" -> Button/Danger
          containedError: ({ theme }) => ({
            '&:hover': { backgroundColor: theme.palette.error.main, opacity: 0.88 },
            '&.Mui-disabled': {
              backgroundColor: theme.palette.error.main,
              color: theme.palette.common.white,
              opacity: DISABLED_OPACITY,
            },
          }),
          // variant="outlined" -> Button/Secondary: viền mặc định màu border.strong,
          // chỉ chuyển sang primary khi hover.
          outlined: ({ theme }) => ({
            backgroundColor: theme.palette.background.paper,
            borderColor: theme.palette.tokens.borderStrong,
            '&:hover': {
              borderColor: theme.palette.primary.main,
              backgroundColor: theme.palette.background.paper,
            },
            '&.Mui-disabled': {
              borderColor: theme.palette.tokens.borderStrong,
              opacity: DISABLED_OPACITY,
            },
          }),
          outlinedPrimary: ({ theme }) => ({
            color: theme.palette.text.primary,
          }),
          // variant="text" -> Button/Ghost: trong suốt, hover phủ brand/tint10.
          text: {
            '&.Mui-disabled': { opacity: DISABLED_OPACITY },
          },
          textPrimary: ({ theme }) => ({
            '&:hover': { backgroundColor: theme.palette.primary.light },
          }),
        },
      },
      // size="small" để label/placeholder căn giữa đúng với chiều cao input 40px
      // (MuiOutlinedInput.input padding bên dưới đã thu nhỏ theo size nhỏ).
      MuiTextField: {
        defaultProps: {
          size: 'small',
        },
      },
      // Input/Select dùng chung MuiOutlinedInput - các state Default/Focus/Error/Disabled
      // và phần Focus/Ring (box-shadow brand/primary 12%) map theo Component/Input,
      // Component/Select.
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: theme.shape.borderRadius,
            backgroundColor: theme.palette.background.paper,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.divider,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.tokens.borderStrong,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.primary.main,
              borderWidth: 1,
            },
            '&.Mui-focused': {
              boxShadow: focusRing(theme.palette.primary.main),
            },
            '&.Mui-error .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.error.main,
            },
            '&.Mui-error.Mui-focused': {
              boxShadow: focusRing(theme.palette.error.main),
            },
            '&.Mui-disabled': {
              backgroundColor: theme.palette.action.disabledBackground,
            },
          }),
          input: {
            padding: '8.5px 12px',
          },
        },
      },
      // Component/Select Menu Item: state=Default (trong suốt), state=Hover/Selected
      // phủ brand/tint10.
      MuiMenu: {
        styleOverrides: {
          paper: ({ theme }) => ({
            marginTop: 4,
            borderRadius: theme.shape.borderRadius,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: '0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)',
          }),
          list: {
            padding: 4,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 6,
            fontSize: '0.875rem',
            '&:hover': { backgroundColor: theme.palette.primary.light },
            '&.Mui-selected': {
              backgroundColor: theme.palette.primary.light,
              color: theme.palette.primary.main,
              fontWeight: 600,
              '&:hover': { backgroundColor: theme.palette.primary.light },
            },
          }),
        },
      },
      // Component/Checkbox: state=Unchecked viền border.strong, state=Checked/Indeterminate
      // tô đầy brand/primary với dấu check trắng (icon mặc định của MUI dùng currentColor).
      MuiCheckbox: {
        styleOverrides: {
          root: ({ theme }) => ({
            color: theme.palette.tokens.borderStrong,
            '&.Mui-checked, &.MuiCheckbox-indeterminate': {
              color: theme.palette.primary.main,
            },
            '&.Mui-disabled': { opacity: DISABLED_OPACITY },
          }),
        },
      },
      // Component/Toggle: track 36x20 pill (radius 999), state=Off border.strong,
      // state=On brand/primary, thumb trắng 16x16.
      MuiSwitch: {
        styleOverrides: {
          root: {
            width: 36,
            height: 20,
            padding: 0,
            overflow: 'visible',
          },
          switchBase: ({ theme }) => ({
            padding: 2,
            '&.Mui-checked': {
              transform: 'translateX(16px)',
            },
            '&.Mui-disabled': { opacity: DISABLED_OPACITY },
            '& + .MuiSwitch-track': {
              backgroundColor: theme.palette.tokens.borderStrong,
              opacity: 1,
            },
            '&.Mui-checked + .MuiSwitch-track': {
              backgroundColor: theme.palette.primary.main,
              opacity: 1,
            },
          }),
          thumb: ({ theme }) => ({
            width: 16,
            height: 16,
            boxShadow: 'none',
            backgroundColor: theme.palette.common.white,
          }),
          track: ({ theme }) => ({
            borderRadius: theme.shape.borderRadiusPill,
            opacity: 1,
          }),
        },
      },
      // Component/Avatar: hasImage=False -> nền brand/tint10 (chữ/icon đại diện),
      // hasImage=True -> nền border.strong (placeholder khi ảnh chưa tải).
      MuiAvatar: {
        styleOverrides: {
          root: ({ theme }) => ({
            width: 40,
            height: 40,
            fontSize: '1rem',
            fontWeight: 600,
            backgroundColor: theme.palette.tokens.borderStrong,
          }),
          colorDefault: ({ theme }) => ({
            backgroundColor: theme.palette.primary.light,
            color: theme.palette.primary.main,
          }),
        },
      },
      // Component/Tooltip: nền = text.primary của mode hiện tại (đảo ngược độ sáng so với nền
      // trang) -> luôn nổi rõ; chữ trắng (light) hoặc ink của light mode (dark) để đủ tương phản.
      MuiTooltip: {
        styleOverrides: {
          tooltip: ({ theme }) => ({
            backgroundColor: theme.palette.text.primary,
            color:
              theme.palette.mode === 'light'
                ? theme.palette.common.white
                : colorTokens.light.text.primary,
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '6px 10px',
            borderRadius: 6,
          }),
          arrow: ({ theme }) => ({
            color: theme.palette.text.primary,
          }),
        },
      },
      // Component/Pagination Page Button: 36x36, radius 8, state=Active nền brand/primary.
      MuiPaginationItem: {
        styleOverrides: {
          root: ({ theme }) => ({
            width: 36,
            height: 36,
            minWidth: 36,
            borderRadius: theme.shape.borderRadius,
            fontWeight: 500,
            '&.Mui-selected': {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.common.white,
              '&:hover': { backgroundColor: theme.palette.primary.dark },
            },
          }),
        },
      },
    },
  })
}

export const theme = createAppTheme('light')
