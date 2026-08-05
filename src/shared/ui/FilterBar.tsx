import type { ReactNode } from 'react'
import { Flex } from 'antd'

export interface FilterBarProps {
  readonly contentClassName?: string
  readonly label: string
  readonly children: ReactNode
  readonly actions?: ReactNode
}

export function FilterBar({ contentClassName, label, children, actions }: FilterBarProps) {
  return (
    <Flex role="search" aria-label={label} align="flex-end" justify="space-between" gap={16} wrap>
      <Flex className={contentClassName} align="flex-end" gap={12} wrap>
        {children}
      </Flex>
      {actions}
    </Flex>
  )
}
