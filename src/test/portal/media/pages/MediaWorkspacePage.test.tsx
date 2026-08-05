import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { MediaWorkspacePage } from '@/features/portal/media/pages/MediaWorkspacePage'
import i18n from '@/shared/i18n/i18n'

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => ({ permissions: ['MEDIA:READ'], scopes: [] }),
}))
vi.mock('@/features/portal/media/api/mediaApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/media/api/mediaApi')>()),
  listMediaAssets: vi.fn().mockResolvedValue({
    items: [
      {
        id: '660000000000000000000902',
        originalFilename: 'design.png',
        mimeType: 'image/png',
        size: 1048576,
        provider: 'local',
        resourceType: 'image',
        ownerType: 'ORDER_ITEM',
        status: 'ACTIVE',
        downloadUrl: null,
        createdAt: '2026-08-03T00:00:00.000Z',
      },
    ],
    pagination: { total: 1, page: 1, limit: 20 },
  }),
}))

describe('MediaWorkspacePage', () => {
  beforeEach(() => i18n.changeLanguage('en'))
  afterEach(cleanup)

  it('shows useful asset metadata without ObjectIDs or write actions', async () => {
    render(
      <AppProviders>
        <MediaWorkspacePage />
      </AppProviders>,
    )
    expect(await screen.findByText('design.png')).toBeVisible()
    expect(screen.getByText('ORDER_ITEM')).toBeVisible()
    expect(screen.queryByText('660000000000000000000902')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Upload file' })).not.toBeInTheDocument()
  })
})
