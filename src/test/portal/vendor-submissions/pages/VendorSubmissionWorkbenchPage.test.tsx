import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  getVendorSubmission,
  type VendorSubmission,
  getVendorSubmissionSummary,
  listVendorSubmissions,
} from '@/features/portal/vendor-submissions/api/vendorSubmissionApi'
import { VendorSubmissionWorkbenchPage } from '@/features/portal/vendor-submissions/pages/VendorSubmissionWorkbenchPage'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => undefined,
}))

vi.mock('@/features/portal/vendor-submissions/api/vendorSubmissionApi', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/features/portal/vendor-submissions/api/vendorSubmissionApi')
  >()),
  getVendorSubmission: vi.fn(),
  listVendorSubmissions: vi.fn(),
  getVendorSubmissionSummary: vi.fn(),
}))

const account: CurrentAccount = {
  account: {
    id: 'vendor-submission-reader',
    email: 'vendor-submission@lng.co',
    mustChangePassword: false,
  },
  roles: [],
  permissions: ['VENDOR_SUBMISSIONS:READ'],
  scopes: [],
  profileSetupRequired: false,
}

function renderPage(url = '/portal/vendor-submissions') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AppProviders>
        <VendorSubmissionWorkbenchPage account={account} />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('VendorSubmissionWorkbenchPage', () => {
  afterEach(cleanup)

  beforeEach(async () => {
    vi.clearAllMocks()
    queryClient.clear()
    await i18n.changeLanguage('en')
    vi.mocked(listVendorSubmissions).mockImplementation(async (params) => ({
      items: [],
      pagination: { total: 40, page: params.page, limit: params.limit },
    }))
    vi.mocked(getVendorSubmissionSummary).mockResolvedValue({
      total: 40,
      ready: 10,
      submitted: 20,
      failed: 5,
      cancelled: 5,
      byStatus: {},
    })
  })

  it('shows separate Merchize code, retry reference and technical receipt ID', async () => {
    vi.mocked(getVendorSubmission).mockResolvedValue({
      id: 'sub-1',
      externalOrderId: 'marketplace-order',
      provider: 'MERCHIZE',
      vendorOrderCode: 'RY-65286-27564',
      vendorOrderReference: 'marketplace-order-R2',
      vendorExternalOrderId: '692839abc123456789abcdef',
      status: 'SUBMITTED',
      submitAttemptCount: 2,
    } as VendorSubmission)
    renderPage('/portal/vendor-submissions?resourceId=sub-1')
    expect(await screen.findByText('RY-65286-27564')).toBeVisible()
    expect(screen.getByText('marketplace-order-R2')).toBeVisible()
    expect(screen.getByText('Vendor technical ID')).toBeVisible()
    expect(screen.getByText('692839abc123456789abcdef')).toBeVisible()
  })

  it('keeps submission columns compact within a stable table width', async () => {
    renderPage()

    await waitFor(() => expect(listVendorSubmissions).toHaveBeenCalled())

    const table = document.querySelector<HTMLTableElement>('.ant-table-container table')
    expect(table).toHaveStyle({ width: '1100px', tableLayout: 'fixed' })
  })

  it('loads and displays summary metrics', async () => {
    renderPage()

    await waitFor(() => expect(getVendorSubmissionSummary).toHaveBeenCalled())
    expect(await screen.findByText('Total')).toBeInTheDocument()
    expect(await screen.findByText('Ready')).toBeInTheDocument()
  })

  it('falls back to row items for summary metrics when api summary returns zeros', async () => {
    vi.mocked(getVendorSubmissionSummary).mockResolvedValue({
      total: 0,
      ready: 0,
      submitted: 0,
      failed: 0,
      cancelled: 0,
      byStatus: {},
    })
    vi.mocked(listVendorSubmissions).mockResolvedValue({
      items: [
        {
          id: 'sub-1',
          externalOrderId: '113-4423297-7689028',
          sku: 'J2512-TS25-111126-01',
          status: 'SUBMITTED',
          submitAttemptCount: 1,
        } as unknown as import('@/features/portal/vendor-submissions/api/vendorSubmissionApi').VendorSubmission,
      ],
      pagination: { total: 1, page: 1, limit: 50 },
    })

    renderPage()

    await waitFor(() => expect(screen.getByText('113-4423297-7689028')).toBeInTheDocument())
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2)
  })
})
