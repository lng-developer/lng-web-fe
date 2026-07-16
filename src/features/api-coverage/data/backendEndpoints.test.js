import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { BACKEND_ENDPOINTS } from './backendEndpoints.js'

const beRoot = path.resolve(process.cwd(), '..', 'lng-web-be')

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
  ['vendor-submissions', '/api/vendor-submissions', 'src/modules/vendorSubmission/routes/index.js'],
  ['integration', '/api/integration', 'src/modules/integration/routes/index.js'],
  [
    'external-order-imports',
    '/api/integration/external-order-imports',
    'src/modules/integration/externalOrderImport/routes/externalOrderImport.routes.js',
  ],
]

function joinRoute(base, routePath) {
  return `${base}/${routePath}`.replace(/\/+/g, '/').replace(/\/$/, '')
}

function normalize(routePath) {
  return routePath.replace(/:[A-Za-z0-9_]+/g, ':param')
}

function key(method, routePath) {
  return `${method.toUpperCase()} ${normalize(routePath)}`
}

function readBackendRoutes() {
  return routeFiles.flatMap(([moduleId, basePath, filePath]) => {
    const source = fs.readFileSync(path.join(beRoot, filePath), 'utf8')
    const routes = []
    const routePattern = /router\.(get|post|patch|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gms
    let match = routePattern.exec(source)

    while (match) {
      const [, method, routePath] = match
      const fullPath = joinRoute(basePath, routePath)
      if (!fullPath.endsWith('/health')) {
        routes.push({ moduleId, method: method.toUpperCase(), path: fullPath })
      }
      match = routePattern.exec(source)
    }

    return routes
  })
}

test('backend endpoint registry covers every backend non-health route', () => {
  const backendKeys = readBackendRoutes()
    .map((route) => key(route.method, route.path))
    .sort()
  const registryKeys = BACKEND_ENDPOINTS.map((route) => key(route.method, route.path)).sort()
  const missing = backendKeys.filter((routeKey) => !registryKeys.includes(routeKey))

  assert.deepEqual(missing, [])
})
