export function getPaginationRange({ page, pageSize, total }) {
  const safeTotal = Math.max(Number(total) || 0, 0)
  if (safeTotal === 0) return { from: 0, to: 0 }

  const safePageSize = Math.max(Number(pageSize) || 1, 1)
  const totalPages = Math.max(Math.ceil(safeTotal / safePageSize), 1)
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages)

  return {
    from: (safePage - 1) * safePageSize + 1,
    to: Math.min(safePage * safePageSize, safeTotal),
  }
}
