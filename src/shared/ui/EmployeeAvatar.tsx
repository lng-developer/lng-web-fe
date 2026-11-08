import { useState } from 'react'
import { Avatar, Tooltip, type AvatarProps } from 'antd'

import { AuthenticatedMediaImage } from '@/shared/media'

const AVATAR_PALETTES = [
  { backgroundColor: '#eff6ff', color: '#1d4ed8' }, // blue
  { backgroundColor: '#f0fdf4', color: '#15803d' }, // emerald
  { backgroundColor: '#faf5ff', color: '#7e22ce' }, // purple
  { backgroundColor: '#fff7ed', color: '#c2410c' }, // orange
  { backgroundColor: '#fdf2f8', color: '#be185d' }, // pink
  { backgroundColor: '#f0fdfa', color: '#0f766e' }, // teal
  { backgroundColor: '#fefce8', color: '#a16207' }, // amber
  { backgroundColor: '#f5f3ff', color: '#6d28d9' }, // violet
]

function getAvatarPalette(text: string) {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length]
}

export type EmployeeAvatarProps = Pick<AvatarProps, 'size' | 'className' | 'style' | 'icon'> & {
  name?: string | null
  avatarUrl?: string | null
}

export function EmployeeAvatar({
  name,
  avatarUrl,
  size = 32,
  className,
  style,
  icon,
}: EmployeeAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>()
  const label = name?.trim() || '?'
  const resolvedAvatarUrl = avatarUrl?.endsWith('/default-avatar.jpg') ? null : avatarUrl
  const initials = label
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  const hasImage = Boolean(resolvedAvatarUrl && failedUrl !== resolvedAvatarUrl)
  const isDirectUrl = Boolean(
    resolvedAvatarUrl &&
    (resolvedAvatarUrl.startsWith('data:') ||
      resolvedAvatarUrl.startsWith('blob:') ||
      resolvedAvatarUrl.startsWith('http://') ||
      resolvedAvatarUrl.startsWith('https://')),
  )
  const palette = !hasImage ? getAvatarPalette(label) : undefined

  return (
    <Avatar
      className={className}
      size={size}
      icon={icon}
      style={{
        ...palette,
        ...style,
      }}
      src={
        hasImage ? (
          isDirectUrl ? (
            <img
              alt={label}
              src={resolvedAvatarUrl || undefined}
              onError={() => setFailedUrl(resolvedAvatarUrl)}
              style={{
                objectFit: 'cover',
                imageRendering: '-webkit-optimize-contrast',
                width: '100%',
                height: '100%',
              }}
            />
          ) : (
            <AuthenticatedMediaImage
              alt={label}
              downloadUrl={resolvedAvatarUrl}
              onError={() => setFailedUrl(resolvedAvatarUrl)}
              style={{
                objectFit: 'cover',
                imageRendering: '-webkit-optimize-contrast',
                width: '100%',
                height: '100%',
              }}
            />
          )
        ) : undefined
      }
    >
      {initials || icon}
    </Avatar>
  )
}

export type EmployeeIdentityMode = 'auto' | 'name' | 'code' | 'inline' | 'stacked'

export type EmployeeIdentityProps = {
  name?: string | null
  employeeCode?: string | null
  avatarUrl?: string | null
  size?: number | 'small' | 'default' | 'large'
  className?: string
  style?: React.CSSProperties
  subtitle?: React.ReactNode
  vertical?: boolean
  showCode?: boolean
  mode?: EmployeeIdentityMode
  tooltip?: boolean | string
}

