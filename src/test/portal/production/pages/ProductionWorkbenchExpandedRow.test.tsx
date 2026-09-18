import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { ProductionTask } from '@/features/portal/production/api/productionApi'
import { ProductionWorkbenchExpandedRow } from '@/features/portal/production/pages/ProductionWorkbenchExpandedRow'

const task: ProductionTask = {
  id: 'task-1',
  status: 'NEED_SCALE',
  qcStatus: 'NOT_READY',
  blockers: [],
  assignedDesignUserId: null,
  designNote: null,
  readyAt: null,
  updatedAt: '2026-09-18T00:00:00.000Z',
  mainListingImageUrl: 'https://example.test/main-listing.jpg',
  amazonCustomizationPreviewUrl: 'https://example.test/customization-preview.jpg',
  fileChecks: [
    {
      id: 'front-check',
      slotKey: 'FRONT',
      slotLabel: 'Front',
      required: true,
      sourceType: 'CUSTOMER_IMAGE',
      inputAssetDownloadUrl: null,
      inputImageName: 'buyer-photo.jpg',
      outputAssetDownloadUrl: null,
      outputStatus: 'MISSING',
      qcStatus: 'NOT_READY',
      note: null,
    },
  ],
  customization: {
    customerInputs: {
      images: [{ assetId: 'buyer-photo', label: 'Upload Photo' }],
    },
    imageAssets: [
      {
        assetId: 'buyer-photo',
        assetDownloadUrl: '/api/media/assets/buyer-photo/download',
        filename: 'buyer-photo.jpg',
      },
      {
        assetId: 'product-details',
        assetDownloadUrl: '/api/media/assets/product-details/download',
        filename: 'product-details.jpg',
      },
    ],
  },
}

describe('ProductionWorkbenchExpandedRow', () => {
  it('downloads only buyer artwork linked to a scale slot', () => {
    render(
      <AppProviders>
        <ProductionWorkbenchExpandedRow
          task={task}
          tab="scale"
          canScale={false}
          canQc={false}
          decisions={{}}
          submittingQc={false}
          submittingScale={false}
          uploadingFileCheckIds={new Set()}
          onSaveNote={() => undefined}
          onSubmitQc={() => undefined}
          onSubmitScaleForQc={() => undefined}
          onUploadScaledOutput={() => undefined}
          onInspectSlot={() => undefined}
          onPassSlot={() => undefined}
          onManualSlotUploaded={() => undefined}
        />
      </AppProviders>,
    )

    expect(screen.getByRole('button', { name: /Download customer images \(1\)/ })).toBeVisible()
    expect(screen.getByText('Main listing')).toBeVisible()
    expect(screen.getByText('Amazon customization preview').closest('details')).not.toHaveAttribute(
      'open',
    )
  })
})
