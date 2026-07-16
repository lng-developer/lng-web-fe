import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import { Skeleton, Typography } from '@mui/material'

function alignClass(align) {
  if (align === 'center') return 'text-center'
  if (align === 'right') return 'text-right'
  return 'text-left'
}

export default function OperationsTable({
  columns,
  rows,
  getRowKey,
  renderCell,
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription,
  sortBy,
  sortOrder = 'desc',
  onSort,
  minWidth = '100%',
  loadingRows = 5,
  getRowClassName,
}) {
  if (loading) {
    return (
      <div className="h-full overflow-hidden bg-surface py-2">
        {Array.from({ length: loadingRows }, (_, index) => (
          <Skeleton key={index} height={58} />
        ))}
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="h-full bg-surface py-8 text-center">
        <Typography className="font-semibold text-ink-strong">{emptyTitle}</Typography>
        {emptyDescription ? (
          <Typography variant="body2" className="mt-1 text-ink-muted">
            {emptyDescription}
          </Typography>
        ) : null}
      </div>
    )
  }

  return (
    <section className="h-full overflow-auto bg-surface">
      <table className="w-full table-fixed border-collapse" style={{ minWidth }}>
        <colgroup>
          {columns.map((column) => (
            <col key={column.key} style={column.width ? { width: column.width } : undefined} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-surface-subtle">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`h-11 px-4 text-xs font-semibold uppercase text-ink-muted ${alignClass(column.align)}`}
              >
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => onSort?.(column.key)}
                    className={`group inline-flex appearance-none items-center gap-1 border-0 bg-transparent p-0 font-semibold uppercase outline-none transition focus-visible:ring-2 focus-visible:ring-primary/30 ${
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
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className={`border-t border-border hover:bg-surface-subtle ${getRowClassName?.(row) || ''}`}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 align-middle ${alignClass(column.align)}`}
                >
                  {renderCell(row, column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