export function EmployeeIdentity({
  name,
  employeeCode,
  avatarUrl,
  size = 32,
  className,
  style,
  subtitle,
  vertical = false,
  showCode = true,
  mode = 'auto',
  tooltip = true,
}: EmployeeIdentityProps) {
  const cleanName = name?.trim() || null
  const cleanCode = employeeCode?.trim() || null
  const avatarSize =
    typeof size === 'number' ? size : size === 'small' ? 24 : size === 'large' ? 40 : 32
  const isSmall = avatarSize <= 24

  const effectiveMode: 'name' | 'code' | 'inline' | 'stacked' = (() => {
    if (mode === 'code') return cleanCode ? 'code' : 'name'
    if (mode === 'name') return 'name'
    if (mode === 'stacked' || vertical || subtitle) return 'stacked'
    if (mode === 'inline') return 'inline'
    if (!showCode || !cleanCode || cleanCode === cleanName) return 'name'
    return 'inline'
  })()

  const avatarLabel = cleanName || cleanCode || '?'
  const avatarGap = isSmall ? 6 : size === 'large' ? 10 : 8
  const codeGap = isSmall ? 5 : 6

  const renderContent = () => {
    if (effectiveMode === 'code') {
      return (
        <div
          className={className}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: avatarGap,
            minWidth: 0,
            maxWidth: '100%',
            ...style,
          }}
        >
          <EmployeeAvatar name={avatarLabel} avatarUrl={avatarUrl} size={avatarSize} />
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: isSmall ? '0 5px' : '1px 6px',
              borderRadius: isSmall ? 3 : 4,
              fontSize: isSmall ? 11 : 12,
              fontWeight: 600,
              background: 'var(--ant-color-fill-secondary)',
              color: 'var(--ant-color-text-secondary)',
              border: '1px solid var(--ant-color-border-secondary)',
              letterSpacing: '0.02em',
              flexShrink: 0,
              lineHeight: isSmall ? '17px' : '19px',
            }}
          >
            {cleanCode || cleanName}
          </span>
        </div>
      )
    }

    if (effectiveMode === 'name') {
      return (
        <div
          className={className}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: avatarGap,
            minWidth: 0,
            maxWidth: '100%',
            ...style,
          }}
        >
          <EmployeeAvatar name={avatarLabel} avatarUrl={avatarUrl} size={avatarSize} />
          <span
            style={{
              fontSize: isSmall ? 13 : 14,
              fontWeight: 500,
              color: 'var(--ant-color-text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {cleanName || cleanCode || '?'}
          </span>
        </div>
      )
    }

    if (effectiveMode === 'stacked') {
      return (
        <div
          className={className}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: avatarGap,
            minWidth: 0,
            maxWidth: '100%',
            ...style,
          }}
        >
          <EmployeeAvatar name={avatarLabel} avatarUrl={avatarUrl} size={avatarSize} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              lineHeight: 1.25,
              gap: 1,
            }}
          >
            <span
              style={{
                fontSize: isSmall ? 13 : 13.5,
                fontWeight: 600,
                color: 'var(--ant-color-text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {cleanName || cleanCode || '?'}
            </span>
            {subtitle ? (
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--ant-color-text-tertiary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {subtitle}
              </div>
            ) : cleanCode && cleanCode !== cleanName ? (
              <span
                style={{
                  fontSize: 11.5,
                  color: 'var(--ant-color-text-secondary)',
                  letterSpacing: '0.01em',
                }}
              >
                {cleanCode}
              </span>
            ) : null}
          </div>
        </div>
      )
    }

    return (
      <div
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: avatarGap,
          minWidth: 0,
          maxWidth: '100%',
          ...style,
        }}
      >
        <EmployeeAvatar name={avatarLabel} avatarUrl={avatarUrl} size={avatarSize} />
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: codeGap,
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              fontSize: isSmall ? 13 : 14,
              fontWeight: 500,
              color: 'var(--ant-color-text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {cleanName || cleanCode || '?'}
          </span>
          {showCode && cleanCode && cleanCode !== cleanName ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: isSmall ? '0 5px' : '1px 6px',
                borderRadius: isSmall ? 3 : 4,
                fontSize: 11,
                fontWeight: 600,
                background: 'var(--ant-color-fill-secondary)',
                color: 'var(--ant-color-text-secondary)',
                border: '1px solid var(--ant-color-border-secondary)',
                letterSpacing: '0.02em',
                flexShrink: 0,
                lineHeight: isSmall ? '17px' : '18px',
              }}
            >
              {cleanCode}
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  const tooltipText =
    typeof tooltip === 'string'
      ? tooltip
      : tooltip
        ? (() => {
            if (cleanName && cleanCode && cleanName !== cleanCode) {
              return `${cleanName} (${cleanCode})`
            }
            return cleanName || cleanCode || ''
          })()
        : ''

  const content = renderContent()
  if (tooltip && tooltipText) {
    return (
      <Tooltip title={tooltipText} mouseEnterDelay={0.35}>
        {content}
      </Tooltip>
    )
  }

  return content
}
