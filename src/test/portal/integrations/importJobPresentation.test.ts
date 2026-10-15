import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import type { ImportJob } from '@/features/portal/integrations/api/integrationApi'
import {
  importJobSource,
  importJobResults,
} from '@/features/portal/integrations/pages/importJobPresentation'
const t = ((_key: string, options: { defaultValue: string }) => options.defaultValue) as TFunction
const job = {
  source: 'MANUAL_EXCEL',
  salesChannelCode: 'ETSY',
  marketplaceCode: 'ETSY_US',
  importedCount: 5,
  skippedCount: 0,
  failedCount: 0,
} as ImportJob
describe('import job presentation', () => {
  it('does not mislabel manual Etsy uploads as extension imports or a US destination', () => {
    expect(importJobSource(job, t)).toBe('Etsy report')
    expect(importJobSource({ ...job, importOrigin: 'EXTENSION' }, t)).toBe('Etsy Extension')
  })
  it('keeps historical processed rows distinct from newly created orders', () => {
    expect(importJobResults(job, t)).toContain('5 rows processed')
    expect(
      importJobResults(
        {
          ...job,
          resultSummary: { createdOrders: 0, updatedOrders: 5, openIssues: 4, addressIssues: 4 },
        },
        t,
      ),
    ).toContain('0 orders created / 5 orders updated')
  })
})
