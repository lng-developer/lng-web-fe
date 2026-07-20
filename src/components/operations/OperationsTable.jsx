import { Fragment, memo } from 'react'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined'
import { Skeleton, Typography } from '@mui/material'

import {
  operationsTableCellContentClass,
  operationsTableCellPaddingClass,
  operationsTableHeaderClass,
  operationsTableRowClass,
  operationsTableSurfaceClass,
  operationsTextCaptionClass,
  operationsTextStrongClass,
} from './operationsLayout'

function alignClass(align) {
  if (align === 'center') return 'text-center'
  if (align === 'right') return 'text-right'
  return 'text-left'
}

function cellContentAlignClass(align) {
  if (align === 'center') return 'justify-items-center text-center'
  if (align === 'right') return 'justify-items-end text-right'
  return 'justify-items-start text-left'
}

function OperationsTable({
  columns,
  rows,
  getRowKey,
  renderCell,
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription,
  emptyAction,
  sortBy,
  sortOrder = 'desc',
  onSort,
  minWidth = '100%',
  loadingRows = 5,
  getRowClassName,
  renderExpandedRow,
  getRowExpanded,
  getRowCellClassName,
  headerClassName = '',
  bodyClassName = '',
}) {
  return (
    <section className={`${operationsTableSurfaceClass} ${bodyClassName}`}>
      <table className="w-full table-fixed border-collapse" style={{ minWidth }}>
        <colgroup>
          {columns.map((column) => (
            <col key={column.key} style={column.width ? { width: column.width } : undefined} />
          ))}
        </colgroup>
        <thead className={`${operationsTableHeaderClass} ${headerClassName}`}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`h-11 px-4 uppercase text-ink-muted ${operationsTextCaptionClass} ${alignClass(column.align)}`}
              >
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => onSort?.(column.key)}
                    className={`group inline-flex appearance-none items-center gap-1 border-0 bg-transparent p-0 uppercase outline-none transition focus-visible:ring-2 focus-visible:ring-primary/30 ${operationsTextCaptionClass} ${
                      sortBy === column.key
                        ? 'text-primary'
                        : 'text-ink-muted hover:text-ink-strong'
                    }`}
                  >
                    <span>{column.label}</span>
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-full transition ${
                        sortBy === column.key
                          ? 'bg-primary-light text-primary'
                          : 'text-transparent group-hover:text-ink-muted'
                      }`}
                    >
                      {sortOrder === 'asc' ? (
                        <ArrowUpwardIcon sx={{ fontSize: 12 }} />
                      ) : (
                        <ArrowDownwardIcon sx={{ fontSize: 12 }} />
                      )}
                    </span>
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: loadingRows }, (_, index) => (
              <tr key={`loading-${index}`} className="border-t border-border">
                <td colSpan={columns.length} className="px-4 py-1.5">
                  <Skeleton height={46} />
                </td>
              </tr>
            ))
          ) : rows.length ? (
            rows.map((row) => {
              const rowKey = getRowKey(row)
              const expanded = Boolean(getRowExpanded?.(row))

              return (
                <Fragment key={rowKey}>
                  <tr className={`${operationsTableRowClass} ${getRowClassName?.(row) || ''}`}>
                    {columns.map((column) => {
                      const cellPaddingClass =
                        column.cellPaddingClass || operationsTableCellPaddingClass

                      return (
                        <td
                          key={column.key}
                          className={`${cellPaddingClass} align-middle ${alignClass(column.align)} ${getRowCellClassName?.(row, column) || ''}`}
                        >
                          <div
                            className={`${operationsTableCellContentClass} ${cellContentAlignClass(column.align)}`}
                          >
                            {renderCell(row, column)}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                  {expanded && renderExpandedRow ? (
                    <tr className="border-t border-border bg-surface">
                      <td colSpan={columns.length} className="p-0 align-top">
                        {renderExpandedRow(row)}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })
          ) : !loading && !rows.length ? (
            <tr className="border-t border-border">
              <td colSpan={columns.length} className="h-52 px-4 text-center align-middle">
                <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-subtle text-ink-muted">
                  <InboxOutlinedIcon fontSize="small" />
                </span>
                <Typography className={`${operationsTextStrongClass} text-ink-muted`}>
                  {emptyTitle}
                </Typography>
                {emptyDescription ? (
                  <Typography variant="body2" className="mt-1 text-ink-muted">
                    {emptyDescription}
                  </Typography>
                ) : null}
                {emptyAction ? <div className="mt-4">{emptyAction}</div> : null}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  )
}

export default memo(OperationsTable)
