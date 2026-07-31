import type { ReactNode } from 'react'
import type { TableProps } from 'antd'
import { Empty, Table } from 'antd'

import styles from './sharedUi.module.scss'

export type DataTableProps<RecordType extends object> = Pick<
  TableProps<RecordType>,
  'columns' | 'dataSource' | 'loading' | 'onRow' | 'pagination' | 'rowKey' | 'rowSelection'
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
  return (
    <div className={styles.dataTable}>
      {toolbar ? <div className={styles.dataTableToolbar}>{toolbar}</div> : null}
      {error ?? (
        <Table
          {...tableProps}
          locale={{ emptyText: emptyText ?? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      )}
    </div>
  )
}
