import type { ReactNode } from 'react'
import { Typography } from 'antd'

import styles from './sharedUi.module.scss'

export interface PageHeaderProps {
  /** Retained for page call-site compatibility. */
  readonly title: string
  /** Retained for page call-site compatibility. */
  readonly description?: string
  /** Retained for page call-site compatibility. */
  readonly updatedAt?: string
  readonly actions?: ReactNode
}

export function PageHeader({ title, description, updatedAt, actions }: PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderMain}>
        <Typography.Title level={2} className={styles.pageHeaderTitle}>
          {title}
        </Typography.Title>
        {(description || updatedAt) && (
          <div className={styles.pageHeaderMeta}>
            {description && <Typography.Text type="secondary">{description}</Typography.Text>}
            {description && updatedAt && <span aria-hidden="true">|</span>}
            {updatedAt && (
              <Typography.Text type="secondary">
                Cập nhật lúc: {new Date(updatedAt).toLocaleString()}
              </Typography.Text>
            )}
          </div>
        )}
      </div>
      {actions && <div className={styles.pageHeaderActions}>{actions}</div>}
    </header>
  )
}
