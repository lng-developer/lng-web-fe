import { describe, expect, it } from 'vitest'

import catalogSource from '@/features/portal/catalog/pages/CatalogListingWorkbenchPage.tsx?raw'
import designSource from '@/features/portal/design/pages/DesignWorkbenchPage.tsx?raw'
import psdSource from '@/features/portal/design/pages/PsdFileWorkspacePage.tsx?raw'
import orderSource from '@/features/portal/orders/pages/OrderInlinePanel.tsx?raw'
import productionSource from '@/features/portal/production/pages/ProductionWorkbenchPage.tsx?raw'
import workScoreSource from '@/features/portal/work-scores/pages/WorkScoreWorkbenchPage.tsx?raw'

describe('protected media consumer contract', () => {
  it('does not navigate or render protected MediaAsset URLs directly', () => {
    const files = [
      designSource,
      psdSource,
      catalogSource,
      orderSource,
      workScoreSource,
      productionSource,
    ]

    for (const source of files) {
      expect(source).not.toMatch(/href=\{[^}]*?(?:downloadUrl|assetDownloadUrl)/)
      expect(source).not.toMatch(
        /src=\{[^}]*?(?:downloadUrl|inputAssetDownloadUrl|outputAssetDownloadUrl)/,
      )
    }
  })

  it('does not link customization image URLs directly', () => {
    expect(orderSource).not.toContain('href={input.secureUrl}')
    expect(orderSource).not.toContain('downloadUrl={input.secureUrl}')
  })
})
