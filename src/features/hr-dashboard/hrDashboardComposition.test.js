import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('./', import.meta.url)

async function source(path) {
  return readFile(new URL(path, root), 'utf8')
}

test('HR dashboard mounts lazily with employee-read access', async () => {
  const routes = await source('../../routes/index.jsx')

  assert.match(
    routes,
    /lazy\(\(\) => import\('@\/features\/hr-dashboard\/pages\/HrDashboardPage'\)\)/,
  )
  assert.match(routes, /HR_DASHBOARD[\s\S]*HR_EMPLOYEES:READ/)
})

test('HR dashboard forwards dateKey and renders each backend DTO section', async () => {
  const [query, page] = await Promise.all([
    source('api/hrDashboard.queries.js'),
    source('pages/HrDashboardPage.jsx'),
  ])

  assert.match(query, /ENDPOINTS\.HR\.DASHBOARD/)
  assert.match(query, /params:\s*\{\s*dateKey\s*\}/)
  assert.match(page, /OperationsPageShell/)
  assert.match(page, /employees\.total/)
  assert.match(page, /attendance\.coverageRate/)
  assert.match(page, /approvals\.totalPending/)
  assert.match(page, /attendance\.absent/)
})
