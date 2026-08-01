import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import {
  createVendorCostCenter,
  createVendorProduct,
  updateVendor,
} from '@/features/portal/vendors/api/vendorApi'
import { VendorCostCenterEditorModal } from '@/features/portal/vendors/pages/VendorCostCenterEditorModal'
import { VendorEditorModal } from '@/features/portal/vendors/pages/VendorEditorModal'
import { VendorProductEditorModal } from '@/features/portal/vendors/pages/VendorProductEditorModal'
import { ApiError } from '@/shared/api'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/portal/vendors/api/vendorApi', () => ({
  createVendor: vi.fn(),
  createVendorCostCenter: vi.fn(),
  createVendorProduct: vi.fn(),
  updateVendor: vi.fn(),
  updateVendorCostCenter: vi.fn(),
  updateVendorProduct: vi.fn(),
}))

describe('VendorEditorModal', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })
  beforeEach(async () => {
    vi.clearAllMocks()
    queryClient.clear()
    i18n.addResourceBundle(
      'en',
      'common',
      {
        portal: {
          vendors: {
            additionalAmount: 'Additional amount',
            attributes: 'Attributes',
            baseCostAmount: 'Base cost',
            cancel: 'Cancel',
            code: 'Code',
            currency: 'Currency',
            designTemplateUrl: 'Template URL',
            dimensionUnit: 'Dimension unit',
            domesticShipping: 'Domestic shipping',
            economyAmount: 'Economy amount',
            embroideryAmount: 'Embroidery',
            externalProductId: 'External product ID',
            height: 'Height',
            imageUrl: 'Image URL',
            importTaxAmount: 'Import tax',
            internationalShipping: 'International shipping',
            length: 'Length',
            lngCode: 'LNG code',
            maxProductionDays: 'Maximum production days',
            minProductionDays: 'Minimum production days',
            name: 'Name',
            priorityShipping: 'Priority shipping',
            productTypeGroupId: 'Product type group ID',
            productUrl: 'Product URL',
            save: 'Save',
            sku: 'SKU',
            standardColor: 'Standard color',
            standardSize: 'Standard size',
            statusLabel: 'Status',
            twoPositionPrintAmount: 'Two-position print',
            twoSidedPrintAmount: 'Two-sided print',
            vendorColor: 'Vendor color',
            vendorSize: 'Vendor size',
            weight: 'Weight',
            weightUnit: 'Weight unit',
            width: 'Width',
            metadata: 'Metadata',
          },
        },
      },
      true,
      true,
    )
    await i18n.changeLanguage('en')
  })

  it('keeps a vendor code immutable while updating its editable fields', async () => {
    i18n.addResourceBundle(
      'en',
      'common',
      { portal: { vendors: { code: 'Code', name: 'Name', save: 'Save' } } },
      true,
      true,
    )
    await i18n.changeLanguage('en')
    vi.mocked(updateVendor).mockResolvedValue({
      code: 'ACME',
      fulfillmentType: 'POD',
      id: 'vendor-1',
      name: 'Updated',
      providerKey: null,
      status: 'ACTIVE',
    })
    const onSaved = vi.fn()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    render(
      <AppProviders>
        <VendorEditorModal
          item={{
            code: 'ACME',
            fulfillmentType: 'POD',
            id: 'vendor-1',
            name: 'Acme Print',
            providerKey: null,
            status: 'ACTIVE',
          }}
          open
          onCancel={vi.fn()}
          onSaved={onSaved}
        />
      </AppProviders>,
    )

    expect(screen.getByLabelText('Code')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(updateVendor).toHaveBeenCalledWith('vendor-1', expect.any(Object)))
    expect(vi.mocked(updateVendor).mock.calls[0][1]).not.toHaveProperty('code')
    expect(onSaved).toHaveBeenCalled()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['portal', 'vendors', 'list'] })
  })

  it('submits every supported Product group with minor-unit money unchanged', async () => {
    vi.mocked(createVendorProduct).mockResolvedValue({ id: 'product-1' } as never)
    render(
      <AppProviders>
        <VendorProductEditorModal open vendorId="vendor-1" onCancel={vi.fn()} onSaved={vi.fn()} />
      </AppProviders>,
    )

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Tee' } })
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'TEE' } })
    fireEvent.change(screen.getByLabelText('Product type group ID'), {
      target: { value: '660000000000000000000001' },
    })
    fireEvent.change(screen.getByLabelText('External product ID'), {
      target: { value: 'external-1' },
    })
    fireEvent.change(screen.getByLabelText('Image URL'), {
      target: { value: 'https://example.com/image.png' },
    })
    fireEvent.change(screen.getByLabelText('Minimum production days'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Maximum production days'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Base cost'), { target: { value: '1250' } })
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'usd' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(createVendorProduct).toHaveBeenCalled())
    expect(vi.mocked(createVendorProduct).mock.calls[0][0]).toMatchObject({
      baseCostAmount: 1250,
      currency: 'USD',
      externalProductId: 'external-1',
      maxProductionDays: 5,
      minProductionDays: 2,
    })
  })

  it('blocks invalid Product IDs and production ranges', async () => {
    render(
      <AppProviders>
        <VendorProductEditorModal open vendorId="vendor-1" onCancel={vi.fn()} onSaved={vi.fn()} />
      </AppProviders>,
    )

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Tee' } })
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'TEE' } })
    fireEvent.change(screen.getByLabelText('Product type group ID'), {
      target: { value: 'invalid' },
    })
    fireEvent.change(screen.getByLabelText('Minimum production days'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Maximum production days'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(screen.getByLabelText('Product type group ID')).toHaveAttribute(
        'aria-invalid',
        'true',
      ),
    )
    expect(createVendorProduct).not.toHaveBeenCalled()
  })

  it('preserves Product fields and reports a live-contract 409 without invented field details', async () => {
    vi.mocked(createVendorProduct).mockRejectedValue(
      new ApiError('Code already exists', { status: 409 }),
    )
    render(
      <AppProviders>
        <VendorProductEditorModal open vendorId="vendor-1" onCancel={vi.fn()} onSaved={vi.fn()} />
      </AppProviders>,
    )

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Tee' } })
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'TEE' } })
    fireEvent.change(screen.getByLabelText('Product type group ID'), {
      target: { value: '660000000000000000000001' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText(
        'A record with this code already exists. Review the form and choose another code.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Tee')
    expect(screen.getByLabelText('Code')).toHaveValue('TEE')
  })

  it('does not discard a dirty Product form when confirmation is declined', () => {
    const onCancel = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(
      <AppProviders>
        <VendorProductEditorModal open vendorId="vendor-1" onCancel={onCancel} onSaved={vi.fn()} />
      </AppProviders>,
    )

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Unsaved tee' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(window.confirm).toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('submits Cost Center money as integer minor units and refreshes child rows and parent counts', async () => {
    vi.mocked(createVendorCostCenter).mockResolvedValue({ id: 'cost-1' } as never)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    render(
      <AppProviders>
        <VendorCostCenterEditorModal
          open
          productId="product-1"
          vendorId="vendor-1"
          onCancel={vi.fn()}
          onSaved={vi.fn()}
        />
      </AppProviders>,
    )

    expect(screen.getByLabelText('Vendor size')).toBeInTheDocument()
    expect(screen.getByLabelText('Weight')).toBeInTheDocument()
    expect(screen.getByLabelText('Width')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Economy amount')).toHaveLength(3)
    expect(screen.getByLabelText('Embroidery')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Tee XL' } })
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'TEE-XL' } })
    fireEvent.change(screen.getByLabelText('Base cost'), { target: { value: '1750' } })
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'usd' } })
    fireEvent.change(screen.getByLabelText('Import tax'), { target: { value: '125' } })
    const economy = screen.getAllByLabelText('Economy amount')
    fireEvent.change(economy[0], { target: { value: '500' } })
    fireEvent.change(economy[1], { target: { value: '900' } })
    fireEvent.change(economy[2], { target: { value: '1400' } })
    fireEvent.change(screen.getByLabelText('Embroidery'), { target: { value: '250' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(createVendorCostCenter).toHaveBeenCalled())
    expect(vi.mocked(createVendorCostCenter).mock.calls[0][1]).toMatchObject({
      additionalCosts: { embroideryAmount: 250 },
      baseCostAmount: 1750,
      currency: 'USD',
      domesticShipping: { economyAmount: 500 },
      importTaxAmount: 125,
      internationalShipping: { economyAmount: 900 },
      priorityShipping: { economyAmount: 1400 },
    })
    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['portal', 'vendors', 'products', 'product-1', 'cost-centers'],
      }),
    )
    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['portal', 'vendors', 'vendor-1', 'products'] }),
    )
  })

  it('rejects Cost Center arrays and negative money before submission', async () => {
    render(
      <AppProviders>
        <VendorCostCenterEditorModal
          open
          productId="product-1"
          vendorId="vendor-1"
          onCancel={vi.fn()}
          onSaved={vi.fn()}
        />
      </AppProviders>,
    )
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Tee XL' } })
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'TEE-XL' } })
    fireEvent.change(screen.getByLabelText('Attributes'), { target: { value: '[]' } })
    fireEvent.change(screen.getByLabelText('Base cost'), { target: { value: '-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Attributes')).toHaveAttribute('aria-invalid', 'true'),
    )
    expect(createVendorCostCenter).not.toHaveBeenCalled()
  })

  it('preserves Cost Center fields on a detail-less duplicate conflict', async () => {
    vi.mocked(createVendorCostCenter).mockRejectedValue(
      new ApiError('Duplicate key', { status: 409 }),
    )
    render(
      <AppProviders>
        <VendorCostCenterEditorModal
          open
          productId="product-1"
          vendorId="vendor-1"
          onCancel={vi.fn()}
          onSaved={vi.fn()}
        />
      </AppProviders>,
    )
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Tee XL' } })
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'TEE-XL' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText(
        'A record with this code already exists. Review the form and choose another code.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Tee XL')
    expect(screen.getByLabelText('Code')).toHaveValue('TEE-XL')
  })

  it('keeps a dirty Cost Center modal open when discard is declined', () => {
    const onCancel = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(
      <AppProviders>
        <VendorCostCenterEditorModal
          open
          productId="product-1"
          vendorId="vendor-1"
          onCancel={onCancel}
          onSaved={vi.fn()}
        />
      </AppProviders>,
    )
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Unsaved center' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(window.confirm).toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
  })
})
