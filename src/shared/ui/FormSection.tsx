import type { ReactNode } from 'react'
import { Divider } from 'antd'

import styles from './sharedUi.module.scss'

export function FormSection({
  title,
  children,
}: {
  readonly title: ReactNode
  readonly children: ReactNode
}) {
  return (
    <>
      <Divider plain className={styles.formSectionDivider}>
        {title}
      </Divider>
      <div className={styles.formSectionGrid}>{children}</div>
    </>
  )
}

export function FormSectionFull({ children }: { readonly children: ReactNode }) {
  return <div className={styles.formSectionFull}>{children}</div>
}
