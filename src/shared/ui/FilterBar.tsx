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
  bordered = false,
  label,
  children,
  actions,
}: FilterBarProps) {
  return (
    <Flex
      role="search"
      aria-label={label}
      className={[
        styles.filterBar,
        bordered ? styles.filterBarBordered : styles.filterBarBorderless,
      ]
        .filter(Boolean)
        .join(' ')}
      align="center"
      justify="space-between"
      gap={8}
      wrap
    >
      <Flex
        className={[styles.filterBarContent, contentClassName].filter(Boolean).join(' ')}
        role="group"
        aria-label={label}
        align="center"
        gap={8}
        wrap
      >
        {children}
      </Flex>
      {actions ? <div className={styles.filterBarActions}>{actions}</div> : null}
    </Flex>
  )
}
