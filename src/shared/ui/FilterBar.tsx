import type { ReactNode } from 'react'
import { Flex } from 'antd'

import styles from './sharedUi.module.scss'

export interface FilterBarProps {
  readonly contentClassName?: string
  readonly bordered?: boolean
  readonly label: string
  readonly children: ReactNode
  readonly actions?: ReactNode
}

export function FilterBar({
  contentClassName,
  bordered = true,
  label,
  children,
  actions,
}: FilterBarProps) {
  return (
    <Flex
      role="search"
      aria-label={label}
      className={[styles.filterBar, !bordered && styles.filterBarBorderless]
        .filter(Boolean)
        .join(' ')}
      align="flex-end"
      justify="space-between"
      gap={16}
      wrap
    >
      <Flex
        className={[styles.filterBarContent, contentClassName].filter(Boolean).join(' ')}
        role="group"
        aria-label={label}
        align="flex-end"
        gap={12}
        wrap
      >
        {children}
      </Flex>
      {actions ? <div className={styles.filterBarActions}>{actions}</div> : null}
    </Flex>
  )
}
