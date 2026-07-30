import type { ReactNode } from 'react'
import { Flex } from 'antd'

export interface FilterBarProps {
  readonly label: string
  readonly children: ReactNode
  readonly actions?: ReactNode
}

export function FilterBar({ label, children, actions }: FilterBarProps) {
  return (
    <Flex role="search" aria-label={label} align="flex-end" justify="space-between" gap={16} wrap>
      <Flex align="flex-end" gap={12} wrap>
        {children}
      </Flex>
      {actions}
    </Flex>
  )
}
