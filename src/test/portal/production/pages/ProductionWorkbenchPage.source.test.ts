import { describe, expect, it } from 'vitest'

import source from '@/features/portal/production/pages/ProductionWorkbenchPage.tsx?raw'

describe('ProductionWorkbenchPage source contract', () => {
  it('keeps vendor handoff out of the Scale queue and supports bulk assignment', () => {
    expect(source).not.toContain("kind: 'bulk-push'")
    expect(source).not.toContain('bulkPushProductionTasks')
    expect(source).toContain("operations.mutate({ kind: 'bulk-assign' })")
    expect(source).toContain('taskIds.length === 1')
    expect(source).toContain('assignProductionTask(taskIds[0], scaleAssigneeId!)')
    expect(source).toContain('bulkAssignProductionTasks(taskIds, scaleAssigneeId!)')
  })

  it('keeps Scale assignment controls out of the QC queue', () => {
    expect(source).toContain("const canAssignScale = tab === 'scale' && canScale")
    expect(source).toContain('{canAssignScale ? (')
    expect(source).toContain('rowSelection={')
    expect(source).toContain("['NEED_SCALE', 'QC_REJECTED']")
  })

  it('keeps task work inline with the expanded order row', () => {
    expect(source).toContain('styles.workspace')
    expect(source).toContain('styles.queuePane')
    expect(source).toContain('<DataTable')
    expect(source).toContain('expandedRowRender: (row) =>')
    expect(source).toContain("check.sourceType !== 'PSD_TEMPLATE'")
    expect(source).toContain('styles.inlineSection')
    expect(source).toContain("title: t('portal.production.requiredSlots')")
    expect(source).not.toContain('<Drawer')
  })

  it('keeps every visible task expanded without a collapse control', () => {
    expect(source).toContain('expandedRowKeys: rows.map((row) => row.id)')
    expect(source).toContain('showExpandColumn: false')
    expect(source).not.toContain('onExpand:')
  })

  it('renders Scale directly from the list row without requesting task detail', () => {
    expect(source).not.toContain('getProductionTask')
    expect(source).toContain('const task = row')
    expect(source).toContain("view: tab === 'qc' ? ('QC' as const) : ('SCALE' as const)")
    expect(source).toContain('summary.data?.scaleQueue')
    expect(source).toContain('summary.data?.qcQueue')
  })

  it('keeps PSD downloads separate from customer artwork previews', () => {
    expect(source).toContain("check.sourceType === 'CUSTOMER_IMAGE'")
    expect(source).toContain('psdTemplate.assetDownloadUrl')
    expect(source).toContain("t('portal.production.downloadPsd')")
    expect(source).not.toContain('task?.scaleContext?.use?.psdTemplate?.assetDownloadUrl ??')
  })

  it('shows operational context and avoids duplicating source artwork in each slot', () => {
    expect(source).toContain('task.vendorProduct?.name')
    expect(source).toContain('task.fulfillQty')
    expect(source).toContain('updateDesignNote')
    expect(source).toContain('styles.noteEditor')
    expect(source).toContain('styles.slotOutput')
    expect(source).not.toContain('styles.slotPreviews')
  })

  it('uses the approved Product, Customization, Task, Output workspace structure', () => {
    expect(source).toContain('styles.productContext')
    expect(source).toContain('styles.customizationSection')
    expect(source).toContain('styles.taskMeta')
    expect(source).toContain('styles.outputSection')
  })

  it('keeps note typing local and restores manual slot upload', () => {
    expect(source).toContain('function TaskNoteEditor')
    expect(source).not.toContain('const [notes, setNotes]')
    expect(source).toContain('function ManualSlotUploadAction')
    expect(source).not.toContain('const [manualTarget, setManualTarget]')
    expect(source).toContain('<ManualSlotUploadModal')
    expect(source).toContain('uploadManualScaledOutput')
  })

  it('uses Fulfillment Plan cost-center size and color in task context', () => {
    expect(source).toContain('task.vendorCostCenter?.standardSize')
    expect(source).toContain('task.vendorCostCenter?.standardColor')
    expect(source).not.toContain('function findOption')
    expect(source).toContain("t('portal.production.size')")
    expect(source).toContain("t('portal.production.color')")
  })

  it('exposes the artwork inspector only to QC', () => {
    expect(source).toContain('function ArtworkInspector')
    expect(source).toContain("tab === 'qc' && canQc")
    expect(source).toContain("t('portal.production.inspect')")
  })

  it('supports synchronized QC zoom, pan, and background color inspection', () => {
    expect(source).toContain('onPointerDown={startPan}')
    expect(source).toContain('onPointerMove={movePan}')
    expect(source).toContain('setPointerCapture(event.pointerId)')
    expect(source).toContain('type="color"')
    expect(source).toContain('styles.pannableImage')
    expect(source).toContain('applyZoom(100)')
    expect(source).toContain("setProperty('--inspect-background'")
    expect(source).not.toContain('const [background, setBackground]')
  })

  it('supports pass and reject decisions inside the QC inspector', () => {
    expect(source).toContain('function QcDecisionControls')
    expect(source).toContain('onPass')
    expect(source).toContain('onReject')
  })

  it('shows QC feedback only on rejected Scale slots', () => {
    expect(source).toMatch(
      /tab === 'scale'\s*&&\s*check\.qcStatus === 'REJECTED'\s*&&\s*check\.note\?\.trim\(\)/,
    )
    expect(source).toContain('styles.rejectionNote')
    expect(source).toContain("t('portal.production.qcReworkRequired')")
  })

  it('shows CS note and keeps Product header compact', () => {
    expect(source).toContain('task.csNote ||')
    expect(source).toContain("t('portal.production.csNote')")
    expect(source).toContain('styles.productActions')
    expect(source).not.toContain('artworkCheck?.inputImageName')
  })

  it('labels vendor separately from vendor product', () => {
    expect(source).toContain("t('portal.production.vendor')")
    expect(source).toContain('{vendorName ||')
  })
})
