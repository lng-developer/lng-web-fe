import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers/AppProviders'
import type { TrackingSyncConfig } from '@/features/portal/shipments/api/shipmentApi'
import { TrackingSyncCard } from '@/features/portal/shipments/components/TrackingSyncCard'
import i18n from '@/shared/i18n/i18n'

const config: TrackingSyncConfig = {
  enabled: true,
  intervalMinutes: 15,
  batchSize: 50,
  lastRunAt: null,
  lastRunFinishedAt: null,
  updatedAt: null,
  queueEnabled: true,
  lastRunSummary: { queued: 5, checked: 0, applied: 0, skipped: 0, failed: 0 },
  monitoring: {
    available: true,
    capturedAt: '2026-11-25T08:00:00Z',
    providers: [
      {
        provider: 'LNG_GROUP',
        waiting: 4,
        processing: 1,
        scheduled: 2,
        completed: 3,
        errors: 1,
        lastAttemptAt: null,
      },
    ],
  },
}
beforeEach(async () => {
  await i18n.changeLanguage('en')
})
afterEach(cleanup)
function show(value: TrackingSyncConfig) {
  return render(
    <AppProviders>
      <TrackingSyncCard
        config={value}
        loading={false}
        saving={false}
        running={false}
        onChange={vi.fn()}
        onRunNow={vi.fn()}
      />
    </AppProviders>,
  )
}
it('shows provider progress and distinguishes dispatch from completed checks', () => {
  show(config)
  expect(screen.getByText('LNG_GROUP')).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: 'In progress' })).toBeInTheDocument()
  expect(screen.getByText('Dispatch candidates: 5 (not completed checks)')).toBeInTheDocument()
  expect(screen.queryByText(/Checked 0/)).not.toBeInTheDocument()
})
it('shows unavailable rather than an empty success table', () => {
  show({ ...config, monitoring: { available: false, providers: [] } })
  expect(
    screen.getByText('Tracking progress is unavailable. Counts are not zero.'),
  ).toBeInTheDocument()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
})
it('keeps legacy results when queue mode is off', () => {
  show({ ...config, queueEnabled: false })
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  expect(screen.queryByText(/Dispatch candidates:/)).not.toBeInTheDocument()
})
