# Portal Integration Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add list and issue-transition backend contracts, then build a single-screen External Order Import workbench with upload, job monitoring, diagnostics, resolution, and bounded polling.

**Architecture:** Extend the existing Integration boundary rather than creating a new module. Backend list and transition services reuse existing shop-scope authorization helpers and repositories; frontend API/query modules feed a job table, selected-job context panel, and global issue queue on one lazy route.

**Tech Stack:** Node.js, Express, Mongoose, Joi, Jest; React 19, TypeScript, TanStack Query 5, Ant Design 6, React Router 7, Vitest.

## Global Constraints

- Frontend repository: `C:\lng_system\lng-web\lng-web-fe\.worktrees\fe-refactor`.
- Backend repository: `C:\lng_system\lng-web\lng-web-be\.worktrees\fe-refactor`.
- Do not add dependencies.
- Use current `ORDERS:READ` and `ORDERS:WRITE` route permissions; do not migrate to `INTEGRATION:*` in this phase.
- Preserve shop-scope isolation for every list, detail, and mutation.
- Upload files remain transient request data; do not store base64 file content on business records.
- Poll only a selected active job, stop on terminal state, and pause while the document is hidden.
- Tests live in each repository's `src/test` tree.
- Create one clean FE commit and one clean BE commit at the completed module checkpoint, only when requested.

---

### Task 1: Add the backend import-job list contract

**Files:**

- Modify: `src/modules/integration/externalOrderImport/validators/externalOrderImport.validator.js`
- Modify: `src/modules/integration/externalOrderImport/repositories/externalOrderImportJob.repository.js`
- Modify: `src/modules/integration/externalOrderImport/services/externalOrderImport.service.js`
- Modify: `src/modules/integration/externalOrderImport/controllers/externalOrderImport.controller.js`
- Modify: `src/modules/integration/externalOrderImport/routes/externalOrderImport.routes.js`
- Modify: `src/test/integration/externalOrderImport/repositories/externalOrderImportJob.repository.test.js`
- Modify: `src/test/integration/externalOrderImport/services/externalOrderImport.service.test.js`
- Modify: `src/test/integration/externalOrderImport/controllers/externalOrderImport.controller.test.js`
- Modify: `src/test/integration/externalOrderImport/routes/externalOrderImport.routes.test.js`

**Interfaces:**

- Produces `GET /api/integration/external-order-imports`.
- Query: `{ shopId?, source?, status?, dateFrom?, dateTo?, page?, limit? }`.
- Response: `{ items: ImportJobDto[], pagination }`.

- [ ] **Step 1: Write failing repository and validator tests**

Test status/source enums, ObjectId shop id, ISO datetime boundaries, `dateFrom <= dateTo`, pagination maximum 100, and repository filtering by inclusive date range:

```js
createdAt: {
  ...(dateFrom && { $gte: new Date(dateFrom) }),
  ...(dateTo && { $lte: new Date(dateTo) }),
}
```

- [ ] **Step 2: Write failing service authorization tests**

Cover global read, scoped read, scoped write-as-read, no readable shops returning an empty page, explicit unauthorized `shopId` returning an empty page, and a global status/date filter.

- [ ] **Step 3: Write failing controller and route tests**

Verify authentication, `ORDERS:READ` or `ORDERS:WRITE`, validated query forwarding, DTO pagination, and stable validation errors.

- [ ] **Step 4: Run backend tests and verify failure**

From the BE worktree:

```powershell
npm test -- --runInBand src/test/integration/externalOrderImport/repositories/externalOrderImportJob.repository.test.js src/test/integration/externalOrderImport/services/externalOrderImport.service.test.js src/test/integration/externalOrderImport/controllers/externalOrderImport.controller.test.js src/test/integration/externalOrderImport/routes/externalOrderImport.routes.test.js
```

Expected: failure because list controller/service/validator route is absent.

- [ ] **Step 5: Implement the minimal list flow**

Add `importJobListQuerySchema`, repository date filters, and:

