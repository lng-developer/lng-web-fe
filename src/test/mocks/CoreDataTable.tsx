import type { Key, ReactNode } from 'react'

import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'

type Column = {
  dataIndex?: string
  render?: (value: unknown, record: Record<string, unknown>) => ReactNode
}

export function CoreDataTable({
  columns = [],
  dataSource = [],
  onRow,
  pagination,
  rowSelection,
  toolbar,
}: {
  columns?: Column[]
  dataSource?: Record<string, unknown>[]
  onRow?: (record: Record<string, unknown>) => { onClick?: () => void }
  pagination?: {
    current?: number
    pageSize?: number
    onChange?: (page: number, pageSize: number) => void
  }
  rowSelection?: {
    selectedRowKeys?: Key[]
    onChange?: (keys: Key[]) => void
    getCheckboxProps?: (record: Record<string, unknown>) => Record<string, unknown>
  }
  toolbar?: ReactNode
}) {
  return (
    <>
      {toolbar}
      {pagination?.onChange ? (
        <button
          type="button"
          aria-label="Page 2"
          onClick={() => pagination.onChange?.(2, pagination.pageSize ?? DEFAULT_PAGE_SIZE)}
        >
          2
        </button>
      ) : null}
      <table>
        <tbody>
          {dataSource.map((record, rowIndex) => (
            <tr key={String(record.id ?? rowIndex)} onClick={onRow?.(record).onClick}>
              {rowSelection
                ? (() => {
                    const props = rowSelection.getCheckboxProps?.(record) ?? {}
                    const id = record.id as Key
                    return (
                      <td>
                        <input
                          type="checkbox"
                          checked={rowSelection.selectedRowKeys?.includes(id) ?? false}
                          onChange={(event) =>
                            rowSelection.onChange?.(event.target.checked ? [id] : [])
                          }
                          {...props}
                        />
                      </td>
                    )
                  })()
                : null}
              {columns.map((column, columnIndex) => (
                <td key={columnIndex}>
                  {column.render
                    ? column.render(column.dataIndex ? record[column.dataIndex] : undefined, record)
                    : column.dataIndex
                      ? String(record[column.dataIndex] ?? '')
                      : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
