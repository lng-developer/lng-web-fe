import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { ArtworkInspector } from '@/features/portal/production/pages/ArtworkInspector'
import type { ProductionTask } from '@/features/portal/production/api/productionApi'

vi.mock('@/shared/media', () => ({
  AuthenticatedMediaImage: ({ alt, downloadUrl }: { alt: string; downloadUrl: string }) => (
    <img alt={alt} src={downloadUrl} />
  ),
}))

const mockTask: ProductionTask = {
  id: 'task-123',
  status: 'NEED_SCALE',
  qcStatus: 'PENDING',
  designType: 'CUSTOM_IMAGE',
  blockers: [],
  assignedDesignUserId: null,
  designNote: null,
  csNote: 'Customer requested bold text on design',
  readyAt: null,
  updatedAt: '2026-11-08T00:00:00Z',
  customization: {
    customerInputs: {
      'Custom Name': 'Ms. Buxton',
      'Design Option': 'Design D',
    },
  },
}

describe('ArtworkInspector', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('compares linked buyer artwork with output and never falls back to the main listing', () => {
    render(
      <AppProviders>
        <ArtworkInspector
          check={{
            id: 'front',
            slotKey: 'FRONT',
            slotLabel: 'Front',
            required: true,
            inputAssetDownloadUrl: null,
            outputAssetDownloadUrl: '/api/media/assets/scaled-output/download',
            outputStatus: 'SCALED',
            qcStatus: 'PENDING',
            note: null,
          }}
          originalInputUrl="/api/media/assets/buyer-upload/download"
          originalInputLabel="Customization artwork"
          listingReferenceUrl="https://example.test/main-listing.jpg"
          onClose={() => undefined}
          onPass={() => undefined}
          onReject={() => undefined}
        />
      </AppProviders>,
    )

    expect(screen.getByAltText(/Original/)).toHaveAttribute(
      'src',
      '/api/media/assets/buyer-upload/download',
    )
    expect(screen.getByText(/Customization artwork/)).toBeVisible()
    expect(screen.queryByRole('img', { name: 'Main listing reference' })).not.toBeInTheDocument()
  })

  it('displays customer inputs and CS note in persistent right sidebar by default', () => {
    render(
      <AppProviders>
        <ArtworkInspector
          check={{
            id: 'front',
            slotKey: 'FRONT',
            slotLabel: 'Front',
            required: true,
            inputAssetDownloadUrl: '/api/media/assets/input/download',
            outputAssetDownloadUrl: '/api/media/assets/output/download',
            outputStatus: 'SCALED',
            qcStatus: 'PENDING',
            note: null,
          }}
          task={mockTask}
          onClose={() => undefined}
          onPass={() => undefined}
          onReject={() => undefined}
        />
      </AppProviders>,
    )

    // Sidebar should be open immediately without clicking any popover
    expect(screen.getByText('Customer requested bold text on design')).toBeVisible()
    expect(screen.getByText('Ms. Buxton')).toBeVisible()
    expect(screen.getByText('Design D')).toBeVisible()
  })

  it('supports collapsing and expanding the sidebar via toggle button and keyboard shortcut', () => {
    render(
      <AppProviders>
        <ArtworkInspector
          check={{
            id: 'front',
            slotKey: 'FRONT',
            slotLabel: 'Front',
            required: true,
            inputAssetDownloadUrl: '/api/media/assets/input/download',
            outputAssetDownloadUrl: '/api/media/assets/output/download',
            outputStatus: 'SCALED',
            qcStatus: 'PENDING',
            note: null,
          }}
          task={mockTask}
          onClose={() => undefined}
          onPass={() => undefined}
          onReject={() => undefined}
        />
      </AppProviders>,
    )

    // Collapse using sidebar collapse button
    const collapseBtn = screen.getByRole('button', { name: 'Collapse sidebar' })
    fireEvent.click(collapseBtn)

    // Customer input details should now be hidden
    expect(screen.queryByText('Ms. Buxton')).not.toBeInTheDocument()

    // Reopen using title toggle button
    const titleToggleBtn = screen.getByRole('button', { name: /Customer inputs/i })
    fireEvent.click(titleToggleBtn)

    // Input details visible again
    expect(screen.getByText('Ms. Buxton')).toBeVisible()

    // Toggle via keyboard shortcut 'i'
    fireEvent.keyDown(window, { key: 'i' })
    expect(screen.queryByText('Ms. Buxton')).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'i' })
    expect(screen.getByText('Ms. Buxton')).toBeVisible()
  })

  it('copies customer input values to clipboard when clicking copy button', async () => {
    render(
      <AppProviders>
        <ArtworkInspector
          check={{
            id: 'front',
            slotKey: 'FRONT',
            slotLabel: 'Front',
            required: true,
            inputAssetDownloadUrl: '/api/media/assets/input/download',
            outputAssetDownloadUrl: '/api/media/assets/output/download',
            outputStatus: 'SCALED',
            qcStatus: 'PENDING',
            note: null,
          }}
          task={mockTask}
          onClose={() => undefined}
          onPass={() => undefined}
          onReject={() => undefined}
        />
      </AppProviders>,
    )

    const copyBtn = screen.getByRole('button', { name: 'Copy Custom Name' })
    fireEvent.click(copyBtn)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Ms. Buxton')
  })
})
