import { describe, expect, it } from 'vitest'

import createModalSource from '@/features/portal/design/pages/CreateDesignTaskModal.tsx?raw'
import workbenchSource from '@/features/portal/design/pages/DesignWorkbenchPage.tsx?raw'

describe('design file selectors', () => {
  it('reuse the shared FileUpload component', () => {
    expect(createModalSource).toContain('<FileUpload')
    expect(workbenchSource).toContain('<FileUpload')
    expect(createModalSource).not.toContain('<Upload.Dragger')
    expect(workbenchSource).not.toContain('<Upload.Dragger')
  })
})
