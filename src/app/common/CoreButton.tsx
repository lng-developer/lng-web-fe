import { useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { Button } from 'antd'

export type CoreButtonColor = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'
export type CoreButtonVariant = 'solid' | 'outlined' | 'subtle' | 'rounded' | 'text'

// Props dùng chung cho nút Core, giữ API độc lập với Ant Design.
export type CoreButtonProps = Readonly<{
  children: ReactNode
  color?: CoreButtonColor
  variant?: CoreButtonVariant
  onClick?: (event: ReactMouseEvent<HTMLElement>) => void
  loading?: boolean
  disabled?: boolean
  size?: 'small' | 'middle' | 'large'
  startIcon?: ReactNode
  endIcon?: ReactNode
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
  'aria-label'?: string
  className?: string
}>

type AntdButtonColor =
  | 'primary'
  | 'orange'
  | 'green'
  | 'danger'
  | 'gold'
  | 'cyan'

type GxonButtonPalette = Readonly<{
  main: string
  hover: string
  hoverBorder: string
  subtle: string
}>

const antdButtonColors: Record<CoreButtonColor, AntdButtonColor> = {
  primary: 'primary',
  secondary: 'orange',
  success: 'green',
  error: 'danger',
  warning: 'gold',
  info: 'cyan',
}

const gxonButtonPalettes: Record<CoreButtonColor, GxonButtonPalette> = {
  primary: {
    main: '#316AFF',
    hover: '#2a5ad9',
    hoverBorder: '#2755cc',
    subtle: '#eaf0ff',
  },
  secondary: {
    main: '#FF8110',
    hover: '#d96e0e',
    hoverBorder: '#cc670d',
    subtle: '#fff2e7',
  },
  success: {
    main: '#22B07E',
    hover: '#1d966b',
    hoverBorder: '#1b8d65',
    subtle: '#e9f7f2',
  },
  error: {
    main: '#FF401C',
    hover: '#d93618',
    hoverBorder: '#cc3316',
    subtle: '#ffece8',
  },
  warning: {
    main: '#FDBB1F',
    hover: '#d79f1a',
    hoverBorder: '#ca9619',
    subtle: '#fff8e9',
  },
  info: {
    main: '#02B4FA',
    hover: '#0299d5',
    hoverBorder: '#0290c8',
    subtle: '#e6f8ff',
  },
}

function getAntdColor(color: CoreButtonColor): AntdButtonColor {
  return antdButtonColors[color]
}

// Chuyển variant Core sang loại button mà Ant Design hỗ trợ.
function getAntdVariant(variant: CoreButtonVariant) {
  if (variant === 'subtle' || variant === 'rounded') return 'filled'
  return variant
}

// Tạo style GXON bổ sung cho các variant không có sẵn trong Ant Design.
function getGxonButtonStyle(
  color: CoreButtonColor,
  variant: CoreButtonVariant,
  isHighlighted: boolean,
): CSSProperties {
  const palette = gxonButtonPalettes[color]

  if (variant === 'solid') {
    return {
      backgroundColor: isHighlighted ? palette.hover : palette.main,
      borderColor: isHighlighted ? palette.hoverBorder : palette.main,
      color: '#ffffff',
    }
  }

  if (variant === 'outlined') {
    return {
      backgroundColor: isHighlighted ? palette.main : 'transparent',
      borderColor: palette.main,
      color: isHighlighted ? '#ffffff' : palette.main,
    }
  }

  if (variant === 'subtle' || variant === 'rounded') {
    return {
      backgroundColor: isHighlighted ? palette.main : palette.subtle,
      borderColor: isHighlighted ? palette.main : palette.subtle,
      color: isHighlighted ? '#ffffff' : palette.main,
    }
  }

  return {
    backgroundColor: isHighlighted ? palette.subtle : 'transparent',
    borderColor: 'transparent',
    color: palette.main,
  }
}

export function CoreButton({
  children,
  color = 'primary',
  variant = 'solid',
  onClick,
  loading,
  disabled,
  size,
  startIcon,
  endIcon,
  fullWidth,
  type,
  'aria-label': ariaLabel,
  className,
}: CoreButtonProps) {
  // Theo dõi hover/focus để cập nhật style custom mà không mất hành vi mặc định.
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Button
      aria-label={ariaLabel}
      block={fullWidth}
      className={className}
      color={getAntdColor(color)}
      disabled={disabled || loading}
      htmlType={type}
      icon={startIcon ?? endIcon}
      iconPlacement={endIcon && !startIcon ? 'end' : 'start'}
      loading={loading}
      shape={variant === 'rounded' ? 'round' : 'default'}
      size={size}
      style={getGxonButtonStyle(color, variant, isHovered || isFocused)}
      variant={getAntdVariant(variant)}
      onBlur={() => setIsFocused(false)}
      onClick={onClick}
      onFocus={() => setIsFocused(true)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </Button>
  )
}
