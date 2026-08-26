import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/design/api/designApi', () => ({
  listDesignAssignees: vi.fn().mockResolvedValue([
    {
      id: 'designer-1',
      fullName: 'Designer One',
      avatarUrl: '/api/hr/employee-profiles/profile-1/avatar',
    },
  ]),
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

vi.mock('@/shared/media', () => ({
  AuthenticatedMediaImage: ({ alt }: { alt: string }) => <img alt={alt} />,
  downloadMediaAsset: vi.fn().mockResolvedValue(undefined),
  useAuthenticatedMediaUrl: (downloadUrl?: string) => ({ url: downloadUrl }),
}))

import { PsdFileWorkspacePage } from '@/features/portal/design/pages/PsdFileWorkspacePage'
import i18n from '@/shared/i18n/i18n'
import { downloadMediaAsset } from '@/shared/media'
import { renderWithTestProviders } from '@/test/helpers/testProviders'

describe('PsdFileWorkspacePage', () => {
  afterEach(cleanup)
  beforeEach(async () => {
    window.localStorage.setItem('lng.language', 'en')
    await i18n.changeLanguage('en')
  })

  it('uses authenticated media actions and only previews image files', async () => {
    const view = renderWithTestProviders(<PsdFileWorkspacePage />)

    expect(await view.findByText('reference.png')).toBeVisible()
    expect(view.getByAltText('reference.png')).toBeVisible()
    expect(view.queryByAltText('master.psd')).not.toBeInTheDocument()
    expect(view.getByText('SKU-1')).toBeVisible()
    expect(view.queryByText('Shirt')).not.toBeInTheDocument()
    expect(view.getByPlaceholderText('Search file or SKU')).toBeVisible()
    fireEvent.click(view.getByRole('button', { name: 'Download master.psd' }))
    expect(downloadMediaAsset).toHaveBeenCalledWith(
      '/api/media/assets/asset-2/download',
      'master.psd',
    )
  }, 15_000)
})
