const fontFamily = ['Inter', 'Helvetica', 'Arial', 'sans-serif'].join(',')
const fontFamilyMono = ['"JetBrains Mono"', 'monospace'].join(',')

/*
 * Typography scale lấy từ Figma "LNG v2" > Design System > 2. Typography Scale.
 */
export const typography = {
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
    fontSize: '1.25rem',
    fontWeight: 700,
    lineHeight: 1.35,
  },
  h3: {
    fontSize: '1rem',
    fontWeight: 700,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: '0.875rem',
    fontWeight: 700,
    lineHeight: 1.45,
  },
  h5: {
    fontSize: '0.875rem',
    fontWeight: 700,
    lineHeight: 1.45,
  },
  h6: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    lineHeight: 1.45,
  },
  subtitle1: {
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: 1.45,
  },
  subtitle2: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    lineHeight: 1.45,
  },
  overline: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    lineHeight: 1.35,
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
    lineHeight: 1.45,
  },
  caption: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    lineHeight: 1.35,
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: 1.45,
    textTransform: 'none',
  },
}
