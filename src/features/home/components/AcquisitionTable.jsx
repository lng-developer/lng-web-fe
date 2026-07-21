import { formatCurrency } from '@/utils/format'

function money(value, currency, language) {
  return formatCurrency(Number(value || 0) / 100, language, currency || 'USD')
}

function percent(value) {
  return value === null || value === undefined ? '-' : `${(Number(value) / 100).toFixed(1)}%`
}

function ratio(value) {
  return value === null || value === undefined ? '-' : `${Number(value).toFixed(2)}x`
}

export default function AcquisitionTable({ labels, language, rows }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
      <table className="w-full min-w-[700px] border-collapse text-sm">
        <thead className="bg-surface-subtle text-left text-xs font-semibold uppercase text-ink-muted">
          <tr>
            <th className="px-4 py-3">{labels.channel}</th>
            <th className="px-4 py-3 text-right">{labels.spend}</th>
            <th className="px-4 py-3 text-right">{labels.newBuyers}</th>
            <th className="px-4 py-3 text-right">{labels.cpa}</th>
            <th className="px-4 py-3 text-right">{labels.ctr}</th>
            <th className="px-4 py-3 text-right">{labels.conversion}</th>
            <th className="px-4 py-3 text-right">{labels.roas}</th>
            <th className="px-4 py-3 text-right">{labels.sales}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length ? (
            rows.map((row) => (
              <tr
                key={`${row.salesChannelCode}-${row.marketplaceCode}-${row.currency}`}
                className="transition-colors hover:bg-surface-subtle"
              >
                <td className="px-4 py-3 font-medium text-ink-strong">
                  {row.salesChannelCode}
                </td>
                <td className="px-4 py-3 text-right text-ink-secondary">
                  {money(row.spendAmount, row.currency, language)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-ink-strong">
                  {row.newBuyerCount}
                </td>
                <td className="px-4 py-3 text-right text-ink-secondary">
                  {row.cpaAmount === null ? '-' : money(row.cpaAmount, row.currency, language)}
                </td>
                <td className="px-4 py-3 text-right text-ink-secondary">{percent(row.ctrBps)}</td>
                <td className="px-4 py-3 text-right text-ink-secondary">
                  {percent(row.conversionBps)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-ink-strong">
                  {ratio(row.roas)}
                </td>
                <td className="px-4 py-3 text-right text-ink-secondary">
                  {money(row.attributedSalesAmount, row.currency, language)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-10 text-center text-sm text-ink-muted" colSpan={8}>
                {labels.empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
