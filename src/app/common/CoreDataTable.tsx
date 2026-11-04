import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { TableProps } from 'antd'
import { Empty, Table } from 'antd'

import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import styles from '@/shared/ui/sharedUi.module.scss'

import { CommonTablePagination } from './TablePagination'

export type ServerSortColumn = {
  asc?: string
  desc?: string
}

export type CoreDataTableServerSorting = {
  enabled: boolean
  value?: string
  columns: Record<string, ServerSortColumn>
  onChange: (value?: string) => void
}

export type CoreDataTableProps<RecordType extends object> = Pick<
  TableProps<RecordType>,
  | 'bordered'
  | 'columns'
  | 'className'
  | 'dataSource'
  | 'expandable'
  | 'loading'
  | 'onRow'
  | 'pagination'
  | 'onChange'
  | 'rowKey'
  | 'rowClassName'
  | 'rowSelection'
  | 'scroll'
  | 'size'
  | 'sticky'
  | 'tableLayout'
  | 'virtual'
> & {
  readonly toolbar?: ReactNode
  readonly emptyText?: ReactNode
  readonly error?: ReactNode

  // Tự động kéo table + pagination kín viewport
  readonly fillViewport?: boolean

  // Khoảng cách muốn chừa ở đáy
  readonly viewportBottomGap?: number

  // Đẩy thanh pagination xuống đáy mà không thay đổi chiều cao phần bảng
  readonly paginationAtBottom?: boolean
  readonly serverSorting?: CoreDataTableServerSorting
}

