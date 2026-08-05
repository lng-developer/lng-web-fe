import type { ReactNode } from 'react'
import { CheckCircleOutlined, ExclamationCircleOutlined, WarningOutlined } from '@ant-design/icons'

import styles from './sharedUi.module.scss'

export interface FeedbackAlertProps {
  readonly type: 'success' | 'warning' | 'error'
  readonly title: string
  readonly description?: string
  readonly action?: ReactNode
}

export function FeedbackAlert({ type, title, description, action }: FeedbackAlertProps) {
  const Icon =
    type === 'success'
      ? CheckCircleOutlined
      : type === 'warning'
        ? WarningOutlined
        : ExclamationCircleOutlined

  return (
    <div className={`${styles.feedbackAlert} ${styles[type]}`} role="alert">
      <Icon className={styles.feedbackIcon} />
      <div className={styles.feedbackContent}>
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
      </div>
      {action ? <div className={styles.feedbackAction}>{action}</div> : null}
    </div>
  )
}
