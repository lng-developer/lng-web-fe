export function deepMerge<T extends Record<string, unknown>>(
  ...objects: Array<Record<string, unknown> | undefined>
): T {
  const result: Record<string, unknown> = {}
  for (const obj of objects) {
    if (!obj) continue
    for (const key of Object.keys(obj)) {
      const val = obj[key]
      const existing = result[key]
      if (
        val &&
        typeof val === 'object' &&
        !Array.isArray(val) &&
        existing &&
        typeof existing === 'object' &&
        !Array.isArray(existing)
      ) {
        result[key] = deepMerge(existing as Record<string, unknown>, val as Record<string, unknown>)
      } else {
        result[key] = val
      }
    }
  }
  return result as T
}
