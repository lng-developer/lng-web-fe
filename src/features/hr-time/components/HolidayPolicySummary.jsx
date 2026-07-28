import { Alert, Chip, Skeleton, Stack, Typography } from '@mui/material'

import {
  useHolidayCheckQuery,
  useHolidayRangeQuery,
  useHolidaySummaryQuery,
  useHolidayTemplatesQuery,
} from '../api/hrTime.queries.js'

function errorMessage(error) {
  return (
    error?.data?.message ||
    error?.data?.error?.message ||
    error?.message ||
    'Could not load calendar policy'
  )
}

export default function HolidayPolicySummary({ canShowSummary, checkParams, rangeParams, year }) {
  const templatesQuery = useHolidayTemplatesQuery()
  const rangeQuery = useHolidayRangeQuery(rangeParams)
  const checkQuery = useHolidayCheckQuery(checkParams)
  const summaryQuery = useHolidaySummaryQuery(year, { enabled: canShowSummary })
  const error = [templatesQuery, rangeQuery, checkQuery, summaryQuery].find(
    (query) => query.isError,
  )?.error
  const summary = summaryQuery.data
  const rangeItems = rangeQuery.data?.items || []
  const templates = templatesQuery.data?.items || []
  const checkedHoliday = checkQuery.data?.holiday

  return (
    <div className="mb-3 grid gap-3 xl:grid-cols-[1fr_2fr]">
      <div className="rounded-lg border border-border bg-surface p-4">
        <Typography variant="subtitle2">Holiday policy</Typography>
        {summaryQuery.isPending ? (
          <Skeleton height={44} />
        ) : canShowSummary ? (
          <Typography variant="body2" className="mt-2 text-ink-secondary">
            {summary?.total ?? 0} dates · {summary?.publicHolidays ?? 0} public ·{' '}
            {summary?.paidDays ?? 0} paid
          </Typography>
        ) : (
          <Typography variant="body2" className="mt-2 text-ink-muted">
            Year totals require global calendar access.
          </Typography>
        )}
        <Typography variant="caption" className="mt-3 block text-ink-muted">
          {checkParams?.dateKey
            ? checkedHoliday
              ? `${checkParams.dateKey}: ${checkedHoliday.name}`
              : `${checkParams.dateKey}: no applicable holiday`
            : 'Select a date to check its policy.'}
        </Typography>
      </div>
      <div className="rounded-lg border border-border bg-surface p-4">
        <Typography variant="subtitle2">Range and templates</Typography>
        <Stack direction="row" useFlexGap flexWrap="wrap" spacing={0.75} className="mt-2">
          {rangeItems.map((holiday) => (
            <Chip key={holiday.id} size="small" label={`${holiday.dateKey} · ${holiday.name}`} />
          ))}
          {templates.map((template) => (
            <Chip key={template.key} size="small" variant="outlined" label={template.name} />
          ))}
        </Stack>
      </div>
      {error ? (
        <Alert severity="error" className="xl:col-span-2">
          {errorMessage(error)}
        </Alert>
      ) : null}
    </div>
  )
}
