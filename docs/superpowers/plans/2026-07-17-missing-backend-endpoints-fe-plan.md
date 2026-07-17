# Missing Backend Endpoints FE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the FE endpoint registry and API console/workflow coverage up to date with backend routes that currently exist but are missing from `ENDPOINTS`.

**Architecture:** Keep the first pass thin: centralize route strings in `src/services/endpoints.js`, prove them with contract tests, and expose callable routes in the existing API workflow console. Do not add unused React Query hooks or new feature screens until a page actually consumes them.

**Tech Stack:** React, Vite, TanStack Query, MUI, Node test runner, existing `apiClient`.

## Global Constraints

- Use the shared `apiClient` and `ENDPOINTS`; do not add raw URLs in feature API code.
- No new dependencies.
- Keep route coverage read-only except for existing API workflow action buttons.
- Do not build new full CRUD screens in this pass.
- Preserve current uncommitted FE refactor work; do not revert unrelated changes.

---

## File Structure

- Modify: `src/services/endpoints.js`
  - Owns canonical FE route strings.
  - Add missing BE routes and fix stale `PRODUCTION.FILE_CHECK`.
- Modify: `src/services/endpoints.contract.test.js`
  - Proves new route helpers produce exact backend paths.
- Modify: `src/features/api-coverage/data/backendEndpoints.js`
  - Static route table powering Backend Endpoint Console and `API_WORKFLOWS` validation.
- Modify: `src/features/api-coverage/data/backendEndpoints.test.js`
  - Already compares the route table with backend files; run it after updating the table.
- Modify: `src/features/api-workflows/data/apiWorkflows.js`
  - Add safe console actions for missing callable endpoints.
- Modify: `src/features/pod-workbench/data/podModules.js`
  - Correct stale production contract labels and add missing logistics/vendor integration contract rows only as documentation.
- Optional later, not in this pass: `src/features/auth/api/auth.mutations.js`
  - Add logout only when header/store flow is ready to call it.
- Optional later, not in this pass: `src/features/vendors/*`
  - Add vendor integration UI only when there is a real settings surface.

---

### Task 1: Add Missing Endpoint Constants

**Files:**
- Modify: `src/services/endpoints.js`
- Test: `src/services/endpoints.contract.test.js`

**Interfaces:**
- Consumes: existing `ENDPOINTS` object.
- Produces:
  - `ENDPOINTS.AUTH.LOGOUT`
  - `ENDPOINTS.AUTH.REGISTER`
  - `ENDPOINTS.MAPPING.SUMMARY`
  - `ENDPOINTS.PRODUCTION.MANUAL_FILE_CHECK(taskId)`
  - `ENDPOINTS.PRODUCTION.MANUAL_SCALED_OUTPUT_FILE(taskId)`
  - `ENDPOINTS.SHIPMENTS.SUMMARY`
  - `ENDPOINTS.SHIPMENTS.RECHECK_VENDOR_TRACKING`
  - `ENDPOINTS.SHIPMENTS.RECHECK_SUBMITTED_VENDOR_TRACKING`
  - `ENDPOINTS.SHOPS.STATUS(shopId)`
  - `ENDPOINTS.VENDOR_SUBMISSIONS.SUMMARY`
  - `ENDPOINTS.VENDOR_SUBMISSIONS.SUBMIT_TO_VENDOR(id)`
  - `ENDPOINTS.VENDORS.INTEGRATION(vendorId)`
  - `ENDPOINTS.VENDORS.INTEGRATION_REFRESH(vendorId)`

- [ ] **Step 1: Write endpoint contract tests first**

Append this to `src/services/endpoints.contract.test.js`:

```js
test('missing backend endpoint constants match backend routes', () => {
  assert.equal(ENDPOINTS.AUTH.LOGOUT, '/api/auth/logout')
  assert.equal(ENDPOINTS.AUTH.REGISTER, '/api/auth/register')
  assert.equal(ENDPOINTS.MAPPING.SUMMARY, '/api/mapping/summary')
  assert.equal(
    ENDPOINTS.PRODUCTION.MANUAL_FILE_CHECK('task-1'),
    '/api/production/tasks/task-1/file-checks/manual',
  )
  assert.equal(
    ENDPOINTS.PRODUCTION.MANUAL_SCALED_OUTPUT_FILE('task-1'),
    '/api/production/tasks/task-1/file-checks/manual/scaled-output-file',
  )
  assert.equal(ENDPOINTS.SHIPMENTS.SUMMARY, '/api/shipments/summary')
  assert.equal(ENDPOINTS.SHIPMENTS.RECHECK_VENDOR_TRACKING, '/api/shipments/vendor-tracking/recheck')
  assert.equal(
    ENDPOINTS.SHIPMENTS.RECHECK_SUBMITTED_VENDOR_TRACKING,
    '/api/shipments/vendor-tracking/recheck-submitted',
  )
  assert.equal(ENDPOINTS.SHOPS.STATUS('shop-1'), '/api/shops/shop-1/status')
  assert.equal(ENDPOINTS.VENDOR_SUBMISSIONS.SUMMARY, '/api/vendor-submissions/summary')
  assert.equal(
    ENDPOINTS.VENDOR_SUBMISSIONS.SUBMIT_TO_VENDOR('submission-1'),
    '/api/vendor-submissions/submission-1/submit-to-vendor',
  )
  assert.equal(
    ENDPOINTS.VENDORS.INTEGRATION('vendor-1'),
    '/api/vendors/vendor-1/integration',
  )
  assert.equal(
    ENDPOINTS.VENDORS.INTEGRATION_REFRESH('vendor-1'),
    '/api/vendors/vendor-1/integration/refresh',
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test src\services\endpoints.contract.test.js
```

