import assert from 'node:assert/strict'
import test from 'node:test'

import { BACKEND_ENDPOINTS } from './backendEndpoints.js'
import {
  findPairedBackendRoot,
  parseExpressRoutes,
  readExpressRoutes,
} from './backendRoutes.testUtils.js'

const beRoot = findPairedBackendRoot()

const routeFiles = [
  ['auth', '/api/auth', 'src/modules/auth/routes/index.js'],
  ['catalog', '/api/catalog', 'src/modules/catalog/routes/index.js'],
  ['orders', '/api/orders', 'src/modules/order/routes/index.js'],
  ['customizations', '/api/customizations', 'src/modules/customization/routes/index.js'],
  ['production', '/api/production', 'src/modules/production/routes/index.js'],
  ['finance', '/api/finance', 'src/modules/finance/routes/index.js'],
  ['design', '/api/design', 'src/modules/design/routes/index.js'],
  ['media', '/api/media', 'src/modules/media/routes/index.js'],
  ['mapping', '/api/mapping', 'src/modules/mapping/routes/index.js'],
  ['shipments', '/api/shipments', 'src/modules/shipment/routes/index.js'],
  ['vendors', '/api/vendors', 'src/modules/vendor/routes/index.js'],
  ['shops', '/api/shops', 'src/modules/shop/routes/index.js'],
  ['organization', '/api/organization', 'src/modules/organization/routes/index.js'],
  ['audit', '/api/audit', 'src/modules/audit/routes/index.js'],
  ['reports', '/api/reports', 'src/modules/report/routes/index.js'],
  ['hr', '/api/hr', 'src/modules/hr/routes/index.js'],
  ['vendor-submissions', '/api/vendor-submissions', 'src/modules/vendorSubmission/routes/index.js'],
  ['integration', '/api/integration', 'src/modules/integration/routes/index.js'],
  [
    'external-order-imports',
    '/api/integration/external-order-imports',
    'src/modules/integration/externalOrderImport/routes/externalOrderImport.routes.js',
  ],
]

function key(moduleId, method, routePath) {
  return `${moduleId}|${method.toUpperCase()}|${routePath}`
}

function readBackendRoutes() {
  return routeFiles.flatMap((routeFile) => readExpressRoutes(beRoot, routeFile))
}

test('backend route parsing ignores commented and string-only router calls', () => {
  const source = `
    // router.get('/commented-out', handler)
    /* router.delete('/also-commented-out', handler) */
    const example = "router.post('/inside-a-string', handler)"
    router.patch('/live/:profileId', handler)
  `

  assert.deepEqual(parseExpressRoutes(source, ['fixture', '/api/fixture']), [
    {
      moduleId: 'fixture',
      method: 'PATCH',
      path: '/api/fixture/live/:profileId',
    },
  ])
})

test(
  'backend endpoint registry exactly covers every backend non-health route',
  { skip: !beRoot },
  () => {
    const allBackendKeys = readBackendRoutes()
      .map((route) => key(route.moduleId, route.method, route.path))
      .sort()
    const backendKeys = allBackendKeys.filter((routeKey) => !routeKey.endsWith('/health'))
    const registryKeys = BACKEND_ENDPOINTS.map((route) =>
      key(route.moduleId, route.method, route.path),
    ).sort()
    const missing = backendKeys.filter((routeKey) => !registryKeys.includes(routeKey))
    const stale = registryKeys.filter((routeKey) => !allBackendKeys.includes(routeKey))

    assert.deepEqual({ missing, stale }, { missing: [], stale: [] })
  },
)
