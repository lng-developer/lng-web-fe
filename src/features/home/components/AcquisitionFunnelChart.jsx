import { buildAcquisitionFunnelRows, getSalesChannelLabel } from '../utils/commercialDashboard'

function formatNumber(value, language) {
  return new Intl.NumberFormat(language).format(value)
}

function formatRate(value, language) {
  return value === null
    ? '-'
    : new Intl.NumberFormat(language, { maximumFractionDigits: 1, style: 'percent' }).format(
        value / 10000,
      )
}

export default function AcquisitionFunnelChart({ labels, language, rows }) {
  return (
    <section className="h-full rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3 text-sm font-semibold text-ink-strong">
        {labels.title}
      </div>
      <div className="space-y-4 px-4 py-4">
        {buildAcquisitionFunnelRows(rows).map((row) => {
          const channelLabel = getSalesChannelLabel(row.salesChannelCode, labels.unknownChannel)
          const stages = [
            { className: 'fill-primary', ratio: row.ratios.impressions },
            { className: 'fill-warning', ratio: row.ratios.clicks },
            { className: 'fill-success', ratio: row.ratios.orders },
          ]
          const tooltip = `${channelLabel}: ${labels.impressions}: ${formatNumber(row.impressions, language)}; ${labels.clicks}: ${formatNumber(row.clicks, language)}; ${labels.orders}: ${formatNumber(row.attributedOrdersCount, language)}; ${labels.ctr}: ${formatRate(row.ctrBps, language)}; ${labels.conversion}: ${formatRate(row.conversionBps, language)}`
          let offset = 0

          return (
            <div key={row.salesChannelCode}>
              <div className="mb-1 text-xs font-medium text-ink-strong">{channelLabel}</div>
              <svg
                aria-label={tooltip}
                className="h-3 w-full bg-surface-subtle"
                role="img"
                viewBox="0 0 100 12"
              >
                <title>{tooltip}</title>
                {stages.map((stage) => {
                  const x = offset
                  offset += stage.ratio
                  return (
                    <rect
                      className={stage.className}
                      height="12"
                      key={stage.className}
                      width={stage.ratio}
                      x={x}
                    />
                  )
                })}
              </svg>
            </div>
          )
        })}
      </div>
    </section>
  )
}
