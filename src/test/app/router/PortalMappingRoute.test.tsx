import { describe, expect, it } from 'vitest'

import { appRoutes } from '@/app/router/router'

describe('Portal Mapping routes', () => {
  it('exposes a redirect, Workbench, and five lazy rule pages', () => {
    const workspace = appRoutes.find((route) => route.id === 'workspace')
    const mappingRoutes =
      workspace?.children?.filter(({ path }) => path?.startsWith('portal/mapping')) ?? []

    expect(mappingRoutes.map(({ path }) => path)).toEqual([
      'portal/mapping',
      'portal/mapping/workbench',
      'portal/mapping/sku-rules',
      'portal/mapping/product-mapping',
      'portal/mapping/input-semantics',
      'portal/mapping/value-aliases',
      'portal/mapping/vendor-routing',
    ])
    expect(mappingRoutes.slice(1).every(({ lazy }) => typeof lazy === 'function')).toBe(true)
  })
})