export function CoreDataTable<RecordType extends object>({
  toolbar,
  emptyText,
  error,
  fillViewport = false,
  viewportBottomGap = 0,
  paginationAtBottom = false,
  serverSorting,
  ...tableProps
}: CoreDataTableProps<RecordType>) {
  // Refs phục vụ việc đo chiều cao viewport và neo thanh phân trang.
  const containerRef = useRef<HTMLDivElement>(null)
  const paginationRef = useRef<HTMLDivElement>(null)

  const [viewportScrollY, setViewportScrollY] = useState<number>()

  const tableClassName = [
    styles.dataTable,
    fillViewport ? styles.dataTableFillViewport : undefined,
    paginationAtBottom || fillViewport ? styles.dataTablePaginationAtBottom : undefined,
    tableProps.className,
  ]
    .filter(Boolean)
    .join(' ')

  const paginationEnabled = tableProps.pagination !== false

  const customPagination =
    paginationEnabled && typeof tableProps.pagination === 'object' ? tableProps.pagination : {}

  const [internalPage, setInternalPage] = useState(customPagination.defaultCurrent ?? 1)

  const [internalPageSize, setInternalPageSize] = useState(
    customPagination.pageSize ?? customPagination.defaultPageSize ?? DEFAULT_PAGE_SIZE,
  )

  const shouldPageClientSide = paginationEnabled && !customPagination.onChange

  const effectiveCurrent = customPagination.current ?? internalPage

  const effectivePageSize = customPagination.pageSize ?? internalPageSize

  const processedColumns = useMemo(() => {
    if (!tableProps.columns || tableProps.columns.length === 0) return tableProps.columns

    const mapColumn = (
      column: NonNullable<TableProps<RecordType>['columns']>[number],
    ): NonNullable<TableProps<RecordType>['columns']>[number] => {
      if ('children' in column) {
        return {
          ...column,
          align: column.align ?? 'center',
          children: column.children?.map(mapColumn),
        }
      }

      const targetAlign = column.align ?? 'center'
      const isExplicitRight = column.align === 'right'
      const isExplicitLeft = column.align === 'left'
      const originalRender = column.render

      let nextCol = {
        ...column,
        align: targetAlign,
        render: (value: unknown, record: RecordType, index: number) => {
          if (!originalRender) {
            if (value == null || value === '' || isExplicitRight || isExplicitLeft) {
              return value as ReactNode
            }
            return <span className={styles.cellContentBlock}>{value as ReactNode}</span>
          }

          const rendered = originalRender(value, record, index)
          if (rendered == null || rendered === '' || isExplicitRight || isExplicitLeft) {
            return rendered as ReactNode
          }

          if (
            typeof rendered === 'object' &&
            rendered !== null &&
            'children' in rendered &&
            'props' in rendered
          ) {
            return {
              ...rendered,
              children: (
                <span className={styles.cellContentBlock}>{rendered.children as ReactNode}</span>
              ),
            }
          }

          return <span className={styles.cellContentBlock}>{rendered as ReactNode}</span>
        },
      }

      if (serverSorting?.enabled) {
        const columnKey =
          column.key != null
            ? String(column.key)
            : 'dataIndex' in column && typeof column.dataIndex === 'string'
              ? column.dataIndex
              : undefined
        const sortColumn = columnKey ? serverSorting.columns[columnKey] : undefined
        if (sortColumn) {
          nextCol = {
            ...nextCol,
            sorter: true,
            sortDirections: [
              ...(sortColumn.desc ? (['descend'] as const) : []),
              ...(sortColumn.asc ? (['ascend'] as const) : []),
              null,
            ],
            sortOrder:
              serverSorting.value === sortColumn.asc
                ? ('ascend' as const)
                : serverSorting.value === sortColumn.desc
                  ? ('descend' as const)
                  : undefined,
          }
        }
      }

      return nextCol
    }

    return tableProps.columns.map(mapColumn)
  }, [serverSorting, tableProps.columns])

  const defaultScrollX = useMemo(() => {
    if (tableProps.scroll?.x && tableProps.scroll.x !== '100%') {
      return tableProps.scroll.x
    }
    if (!tableProps.columns || tableProps.columns.length === 0) {
      return tableProps.scroll?.x
    }
    let sum = 0
    for (const col of tableProps.columns) {
      if ('width' in col && typeof col.width === 'number') {
        sum += col.width
      } else if ('width' in col && typeof col.width === 'string' && col.width.endsWith('px')) {
        sum += Number.parseFloat(col.width) || 120
      } else {
        sum += 120
      }
    }
    if (tableProps.rowSelection) {
      sum += 48
    }
    return sum > 0 ? Math.max(sum, 1000) : 'max-content'
  }, [tableProps.columns, tableProps.rowSelection, tableProps.scroll])

  const handleTableChange: TableProps<RecordType>['onChange'] = (
    pagination,
    filters,
    sorter,
    extra,
  ) => {
    // Đổi sorter của Ant Design thành mã sort mà backend yêu cầu.
    if (serverSorting?.enabled) {
      const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter
      const columnKey = activeSorter?.columnKey ?? activeSorter?.field
      const sortColumn = columnKey != null ? serverSorting.columns[String(columnKey)] : undefined
      const nextValue =
        sortColumn && activeSorter?.order === 'ascend'
          ? sortColumn.asc
          : sortColumn && activeSorter?.order === 'descend'
            ? sortColumn.desc
            : undefined
      serverSorting.onChange(nextValue)
    }
    tableProps.onChange?.(pagination, filters, sorter, extra)
  }

  useLayoutEffect(() => {
    const tableBody = containerRef.current?.querySelector<HTMLElement>('.ant-table-body')
    if (tableBody) tableBody.scrollTop = 0
  }, [effectiveCurrent])

  const dataSource = tableProps.dataSource
  const dataSourceLength = Array.isArray(dataSource) ? dataSource.length : 0

  const pagedDataSource = useMemo(() => {
    // Chỉ cắt dữ liệu ở client khi pagination không có onChange từ server.
    if (!shouldPageClientSide || !Array.isArray(dataSource)) {
      return dataSource
    }

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

  useLayoutEffect(() => {
    // Đo lại phần bảng còn lại khi bật chế độ lấp đầy viewport.
    if (!fillViewport) return

    const calculateHeight = () => {
      const container = containerRef.current
      const tableHeader = container?.querySelector<HTMLElement>('.ant-table-thead')

      if (!container || !tableHeader) return

      const headerBottom = tableHeader.getBoundingClientRect().bottom

      const paginationHeight = paginationRef.current?.getBoundingClientRect().height ?? 0

      const main = container.closest('main')

      const mainPaddingBottom = main
        ? Number.parseFloat(window.getComputedStyle(main).paddingBottom) || 0
        : 0

      const availableHeight =
        window.innerHeight - headerBottom - paginationHeight - mainPaddingBottom - viewportBottomGap

      const nextHeight = Math.max(120, Math.floor(availableHeight))

      setViewportScrollY((current) => (current === nextHeight ? current : nextHeight))
    }

    const frameId = requestAnimationFrame(calculateHeight)

    const resizeObserver = new ResizeObserver(calculateHeight)

    if (paginationRef.current) {
      resizeObserver.observe(paginationRef.current)
    }
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    window.addEventListener('resize', calculateHeight)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', calculateHeight)
    }
  }, [dataSourceLength, fillViewport, viewportBottomGap])

  const scroll = {
    ...(fillViewport && dataSourceLength > 0
      ? { y: viewportScrollY ?? 'calc(100vh - 360px)' }
      : {}),
    ...tableProps.scroll,
    ...(defaultScrollX ? { x: defaultScrollX } : {}),
  }

  return (
    <div ref={containerRef} className={tableClassName}>
      {toolbar ? <div className={styles.dataTableToolbar}>{toolbar}</div> : null}

      <div className={styles.dataTableBody}>
        {error ?? (
          <Table
            {...tableProps}
            tableLayout={tableProps.tableLayout ?? 'fixed'}
            columns={processedColumns}
            onChange={serverSorting?.enabled ? handleTableChange : tableProps.onChange}
            pagination={paginationEnabled ? false : tableProps.pagination}
            dataSource={pagedDataSource}
            scroll={scroll}
            locale={{
              emptyText: emptyText ?? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />,
            }}
          />
        )}
      </div>

      {effectivePagination ? (
        <div ref={paginationRef} className={styles.dataTablePaginationDock}>
          <CommonTablePagination pagination={effectivePagination} />
        </div>
      ) : null}
    </div>
  )
}
