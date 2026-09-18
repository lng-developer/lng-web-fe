import { describe, expect, it } from 'vitest'

import { parseVendorTemplateCsv } from '@/features/portal/vendors/components/vendorCsvUtils'

describe('parseVendorTemplateCsv', () => {
  it('preserves the canonical camel-case header contract required by the catalog importer', () => {
    expect(parseVendorTemplateCsv('vendorCode,code,name\nPRINTWAY,TEE,Tee')).toEqual([
      { vendorCode: 'PRINTWAY', code: 'TEE', name: 'Tee' },
    ])
  })
})
