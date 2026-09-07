import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from 'antd'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CurrentAccount } from '@/features/auth/api/authApi'

vi.mock('@/features/portal/integrations/api/integrationApi', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/portal/integrations/api/integrationApi')>()
  return { ...actual, listIssues: vi.fn(), updateIssueStatus: vi.fn() }
})

import {
  type ImportIssue,
  listIssues,
  updateIssueStatus,
} from '@/features/portal/integrations/api/integrationApi'
import { integrationKeys } from '@/features/portal/integrations/api/integrationKeys'
import { ImportIssueQueue } from '@/features/portal/integrations/pages/ImportIssueQueue'
import type { Shop } from '@/features/portal/shops/api/shopApi'
import { setPermissions } from '@/shared/auth/session'

const shop: Shop = {
  id: 'shop-1',
  name: 'LNG Amazon US',
  currency: 'USD',
  status: 'ACTIVE',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
}
const issue: ImportIssue = {
  id: 'issue-1',
  importJobId: 'job-1',
  shopId: 'shop-1',
  rawRecordId: 'raw-1',
  source: 'MANUAL_EXCEL',
  externalOrderId: 'ORDER-1',
  externalItemId: 'ITEM-1',
  rowNumber: 4,
  issueType: 'ORDER_IMPORT_FAILED',
  severity: 'ERROR',
  status: 'OPEN',
  errorCode: 'INVALID_ADDRESS',
  errorMessage: 'Postal code is missing',
  details: { field: 'postalCode' },
  resolvedBy: null,
  resolvedAt: null,
  resolutionNote: null,
  createdAt: '2026-07-31T00:00:00.000Z',
  updatedAt: '2026-07-31T00:00:00.000Z',
}

const account = (
  permissions: string[] = ['ORDERS:READ'],
  scopes: CurrentAccount['scopes'] = [],
): CurrentAccount => ({
  account: { id: 'account-1', email: 'operator@example.com', mustChangePassword: false },
  roles: [],
  permissions,
  scopes,
  profileSetupRequired: false,
})

function renderQueue(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  currentAccount = account(),
  selectedJobId?: string,
) {
  render(
    <QueryClientProvider client={client}>
      <App>
        <ImportIssueQueue account={currentAccount} shops={[shop]} selectedJobId={selectedJobId} />
      </App>
    </QueryClientProvider>,
  )
  return client
}

