import { alpha, createTheme } from '@mui/material/styles'

import { ELEVATION_SHADOWS, THEME_MODES } from '@/constants/app'

import { buildPalette, colorTokens } from './palette'
import { typography } from './typography'

export { colorTokens }

// Hệ số opacity dùng chung cho mọi state "disabled" (Button, Checkbox, Switch...).
const DISABLED_OPACITY = 0.5

// Focus/Ring (Component/Input, Component/Select...): viền glow 4px, alpha 12% theo màu trạng thái
// (brand/primary khi focus thường, error khi focus + lỗi).
const focusRing = (color) => `0 0 0 4px ${alpha(color, 0.12)}`

/**
 * Tạo MUI theme theo mode (light/dark). Typography lấy từ src/theme/typography.js,
 * shape.borderRadius* lấy từ Figma "LNG v2" > Design System > 3. Spacing & Radius.
 */
export function createAppTheme(mode = THEME_MODES.LIGHT) {
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
    typography,
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
            color: theme.palette.text.primary,
            minHeight: 42,
            transition: theme.transitions.create(
              ['background-color', 'border-color', 'box-shadow'],
              {
                duration: theme.transitions.duration.shorter,
              },
            ),
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
              color: theme.palette.text.disabled,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.action.disabledBackground,
              },
            },
          }),
          input: ({ theme }) => ({
            padding: '8.5px 12px',
            '&::placeholder': {
              color: theme.palette.text.secondary,
              opacity: 1,
            },
            '&.Mui-disabled': {
              WebkitTextFillColor: theme.palette.text.disabled,
              '&::placeholder': {
                color: theme.palette.text.disabled,
                opacity: 1,
              },
            },
          }),
        },
      },
      MuiInputAdornment: {
        styleOverrides: {
          root: ({ theme }) => ({
            color: theme.palette.text.disabled,
            '& .MuiSvgIcon-root': {
              fontSize: 20,
            },
          }),
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            marginLeft: 0,
            marginRight: 0,
            marginTop: 6,
            fontSize: '0.8125rem',
            lineHeight: 1.35,
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
            boxShadow: ELEVATION_SHADOWS.LG,
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
              theme.palette.mode === THEME_MODES.LIGHT
                ? theme.palette.common.white
                : colorTokens[THEME_MODES.LIGHT].text.primary,
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

export const theme = createAppTheme(THEME_MODES.LIGHT)
