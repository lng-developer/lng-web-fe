import type { ReactNode } from 'react'
import { Card, Typography } from 'antd'

import styles from './sharedUi.module.scss'

export interface SectionCardProps {
  readonly title?: ReactNode
  readonly children: ReactNode
  readonly selected?: boolean
  readonly extra?: ReactNode
  readonly className?: string
}

export function SectionCard({
  title,
  children,
  selected = false,
  extra,
  className,
}: SectionCardProps) {
  return (
    <Card
      title={
        typeof title === 'string' ? <Typography.Title level={2}>{title}</Typography.Title> : title
      }
      extra={extra}
      className={`${styles.sectionCard} ${selected ? styles.selectedCard : ''} ${className ?? ''}`}
      variant="outlined"
    >
      {children}
    </Card>
  )
}