```js
async function listImportJobs(params = {}, authContext = {}) {
  const shopIds = getReadableShopIds(authContext)
  if (shopIds === null) return jobRepository.list(params)
  if (shopIds.length === 0) return emptyPage(params)
  if (params.shopId && !shopIds.includes(String(params.shopId))) return emptyPage(params)
  return jobRepository.list(params.shopId ? params : { ...params, shopIds })
}
```

Route `GET /` before parameter routes and map items with `toImportJobDto` without building expensive per-job downstream summaries.

- [ ] **Step 6: Run backend tests**

Run the Step 4 command. Expected: pass.

---

### Task 2: Add the backend issue resolution contract

**Files:**

- Modify: `src/modules/integration/externalOrderImport/models/externalOrderImportIssue.model.js`
- Modify: `src/modules/integration/externalOrderImport/repositories/externalOrderImportIssue.repository.js`
- Modify: `src/modules/integration/externalOrderImport/validators/externalOrderImport.validator.js`
- Modify: `src/modules/integration/externalOrderImport/services/externalOrderImport.service.js`
- Modify: `src/modules/integration/externalOrderImport/controllers/externalOrderImport.controller.js`
- Modify: `src/modules/integration/externalOrderImport/dtos/externalOrderImport.dto.js`
- Modify: `src/modules/integration/externalOrderImport/routes/externalOrderImport.routes.js`
- Modify: `src/test/integration/externalOrderImport/repositories/externalOrderImportIssue.repository.test.js`
- Modify: `src/test/integration/externalOrderImport/services/externalOrderImport.service.test.js`
- Modify: `src/test/integration/externalOrderImport/controllers/externalOrderImport.controller.test.js`
- Modify: `src/test/integration/externalOrderImport/routes/externalOrderImport.routes.test.js`

**Interfaces:**

- Produces `PATCH /api/integration/external-order-imports/issues/:issueId`.
- Input: `{ status: 'RESOLVED' | 'IGNORED'; note: string }`.
- Output: Issue DTO with `resolutionNote`, `resolvedBy`, and `resolvedAt`.

- [ ] **Step 1: Write failing model, validator, and repository tests**

Test nullable trimmed `resolutionNote`, valid terminal statuses only, nonblank note, ObjectId issue id, and an atomic repository transition constrained by `{ _id, status: 'OPEN' }`.

- [ ] **Step 2: Write failing service tests**

Cover issue not found, already terminal conflict, load owning job, global and scoped `ORDERS:WRITE`, forbidden other-shop mutation, resolver account/timestamp persistence, and DTO output.

- [ ] **Step 3: Run focused tests and verify failure**

From BE:

```powershell
npm test -- --runInBand src/test/integration/externalOrderImport/repositories/externalOrderImportIssue.repository.test.js src/test/integration/externalOrderImport/services/externalOrderImport.service.test.js src/test/integration/externalOrderImport/controllers/externalOrderImport.controller.test.js src/test/integration/externalOrderImport/routes/externalOrderImport.routes.test.js
```

Expected: failure because the transition contract does not exist.

- [ ] **Step 4: Implement the transition once in the service**

Use the existing `loadAuthorizedImportJob(jobId, ORDER_WRITE_PERMISSION, authContext)` after loading the issue. Update with one repository method:

```js
transitionOpen(issueId, {
  status,
  resolutionNote: note,
  resolvedBy: authContext.accountId,
  resolvedAt: new Date(),
})
```

If the conditional update returns null after the issue existed, throw `CONFLICT_ERROR`. Do not permit reopening in this endpoint.

- [ ] **Step 5: Run focused tests**

Run the Step 3 command. Expected: pass.

---

### Task 3: Add frontend Integration API, types, and query keys

**Files:**

- Create: `src/features/portal/integrations/api/integrationApi.ts`
- Create: `src/features/portal/integrations/api/integrationKeys.ts`
- Create: `src/test/portal/integrations/api/integrationApi.test.ts`

**Interfaces:**