describe('ImportIssueQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setPermissions(['ORDERS:READ'])
    vi.mocked(listIssues).mockResolvedValue({
      items: [issue],
      pagination: { total: 1, page: 1, limit: 20 },
    })
    vi.mocked(updateIssueStatus).mockResolvedValue({
      ...issue,
      status: 'RESOLVED',
      resolutionNote: 'Corrected source row',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('scopes the issue queue to the selected import job', async () => {
    renderQueue(undefined, account(), 'job-selected')

    await waitFor(() =>
      expect(listIssues).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        importJobId: 'job-selected',
      }),
    )
  })

  it('does not render an empty item reference placeholder', async () => {
    vi.mocked(listIssues).mockResolvedValue({
      items: [{ ...issue, externalItemId: null }],
      pagination: { total: 1, page: 1, limit: 20 },
    })

    renderQueue()

    expect(await screen.findByText('Postal code is missing')).toBeVisible()
    expect(screen.queryByText('-', { selector: '.ant-typography' })).not.toBeInTheDocument()
  })

  it('sends all queue filters to the server and hides write actions for readers', async () => {
    renderQueue()
    await waitFor(() => expect(listIssues).toHaveBeenCalledWith({ page: 1, limit: 20 }))

    const selections = [
      ['Issue shop', 'LNG Amazon US', 'shopId', 'shop-1'],
      ['Issue source', 'MANUAL_EXCEL', 'source', 'MANUAL_EXCEL'],
      ['Issue severity', 'ERROR', 'severity', 'ERROR'],
      ['Issue status', 'OPEN', 'status', 'OPEN'],
      ['Issue type', 'ORDER_IMPORT_FAILED', 'issueType', 'ORDER_IMPORT_FAILED'],
    ] as const
    for (const [label, option, key, value] of selections) {
      fireEvent.mouseDown(screen.getByLabelText(label))
      const optionElements = await screen.findAllByText(option)
      const visibleOption = optionElements.find((element) =>
        element.closest('.ant-select-item-option'),
      )
      expect(visibleOption).toBeDefined()
      fireEvent.click(visibleOption!)
      await waitFor(() =>
        expect(listIssues).toHaveBeenLastCalledWith(expect.objectContaining({ [key]: value })),
      )
    }
    fireEvent.change(screen.getByLabelText('External order ID'), {
      target: { value: 'ORDER-1' },
    })
    fireEvent.change(screen.getByLabelText('External item ID'), { target: { value: 'ITEM-1' } })

    await waitFor(() =>
      expect(listIssues).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        shopId: 'shop-1',
        source: 'MANUAL_EXCEL',
        severity: 'ERROR',
        status: 'OPEN',
        issueType: 'ORDER_IMPORT_FAILED',
        externalOrderId: 'ORDER-1',
        externalItemId: 'ITEM-1',
      }),
    )
    expect(await screen.findByText('Postal code is missing')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Resolve issue issue-1' })).not.toBeInTheDocument()
  })

  it('requires a note and invalidates global issues plus the resolved issue owner', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    renderQueue(client, account(['ORDERS:WRITE']), 'job-selected')

    fireEvent.click(await screen.findByRole('button', { name: 'Resolve issue issue-1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save resolution' }))
    expect(await screen.findByText('Enter a resolution note')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Resolution note'), {
      target: { value: 'Corrected source row' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save resolution' }))

    await waitFor(() =>
      expect(updateIssueStatus).toHaveBeenCalledWith('issue-1', {
        status: 'RESOLVED',
        note: 'Corrected source row',
      }),
    )
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [...integrationKeys.all, 'issues'] })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: integrationKeys.job('job-1'),
    })
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: integrationKeys.job('job-selected') })
  })

  it('preserves an ignored resolution form when the mutation fails', async () => {
    vi.mocked(updateIssueStatus).mockRejectedValue(new Error('Conflict'))
    renderQueue(undefined, account(['ORDERS:WRITE']))

    fireEvent.click(await screen.findByRole('button', { name: 'Resolve issue issue-1' }))
    fireEvent.click(screen.getByText('IGNORED'))
    fireEvent.change(screen.getByLabelText('Resolution note'), {
      target: { value: 'Duplicate report' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save resolution' }))

    await waitFor(() =>
      expect(
        screen
          .getAllByText('Conflict')
          .some(
            (element) =>
              element.offsetParent !== null || !element.closest('[style*="display: none"]'),
          ),
      ).toBe(true),
    )
    expect(screen.getByLabelText('Resolution note')).toHaveValue('Duplicate report')
    expect(updateIssueStatus).toHaveBeenCalledWith('issue-1', {
      status: 'IGNORED',
      note: 'Duplicate report',
    })
  })

  it('hides resolution for an issue outside the caller exact write scope', async () => {
    const scopedAccount = account(
      [],
      [
        {
          assignmentId: 'assignment-1',
          scopeType: 'shop',
          scopeId: 'shop-2',
          resourceId: 'shop-2',
          roles: [],
          permissions: ['ORDERS:WRITE'],
        },
      ],
    )

    renderQueue(undefined, scopedAccount)

    expect(await screen.findByText('Postal code is missing')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Resolve issue issue-1' })).not.toBeInTheDocument()
  })

  it('debounces external id filters into one server request', async () => {
    vi.useFakeTimers()
    renderQueue()
    await act(async () => vi.advanceTimersByTimeAsync(1))
    vi.mocked(listIssues).mockClear()

    fireEvent.change(screen.getByLabelText('External order ID'), { target: { value: 'O' } })
    fireEvent.change(screen.getByLabelText('External order ID'), { target: { value: 'OR' } })
    fireEvent.change(screen.getByLabelText('External order ID'), { target: { value: 'ORDER-1' } })
    expect(listIssues).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTimeAsync(200))

    expect(listIssues).toHaveBeenCalledTimes(1)
    expect(listIssues).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      externalOrderId: 'ORDER-1',
    })
    vi.useRealTimers()
  })
})
