export const initialResolveQueueState = {
  preview: null,
  resolvePage: 0,
  resolveRowsPerPage: 10,
  resolveSearch: '',
  selectedRow: null,
}

function getSearchText(value) {
  return Array.isArray(value) ? value.join(' ') : String(value || '')
}

export function filterResolveQueueRows(rows, search) {
  const needle = search.trim().toLowerCase()
  if (!needle) return rows

  return rows.filter((row) =>
    [
      row.itemLabel,
      row.orderLabel,
      row.originalSku,
      row.canonicalSku,
      row.configCode,
      row.blockingReasons,
      row.recommendedFixes,
    ]
      .map(getSearchText)
      .join(' ')
      .toLowerCase()
      .includes(needle),
  )
}

export function resolveQueueReducer(state, action) {
  switch (action.type) {
    case 'select-row':
      return { ...state, preview: null, selectedRow: action.row }
    case 'set-search':
      return { ...state, resolvePage: 0, resolveSearch: action.search }
    case 'set-page':
      return { ...state, resolvePage: action.page }
    case 'set-rows-per-page':
      return { ...state, resolvePage: 0, resolveRowsPerPage: action.rowsPerPage }
    case 'set-preview':
      return { ...state, preview: action.preview }
    default:
      return state
  }
}