- Produces ImportJob, ImportIssue, ImportRawRecord, list/detail/filter/input types.
- Produces `listImportJobs`, `uploadManualExcel`, `uploadEtsySoldItems`, `getImportJob`, `listJobIssues`, `listJobRawRecords`, `listIssues`, `retryImportJob`, `updateIssueStatus`.
- Produces stable list/detail/issues/raw query keys.

- [ ] **Step 1: Write API tests**

Verify URL and payloads for all endpoints. Verify uploads use `FormData` with the original File and metadata, and do not send `fileBase64`.

- [ ] **Step 2: Run and verify failure**

From FE:

```powershell
npm test -- src/test/portal/integrations/api/integrationApi.test.ts
```

Expected: failure because the module does not exist.

- [ ] **Step 3: Implement API functions and keys**

Use factories:

```ts
export const integrationKeys = {
  all: ['portal', 'integrations'] as const,
  jobs: (params: ImportJobListParams) => [...integrationKeys.all, 'jobs', params] as const,
  job: (jobId: string) => [...integrationKeys.all, 'job', jobId] as const,
  issues: (params: IssueListParams) => [...integrationKeys.all, 'issues', params] as const,
  jobIssues: (jobId: string, params: PageParams) =>
    [...integrationKeys.job(jobId), 'issues', params] as const,
  rawRecords: (jobId: string, params: RawRecordListParams) =>
    [...integrationKeys.job(jobId), 'raw-records', params] as const,
}
```

- [ ] **Step 4: Run API tests**

Run the Step 2 command. Expected: pass.

---

### Task 4: Build the job table and upload flow

**Files:**

