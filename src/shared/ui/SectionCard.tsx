import type { ReactNode } from 'react'
import { Card, Typography } from 'antd'

import styles from './sharedUi.module.scss'

export interface SectionCardProps {
  readonly title?: string
  readonly children: ReactNode
  readonly selected?: boolean
}

export function SectionCard({ title, children, selected = false }: SectionCardProps) {
  return (
    <Card
      title={title ? <Typography.Title level={2}>{title}</Typography.Title> : undefined}
      className={selected ? styles.selectedCard : undefined}
      variant="outlined"
    >
      {children}
    </Card>
  )
}
