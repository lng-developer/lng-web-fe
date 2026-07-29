export function buildMonthColumns(year, month) {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()

  return Array.from({ length: days }, (_value, index) => {
    const day = index + 1
    const date = new Date(Date.UTC(year, month - 1, day))
    return {
      dateKey: date.toISOString().slice(0, 10),
      label: String(day),
      isWeekend: [0, 6].includes(date.getUTCDay()),
      weekday: date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' }),
    }
  })
}

export function mapMatrixRow(row) {
  if (!row) return null

  return {
    profile: row.profile || null,
    cells: Array.isArray(row.cells) ? row.cells : [],
    totals: row.totals || {},
    capabilities: row.capabilities || {},
  }
}
