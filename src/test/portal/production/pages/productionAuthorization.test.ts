import { describe, expect, it } from 'vitest'
import { isOwnProductionOutput } from '@/features/portal/production/pages/productionAuthorization'
import type { ProductionTask, FileCheck } from '@/features/portal/production/api/productionApi'

describe('own production output', () => {
  const task = {
    assignedDesignUserId: 'other',
    csAssigneeId: 'other',
    qcPreviewFileChecks: [{ outputAssetId: 'asset', outputWorkerId: 'me' } as FileCheck],
  } as ProductionTask

  it('retains the worker identity after reassignment', () => {
    expect(isOwnProductionOutput(task, 'me')).toBe(true)
    expect(isOwnProductionOutput(task, 'reviewer')).toBe(false)
  })
  it('checks both summary and detail outputs', () => {
    expect(isOwnProductionOutput({ ...task, fileChecks: [] }, 'me')).toBe(true)
  })
  it('uses assignment only for legacy outputs without worker identity', () => {
    expect(
      isOwnProductionOutput(
        {
          ...task,
          csAssigneeId: 'me',
          qcPreviewFileChecks: [{ outputAssetId: 'asset', outputWorkerId: null } as FileCheck],
        },
        'me',
      ),
    ).toBe(true)
    expect(isOwnProductionOutput(task, 'other')).toBe(false)
  })
})
