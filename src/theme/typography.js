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
    fontSize: '24px',
    fontWeight: 700,
    lineHeight: '32px',
  },
  h2: {
    fontSize: '20px',
    fontWeight: 700,
    lineHeight: '28px',
  },
  h3: {
    fontSize: '16px',
    fontWeight: 700,
    lineHeight: '24px',
  },
  h4: {
    fontSize: '16px',
    fontWeight: 700,
    lineHeight: '24px',
  },
  h5: {
    fontSize: '16px',
    fontWeight: 700,
    lineHeight: '24px',
  },
  h6: {
    fontSize: '16px',
    fontWeight: 700,
    lineHeight: '24px',
  },
  subtitle1: {
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: '20px',
  },
  subtitle2: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    lineHeight: '16px',
  },
  overline: {
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: '18px',
    textTransform: 'uppercase',
  },
  body1: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: '20px',
  },
  body2: {
    fontSize: '0.8125rem',
    fontWeight: 400,
    lineHeight: '18px',
  },
  caption: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    lineHeight: '16px',
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: '20px',
    textTransform: 'none',
  },
}
