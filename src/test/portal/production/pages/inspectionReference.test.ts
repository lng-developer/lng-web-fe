import { describe, expect, it } from 'vitest'

import type { FileCheck, ProductionTask } from '@/features/portal/production/api/productionApi'
import { inspectionReference } from '@/features/portal/production/pages/inspectionReference'

describe('inspectionReference', () => {
  it('uses the sole extracted customization artwork when no buyer upload is linked', () => {
    const task = {
      customization: {
        customerInputs: { images: [] },
        imageAssets: [
          { assetId: 'artwork', assetDownloadUrl: '/api/media/assets/artwork/download' },
        ],
      },
    } as unknown as ProductionTask
    const check = { sourceType: 'CUSTOMER_IMAGE', inputAssetDownloadUrl: null } as FileCheck

    expect(inspectionReference(task, check)).toEqual({
      url: '/api/media/assets/artwork/download',
      type: 'CUSTOMIZATION_ARTWORK',
    })
  })
})
