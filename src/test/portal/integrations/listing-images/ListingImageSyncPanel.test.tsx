import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import * as api from '@/features/portal/integrations/listing-images/api/listingImageApi'
import ListingImageSyncPanel from '@/features/portal/integrations/listing-images/components/ListingImageSyncPanel'
import i18n from '@/shared/i18n/i18n'

vi.mock('@/features/portal/integrations/listing-images/api/listingImageApi', () => ({
  listImageSchedules: vi.fn(),
  listImageJobs: vi.fn(),
  saveImageSchedule: vi.fn(),
  createImageJob: vi.fn(),
  actOnImageJob: vi.fn(),
}))
const agent = {
  id: 'agent',
  shopId: 'shop',
  clientId: 'client',
  label: 'RDC',
  version: 'test',
  apiBaseUrl: null,
  lastSeenAt: '',
  status: 'ONLINE' as const,
  token: null,
  listingImageSync: true,
}
const account: CurrentAccount = {
  account: { id: 'u', email: 'test@example.test', mustChangePassword: false },
  roles: [],
  permissions: ['CATALOG:READ', 'CATALOG:WRITE'],
  scopes: [],
  profileSetupRequired: false,
}
const job = {
  id: 'job',
  shopId: 'shop',
  agentId: 'agent',
  status: 'RUNNING' as const,
  total: 3000,
  processed: 25,
  updated: 20,
  unchanged: 3,
  skipped: 1,
  failed: 1,
  createdAt: '2026-09-17T00:00:00Z',
  updatedAt: '2026-09-17T00:00:00Z',
  errorMessage: null,
}
beforeEach(async () => {
  vi.resetAllMocks()
  await i18n.changeLanguage('en')
  vi.mocked(api.listImageSchedules).mockResolvedValue({ items: [] })
  vi.mocked(api.listImageJobs).mockResolvedValue({ items: [job], total: 1, page: 1, limit: 10 })
})
function show(agents = [agent], operator = account) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ListingImageSyncPanel
        account={operator}
        agents={agents}
        shopNames={new Map([['shop', 'LLC']])}
      />
    </QueryClientProvider>,
  )
}
it('shows parent job progress and pauses the correct job', async () => {
  vi.mocked(api.actOnImageJob).mockResolvedValue({ ...job, status: 'PAUSED' })
  show()
  expect(await screen.findByText('25 / 3000')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
  await waitFor(() => expect(api.actOnImageJob).toHaveBeenCalledWith('job', 'pause'))
}, 15_000)
it('request now confirms the seven-day bypass before creating a job', async () => {
  vi.mocked(api.listImageJobs).mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 })
  vi.mocked(api.createImageJob).mockResolvedValue(job)
  show()
  const button = await screen.findByRole('button', { name: 'Request image sync now' })
  await waitFor(() => expect(button).toBeEnabled())
  fireEvent.click(button)
  expect(api.createImageJob).not.toHaveBeenCalled()
  expect(await screen.findByText(/including listings less than 7 days old/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Start sync' }))
  await waitFor(() =>
    expect(vi.mocked(api.createImageJob).mock.calls[0]?.[0]).toEqual({
      agentId: 'agent',
      shopId: 'shop',
    }),
  )
}, 15_000)
it('blocks requests for unsupported extensions and hides cross-shop write controls', async () => {
  show([{ ...agent, listingImageSync: false }])
  expect(await screen.findByRole('button', { name: 'Request image sync now' })).toBeDisabled()
  expect(screen.getByText(/Update and reload/)).toBeVisible()
})
it('read-only catalog users cannot schedule, request or pause jobs', async () => {
  show([agent], { ...account, permissions: ['CATALOG:READ'] })
  expect(await screen.findByText('25 / 3000')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Request image sync now' })).not.toBeInTheDocument()
})

it('saves the daily schedule without creating a manual job', async () => {
  vi.mocked(api.saveImageSchedule).mockResolvedValue({
    id: 's',
    agentId: 'agent',
    shopId: 'shop',
    enabled: true,
    nextRunAt: '2026-09-18T00:00:00Z',
    lastError: null,
  })
  show()
  const toggle = await screen.findByRole('switch', { name: 'Daily eligibility check' })
  await waitFor(() => expect(toggle).toBeEnabled())
  fireEvent.click(toggle)
  await waitFor(() => expect(api.saveImageSchedule).toHaveBeenCalledWith('agent', true))
  expect(api.createImageJob).not.toHaveBeenCalled()
})
it('resumes a paused parent and retries failed items without creating a replacement job', async () => {
  vi.mocked(api.listImageJobs).mockResolvedValue({
    items: [{ ...job, status: 'PAUSED' }],
    total: 1,
    page: 1,
    limit: 10,
  })
  vi.mocked(api.actOnImageJob).mockResolvedValue(job)
  show()
  fireEvent.click(await screen.findByRole('button', { name: 'Resume' }))
  await waitFor(() => expect(api.actOnImageJob).toHaveBeenCalledWith('job', 'resume'))
  const retry = screen.getByRole('button', { name: 'Retry failed' })
  await waitFor(() => expect(retry).toBeEnabled())
  fireEvent.click(retry)
  await waitFor(() => expect(api.actOnImageJob).toHaveBeenCalledWith('job', 'retry'))
  expect(api.createImageJob).not.toHaveBeenCalled()
}, 15_000)
it('never grants write actions to a catalog writer scoped to another shop', async () => {
  show([agent], {
    ...account,
    permissions: ['CATALOG:READ'],
    scopes: [
      {
        assignmentId: 'assignment',
        scopeType: 'shop',
        scopeId: 'other',
        resourceId: 'other',
        roles: [],
        permissions: ['CATALOG:WRITE'],
      },
    ],
  })
  expect(await screen.findByText('25 / 3000')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument()
  expect(screen.queryByRole('switch')).not.toBeInTheDocument()
})
