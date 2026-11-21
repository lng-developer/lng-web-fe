import { describe, expect, it } from 'vitest'

import columnsSource from '@/features/portal/production/components/ProductionWorkbenchColumns.tsx?raw'
import modalsSource from '@/features/portal/production/components/ProductionWorkbenchActionModals.tsx?raw'
import rowSource from '@/features/portal/production/components/ProductionGroupedOrderRow.tsx?raw'
import source from '@/features/portal/production/pages/ProductionWorkbenchPage.tsx?raw'

const combinedSource = `${source}\n${columnsSource}\n${modalsSource}\n${rowSource}`

describe('ProductionWorkbenchPage source contract', () => {
  it('uses deferred search and cached lists', () => {
    expect(combinedSource).toContain('useDeferredValue(search)')
    expect(combinedSource).toContain('placeholderData: keepPreviousData')
    expect(combinedSource).toContain('const displayedTasks = useDeferredValue(tasks.data)')
  })

  it('keeps expanded inline rows with full toolbar context', () => {
    expect(combinedSource).toContain('expandedRowRender: (row) =>')
    expect(combinedSource).toContain('expandedRowKeys')
    expect(combinedSource).toContain('showExpandColumn: false')
    expect(combinedSource).toContain('ProductionWorkbenchExpandedRow')
  })

  it('supports bulk actions with single-item fast path', () => {
    expect(combinedSource).toContain("if (input.kind === 'bulk-assign')")
    expect(combinedSource).toContain(
      'if (taskIds.length === 1) return assignProductionTask(taskIds[0], scaleAssigneeId!)',
    )
    expect(combinedSource).toContain('return bulkAssignProductionTasks(taskIds, scaleAssigneeId!)')
    expect(combinedSource).toMatch(
      /onBulkAssign=\{handleBulkAssign\}|onBulkAssign=\{.*bulk-assign.*\}/,
    )
  })

  it('scopes assign permissions to the Scale queue and keeps QC operations separate', () => {
    expect(combinedSource).toContain('const canAssignScale =')
    expect(combinedSource).toMatch(
      /allowed\.has\('PRODUCTION:WRITE'\)\s*\|\|\s*allowed\.has\('PRODUCTION:SCALE_ASSIGN'\)/,
    )
    expect(combinedSource).toContain("canUseScopedPermission(account, 'PRODUCTION:QC_REVIEW'")
    expect(combinedSource).toContain('rowSelection={')
    expect(combinedSource).toContain('preserveSelectedRowKeys: true')
    expect(combinedSource).toMatch(
      /onPassSlot=\{handleQcSlotPass\}|onPassSlot=\{.*handleSetInspectionDecision.*PASSED.*\}/,
    )
    expect(combinedSource).toMatch(/onPass=\{handleInspectionPass\}|onPass=\{onPassInspect\}/)
  })

  it('keeps PSD-missing tasks in the blocked queue and shows their blockers', () => {
    expect(combinedSource).toContain("psdReadyOnly: tab !== 'blocked'")
    expect(combinedSource).toContain("title: t('portal.production.blockers')")
    expect(combinedSource).toContain("(row.blockers || []).join(', ')")
  })

  it('keeps queue navigation outside the queue card', () => {
    expect(source.indexOf('<div className={styles.queueToolbar}>')).toBeLessThan(
      source.indexOf('<section className={styles.queuePane}'),
    )
  })
})
