import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { FileCheck, ProductionTask } from '@/features/portal/production/api/productionApi'
import { ProductionWorkbenchExpandedRow } from '@/features/portal/production/pages/ProductionWorkbenchExpandedRow'
import i18n from '@/shared/i18n/i18n'

const task: ProductionTask = {
  id: 'production-task-1',
  status: 'QC_PENDING',
  qcStatus: 'PENDING',
  blockers: [],
  assignedDesignUserId: null,
  csNote: 'Use the customer-provided artwork.',
  designNote: null,
  readyAt: null,
  updatedAt: '2026-09-17T00:00:00.000Z',
  fileChecks: [
    {
      id: 'front-check',
      slotKey: 'FRONT',
      slotLabel: 'Front',
      required: true,
      inputAssetDownloadUrl: null,
      outputAssetDownloadUrl: 'https://assets.example.test/front.png',
      outputStatus: 'READY',
      qcStatus: 'PENDING',
      note: null,
    },
  ],
}

function renderExpandedRow() {
  const onInspectSlot =
    vi.fn<(productionTask: ProductionTask, check: FileCheck, readonly?: boolean) => void>()
  const onPassSlot = vi.fn<(fileCheckId: string) => void>()

  render(
    <AppProviders>
      <ProductionWorkbenchExpandedRow
        task={task}
        tab="qc"
        canScale={false}
        canQc
        decisions={{}}
        submittingQc={false}
        submittingScale={false}
        uploadingFileCheckIds={new Set()}
        onSaveNote={vi.fn()}
        onSubmitQc={vi.fn()}
        onSubmitScaleForQc={vi.fn()}
        onUploadScaledOutput={vi.fn()}
        onInspectSlot={onInspectSlot}
        onPassSlot={onPassSlot}
        onManualSlotUploaded={vi.fn()}
      />
    </AppProviders>,
  )

  return { onInspectSlot, onPassSlot }
}

describe('ProductionWorkbenchExpandedRow', () => {
  afterEach(cleanup)

  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('opens a slot inspection from its thumbnail while retaining the pass action', () => {
    const { onInspectSlot, onPassSlot } = renderExpandedRow()

    fireEvent.click(screen.getByRole('button', { name: 'Inspect artwork · Front' }))
    expect(onInspectSlot).toHaveBeenCalledWith(task, task.fileChecks![0])

    fireEvent.click(screen.getByRole('button', { name: 'Pass slot' }))
    expect(onPassSlot).toHaveBeenCalledWith('front-check')
  })

  it('downloads only buyer artwork linked to a scale slot', () => {
    const artworkTask: ProductionTask = {
      ...task,
      status: 'NEED_SCALE',
      qcStatus: 'NOT_READY',
      mainListingImageUrl: 'https://example.test/main-listing.jpg',
      amazonCustomizationPreviewUrl: 'https://example.test/customization-preview.jpg',
      fileChecks: [
        {
          ...task.fileChecks![0],
          sourceType: 'CUSTOMER_IMAGE',
          inputImageName: 'buyer-photo.jpg',
          outputAssetDownloadUrl: null,
          outputStatus: 'MISSING',
          qcStatus: 'NOT_READY',
        },
      ],
      customization: {
        customerInputs: { images: [{ assetId: 'buyer-photo', label: 'Upload Photo' }] },
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

    render(
      <AppProviders>
        <ProductionWorkbenchExpandedRow
          task={artworkTask}
          tab="scale"
          canScale={false}
          canQc={false}
          decisions={{}}
          submittingQc={false}
          submittingScale={false}
          uploadingFileCheckIds={new Set()}
          onSaveNote={vi.fn()}
          onSubmitQc={vi.fn()}
          onSubmitScaleForQc={vi.fn()}
          onUploadScaledOutput={vi.fn()}
          onInspectSlot={vi.fn()}
          onPassSlot={vi.fn()}
          onManualSlotUploaded={vi.fn()}
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
