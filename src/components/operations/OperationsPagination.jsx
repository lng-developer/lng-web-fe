import { FormControl, MenuItem, Pagination, Select, Typography } from '@mui/material'

export default function OperationsPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}) {
  const pageCount = Math.max(Math.ceil((total || 0) / pageSize), 1)

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <Typography variant="body2" className="text-ink-muted">
        {total || 0} records / page {page} of {pageCount}
      </Typography>
      <div className="flex items-center gap-2">
        {onPageSizeChange ? (
          <FormControl size="small">
            <Select
              value={pageSize}
              onChange={(event) => {
                const nextPageSize = Number(event.target.value)
                if (nextPageSize !== pageSize) onPageSizeChange(nextPageSize)
              }}
            >
              {[10, 20, 50, 100].map((size) => (
                <MenuItem key={size} value={size}>
                  {size} / page
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
        <Pagination
          color="primary"
          count={pageCount}
          page={Math.min(page, pageCount)}
          siblingCount={1}
          boundaryCount={1}
          onChange={(_event, value) => {
            if (value !== page) onPageChange(value)
          }}
        />
      </div>
      <div aria-hidden="true" />
    </div>
  )
}
