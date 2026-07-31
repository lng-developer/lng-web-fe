import { Tabs, type TabsProps } from 'antd'

import styles from './sharedUi.module.scss'

export type UiTabsProps = TabsProps

export function UiTabs({ className, ...props }: UiTabsProps) {
  return <Tabs {...props} className={[styles.uiTabs, className].filter(Boolean).join(' ')} />
}
