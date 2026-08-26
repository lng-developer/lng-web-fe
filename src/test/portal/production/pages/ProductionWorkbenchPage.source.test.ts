import { describe, expect, it } from 'vitest'

import source from '@/features/portal/production/pages/ProductionWorkbenchPage.tsx?raw'

describe('ProductionWorkbenchPage source contract', () => {
  it('uses deferred search and cached lists', () => {
    expect(source).toContain('useDeferredValue(search)')
    expect(source).toContain('placeholderData: keepPreviousData')
    expect(source).toContain('const displayedTasks = useDeferredValue(tasks.data)')
  })

  it('keeps expanded inline rows with full toolbar context', () => {
    expect(source).toContain('expandedRowRender: (row) =>')
    expect(source).toContain('expandedRowKeys')
    expect(source).toContain('onExpandedRowsChange')
    expect(source).toContain('ProductionWorkbenchExpandedRow')
  })

  it('supports bulk actions with single-item fast path', () => {
    expect(source).toContain("if (input.kind === 'bulk-assign')")
    expect(source).toContain(
      'if (taskIds.length === 1) return assignProductionTask(taskIds[0], scaleAssigneeId!)',
    )
    expect(source).toContain('return bulkAssignProductionTasks(taskIds, scaleAssigneeId!)')
    expect(source).toContain('onBulkAssign={handleBulkAssign}')
  })

  it('scopes assign permissions to the Scale queue and keeps QC operations separate', () => {
    expect(source).toContain('const canAssignScale =')
    expect(source).toContain("allowed.has('PRODUCTION:WRITE') || hasScopedScaleAssign")
    expect(source).toContain("hasScopedPermission(account, 'DESIGN:REVIEW', 'team')")
    expect(source).toContain('rowSelection={')
    expect(source).toContain('preserveSelectedRowKeys: true')
    expect(source).toContain('onPassSlot={handleQcSlotPass}')
    expect(source).toContain('onPass={handleInspectionPass}')
  })

  it('keeps PSD-missing tasks in the blocked queue and shows their blockers', () => {
    expect(source).toContain("psdReadyOnly: tab !== 'blocked'")
    expect(source).toContain("title: t('portal.production.blockers')")
    expect(source).toContain("(row.blockers || []).join(', ')")
  })
})
