import type { ReactNode } from 'react'
import { Flex } from 'antd'

export interface PageHeaderProps {
  /** Retained for page call-site compatibility. */
  readonly title: string
  /** Retained for page call-site compatibility. */
  readonly description?: string
  /** Retained for page call-site compatibility. */
  readonly updatedAt?: string
  readonly actions?: ReactNode
}

export function PageHeader({ actions }: PageHeaderProps) {
  return actions ? <Flex justify="flex-end">{actions}</Flex> : null
}
