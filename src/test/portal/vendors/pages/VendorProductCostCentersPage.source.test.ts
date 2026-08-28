import { describe, expect, it } from 'vitest'

import routerSource from '@/app/router/router.tsx?raw'
import editorTemplateSource from '@/features/portal/vendors/pages/VendorCostCenterEditorModal.tsx?raw'
import costCentersPageSource from '@/features/portal/vendors/pages/VendorProductCostCentersPage.tsx?raw'

describe('VendorProductCostCentersPage', () => {
  it('loads the selected product and its cost centers from the route product id', () => {
    expect(costCentersPageSource).toContain('useParams')
    expect(costCentersPageSource).toContain('getVendorProduct')
    expect(costCentersPageSource).toContain('listVendorCostCenters')
  })

  it('registers the dedicated cost center URL behind the Vendor read permission', () => {
    expect(routerSource).toContain("path: 'portal/vendors/products/:productId/cost-centers'")
    expect(routerSource).toContain('<VendorProductCostCentersPage />')
  })

  it('expands the selected cost center into the shared inline detail and edit form', () => {
    expect(costCentersPageSource).toContain('VendorCostCenterEditorModal')
    expect(costCentersPageSource).toContain('expandedRowRender')
    expect(costCentersPageSource).toContain('setSelectedCostCenter(row)')
    expect(costCentersPageSource).not.toContain('navigate(`/portal/vendors/cost-centers/${row.id}`')
  })

  it('uses the inline template rather than a separate detail or edit route', () => {
    expect(costCentersPageSource).not.toContain('cost-centers/new')
    expect(costCentersPageSource).not.toContain('state: { costCenter: row, productId }')
    expect(editorTemplateSource).toContain("mode?: 'drawer' | 'page' | 'inline'")
  })

  it('changes the selected inline form from detail to edit in place', () => {
    expect(costCentersPageSource).toContain('readOnly={!isEditing}')
    expect(costCentersPageSource).toContain('onEdit={() => setIsEditing(true)}')
    expect(editorTemplateSource).toContain('readOnly')
  })

  it('renders inline cost center details as a nested table with editable cells', () => {
    expect(editorTemplateSource).toContain('inlineTableColumns')
    expect(editorTemplateSource).toContain('CoreDataTable')
    expect(editorTemplateSource).toContain('inlineTableFormContent')
  })

  it('maps the inline columns to the compact cost center response fields', () => {
    expect(editorTemplateSource).toContain('name="sku"')
    expect(editorTemplateSource).toContain('name="vendorColor"')
    expect(editorTemplateSource).toContain('name="printMethod"')
    expect(editorTemplateSource).toContain("title: 'Domestic shipping'")
    expect(editorTemplateSource).toContain('children:')
    expect(editorTemplateSource).toContain('addonAfter="USD"')
  })

  it('keeps shipping headers centered and puts inline editing in a compact action column', () => {
    expect(editorTemplateSource).toContain("title: t('vendors.costCenterActions')")
    expect(editorTemplateSource).toContain("align: 'center'")
    expect(editorTemplateSource).toContain('width: 100')
  })

  it('uses icons for inline actions and a status tag while viewing', () => {
    expect(editorTemplateSource).toContain('EditOutlined')
    expect(editorTemplateSource).toContain('SaveOutlined')
    expect(editorTemplateSource).toContain('CloseOutlined')
    expect(editorTemplateSource).toContain('StatusTag')
  })

  it('resolves unsaved-change feedback from the root i18n namespace', () => {
    expect(editorTemplateSource).toContain("i18n.t('actionFeedback.unsaved')")
    expect(editorTemplateSource).toContain("i18n.t('actionFeedback.failed')")
  })
})
