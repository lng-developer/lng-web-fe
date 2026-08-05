import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { ProductTypeManagementPage } from '@/features/portal/catalog/pages/ProductTypeManagementPage'
import i18n from '@/shared/i18n/i18n'

vi.mock('@/features/portal/catalog/api/catalogApi', () => ({
  listProductTypeGroups: vi.fn().mockResolvedValue({
    items: [{ id: 'group-1', code: 'SHIRT', name: 'Shirt', status: 'ACTIVE' }],
    pagination: { total: 1 },
  }),
  createProductTypeGroup: vi.fn(),
  updateProductTypeGroup: vi.fn(),
}))

describe('ProductTypeManagementPage', () => {
  afterEach(cleanup)
  beforeEach(() => i18n.changeLanguage('en'))
  it('shows a quick edit action for managers', async () => {
    render(
      <AppProviders>
        <ProductTypeManagementPage canManage />
      </AppProviders>,
    )
    const action = await screen.findByRole('button', { name: 'Edit product type' })
    expect(action).toHaveTextContent('')
    fireEvent.click(action)
    expect(screen.getByRole('dialog')).toHaveTextContent('Edit product type')
  })

  it('hides mutation actions from read-only users', async () => {
    render(
      <AppProviders>
        <ProductTypeManagementPage canManage={false} />
      </AppProviders>,
    )
    await screen.findByText('SHIRT')
    expect(screen.queryByRole('button', { name: 'Edit product type' })).not.toBeInTheDocument()
  })
})
