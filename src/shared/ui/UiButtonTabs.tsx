import type { ReactNode } from 'react'
import { Button } from 'antd'

import styles from './sharedUi.module.scss'

export type UiButtonTabItem<T extends string> = {
  value: T
  label: ReactNode
}

export function UiButtonTabs<T extends string>({
  value,
  items,
  onChange,
  className,
}: {
  value: T
  items: UiButtonTabItem<T>[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={[styles.uiButtonTabs, className].filter(Boolean).join(' ')}>
      {items.map((item) => (
        <Button
          key={item.value}
          type={value === item.value ? 'primary' : 'default'}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}