Expected: FAIL with missing endpoint keys such as `ENDPOINTS.AUTH.LOGOUT`.

- [ ] **Step 3: Add minimal endpoint constants**

Patch `src/services/endpoints.js`:

```js
AUTH: {
  REGISTER: '/api/auth/register',
  LOGIN: '/api/auth/login',
  REFRESH: '/api/auth/refresh',
  LOGOUT: '/api/auth/logout',
  ME: '/api/auth/me',
},
```

```js
MAPPING: {
  SUMMARY: '/api/mapping/summary',
  CONFIG_WORKBENCH: '/api/mapping/config-workbench',
  // existing mapping endpoints stay below
},
```

```js
PRODUCTION: {
  // keep existing keys
  MANUAL_FILE_CHECK: (taskId) => `/api/production/tasks/${taskId}/file-checks/manual`,
  MANUAL_SCALED_OUTPUT_FILE: (taskId) =>
    `/api/production/tasks/${taskId}/file-checks/manual/scaled-output-file`,
  // remove or stop using stale FILE_CHECK: /tasks/:taskId/file-check
},
```

```js
SHIPMENTS: {
  LIST: '/api/shipments',
  SUMMARY: '/api/shipments/summary',
  DETAIL: (id) => `/api/shipments/${id}`,
  FROM_VENDOR_SUBMISSION: (vendorSubmissionId) =>
    `/api/shipments/from-vendor-submissions/${vendorSubmissionId}`,
  BY_ORDER_ITEM: (orderItemId) => `/api/shipments/order-items/${orderItemId}`,
  RECHECK_VENDOR_TRACKING: '/api/shipments/vendor-tracking/recheck',
  RECHECK_SUBMITTED_VENDOR_TRACKING: '/api/shipments/vendor-tracking/recheck-submitted',
  VENDOR_WEBHOOK_LOGS: '/api/shipments/vendor-webhooks/logs',
  VENDOR_WEBHOOK_PROVIDER: (provider) => `/api/shipments/vendor-webhooks/${provider}`,
  TRACKING: (id) => `/api/shipments/${id}/tracking`,
  STATUS: (id) => `/api/shipments/${id}/status`,
},
```

```js
SHOPS: {
  LIST: '/api/shops',
  DETAIL: (shopId) => `/api/shops/${shopId}`,
  STATUS: (shopId) => `/api/shops/${shopId}/status`,
},
```

```js
VENDOR_SUBMISSIONS: {
  LIST: '/api/vendor-submissions',
  SUMMARY: '/api/vendor-submissions/summary',
  DETAIL: (id) => `/api/vendor-submissions/${id}`,
  SUBMIT_TO_VENDOR: (id) => `/api/vendor-submissions/${id}/submit-to-vendor`,
  // existing keys stay below
},
```

```js
VENDORS: {
  LIST: '/api/vendors',
  DETAIL: (id) => `/api/vendors/${id}`,
  INTEGRATION: (vendorId) => `/api/vendors/${vendorId}/integration`,
  INTEGRATION_REFRESH: (vendorId) => `/api/vendors/${vendorId}/integration/refresh`,
  // existing product and cost center keys stay below
},
```

- [ ] **Step 4: Run endpoint tests**

Run:

```powershell
node --test src\services\endpoints.contract.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src\services\endpoints.js src\services\endpoints.contract.test.js
git commit -m "chore: sync frontend endpoint constants"
```

---

### Task 2: Sync Backend Endpoint Console Table

**Files:**
- Modify: `src/features/api-coverage/data/backendEndpoints.js`
- Test: `src/features/api-coverage/data/backendEndpoints.test.js`

**Interfaces:**
- Consumes: `BACKEND_ENDPOINTS`.
- Produces: complete route rows for API console and `API_WORKFLOWS` validation.

- [ ] **Step 1: Add the missing table rows**

