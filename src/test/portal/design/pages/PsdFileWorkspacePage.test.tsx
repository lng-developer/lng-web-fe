import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/design/api/designApi', () => ({
  listDesignAssignees: vi.fn().mockResolvedValue([]),
  listPsdFiles: vi.fn().mockResolvedValue({
    items: [
      {
        rowKey: 'image',
        role: 'REFERENCE',
        linkedAt: null,
        asset: {
          id: 'asset-1',
          originalFilename: 'reference.png',
          mimeType: 'image/png',
          size: 1,
          downloadUrl: '/api/media/assets/asset-1/download',
        },
        task: { id: 'task-1', taskType: 'PSD_TEMPLATE', status: 'OPEN' },
        listing: { id: 'listing-1', code: 'SKU-1', title: 'Shirt' },
        designer: { id: null, name: null },
        submission: { id: null, version: null, submittedAt: null },
      },
      {
        rowKey: 'psd',
        role: 'APPROVED',
        linkedAt: null,
        asset: {
          id: 'asset-2',
          originalFilename: 'master.psd',
          mimeType: 'application/octet-stream',
          size: 2,
          downloadUrl: '/api/media/assets/asset-2/download',
        },
        task: { id: 'task-2', taskType: 'PSD_TEMPLATE', status: 'APPROVED' },
        listing: { id: 'listing-2', code: 'SKU-2', title: 'Hoodie' },
        designer: { id: 'designer-1', name: 'Designer One' },
        submission: { id: 'submission-1', version: 2, submittedAt: null },
      },
    ],
    total: 2,
    page: 1,
    limit: 20,
  }),
}))

import { AppProviders } from '@/app/providers/AppProviders'
import { PsdFileWorkspacePage } from '@/features/portal/design/pages/PsdFileWorkspacePage'

describe('PsdFileWorkspacePage', () => {
  afterEach(cleanup)

  it('shows real download links and only previews image files', async () => {
    render(
      <AppProviders>
        <PsdFileWorkspacePage />
      </AppProviders>,
    )

    expect(await screen.findByText('reference.png')).toBeVisible()
    expect(screen.getByAltText('reference.png')).toBeVisible()
    expect(screen.queryByAltText('master.psd')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Download master.psd' })).toHaveAttribute(
      'href',
      '/api/media/assets/asset-2/download',
    )
  }, 15_000)
})
