import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

  // Tự động kéo table + pagination kín viewport
  readonly fillViewport?: boolean

  // Khoảng cách muốn chừa ở đáy
  readonly viewportBottomGap?: number
}

export function CoreDataTable<RecordType extends object>({
  toolbar,
  emptyText,
  error,
  fillViewport = false,
  viewportBottomGap = 0,
  ...tableProps
}: CoreDataTableProps<RecordType>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const paginationRef = useRef<HTMLDivElement>(null)

  const [viewportScrollY, setViewportScrollY] = useState<number>()

  const tableClassName = [
    styles.dataTable,
    fillViewport ? styles.dataTableFillViewport : undefined,
    tableProps.className,
  ]
    .filter(Boolean)
    .join(' ')

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

    window.addEventListener('resize', calculateHeight)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', calculateHeight)
    }
  }, [fillViewport, viewportBottomGap])

  const scroll = {
    y: fillViewport ? (viewportScrollY ?? 'calc(100vh - 360px)') : 'calc(100vh - 360px)',
    ...tableProps.scroll,
  }

  return (
    <div ref={containerRef} className={tableClassName}>
      {toolbar ? <div className={styles.dataTableToolbar}>{toolbar}</div> : null}

      <div className={styles.dataTableBody}>
        {error ?? (
          <Table
            {...tableProps}
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
