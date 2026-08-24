import { type ReactNode, useMemo, useState } from 'react'
import type { TableProps } from 'antd'
import { Empty, Table } from 'antd'

import styles from '@/shared/ui/sharedUi.module.scss'

import { CommonTablePagination } from './TablePagination'

export type CoreDataTableProps<RecordType extends object> = Pick<
  TableProps<RecordType>,
  | 'columns'
  | 'className'
  | 'dataSource'
  | 'expandable'
  | 'loading'
  | 'onRow'
  | 'pagination'
  | 'rowKey'
  | 'rowClassName'
  | 'rowSelection'
  | 'scroll'
  | 'size'
> & {
  readonly toolbar?: ReactNode
  readonly emptyText?: ReactNode
  readonly error?: ReactNode
}

export function CoreDataTable<RecordType extends object>({
  toolbar,
  emptyText,
  error,
  ...tableProps
}: CoreDataTableProps<RecordType>) {
  const tableClassName = `${styles.dataTable} ${tableProps.className ?? ''}`.trim()
  const scroll = {
    y: 'calc(100vh - 360px)',
    ...tableProps.scroll,
  }
  const paginationEnabled = tableProps.pagination !== false
  const customPagination =
    paginationEnabled && typeof tableProps.pagination === 'object' ? tableProps.pagination : {}
  const [internalPage, setInternalPage] = useState(customPagination.defaultCurrent ?? 1)
  const [internalPageSize, setInternalPageSize] = useState(
    customPagination.pageSize ?? customPagination.defaultPageSize ?? 20,
  )
  const shouldPageClientSide = paginationEnabled && !customPagination.onChange
  const effectiveCurrent = customPagination.current ?? internalPage
  const effectivePageSize = customPagination.pageSize ?? internalPageSize
  const dataSource = tableProps.dataSource
  const pagedDataSource = useMemo(() => {
    if (!shouldPageClientSide || !Array.isArray(dataSource)) return dataSource
    const start = (effectiveCurrent - 1) * effectivePageSize
    return dataSource.slice(start, start + effectivePageSize)
  }, [dataSource, effectiveCurrent, effectivePageSize, shouldPageClientSide])
  const effectivePagination = paginationEnabled
    ? {
        ...customPagination,
        current: effectiveCurrent,
        pageSize: effectivePageSize,
        total: customPagination.total ?? (Array.isArray(dataSource) ? dataSource.length : 0),
        onChange: (nextPage: number, nextPageSize: number) => {
          setInternalPage(nextPage)
          setInternalPageSize(nextPageSize)
          customPagination.onChange?.(nextPage, nextPageSize)
        },
        onShowSizeChange: (nextPage: number, nextPageSize: number) => {
          setInternalPage(nextPage)
          setInternalPageSize(nextPageSize)
          customPagination.onShowSizeChange?.(nextPage, nextPageSize)
        },
      }
    : undefined

  return (
    <div className={tableClassName}>
      {toolbar ? <div className={styles.dataTableToolbar}>{toolbar}</div> : null}
      {error ?? (
        <Table
          {...tableProps}
          pagination={paginationEnabled ? false : tableProps.pagination}
          dataSource={pagedDataSource}
          scroll={scroll}
          locale={{ emptyText: emptyText ?? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      )}
      {effectivePagination ? <CommonTablePagination pagination={effectivePagination} /> : null}
    </div>
  )
}
