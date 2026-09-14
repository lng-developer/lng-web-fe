import type { ReactNode } from 'react'

import styles from '../pages/MappingWorkspacePage.module.scss'

export interface MappingTabLabelProps {
  readonly label: string
  readonly step?: number
  readonly icon?: ReactNode
  readonly count?: number
  readonly active?: boolean
}

export function MappingTabLabel({ label, step, icon, count, active }: MappingTabLabelProps) {
  return (
    <span className={styles.tabLabel}>
      {typeof step === 'number' ? (
        <span aria-hidden="true" className={active ? styles.tabStepActive : styles.tabStep}>
          {step}
        </span>
      ) : null}
      {icon ? (
        <span aria-hidden="true" className={styles.tabIcon}>
          {icon}
        </span>
      ) : null}
      <span className={styles.tabText}>{label}</span>
      {typeof count === 'number' && count > 0 ? (
        <span
          aria-hidden="true"
          className={active ? styles.tabCountBadgeActive : styles.tabCountBadge}
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </span>
  )
}