Patch the `ROUTE_TABLE` string in `src/features/api-coverage/data/backendEndpoints.js`:

```txt
mapping|GET|/api/mapping/summary
production|POST|/api/production/tasks/:taskId/file-checks/manual
production|POST|/api/production/tasks/:taskId/file-checks/manual/scaled-output-file
shipments|GET|/api/shipments/summary
shipments|POST|/api/shipments/vendor-tracking/recheck
shipments|POST|/api/shipments/vendor-tracking/recheck-submitted
vendors|GET|/api/vendors/:vendorId/integration
vendors|PATCH|/api/vendors/:vendorId/integration
vendors|POST|/api/vendors/:vendorId/integration/refresh
vendor-submissions|GET|/api/vendor-submissions/summary
vendor-submissions|POST|/api/vendor-submissions/:id/submit-to-vendor
```

The existing table already contains:

```txt
auth|POST|/api/auth/register
auth|POST|/api/auth/logout
shops|PATCH|/api/shops/:shopId/status
```

- [ ] **Step 2: Run route coverage test**

Run:

```powershell
node --test src\features\api-coverage\data\backendEndpoints.test.js
```

Expected: PASS. If it fails because the test points to `..\lng-web-be`, update `beRoot` in the test to probe `..\lng-web-be-v1\lng-web-be` when the first path does not exist:

```js
const beRootCandidates = [
  path.resolve(process.cwd(), '..', 'lng-web-be'),
  path.resolve(process.cwd(), '..', 'lng-web-be-v1', 'lng-web-be'),
]
const beRoot = beRootCandidates.find((candidate) => fs.existsSync(candidate))
```

- [ ] **Step 3: Commit**

```powershell
git add src\features\api-coverage\data\backendEndpoints.js src\features\api-coverage\data\backendEndpoints.test.js
git commit -m "chore: sync backend endpoint console"
```

---

### Task 3: Expose Missing Routes In API Workflow Console

**Files:**
- Modify: `src/features/api-workflows/data/apiWorkflows.js`
- Test: `src/features/api-workflows/utils/apiWorkflowRows.test.js`

**Interfaces:**
- Consumes: `BACKEND_ENDPOINTS`, `endpoint(method, path)`, `action(label, method, path, body)`.
- Produces: callable API console entries for shipping, vendor submissions, mapping, and vendor integration.

- [ ] **Step 1: Add API workflow actions**

Patch `src/features/api-workflows/data/apiWorkflows.js`:

```js
{
  id: 'vendor-submissions',
  label: 'Vendor Submissions',
  listEndpoint: endpoint('GET', '/api/vendor-submissions'),
  detailEndpoint: endpoint('GET', '/api/vendor-submissions/:id'),
  actions: [
    action('Summary', 'GET', '/api/vendor-submissions/summary'),
    action('Submit to vendor', 'POST', '/api/vendor-submissions/:id/submit-to-vendor'),
    action('Recheck ready tasks', 'POST', '/api/vendor-submissions/recheck-ready-production-tasks'),
    action('Create from production task', 'POST', '/api/vendor-submissions/from-production-tasks/:productionTaskId'),
    action('Preview payload', 'GET', '/api/vendor-submissions/:id/payload-preview'),
    action('Mark submitted', 'POST', '/api/vendor-submissions/:id/mark-submitted'),
    action('Mark failed', 'POST', '/api/vendor-submissions/:id/mark-failed', '{"reason":""}'),
    action('Retry', 'POST', '/api/vendor-submissions/:id/retry'),
    action('Cancel', 'POST', '/api/vendor-submissions/:id/cancel', '{"reason":""}'),
  ],
}
```

Add shipment actions:

```js
action('Summary', 'GET', '/api/shipments/summary')
action('Recheck vendor tracking', 'POST', '/api/shipments/vendor-tracking/recheck')
action('Recheck submitted tracking', 'POST', '/api/shipments/vendor-tracking/recheck-submitted')
```

Add mapping summary action:

```js
action('Summary', 'GET', '/api/mapping/summary')
```

Add vendor integration tab under a workflow that already fits vendor ops:

```js
{
  id: 'vendor-integration',
  label: 'Vendor Integration',
  listEndpoint: endpoint('GET', '/api/vendors'),
  actions: [
    action('Get integration', 'GET', '/api/vendors/:vendorId/integration'),
    action('Update integration', 'PATCH', '/api/vendors/:vendorId/integration', '{"providerCode":"","status":"ACTIVE"}'),
    action('Refresh credential', 'POST', '/api/vendors/:vendorId/integration/refresh'),
  ],
}
```

- [ ] **Step 2: Run workflow tests**

Run:

```powershell
node --test src\features\api-workflows\utils\apiWorkflowRows.test.js
```

Expected: PASS.

