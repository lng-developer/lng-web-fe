import { describe, expect, it } from 'vitest'

import { appRoutes } from '@/app/router/router'

describe('route loading contract', () => {
  it('lazy-loads business routes while keeping the foundation static', () => {
    const workspace = appRoutes.find((route) => route.children)
    const childByPath = new Map(workspace?.children?.map((route) => [route.path, route]))

    for (const path of [
      'auth/accounts',
      'auth/access-control',
      'organization',
      'hr/*',
      'portal/shops',
      'portal/vendors',
      'portal/integrations',
    ]) {
      expect(childByPath.get(path)?.lazy).toBeTypeOf('function')
      expect(childByPath.get(path)?.element).toBeUndefined()
    }
    expect(childByPath.get('portal/dashboard')?.element).toBeDefined()
  })

  it('does not retain compatibility routes that bypass the current menu', () => {
    const workspace = appRoutes.find((route) => route.children)
    const childByPath = new Map(workspace?.children?.map((route) => [route.path, route]))

    for (const path of [
      'operations-dashboard',
      'foundation',
      'auth/roles',
      'auth/permissions',
      'auth/scopes',
      'auth/access',
      'portal/listing/:salesChannelCode',
      'portal/mapping/workbench',
      'portal/mapping/sku-rules',
      'portal/mapping/product-mapping',
      'portal/mapping/input-semantics',
      'portal/mapping/value-aliases',
      'portal/mapping/vendor-routing',
    ]) {
      expect(childByPath.has(path)).toBe(false)
    }
  })

  it('does not refresh the workspace session for child-route navigation', () => {
    const workspace = appRoutes.find((route) => route.children)

    expect(workspace?.shouldRevalidate?.({} as never)).toBe(false)
  })
})
