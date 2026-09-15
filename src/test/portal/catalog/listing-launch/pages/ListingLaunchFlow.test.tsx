import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers/AppProviders'
import ContentReviewPanel from '@/features/portal/catalog/listing-launch/components/ContentReviewPanel'
import MockupAnalysisPanel from '@/features/portal/catalog/listing-launch/components/MockupAnalysisPanel'
import MockupConfirmationForm from '@/features/portal/catalog/listing-launch/components/MockupConfirmationForm'
import {
  requestMockupAnalysis,
  uploadMockup,
} from '@/features/portal/catalog/listing-launch/api/listingLaunchApi'
import type { Launch } from '@/features/portal/catalog/listing-launch/api/listingLaunchTypes'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'
vi.mock('react-router-dom', async (original) => ({
  ...(await original<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => ({ account: { id: 'test' } }),
}))
vi.mock('@/shared/media/AuthenticatedMediaImage', () => ({
  AuthenticatedMediaImage: () => <img alt="Mockup" />,
}))
vi.mock('@/features/portal/catalog/listing-launch/api/listingLaunchApi', () => ({
  listContentVersions: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  requestContentGeneration: vi.fn(),
  requestMockupAnalysis: vi.fn(),
  uploadMockup: vi.fn(),
  saveLaunchInputs: vi.fn(),
}))
const launch = {
  id: 'launch-1',
  shopId: 'shop-1',
  state: 'PRODUCT_SELECTED',
  contentInputVersion: 1,
  mockupRevision: 1,
  mockup: {
    assetId: 'image-1',
    revision: 1,
    width: 20,
    height: 10,
    size: 20,
    downloadUrl: '/api/media/assets/image-1/download',
  },
  mockupConfirmationUsable: false,
  contentInputs: null,
  latestMockupAnalysis: null,
  approvedContent: null,
} as Launch
beforeEach(() => {
  vi.clearAllMocks()
  queryClient.clear()
  i18n.changeLanguage('en')
})
it('uploads without starting analysis and preserves dirty observations across a refetch', async () => {
  vi.mocked(uploadMockup).mockResolvedValue(launch)
  const saved = vi.fn()
  const view = render(
    <AppProviders>
      <MockupAnalysisPanel launch={launch} canWrite onSaved={saved} dirty={false} />
    </AppProviders>,
  )
  const input = view.container.querySelector('input[type="file"]')!
  fireEvent.change(input, {
    target: { files: [new File(['fixture'], 'cat.png', { type: 'image/png' })] },
  })
  await waitFor(() => expect(saved).toHaveBeenCalled())
  expect(uploadMockup).toHaveBeenCalledTimes(1)
  expect(requestMockupAnalysis).not.toHaveBeenCalled()
  view.unmount()
  const dirty = vi.fn()
  const editor = render(
    <AppProviders>
      <MockupConfirmationForm launch={launch} canWrite onSaved={saved} onDirty={dirty} />
    </AppProviders>,
  )
  fireEvent.change(screen.getByLabelText('Text visible in the design'), {
    target: { value: 'My correction' },
  })
  editor.rerender(
    <AppProviders>
      <MockupConfirmationForm
        launch={{ ...launch, contentInputVersion: 2 }}
        canWrite
        onSaved={saved}
        onDirty={dirty}
      />
    </AppProviders>,
  )
  expect(screen.getByLabelText('Text visible in the design')).toHaveValue('My correction')
  expect(dirty).toHaveBeenCalledWith(true)
})
afterEach(cleanup)
it('blocks Generate until current image observations and facts are saved', async () => {
  render(
    <AppProviders>
      <ContentReviewPanel launch={launch} canWrite onSaved={vi.fn()} dirty={false} />
    </AppProviders>,
  )
  expect(screen.getByRole('button', { name: 'Generate content' })).toBeDisabled()
})
it('shows explicit analysis action, and read-only users cannot invoke it', async () => {
  const { rerender } = render(
    <AppProviders>
      <MockupAnalysisPanel launch={launch} canWrite onSaved={vi.fn()} dirty={false} />
    </AppProviders>,
  )
  expect(screen.getByRole('button', { name: 'Analyze mockup' })).toBeEnabled()
  rerender(
    <AppProviders>
      <MockupAnalysisPanel launch={launch} canWrite={false} onSaved={vi.fn()} dirty={false} />
    </AppProviders>,
  )
  expect(screen.getByRole('button', { name: 'Analyze mockup' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Analyze mockup' }))
})