- [ ] **Step 3: Smoke compile API workflow data**

Run:

```powershell
node -e "import('./src/features/api-workflows/data/apiWorkflows.js').then(() => console.log('api workflows ok'))"
```

Expected: `api workflows ok`.

- [ ] **Step 4: Commit**

```powershell
git add src\features\api-workflows\data\apiWorkflows.js
git commit -m "feat: expose missing backend routes in api workflow console"
```

---

### Task 4: Correct POD Contract Documentation Rows

**Files:**
- Modify: `src/features/pod-workbench/data/podModules.js`
- Test: `src/features/pod-workbench/data/podModules.test.js`

**Interfaces:**
- Consumes: `POD_MODULES`.
- Produces: route documentation rows matching backend paths.

- [ ] **Step 1: Fix stale production contract strings**

In the production module, replace stale rows:

```js
endpoint('PATCH', '/api/production/tasks/:id/file-check', 'File check')
endpoint('PATCH', '/api/production/tasks/:id/scaled-output', 'Scaled output')
```

with:

```js
endpoint('POST', '/api/production/tasks/:taskId/file-checks/manual', 'Manual file check')
endpoint(
  'POST',
  '/api/production/tasks/:taskId/file-checks/manual/scaled-output-file',
  'Manual scaled output upload',
)
endpoint(
  'PATCH',
  '/api/production/tasks/:taskId/file-checks/:fileCheckId/scaled-output',
  'Scaled output metadata',
)
```

- [ ] **Step 2: Add logistics summary and submit-to-vendor contract rows**

In the logistics module contracts, add:

```js
endpoint('GET', '/api/vendor-submissions/summary', 'Submission summary')
endpoint('POST', '/api/vendor-submissions/:id/submit-to-vendor', 'Submit to vendor adapter')
endpoint('GET', '/api/shipments/summary', 'Shipment summary')
endpoint('POST', '/api/shipments/vendor-tracking/recheck', 'Recheck vendor tracking')
endpoint(
  'POST',
  '/api/shipments/vendor-tracking/recheck-submitted',
  'Recheck submitted tracking',
)
```

- [ ] **Step 3: Add vendor integration contract rows**

In the vendors module contracts, add:

```js
endpoint('GET', '/api/vendors/:vendorId/integration', 'Load vendor integration config')
endpoint('PATCH', '/api/vendors/:vendorId/integration', 'Update vendor integration config')
endpoint('POST', '/api/vendors/:vendorId/integration/refresh', 'Refresh vendor credential')
```

- [ ] **Step 4: Run POD module tests**

Run:

```powershell
node --test src\features\pod-workbench\data\podModules.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src\features\pod-workbench\data\podModules.js
git commit -m "docs: sync pod module backend contracts"
```

---

### Task 5: Final Verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes: all changes from Tasks 1-4.
- Produces: confidence that endpoint registry, API console, lint, and build still pass.

- [ ] **Step 1: Run narrow endpoint/API tests**

```powershell
node --test src\services\endpoints.contract.test.js src\features\api-coverage\data\backendEndpoints.test.js src\features\api-workflows\utils\apiWorkflowRows.test.js src\features\pod-workbench\data\podModules.test.js
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

```powershell
npm.cmd run lint
```

Expected: exits `0`.

- [ ] **Step 3: Run build**

```powershell
npm.cmd run build
```

Expected: exits `0`; existing Vite chunk-size warning is acceptable.

- [ ] **Step 4: Review diff**

```powershell
git diff --stat
git diff -- src\services\endpoints.js src\features\api-coverage\data\backendEndpoints.js src\features\api-workflows\data\apiWorkflows.js src\features\pod-workbench\data\podModules.js
```

Expected: only endpoint registry, route table, workflow data, and contract docs changed.

- [ ] **Step 5: Commit final verification note if needed**

If Tasks 1-4 were already committed separately, no final commit is needed. If running as a single batch, commit:

```powershell
git add src\services\endpoints.js src\services\endpoints.contract.test.js src\features\api-coverage\data\backendEndpoints.js src\features\api-coverage\data\backendEndpoints.test.js src\features\api-workflows\data\apiWorkflows.js src\features\pod-workbench\data\podModules.js
git commit -m "feat: sync missing backend endpoint coverage"
```

---

## Self-Review

- Spec coverage: covers all 14 backend routes missing from FE endpoint registry, plus the stale `PRODUCTION.FILE_CHECK` mismatch found during audit.
- Placeholder scan: no TBD/TODO steps; every changed file has exact paths, snippets, and commands.
- Type consistency: route helper names in Task 1 are reused only as endpoint constants; workflow and POD docs continue to use route strings through existing helper functions.
- Deliberate skip: no full UI screens or unused React Query hooks for these endpoints. Add hooks only when a real page consumes them.
