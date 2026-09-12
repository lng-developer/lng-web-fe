import { type Key, type ReactNode,useState } from 'react'

import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'

type Column = {
  dataIndex?: string
  render?: (value: unknown, record: Record<string, unknown>) => ReactNode
}

type Expandable = {
  expandedRowRender?: (record: Record<string, unknown>) => ReactNode
  expandIcon?: (props: {
    expanded: boolean
    onExpand: (record: Record<string, unknown>) => void
    record: Record<string, unknown>
  }) => ReactNode
}

export function CoreDataTable({
  columns = [],
  dataSource = [],
  onRow,
  pagination,
  rowSelection,
  toolbar,
  expandable,
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
  expandable?: Expandable
}) {
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([])
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
            <>
              <tr key={String(record.id ?? rowIndex)} onClick={onRow?.(record).onClick}>
                {expandable ? (
                  <td>
                    {expandable.expandIcon?.({
                      expanded: expandedKeys.includes(record.id as Key),
                      onExpand: (nextRecord) =>
                        setExpandedKeys((keys) =>
                          keys.includes(nextRecord.id as Key)
                            ? keys.filter((key) => key !== nextRecord.id)
                            : [...keys, nextRecord.id as Key],
                        ),
                      record,
                    })}
                  </td>
                ) : null}
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
              {expandedKeys.includes(record.id as Key) ? (
                <tr key={`${String(record.id ?? rowIndex)}-expanded`}>
                  <td colSpan={columns.length + (rowSelection ? 1 : 0) + 1}>
                    {expandable?.expandedRowRender?.(record)}
                  </td>
                </tr>
              ) : null}
            </>
          ))}
        </tbody>
      </table>
    </>
  )
}
