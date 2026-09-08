export function getFullRowsHeight(availableHeight: number, rowHeight?: number) {
  if (!rowHeight || rowHeight <= 0 || availableHeight < rowHeight) return availableHeight

  return Math.floor(availableHeight / rowHeight) * rowHeight
}
