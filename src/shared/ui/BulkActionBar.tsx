import type { ReactNode } from 'react'
import { Button, Space, Typography } from 'antd'

import styles from './sharedUi.module.scss'

export interface BulkActionBarProps {
  readonly selectedCount: number
  readonly children: ReactNode
  readonly onClear: () => void
}

export function BulkActionBar({ selectedCount, children, onClear }: BulkActionBarProps) {
  if (selectedCount === 0) {
    return null
  }

  return (
    <div className={styles.bulkActionBar}>
      <Typography.Text strong>{selectedCount} selected</Typography.Text>
      <Space>
        {children}
        <Button type="link" onClick={onClear}>
          Clear
        </Button>
      </Space>
    </div>
  )
}
