import { describe, expect, it } from 'vitest'

import migrationTabSource from '@/features/portal/vendors/pages/VendorMigrationTabPage.tsx?raw'
import productsTabSource from '@/features/portal/vendors/pages/VendorWorkspaceProductsTabPage.tsx?raw'
import vendorsTabSource from '@/features/portal/vendors/pages/VendorWorkspaceVendorsTabPage.tsx?raw'

describe('Vendor workspace responsive tabs', () => {
  it('lets Products data scroll instead of covering columns with fixed actions', () => {
    expect(productsTabSource).not.toMatch(/fixed:\s*'right'/)
    expect(productsTabSource).toContain('scroll={{ x: 1200 }}')
    expect(productsTabSource).not.toContain('showSizeChanger: false')
  })

  it('shows the product image instead of a redundant vendor-code column', () => {
    expect(productsTabSource).toContain("dataIndex: 'imageUrl'")
    expect(productsTabSource).not.toContain("title: t('portal.vendors.vendorCode')")
  })

  it('gives Migration review a dedicated horizontal table scroll', () => {
    expect(migrationTabSource).toContain(
      "import { CoreDataTable } from '@/app/common/CoreDataTable'",
    )
    expect(migrationTabSource).toContain('<CoreDataTable')
    expect(migrationTabSource).toContain('fillViewport')
    expect(migrationTabSource).toContain('paginationAtBottom')
    expect(migrationTabSource).toContain('scroll={{ x: 900 }}')
    expect(migrationTabSource).toContain('pagination={{')
    expect(migrationTabSource).not.toContain('showSizeChanger: false')
    expect(migrationTabSource).not.toMatch(
      /title:\s*t\('portal\.vendors\.migration\.variants'\)[\s\S]*?align:\s*'right'/,
    )
  })

  it('keeps the shared page-size selector available in Vendors', () => {
    expect(vendorsTabSource).not.toContain('showSizeChanger: false')
  })
})
