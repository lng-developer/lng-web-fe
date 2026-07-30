import type { ReactNode } from 'react'
import { Empty } from 'antd'

export interface EmptyStateProps {
  readonly title: string
  readonly description?: string
  readonly action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Empty
      description={
        <>
          <strong>{title}</strong>
          {description && <div>{description}</div>}
        </>
      }
    >
      {action}
    </Empty>
  )
}
