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

function renderExpandedRow(displayTask = task) {
  const onInspectSlot =
    vi.fn<(productionTask: ProductionTask, check: FileCheck, readonly?: boolean) => void>()
  const onPassSlot = vi.fn<(fileCheckId: string) => void>()

  render(
    <AppProviders>
      <ProductionWorkbenchExpandedRow
        task={displayTask}
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

  it('shows ZIP preview for text-only customization without treating it as buyer artwork', () => {
    renderExpandedRow({
      ...task,
      customization: {
        customerInputs: { images: [] },
        imageAssets: [
          {
            assetId: 'preview',
            mimeType: 'image/jpeg',
            assetDownloadUrl: 'https://assets.example.test/text-preview.jpg',
          },
        ],
      },
    })
    expect(screen.getByAltText('Amazon customization preview')).toHaveAttribute(
      'src',
      'https://assets.example.test/text-preview.jpg',
    )
    expect(
      screen.queryByRole('button', { name: /Download customer images/ }),
    ).not.toBeInTheDocument()
  })

  it('does not present Amazon base image as a customized preview when ZIP images are absent', () => {
    renderExpandedRow({ ...task, amazonCustomizationPreviewUrl: 'https://example.test/base.jpg' })
    expect(screen.queryByText('Amazon customization preview')).not.toBeInTheDocument()
  })

  it('opens a slot inspection from its thumbnail while retaining the pass action', () => {
    const { onInspectSlot, onPassSlot } = renderExpandedRow()

    fireEvent.click(screen.getByRole('button', { name: 'Inspect artwork · Front' }))
    expect(onInspectSlot).toHaveBeenCalledWith(task, task.fileChecks![0])

    fireEvent.click(screen.getByRole('button', { name: 'Pass slot' }))
    expect(onPassSlot).toHaveBeenCalledWith('front-check')
  })

  it('labels the design source independently from buyer artwork', () => {
    renderExpandedRow({
      ...task,
      scaleContext: {
        use: { psdTemplate: { assetDownloadUrl: '/api/media/assets/source/download' } },
      },
    })
    expect(screen.getByRole('button', { name: /Download PSD source/ })).toBeVisible()
  })

  it('shows missing source instead of offering a stale download', () => {
    renderExpandedRow({
      ...task,
      scaleContext: {
        use: {
          psdTemplate: {
            status: 'MISSING',
            assetDownloadUrl: '/api/media/assets/stale/download',
          },
        },
      },
    })
    expect(screen.getByText(/Design source missing/)).toBeVisible()
    expect(screen.queryByRole('button', { name: /Download PSD source/ })).not.toBeInTheDocument()
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
            assetDownloadUrl: 'https://assets.example.test/order-preview.jpg',
            filename: 'product-details.jpg',
            mimeType: 'image/jpeg',
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
    expect(screen.getByAltText('Amazon customization preview')).toHaveAttribute(
      'src',
      'https://assets.example.test/order-preview.jpg',
    )
    expect(screen.queryByRole('img', { name: 'buyer-photo.jpg' })).not.toBeInTheDocument()
    expect(screen.getByText('Amazon customization preview').closest('details')).not.toHaveAttribute(
      'open',
    )
  })
})
