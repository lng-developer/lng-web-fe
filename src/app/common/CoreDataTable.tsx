import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { TableProps } from 'antd'
import { Empty, Table } from 'antd'

import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import styles from '@/shared/ui/sharedUi.module.scss'

import { CommonTablePagination } from './TablePagination'

function getFullRowsHeight(availableHeight: number, rowHeight?: number) {
  // Căn chiều cao theo số dòng trọn vẹn để bảng không cắt ngang một dòng dữ liệu.
  if (!rowHeight || rowHeight <= 0 || availableHeight < rowHeight) return availableHeight

  return Math.floor(availableHeight / rowHeight) * rowHeight
}

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

  const sortableColumns = useMemo(() => {
    // Bổ sung sorter theo mapping server nhưng vẫn giữ nguyên cấu hình cột gốc.
    if (!serverSorting?.enabled || !tableProps.columns) return tableProps.columns

    return tableProps.columns.map((column) => {
      if ('children' in column) return column

      const columnKey =
        column.key != null
          ? String(column.key)
          : typeof column.dataIndex === 'string'
            ? column.dataIndex
            : undefined
      const sortColumn = columnKey ? serverSorting.columns[columnKey] : undefined
      if (!sortColumn) return column

      return {
        ...column,
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
    })
  }, [serverSorting, tableProps.columns])

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
    ...(fillViewport ? { y: viewportScrollY ?? 'calc(100vh - 360px)' } : {}),
    ...tableProps.scroll,
  }

  return (
    <div ref={containerRef} className={tableClassName}>
      {toolbar ? <div className={styles.dataTableToolbar}>{toolbar}</div> : null}

      <div className={styles.dataTableBody}>
        {error ?? (
          <Table
            {...tableProps}
            columns={sortableColumns}
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
