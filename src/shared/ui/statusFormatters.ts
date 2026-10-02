const ACRONYMS = new Set(['PSD', 'QC', 'SKU', 'ASIN', 'CS', 'SLA', 'ID', 'CSV'])

export function humanizeCode(value?: string | null): string {
  if (!value) return '—'
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => {
      const upper = word.toUpperCase()
      if (ACRONYMS.has(upper)) return upper
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}
