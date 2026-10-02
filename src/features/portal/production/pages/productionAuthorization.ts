export function isForbiddenProductionError(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status === 403
}
