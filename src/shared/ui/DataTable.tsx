import type { ReactNode } from 'react'
import type { TableProps } from 'antd'
import { Empty, Table } from 'antd'

import styles from './sharedUi.module.scss'

export type DataTableProps<RecordType extends object> = Pick<
  TableProps<RecordType>,
  | 'columns'
  | 'className'
  | 'dataSource'
  | 'expandable'
  | 'loading'
  | 'onRow'
  | 'pagination'
  | 'rowKey'
  | 'rowSelection'
  | 'scroll'
> & {
  readonly toolbar?: ReactNode
  readonly emptyText?: ReactNode
  readonly error?: ReactNode
}

export function DataTable<RecordType extends object>({
  toolbar,
  emptyText,
  error,
  ...tableProps
}: DataTableProps<RecordType>) {
  const tableClassName = `${styles.dataTable} ${tableProps.className ?? ''}`.trim()
  const scroll = {
    y: 'calc(100vh - 360px)',
    ...tableProps.scroll,
  }

  return (
    <div className={tableClassName}>
      {toolbar ? <div className={styles.dataTableToolbar}>{toolbar}</div> : null}
      {error ?? (
        <Table
          {...tableProps}
          scroll={scroll}
          locale={{ emptyText: emptyText ?? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      )}
    </div>
  )
}
