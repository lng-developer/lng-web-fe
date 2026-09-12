import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/common/CoreDataTable', async () => ({
  CoreDataTable: (await import('@/test/mocks/CoreDataTable')).CoreDataTable,
}))

import { AppProviders } from '@/app/providers/AppProviders'
import { getInternalTemplate, listInternalTemplates } from '@/features/portal/catalog/api/catalogApi'
import { InternalTemplateManagementPage } from '@/features/portal/catalog/pages/InternalTemplateManagementPage'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/portal/catalog/api/catalogApi', () => ({
  listInternalTemplates: vi.fn().mockResolvedValue({
    items: [{ id: 'template-1', code: 'MAIN', name: 'Main', requiresPsd: true, status: 'ACTIVE' }],
    pagination: { total: 1 },
  }),
  listProductTypeGroups: vi.fn().mockResolvedValue({ items: [], pagination: { total: 0 } }),
  getInternalTemplate: vi.fn().mockResolvedValue({
    id: 'template-1',
    code: 'MAIN',
    name: 'Main',
    requiresPsd: true,
    status: 'ACTIVE',
    productTypeGroup: null,
    requiredFields: [],
    artworkSlots: [],
    designAssets: [],
  }),
  createInternalTemplate: vi.fn(),
  updateInternalTemplate: vi.fn(),
  uploadCatalogAsset: vi.fn(),
}))

describe('InternalTemplateManagementPage', () => {
  afterEach(() => {
    cleanup()
    queryClient.clear()
  })
  beforeEach(async () => {
    queryClient.clear()
    window.localStorage.setItem('lng.language', 'en')
    await i18n.changeLanguage('en')
  })
  it('shows a quick edit action for managers', async () => {
    render(
      <AppProviders>
        <InternalTemplateManagementPage canManage />
      </AppProviders>,
    )
    const action = await screen.findByRole('button', { name: 'Edit internal template' })
    expect(action).toHaveTextContent('')
    fireEvent.click(action)
    expect(await screen.findByRole('dialog')).toHaveTextContent('Edit internal template')
  }, 15_000)

  it('hides mutation actions from read-only users', async () => {
    render(
      <AppProviders>
        <InternalTemplateManagementPage canManage={false} />
      </AppProviders>,
    )
    await screen.findByText('MAIN')
    expect(screen.queryByRole('button', { name: 'Edit internal template' })).not.toBeInTheDocument()
  })

  it('can render without its embedded page header', async () => {
    render(
      <AppProviders>
        <InternalTemplateManagementPage {...{ canManage: true, showHeader: false }} />
      </AppProviders>,
    )

    await screen.findByText('MAIN')
    expect(screen.queryByRole('heading', { name: 'Internal templates' })).not.toBeInTheDocument()
  })

  it('keeps search and create controls outside the data card', async () => {
    const { container } = render(
      <AppProviders>
        <InternalTemplateManagementPage canManage />
      </AppProviders>,
    )

    await screen.findByText('MAIN')
    const card = container.querySelector('.ant-card')
    expect(card).not.toBeNull()
    expect(within(card as HTMLElement).queryByPlaceholderText('Search templates')).toBeNull()
    expect(within(card as HTMLElement).queryByRole('button', { name: 'Create template' })).toBeNull()
  })

  it('disables template editing until its detail has loaded', async () => {
    let resolveDetail: (value: never) => void
    vi.mocked(getInternalTemplate).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDetail = resolve
      }),
    )

    render(
      <AppProviders>
        <InternalTemplateManagementPage canManage />
      </AppProviders>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Edit internal template' }))
    expect(await screen.findByRole('button', { name: 'Save template' })).toBeDisabled()

    resolveDetail!({
      artworkSlots: [],
      code: 'MAIN',
      designAssets: [],
      id: 'template-1',
      name: 'Main',
      productTypeGroup: null,
      requiredFields: [],
      requiresPsd: true,
      status: 'ACTIVE',
    } as never)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save template' })).toBeEnabled())
  })

  it('resets to the first page and searches while typing', async () => {
    render(
      <AppProviders>
        <InternalTemplateManagementPage canManage />
      </AppProviders>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Page 2' }))
    await waitFor(() =>
      expect(listInternalTemplates).toHaveBeenLastCalledWith({ page: 2, limit: 10, q: undefined }),
    )

    fireEvent.change(screen.getByPlaceholderText('Search templates'), {
      target: { value: 'canvas' },
    })

    await waitFor(() =>
      expect(listInternalTemplates).toHaveBeenLastCalledWith({ page: 1, limit: 10, q: 'canvas' }),
    )
  })
})
