import type { ReactNode } from 'react'

import styles from './sharedUi.module.scss'

type UiTabLabelProps = {
  readonly children: ReactNode
  readonly count?: number
  readonly active?: boolean
}

export function UiTabLabel({ children, count, active }: UiTabLabelProps) {
  return (
    <span className={styles.tabLabel}>
      <span>{children}</span>
      {typeof count === 'number' ? (
        <span className={active ? styles.tabLabelBadgeActive : styles.tabLabelBadge}>{count}</span>
      ) : null}
    </span>
  )
}
