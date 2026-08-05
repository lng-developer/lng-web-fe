import { describe, expect, it } from 'vitest'

import source from '@/features/portal/production/pages/ProductionWorkbenchPage.tsx?raw'

describe('ProductionWorkbenchPage source contract', () => {
  it('keeps vendor handoff out of the Scale queue and groups assignment controls', () => {
    expect(source).not.toContain("kind: 'bulk-push'")
    expect(source).not.toContain('bulkPushProductionTasks')
    expect(source).toContain('styles.assignmentGroup')
  })

  it('supports synchronized pointer panning without rerendering on every move', () => {
    expect(source).toContain('onPointerDown={startPan}')
    expect(source).toContain('onPointerMove={movePan}')
    expect(source).toContain('setPointerCapture(event.pointerId)')
    expect(source).toContain("setProperty('--inspect-pan-x'")
    expect(source).toContain('styles.pannableImage')
  })

  it('keeps Scale assignment controls out of the QC queue', () => {
    expect(source).toContain("const canAssignScale = tab === 'scale' && canScale")
    expect(source).toContain('{canAssignScale ? (')
    expect(source).toContain('rowSelection={')
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
})
