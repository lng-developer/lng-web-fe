import { Skeleton } from 'antd'

import styles from './sharedUi.module.scss'

export interface LoadingStateProps {
  readonly variant: 'page' | 'card' | 'table'
}

export function LoadingState({ variant }: LoadingStateProps) {
  const rows = variant === 'table' ? 6 : variant === 'page' ? 12 : 3

  return (
    <div className={`${styles.loadingState} ${styles[`loading${variant}`]}`} aria-busy="true">
      <Skeleton active avatar={variant === 'card'} paragraph={{ rows }} />
    </div>
  )
}
