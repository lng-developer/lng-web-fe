import { describe, expect, it } from 'vitest'

import { appRoutes } from '@/app/router/router'

describe('Portal Mapping routes', () => {
  it('exposes one canonical Mapping workspace and legacy redirects', () => {
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
    expect(typeof mappingRoutes[0]?.lazy).toBe('function')
    expect(mappingRoutes.slice(1).every(({ element }) => element !== undefined)).toBe(true)
  })
})
