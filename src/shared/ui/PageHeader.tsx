import type { ReactNode } from 'react'
import { Typography } from 'antd'

export interface PageHeaderProps {
  /** Retained for page call-site compatibility. */
  readonly title: string
  /** Retained for page call-site compatibility. */
  readonly description?: string
  /** Retained for page call-site compatibility. */
  readonly updatedAt?: string
  readonly actions?: ReactNode
}

export function PageHeader({ title, description, updatedAt, actions }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '1px solid var(--ant-color-border-secondary)',
        paddingBottom: 16,
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16,
      }}
    >
      <div>
        <Typography.Title
          level={2}
          style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}
        >
          {title}
        </Typography.Title>
        {(description || updatedAt) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 6,
              flexWrap: 'wrap',
            }}
          >
            {description && (
              <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                {description}
              </Typography.Text>
            )}
            {description && updatedAt && (
              <span style={{ color: 'var(--ant-color-text-quaternary)' }}>|</span>
            )}
            {updatedAt && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Cập nhật lúc: {new Date(updatedAt).toLocaleString()}
              </Typography.Text>
            )}
          </div>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          {actions}
        </div>
      )}
    </div>
  )
}
