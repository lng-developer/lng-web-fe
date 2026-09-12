import { describe, expect, it } from 'vitest'

import internalTemplatesSource from '@/features/portal/catalog/pages/InternalTemplateManagementPage.tsx?raw'
import productTypesSource from '@/features/portal/catalog/pages/ProductTypeManagementPage.tsx?raw'

describe('catalog viewport tables', () => {
  it('keeps pagination docked to the bottom of full-page catalog tables', () => {
    expect(productTypesSource).toMatch(/<CoreDataTable[\s\S]*?fillViewport/)
    expect(internalTemplatesSource).toMatch(/<CoreDataTable[\s\S]*?fillViewport/)
  })
})
