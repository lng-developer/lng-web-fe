import { describe, expect, it } from 'vitest'

import createDesignTaskModalSource from '@/features/portal/design/pages/CreateDesignTaskModal.tsx?raw'
import designSource from '@/features/portal/design/pages/DesignWorkbenchPage.tsx?raw'
import productionSource from '@/features/portal/production/pages/ProductionWorkbenchPage.tsx?raw'
import submissionsSource from '@/features/portal/vendor-submissions/pages/VendorSubmissionWorkbenchPage.tsx?raw'

describe('Fulfillment listing display contract', () => {
  it('keeps queue rows compact by rendering SKU without long listing titles', () => {
    expect(designSource).not.toContain("{row.listing?.title ?? row.internalTemplate?.name ?? '-'}")
    expect(designSource).not.toContain('task.listing?.title')
    expect(createDesignTaskModalSource).not.toContain('`${sku} - ${title}`')
    expect(productionSource).not.toContain("{row.orderItem?.title || '-'}")
    expect(submissionsSource).not.toContain("{row.listingTitle || row.vendorProductName || '-'}")
  })
})