- Modify: `src/app/layout/appNavigation.ts`
- Modify: `src/app/router/router.tsx`
- Create: `src/features/portal/integrations/pages/IntegrationWorkbenchPage.tsx`
- Create: `src/features/portal/integrations/pages/ImportUploadModal.tsx`
- Create: `src/features/portal/integrations/pages/IntegrationWorkbenchPage.module.scss`
- Create: `src/shared/ui/DateRangePicker.tsx`
- Modify: `src/shared/ui/index.ts`
- Create: `src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx`
- Create: `src/test/shared/ui/DateRangePicker.test.tsx`
- Modify: `src/test/app/layout/appNavigation.test.ts`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`

**Interfaces:**

- Consumes Integration API/keys and Shop API/keys from the completed Shop module.
- Produces Portal Operations navigation and lazy `/portal/integrations` route.

- [ ] **Step 1: Write workbench tests**

Cover URL-backed shop/source/status/date/page filters, local-day to UTC-boundary serialization, DataTable status/count rendering, selected job id, read-only upload hiding, source-specific upload endpoint, 10 MB validation, form preservation on error, and targeted query invalidation.

- [ ] **Step 2: Run and verify failure**

```powershell
npm test -- src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx src/test/app/layout/appNavigation.test.ts
```

Expected: failure because workbench and navigation do not exist.

- [ ] **Step 3: Implement navigation and server-driven table**

Add Integrations under Portal Operations for `ORDERS:READ` or `ORDERS:WRITE`. Add a thin shared `DateRangePicker` wrapper around Ant Design `DatePicker.RangePicker`; it accepts `{ dateFrom, dateTo }`, displays local dates, and emits `startOf('day').toISOString()` plus `endOf('day').toISOString()`. Use it with shared FilterBar, DataTable, StatusTag, and inline FeedbackAlert.

- [ ] **Step 4: Implement upload modal**

Use shared FileUpload and authorized Shop selector. Required values are file, shopId, marketplaceCode, and source. Optional values are shopConnectionId and externalAccountId. Match the server 10 MB limit and keep backend validation authoritative.

- [ ] **Step 5: Run workbench tests**

Run the Step 2 command. Expected: pass.

---

### Task 5: Add selected-job panel with bounded polling

**Files:**

- Create: `src/features/portal/integrations/pages/ImportJobPanel.tsx`
- Create: `src/features/portal/integrations/hooks/useImportJobPolling.ts`
- Create: `src/test/portal/integrations/hooks/useImportJobPolling.test.tsx`
- Create: `src/test/portal/integrations/pages/ImportJobPanel.test.tsx`

**Interfaces:**

- Produces `useImportJobPolling(jobId, status)`.
- Consumes job detail, job issues, raw-record APIs, and retry mutation.

- [ ] **Step 1: Write polling tests**

Use fake timers to prove active selected jobs poll, terminal jobs do not, no selected job does not, hidden document pauses polling, visible document resumes, and cleanup removes the visibility listener.

- [ ] **Step 2: Run and verify failure**

```powershell
npm test -- src/test/portal/integrations/hooks/useImportJobPolling.test.tsx src/test/portal/integrations/pages/ImportJobPanel.test.tsx
```

Expected: failure because hook and panel do not exist.

- [ ] **Step 3: Implement bounded polling**

Use TanStack Query's `refetchInterval` callback, returning `5000` only for `PENDING`, `PARSING`, or `IMPORTING` while `document.visibilityState === 'visible'`; otherwise return `false`. Never attach scroll listeners.

- [ ] **Step 4: Implement panel sections and retry**

Render summary first, then issue and raw-record sections in the panel. Retry requires confirmation and is shown only to `ORDERS:WRITE`. On success invalidate selected job, jobs list, selected-job issues, and raw records.

- [ ] **Step 5: Run panel tests**

Run the Step 2 command. Expected: pass.

---

### Task 6: Add the global issue queue and resolution modal

**Files:**

- Create: `src/features/portal/integrations/pages/ImportIssueQueue.tsx`
- Create: `src/features/portal/integrations/pages/IssueResolutionModal.tsx`
- Create: `src/test/portal/integrations/pages/ImportIssueQueue.test.tsx`

**Interfaces:**

- Consumes `listIssues` and `updateIssueStatus`.
- Produces resolved/ignored mutations with required notes.

- [ ] **Step 1: Write queue tests**

Cover shop/source/severity/status/type/order/item filters, semantic status colors, writer-only actions, required note, `RESOLVED` and `IGNORED` payloads, mutation error preservation, and successful invalidation of global and selected-job issue keys.

- [ ] **Step 2: Run and verify failure**

```powershell
npm test -- src/test/portal/integrations/pages/ImportIssueQueue.test.tsx
```

Expected: failure because the queue does not exist.

- [ ] **Step 3: Implement queue and modal**

Use a server-paginated DataTable. Open one centered modal with radio/segmented terminal status and required text area. Render structured error details as text only; never inject external HTML.

- [ ] **Step 4: Run queue tests**

Run the Step 2 command. Expected: pass.

---

### Task 7: Integration checkpoint

**Files:**

- Verify all BE Integration and FE Portal Integration files from Tasks 1-6.

**Interfaces:**

- Produces a complete External Order Import workbench while leaving SQL Attendance and Vendor Submission untouched.

- [ ] **Step 1: Run backend gates**

From BE:

```powershell
npm test -- --runInBand src/test/integration/externalOrderImport
npm run lint
```

Expected: all commands exit 0.

- [ ] **Step 2: Run frontend gates**

From FE:

```powershell
npm run lint
npm run typecheck
npm test -- src/test/portal/integrations src/test/app/layout/appNavigation.test.ts
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 3: Manual browser verification**

Verify scoped shop isolation, upload formats, active and terminal jobs, partial failures, issue resolution, retry, no requests during scroll, polling pause in a background tab, VI/EN, and light/dark mode.

- [ ] **Step 4: Create one clean commit per repository only when requested**

Backend:

```powershell
git add src/modules/integration/externalOrderImport src/test/integration/externalOrderImport docs/integration
git commit -m "feat(integration): add import operations contracts"
```

Frontend:

```powershell
git add src/app/layout/appNavigation.ts src/app/router/router.tsx src/features/portal/integrations src/shared/i18n src/test/portal/integrations src/test/app/layout/appNavigation.test.ts docs/superpowers
git commit -m "feat(portal): add integration workbench"
```
