import { Tag } from 'antd'

export interface ExtensionPlatformBadgeProps {
  readonly platform?: 'AMAZON' | 'ETSY' | string | null
}

export function ExtensionPlatformBadge({ platform }: ExtensionPlatformBadgeProps) {
  const normalized = platform?.toUpperCase()
  if (normalized === 'ETSY') {
    return <Tag color="volcano">Etsy</Tag>
  }
  if (normalized === 'AMAZON') {
    return <Tag color="orange">Amazon</Tag>
  }
  return <Tag>Multi-platform</Tag>
}
