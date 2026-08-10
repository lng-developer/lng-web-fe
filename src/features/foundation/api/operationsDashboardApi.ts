type TrendBucket = { label?: unknown; value?: unknown; count?: unknown; total?: unknown }

export type OperationsDashboardTrendSeries = Array<{
  label: string
  value: number
}>

type OperationsDashboardTrendSeriesPayload = {
  line?: unknown
  trend?: unknown
  series?: unknown
  data?: unknown
  donut?: unknown
  composition?: unknown
  points?: unknown
}

export type OperationsDashboardTrendPayload = {
  generatedAt?: string
  scope?: string
  windowDays?: number
  granularity?: 'hour' | 'day'
  range?: { from: string; to: string }
  orders?: OperationsDashboardTrendSeriesPayload
  mapping?: OperationsDashboardTrendSeriesPayload
  design?: OperationsDashboardTrendSeriesPayload
  production?: OperationsDashboardTrendSeriesPayload
  hr?: OperationsDashboardTrendSeriesPayload
  modules?: {
    orders?: OperationsDashboardTrendSeriesPayload
    mapping?: OperationsDashboardTrendSeriesPayload
    design?: OperationsDashboardTrendSeriesPayload
    production?: OperationsDashboardTrendSeriesPayload
    hr?: OperationsDashboardTrendSeriesPayload
  }
}

const toNumber = (value: unknown) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

export const toTrendSeries = (value: unknown): OperationsDashboardTrendSeries => {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const payload = item as Record<string, unknown>
      const bucket = payload as TrendBucket

      const label =
        typeof bucket.label === 'string'
          ? bucket.label
          : typeof payload.name === 'string'
            ? payload.name
            : typeof payload.date === 'string'
              ? payload.date
              : typeof payload.timestamp === 'string'
                ? payload.timestamp
                : ''

      if (!label) return null

      const point = bucket.value ?? bucket.count ?? bucket.total
      const numericValue = toNumber(point)

      return { label, value: numericValue }
    })
    .filter((item): item is { label: string; value: number } => Boolean(item))
}
