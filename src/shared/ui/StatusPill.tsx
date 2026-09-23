/* eslint-disable react-refresh/only-export-components */
import { type CSSProperties, memo, type ReactNode } from 'react'

export const DATA_COLORS = {
  success: '#39a00d',
  process: '#d46a08',
  pending: '#0958d7',
  purple: '#7248BA',
  cancelled: '#cd1323',
  default: '#94a3b8',
  backgroundHover: '#f1f5f9',
  title: '#64748b',
  yellow: '#d5b207',
  asin: '#08969b',
  pink: '#C46AAA',
  black: '#000000',
} as const

export interface StatusPillProps {
  readonly title?: ReactNode
  readonly color?: string
  readonly maxWidth?: number | string
  readonly className?: string
  readonly style?: CSSProperties
}

export const StatusPill = memo(function StatusPill({
  title = '',
  color = '#64748b',
  maxWidth = 220,
  className,
  style,
}: StatusPillProps) {
  const isHex =
    typeof color === 'string' && color.startsWith('#') && (color.length === 7 || color.length === 4)
  const backgroundColor = isHex ? `${color}15` : 'rgba(0,0,0,0.04)'

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 9999,
        border: `1px solid ${color}`,
        backgroundColor,
        padding: '2px 10px',
        fontSize: 12,
        fontWeight: 500,
        maxWidth,
        lineHeight: '18px',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span
        style={{
          color,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'inline-block',
        }}
        title={typeof title === 'string' ? title : undefined}
      >
        {title || '-'}
      </span>
    </div>
  )
})
