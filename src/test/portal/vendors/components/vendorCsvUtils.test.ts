import { describe, expect, it } from 'vitest'

import {
  buildImportTemplate,
  COST_CENTER_IMPORT_SAMPLE_ROW,
  COST_CENTER_IMPORT_TEMPLATE_HEADERS,
  parseCsv,
  parseMoneyField,
  parseVendorTemplateCsv,
  PRODUCT_IMPORT_SAMPLE_ROWS,
  PRODUCT_IMPORT_TEMPLATE_HEADERS,
} from '@/features/portal/vendors/components/vendorCsvUtils'

describe('parseVendorTemplateCsv', () => {
  it('preserves the canonical camel-case header contract required by the catalog importer', () => {
    expect(parseVendorTemplateCsv('vendorCode,code,name\nPRINTWAY,TEE,Tee')).toEqual([
      { vendorCode: 'PRINTWAY', code: 'TEE', name: 'Tee' },
    ])
  })
})

describe('Vendor CSV Import Template Alignment', () => {
  it('has exact 1-to-1 matching column count between product headers and sample rows', () => {
    const headerCount = PRODUCT_IMPORT_TEMPLATE_HEADERS.length
    for (const sampleRow of PRODUCT_IMPORT_SAMPLE_ROWS) {
      expect(sampleRow).toHaveLength(headerCount)
    }
  })

  it('has exact 1-to-1 matching column count between cost center headers and sample row', () => {
    expect(COST_CENTER_IMPORT_SAMPLE_ROW).toHaveLength(COST_CENTER_IMPORT_TEMPLATE_HEADERS.length)
  })

  it('buildImportTemplate produces valid parseable CSV with matching headers and values', () => {
    const productCsv = buildImportTemplate({ kind: 'product', vendorId: 'v123' })
    const productRows = parseCsv(productCsv)
    expect(productRows).toHaveLength(PRODUCT_IMPORT_SAMPLE_ROWS.length)
    expect(productRows[0].code).toBe('TP-SHIRT')
    expect(productRows[0].basecostamount).toBe('12.00')
    expect(productRows[0].domesticeconomyamount).toBe('4.50')

    const costCenterCsv = buildImportTemplate({
      kind: 'costCenter',
      productId: 'p123',
      vendorId: 'v123',
      productName: 'T-Shirt',
    })
    const costCenterRows = parseCsv(costCenterCsv)
    expect(costCenterRows).toHaveLength(1)
    expect(costCenterRows[0].code).toBe('TC-100')
    expect(costCenterRows[0].basecostamount).toBe('8.00')
    expect(costCenterRows[0].domesticeconomyamount).toBe('4.50')
  })
})

describe('parseMoneyField', () => {
  it('parses decimal dollar values', () => {
    expect(parseMoneyField('12.00')).toBe(12)
    expect(parseMoneyField('12.5')).toBe(12.5)
    expect(parseMoneyField('4.50')).toBe(4.5)
    expect(parseMoneyField('$12.50')).toBe(12.5)
  })

  it('parses integer minor units or numbers', () => {
    expect(parseMoneyField('1200')).toBe(1200)
    expect(parseMoneyField('0')).toBe(0)
    expect(parseMoneyField('')).toBeUndefined()
    expect(parseMoneyField(undefined)).toBeUndefined()
  })

  it('returns NaN for invalid or negative inputs', () => {
    expect(Number.isNaN(parseMoneyField('abc'))).toBe(true)
    expect(Number.isNaN(parseMoneyField('-10'))).toBe(true)
  })
})
