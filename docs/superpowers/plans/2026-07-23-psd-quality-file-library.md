# PSD Quality Scoring and File Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PSD-only Quality Scoring and PSD File Library pages backed by two paginated Design read endpoints, without creating a generic media manager.

**Architecture:** The backend owns flattened, paginated read models for score records and PSD file links. It enforces `PSD_TEMPLATE` and applies the current Design shop-scope filter before querying. The frontend extends the existing `design-tasks` feature with query hooks, mappers, two Operations pages, routes, and permission-filtered sidebar leaves; existing score mutation and media download contracts are reused.

**Tech Stack:** Node.js, Express, Mongoose, Joi, Jest; React 19, MUI 9, Tailwind 4, TanStack Query 5, React Router 7, node:test.

## Global Constraints

- Only `PSD_TEMPLATE` task data is returned. No other Design task types or non-Design media may enter either list.
- Reuse `apiClient`, `ENDPOINTS`, `OperationsPageShell`, `OperationsToolbar`, `OperationsTable`, `OperationsPagination`, `StatusBadge`, `SubmissionScoreEditor`, and `GET /api/media/assets/:assetId/download`.
- Design must access Media only through `src/modules/media/public.js`; Design repositories must not import Media models or repositories.
- Do not add dependencies, generic media CRUD, upload, delete, rename, move, or a duplicate approve/reject workflow.
- Do not render raw MongoDB IDs. Keep all list filters in a single toolbar row on desktop and let it wrap only at narrow widths.
- Read access matches the existing Design Tasks route. Override and void keep the current `DESIGN:REVIEW` or `DESIGN:WRITE` backend authorization.
- Preserve loading, empty, error, keyboard, and focus behavior supplied by existing MUI and Operations components.
- Before backend edits, create a fresh clean backend worktree. Do not edit `C:\lng_system\lng-web\lng-web-be`, which contains user-owned changes.

## File Structure

### Backend worktree: `C:\lng_system\lng-web\lng-web-be-psd-quality-file-library`

- Modify: `src/modules/design/validators/designTask.validator.js` to validate both list queries.
- Modify: `src/modules/design/repositories/designSubmissionScore.repository.js` to return paginated PSD score rows through a score-to-task aggregation.
- Modify: `src/modules/design/repositories/designTask.repository.js` to return paginated flattened PSD file links through a task aggregation.
- Modify: `src/modules/media/repositories/mediaAsset.repository.js`, `src/modules/media/services/mediaAsset.service.js`, and `src/modules/media/public.js` to expose a read-only filename-to-asset-ID Public Port for the Design module.
- Create: `src/modules/design/dtos/designWorkspace.dto.js` to map the two read models without leaking storage fields or raw identifiers as display values.
- Modify: `src/modules/design/services/designTask.service.js` to apply existing Design read scope rules, enrich asset IDs through `mediaPublic`, and call the DTO mappers.
- Modify: `src/modules/design/controllers/designTask.controller.js` and `src/modules/design/routes/index.js` to expose the two GET endpoints.
- Modify tests: `src/test/design/repositories/designSubmissionScore.repository.test.js`, `src/test/design/repositories/designTask.repository.test.js`, `src/test/design/services/designTask.service.test.js`, `src/test/design/routes/index.test.js`.
- Create: `src/test/media/repositories/mediaAsset.repository.test.js` and modify `src/test/media/services/mediaAsset.service.test.js` for the new Media Public Port.

### Frontend worktree: `C:\lng_system\lng-web\lng-web-fe-orders-targeted-evolution`

- Modify: `src/constants/routes.js`, `src/routes/index.jsx`, `src/layouts/sidebarNavigation.js`, `src/layouts/sidebarNavigation.test.js`, `src/i18n/locales/en/common.json`, and `src/i18n/locales/vi/common.json` for the two permission-aware routes and labels.
- Modify: `src/services/endpoints.js`, `src/features/design-tasks/api/designTasks.keys.js`, `src/features/design-tasks/api/designTasks.queries.js`, and `src/features/design-tasks/utils/designTasksApi.js` for endpoint constants, query keys, hooks, query builders, and response mappers.
- Create: `src/features/design-tasks/components/QualityScoreDetailDrawer.jsx` and `src/features/design-tasks/components/PsdFileDetailDrawer.jsx` for focused detail actions.
- Create: `src/features/design-tasks/pages/QualityScoringPage.jsx` and `src/features/design-tasks/pages/PsdFileLibraryPage.jsx` for the two operations workbenches.
- Create: `src/features/design-tasks/utils/designWorkspaceApi.test.js` and `src/features/design-tasks/pages/designWorkspacePagesComposition.test.js` for contract and composition regression checks.

---

### Task 1: Define and test the two backend list-query contracts

**Files:**

- Modify: `C:\lng_system\lng-web\lng-web-be-psd-quality-file-library\src\modules\design\validators\designTask.validator.js`
- Modify: `C:\lng_system\lng-web\lng-web-be-psd-quality-file-library\src\test\design\routes\index.test.js`

**Interfaces:**

- Consumes: `designScoreLevels`, `designScoreStatuses`, `designTaskStatuses`, and `assertValid`.
- Produces: `submissionScoresQuerySchema` and `psdFilesQuerySchema`, each returning normalized pagination and uppercase enum filters.

- [ ] **Step 1: Create the clean backend worktree and write the failing route-contract cases.**

```powershell
git -C C:\lng_system\lng-web\lng-web-be worktree add -b codex/feat-psd-quality-file-library C:\lng_system\lng-web\lng-web-be-psd-quality-file-library develop
```

Add these cases to `src/test/design/routes/index.test.js`:

```js
test('GET /submission-scores validates and forwards the PSD score filters', async () => {
  service.listSubmissionScores.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 })

  const response = await request(createServer(), {
    method: 'GET',
    path: '/submission-scores?search=shirt&designerId=660000000000000000510006&scoreLevel=standard&scoreStatus=voided&dateFrom=2026-07-01&dateTo=2026-07-31&page=1&limit=20&sortBy=scoredAt&sortOrder=asc',
    headers: { 'X-Auth-Context': JSON.stringify({ permissions: ['DESIGN:READ'] }) },
  })

  expect(response.statusCode).toBe(200)
  expect(service.listSubmissionScores).toHaveBeenCalledWith(
    expect.objectContaining({
      search: 'shirt',
      designerId: '660000000000000000510006',
      scoreLevel: 'STANDARD',
      scoreStatus: 'VOIDED',
      page: 1,
      limit: 20,
      sortBy: 'scoredAt',
      sortOrder: 'asc',
    }),
    { permissions: ['DESIGN:READ'] },
  )
})

test('GET /psd-files rejects an invalid file role and permits Design work access', async () => {
  const invalid = await request(createServer(), {
    method: 'GET',
    path: '/psd-files?role=MASTER',
    headers: { 'X-Auth-Context': JSON.stringify({ permissions: ['DESIGN:READ'] }) },
  })
  expect(invalid.statusCode).toBe(400)

  service.listPsdFiles.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 })
  const allowed = await request(createServer(), {
    method: 'GET',
    path: '/psd-files?role=approved&taskStatus=approved&page=1&limit=20',
    headers: {
      'X-Auth-Context': JSON.stringify({
        permissions: ['DESIGN:WORK'],
        accountId: '660000000000000000510006',
      }),
    },
  })
  expect(allowed.statusCode).toBe(200)
  expect(service.listPsdFiles).toHaveBeenCalledWith(
    expect.objectContaining({
      role: 'APPROVED',
      taskStatus: 'APPROVED',
      page: 1,
      limit: 20,
    }),
    expect.objectContaining({ permissions: ['DESIGN:WORK'] }),
  )
})
```

- [ ] **Step 2: Run the focused route test and confirm it fails because neither route nor service function exists.**

Run:

```powershell
$env:NODE_ENV='test'; $env:MONGODB_URI='mongodb://127.0.0.1:27017/lng-web-test'; $env:REDIS_ENABLED='false'; $env:LOG_LEVEL='silent'; npx jest src/test/design/routes/index.test.js --runInBand
```

Expected: FAIL with `Cannot read properties of undefined (reading 'mockResolvedValue')` or 404 for the missing endpoints.

- [ ] **Step 3: Add the exact Joi schemas and controller entry points.**

Add to `designTask.validator.js` and export both schemas:

```js
const submissionScoresQuerySchema = Joi.object({
  search: Joi.string().trim().max(200),
  designerId: objectId,
  scoreLevel: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(designScoreLevels)),
  scoreStatus: Joi.string()
    .trim()
    .uppercase()
    .valid('ALL', ...Object.values(designScoreStatuses))
    .default('ACTIVE'),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  sortBy: Joi.string().trim().valid('scoredAt', 'finalPoints', 'updatedAt'),
  sortOrder: Joi.string().trim().lowercase().valid('asc', 'desc'),
})

const psdFilesQuerySchema = Joi.object({
  search: Joi.string().trim().max(200),
  role: Joi.string().trim().uppercase().valid('REFERENCE', 'SUBMISSION', 'APPROVED'),
  designerId: objectId,
  taskStatus: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(designTaskStatuses)),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  sortBy: Joi.string().trim().valid('createdAt', 'submittedAt', 'filename', 'size'),
  sortOrder: Joi.string().trim().lowercase().valid('asc', 'desc'),
})
```

Add controller functions using the existing service import:

```js
async function listSubmissionScores(req, res) {
  const query = assertValid(submissionScoresQuerySchema, req.query)
  res
    .status(httpStatus.OK)
    .json({ success: true, data: await service.listSubmissionScores(query, req.auth) })
}

async function listPsdFiles(req, res) {
  const query = assertValid(psdFilesQuerySchema, req.query)
  res
    .status(httpStatus.OK)
    .json({ success: true, data: await service.listPsdFiles(query, req.auth) })
}
```

Import both schemas and export both controller functions.

- [ ] **Step 4: Register the two GET routes before dynamic task routes.**

Insert after `/score-summary` in `src/modules/design/routes/index.js`:

```js
router.get(
  '/submission-scores',
  authPublic.authenticate,
  requireRead,
  asyncHandler(controller.listSubmissionScores),
)
router.get(
  '/psd-files',
  authPublic.authenticate,
  requireRead,
  asyncHandler(controller.listPsdFiles),
)
```

- [ ] **Step 5: Run the route test to verify validation and permission flow pass, then commit.**

Run the command from Step 2. Expected: PASS.

```powershell
git add src/modules/design/validators/designTask.validator.js src/modules/design/controllers/designTask.controller.js src/modules/design/routes/index.js src/test/design/routes/index.test.js
git commit -m "feat(design): add PSD workspace list contracts"
```

### Task 2: Build backend PSD-only read models with scope-safe pagination

**Files:**

- Modify: `C:\lng_system\lng-web\lng-web-be-psd-quality-file-library\src\modules\design\repositories\designSubmissionScore.repository.js`
- Modify: `C:\lng_system\lng-web\lng-web-be-psd-quality-file-library\src\modules\design\repositories\designTask.repository.js`
- Create: `C:\lng_system\lng-web\lng-web-be-psd-quality-file-library\src\modules\design\dtos\designWorkspace.dto.js`
- Modify: `C:\lng_system\lng-web\lng-web-be-psd-quality-file-library\src\modules\design\services\designTask.service.js`
- Test: `C:\lng_system\lng-web\lng-web-be-psd-quality-file-library\src\test\design\repositories\designSubmissionScore.repository.test.js`
- Test: `C:\lng_system\lng-web\lng-web-be-psd-quality-file-library\src\test\design\repositories\designTask.repository.test.js`
- Test: `C:\lng_system\lng-web\lng-web-be-psd-quality-file-library\src\test\design\services\designTask.service.test.js`

**Interfaces:**

- Consumes: `applyReadAccessFilter(query, authContext)`, `mediaPublic.getAssetsByIds(assetIds)`, `mediaPublic.findAssetIdsByOriginalFilename(search)`, and Design task submission shape.
- Produces: `listPsdScoreRows(query)`, `listPsdFileLinks(query)`, `listSubmissionScores(query, authContext)`, and `listPsdFiles(query, authContext)` returning `{ items, total, page, limit }`.

- [ ] **Step 1: Add repository tests that require task-type enforcement and database pagination.**

Add to the score repository test:

```js
test('listPsdScoreRows always restricts the score aggregation to PSD_TEMPLATE and applies score status', async () => {
  mockAggregate.mockResolvedValue([{ items: [], total: [{ count: 0 }] }])
  await repository.listPsdScoreRows({ scoreStatus: 'VOIDED', page: 2, limit: 10 })
  const pipeline = mockAggregate.mock.calls[0][0]
  expect(pipeline[0].$match).toMatchObject({ taskType: 'PSD_TEMPLATE', status: 'VOIDED' })
  expect(JSON.stringify(pipeline)).toContain('designtasks')
  expect(JSON.stringify(pipeline)).toContain('$skip')
  expect(JSON.stringify(pipeline)).toContain('$limit')
})
```

Add the analogous task repository test with a mocked `DesignTask.aggregate` and assert its first `$match` includes `{ taskType: 'PSD_TEMPLATE' }`, its flattened links contain `REFERENCE`, `SUBMISSION`, and `APPROVED`, and the aggregate includes `$facet` for `items` and `total`.

Add Media repository and service coverage for the new Public Port:

```js
test('findAssetIdsByOriginalFilename returns only IDs for a normalized filename prefix', async () => {
  mockFind.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([{ _id: '660000000000000000510007' }]),
  })
  await expect(service.findAssetIdsByOriginalFilename('  master ')).resolves.toEqual([
    '660000000000000000510007',
  ])
  expect(repository.findIdsByOriginalFilename).toHaveBeenCalledWith('master')
})
```

- [ ] **Step 2: Run the two repository tests and confirm they fail because the methods do not exist.**

Run:

```powershell
$env:NODE_ENV='test'; $env:MONGODB_URI='mongodb://127.0.0.1:27017/lng-web-test'; $env:REDIS_ENABLED='false'; $env:LOG_LEVEL='silent'; npx jest src/test/media/repositories/mediaAsset.repository.test.js src/test/media/services/mediaAsset.service.test.js src/test/design/repositories/designSubmissionScore.repository.test.js src/test/design/repositories/designTask.repository.test.js --runInBand
```

Expected: FAIL with `repository.listPsdScoreRows is not a function` and `repository.listPsdFileLinks is not a function`.

- [ ] **Step 3: Implement the Media Public Port and the two Design aggregations with a single stable row identity.**

In `mediaAsset.repository.js`, add this metadata-only query and export it through the existing service and `media/public.js`. It is an internal Public Port only, not an HTTP endpoint and not a generic media listing API:

```js
async function findIdsByOriginalFilename(search) {
  const normalized = normalizeSearchTerm(search)
  const regex = buildCaseInsensitivePrefixRegex(normalized)
  if (!regex) return []
  const rows = await MediaAsset.find({ originalFilename: regex }).select('_id').limit(5000).lean()
  return rows.map((row) => String(row._id))
}

async function findAssetIdsByOriginalFilename(search) {
  return repository.findIdsByOriginalFilename(search)
}
```

In `designSubmissionScore.repository.js`, import `designTaskTypes`, `normalizePagination`, `getPaginationOffset`, and the search helpers. Add `listPsdScoreRows(query)` with this complete aggregation shape:

```js
async function listPsdScoreRows(query = {}) {
  const { page, limit } = normalizePagination(query, { defaultLimit: 20, maxLimit: 100 })
  const scoreMatch = {
    taskType: designTaskTypes.PSD_TEMPLATE,
    ...(query.scoreStatus !== 'ALL'
      ? { status: query.scoreStatus || designScoreStatuses.ACTIVE }
      : {}),
    ...(query.designerId ? { designerId: toObjectId(query.designerId) } : {}),
    ...(query.scoreLevel ? { scoreLevel: query.scoreLevel } : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          scoredAt: {
            ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
            ...(query.dateTo ? { $lte: endOfDay(query.dateTo) } : {}),
          },
        }
      : {}),
  }
  const taskMatch = {
    'task.taskType': designTaskTypes.PSD_TEMPLATE,
    ...(query.shopId ? { 'task.shopId': toObjectId(query.shopId) } : {}),
    ...(query.shopIds ? { 'task.shopId': { $in: query.shopIds.map(toObjectId) } } : {}),
    ...(query.assignedDesignerId
      ? { 'task.assignedDesignerId': toObjectId(query.assignedDesignerId) }
      : {}),
  }
  const searchRegex = buildCaseInsensitivePrefixRegex(normalizeSearchTerm(query.search))
  const basePipeline = [
    { $match: scoreMatch },
    { $lookup: { from: 'designtasks', localField: 'taskId', foreignField: '_id', as: 'task' } },
    { $unwind: '$task' },
    { $match: taskMatch },
    {
      $set: {
        submission: {
          $first: {
            $filter: {
              input: '$task.submissions',
              as: 'submission',
              cond: { $eq: ['$$submission._id', '$submissionId'] },
            },
          },
        },
      },
    },
    {
      $set: {
        assetId: {
          $ifNull: ['$submission.approvedAssetId', { $arrayElemAt: ['$submission.assetIds', 0] }],
        },
      },
    },
    ...(searchRegex
      ? [
          {
            $match: {
              $or: [
                { assetId: { $in: (query.matchingAssetIds || []).map(toObjectId) } },
                { 'task.listingSnapshot.sku': searchRegex },
                { 'task.listingSnapshot.asin': searchRegex },
                { 'task.listingSnapshot.title': searchRegex },
              ],
            },
          },
        ]
      : []),
  ]
  const sortBy = ['scoredAt', 'finalPoints', 'updatedAt'].includes(query.sortBy)
    ? query.sortBy
    : 'scoredAt'
  const direction = query.sortOrder === 'asc' ? 1 : -1
  const [result = {}] = await DesignSubmissionScore.aggregate([
    ...basePipeline,
    {
      $facet: {
        items: [
          { $sort: { [sortBy]: direction, _id: direction } },
          { $skip: getPaginationOffset({ page, limit }) },
          { $limit: limit },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ])
  return { items: result.items || [], total: result.total?.[0]?.count || 0, page, limit }
}
```

The aggregate joins only Design-owned scores and tasks. `matchingAssetIds` comes from `mediaPublic.findAssetIdsByOriginalFilename`; `designWorkspace.dto.js` remains the sole place that exposes asset fields to the API response.

In `designTask.repository.js`, add `listPsdFileLinks(query)` with a `$project` that concatenates three role arrays, then `$unwind`s them before the `$facet`:

```js
fileLinks: {
  $concatArrays: [
    { $map: { input: '$referenceAssetIds', as: 'assetId', in: { assetId: '$$assetId', role: 'REFERENCE', submissionId: null, version: null, linkedAt: '$createdAt' } } },
    { $reduce: {
      input: '$submissions', initialValue: [], in: { $concatArrays: ['$$value',
        { $map: { input: '$$this.assetIds', as: 'assetId', in: { assetId: '$$assetId', role: 'SUBMISSION', submissionId: '$$this._id', version: '$$this.version', linkedAt: '$$this.submittedAt' } } },
        { $cond: [{ $ne: ['$$this.approvedAssetId', null] }, [{ assetId: '$$this.approvedAssetId', role: 'APPROVED', submissionId: '$$this._id', version: '$$this.version', linkedAt: '$$this.approvedAt' }], []] },
      ] },
    } },
  ],
}
```

Build `basePipeline` from `{ taskType: designTaskTypes.PSD_TEMPLATE }` plus `shopId`, `shopIds`, `assignedDesignerId`, `taskStatus`, and date filters. After `$unwind: '$fileLinks'`, add the role filter and a filename/listing `$or` match. The filename leg is `{ 'fileLinks.assetId': { $in: (query.matchingAssetIds || []).map(toObjectId) } }`; the listing legs use `buildCaseInsensitivePrefixRegex(normalizeSearchTerm(query.search))`. Finish with this exact result envelope:

```js
const [result = {}] = await DesignTask.aggregate([
  ...basePipeline,
  {
    $facet: {
      items: [
        { $sort: { [sortBy]: direction, _id: direction } },
        { $skip: getPaginationOffset({ page, limit }) },
        { $limit: limit },
      ],
      total: [{ $count: 'count' }],
    },
  },
])
return { items: result.items || [], total: result.total?.[0]?.count || 0, page, limit }
```

Return raw link rows and `total`, never storage paths.

- [ ] **Step 4: Add DTO mappers and service enrichment without exposing media storage fields.**

Create `designWorkspace.dto.js` with these public functions:

```js
function toAssetDto(asset) {
  if (!asset) return null
  return {
    id: String(asset._id || asset.id),
    originalFilename: asset.originalFilename || null,
    mimeType: asset.mimeType || null,
    size: asset.size ?? null,
    createdAt: asset.createdAt || null,
  }
}

function toSubmissionScoreListItemDto(row, assetsById) {
  const asset = assetsById[String(row.assetId)]
  return {
    id: String(row._id),
    task: { id: String(row.task._id), taskType: row.task.taskType, status: row.task.status },
    listing: {
      id: String(row.task.listingId),
      code: row.task.listingSnapshot?.sku || row.task.listingSnapshot?.asin || null,
      title: row.task.listingSnapshot?.title || null,
    },
    submission: {
      id: String(row.submissionId),
      version: row.submissionVersion || row.submission?.version || null,
      approvedAt: row.submission?.approvedAt || null,
    },
    file: toAssetDto(asset),
    designer: { id: String(row.designerId), name: row.designerName || null },
    score: {
      basePoints: row.basePoints ?? null,
      finalPoints: row.finalPoints ?? null,
      scoreLevel: row.scoreLevel || null,
      status: row.status || null,
      scoredAt: row.scoredAt || null,
      override: row.override || null,
      voidReason: row.voidReason || null,
      voidedAt: row.voidedAt || null,
    },
  }
}
```

Add the equivalent `toPsdFileListItemDto(row, assetsById)` with `rowKey` composed as `${assetId}:${taskId}:${role}:${submissionId || 'task'}` and only the DTO fields in the approved spec.

In `designTask.service.js`, resolve filename matches through the Media Public Port before applying the existing read scope:

```js
async function withAssetFilenameFilter(query = {}) {
  const search = String(query.search || '').trim()
  if (!search) return query
  return { ...query, matchingAssetIds: await mediaPublic.findAssetIdsByOriginalFilename(search) }
}
```

Call `applyReadAccessFilter({ ...(await withAssetFilenameFilter(query)), taskType: designTaskTypes.PSD_TEMPLATE }, authContext)`, collect the returned page's asset IDs, load them once through `mediaPublic.getAssetsByIds`, build a string-keyed map, and return `{ items, total, page, limit }` with the DTO mapper. Do not call a Media model or Media repository from Design.

- [ ] **Step 5: Add service tests for scope and no-storage-leak behavior.**

Add this test to `designTask.service.test.js`:

```js
test('lists PSD score records through the read scope and never exposes media storage fields', async () => {
  scoreRepository.listPsdScoreRows.mockResolvedValue({
    items: [
      {
        _id: '660000000000000000510024',
        task: openTask,
        submissionId: '660000000000000000510022',
        submissionVersion: 2,
        assetId,
        designerId: accountId,
        designerName: 'Design User',
        finalPoints: 3,
        scoreLevel: 'STANDARD',
        status: 'ACTIVE',
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
  })
  mediaPublic.getAssetsByIds.mockResolvedValue([
    {
      _id: assetId,
      originalFilename: 'master.psd',
      mimeType: 'application/octet-stream',
      size: 1024,
      relativeStoragePath: 'private/master.psd',
    },
  ])

  const result = await service.listSubmissionScores({}, { permissions: ['DESIGN:READ'], accountId })

  expect(scoreRepository.listPsdScoreRows).toHaveBeenCalledWith(
    expect.objectContaining({ taskType: 'PSD_TEMPLATE' }),
  )
  expect(result.items[0].file).toEqual(
    expect.objectContaining({ originalFilename: 'master.psd', size: 1024 }),
  )
  expect(JSON.stringify(result)).not.toContain('relativeStoragePath')
})
```

Add a parallel `listPsdFiles` test asserting all DTO rows have `task.taskType === 'PSD_TEMPLATE'` and that scoped users pass a `shopIds` restriction to the task repository.

- [ ] **Step 6: Run the repository and service tests, then commit.**

Run:

```powershell
$env:NODE_ENV='test'; $env:MONGODB_URI='mongodb://127.0.0.1:27017/lng-web-test'; $env:REDIS_ENABLED='false'; $env:LOG_LEVEL='silent'; npx jest src/test/media/repositories/mediaAsset.repository.test.js src/test/media/services/mediaAsset.service.test.js src/test/design/repositories/designSubmissionScore.repository.test.js src/test/design/repositories/designTask.repository.test.js src/test/design/services/designTask.service.test.js --runInBand
```

Expected: PASS.

```powershell
git add src/modules/media/repositories/mediaAsset.repository.js src/modules/media/services/mediaAsset.service.js src/modules/media/public.js src/test/media/repositories/mediaAsset.repository.test.js src/test/media/services/mediaAsset.service.test.js src/modules/design/repositories/designSubmissionScore.repository.js src/modules/design/repositories/designTask.repository.js src/modules/design/dtos/designWorkspace.dto.js src/modules/design/services/designTask.service.js src/test/design/repositories/designSubmissionScore.repository.test.js src/test/design/repositories/designTask.repository.test.js src/test/design/services/designTask.service.test.js
git commit -m "feat(design): expose PSD score and file read models"
```

### Task 3: Verify the complete backend contract and permission boundaries

**Files:**

- Modify if required by failures: `C:\lng_system\lng-web\lng-web-be-psd-quality-file-library\src\modules\design\controllers\designTask.controller.js`
- Modify if required by failures: `C:\lng_system\lng-web\lng-web-be-psd-quality-file-library\src\modules\design\routes\index.js`
- Test: `C:\lng_system\lng-web\lng-web-be-psd-quality-file-library\src\test\design\routes\index.test.js`

**Interfaces:**

- Consumes: the validators and service list methods from Tasks 1-2.
- Produces: stable successful envelope `{ success: true, data: { items, total, page, limit } }` for both GET routes.

- [ ] **Step 1: Add a focused route regression that checks the existing score mutation endpoints remain unchanged.**

```js
test('PSD workspace list routes do not widen score mutation permissions', async () => {
  const override = await request(createServer(), {
    method: 'PATCH',
    path: `/submission-scores/${scoreId}/override`,
    headers: { 'X-Auth-Context': JSON.stringify({ permissions: ['DESIGN:READ'] }) },
    body: { points: 2, overrideReason: 'Correction' },
  })
  expect(override.statusCode).toBe(403)
})
```

- [ ] **Step 2: Run the complete design route contract test.**

Run:

```powershell
$env:NODE_ENV='test'; $env:MONGODB_URI='mongodb://127.0.0.1:27017/lng-web-test'; $env:REDIS_ENABLED='false'; $env:LOG_LEVEL='silent'; npx jest src/test/design/routes/index.test.js --runInBand
```

Expected: PASS, including forbidden read and mutation cases.

- [ ] **Step 3: Run all Design backend tests and commit only any corrective route/test change.**

Run:

```powershell
$env:NODE_ENV='test'; $env:MONGODB_URI='mongodb://127.0.0.1:27017/lng-web-test'; $env:REDIS_ENABLED='false'; $env:LOG_LEVEL='silent'; npx jest src/test/design --runInBand
```

Expected: PASS.

If this task changed files after Task 2:

```powershell
git add src/modules/design/controllers/designTask.controller.js src/modules/design/routes/index.js src/test/design/routes/index.test.js
git commit -m "test(design): verify PSD workspace access"
```

### Task 4: Add frontend contracts, mappers, and query hooks

**Files:**

- Modify: `C:\lng_system\lng-web\lng-web-fe-orders-targeted-evolution\src\services\endpoints.js`
- Modify: `C:\lng_system\lng-web\lng-web-fe-orders-targeted-evolution\src\features\design-tasks\api\designTasks.keys.js`
- Modify: `C:\lng_system\lng-web\lng-web-fe-orders-targeted-evolution\src\features\design-tasks\api\designTasks.queries.js`
- Modify: `C:\lng_system\lng-web\lng-web-fe-orders-targeted-evolution\src\features\design-tasks\utils\designTasksApi.js`
- Create: `C:\lng_system\lng-web\lng-web-fe-orders-targeted-evolution\src\features\design-tasks\utils\designWorkspaceApi.test.js`

**Interfaces:**

- Consumes: backend response envelopes from Tasks 1-3 and existing `unwrapApiData`, `cleanObject`, `displayNoId`, and `assetDownloadUrl` helpers.
- Produces: `useSubmissionScoresQuery`, `usePsdFilesQuery`, `buildSubmissionScoresQuery`, `buildPsdFilesQuery`, `mapSubmissionScoresResponse`, and `mapPsdFilesResponse`.

- [ ] **Step 1: Write failing pure-mapper tests.**

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPsdFilesQuery,
  buildSubmissionScoresQuery,
  mapPsdFilesResponse,
  mapSubmissionScoresResponse,
} from './designTasksApi.js'

test('submission score query trims filters and preserves PSD score status', () => {
  assert.deepEqual(
    buildSubmissionScoresQuery({
      search: ' master ',
      scoreLevel: 'standard',
      scoreStatus: 'voided',
      designerId: 'designer-1',
      page: 2,
      pageSize: 25,
    }),
    {
      search: 'master',
      scoreLevel: 'STANDARD',
      scoreStatus: 'VOIDED',
      designerId: 'designer-1',
      page: 2,
      limit: 25,
    },
  )
})

test('PSD file rows expose readable names and never use IDs as labels', () => {
  const result = mapPsdFilesResponse({
    items: [
      {
        rowKey: 'row-1',
        asset: { id: 'asset-1', originalFilename: 'shirt.psd', size: 2048 },
        role: 'APPROVED',
        task: { id: 'task-1', status: 'APPROVED' },
        listing: { id: 'listing-1', code: 'SKU-1', title: 'Shirt' },
        designer: { id: 'designer-1', name: 'Mai' },
        submission: { id: 'submission-1', version: 2 },
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
  })
  assert.equal(result.items[0].filename, 'shirt.psd')
  assert.equal(result.items[0].listingLabel, 'SKU-1')
  assert.equal(result.items[0].downloadUrl, '/api/media/assets/asset-1/download')
})
```

- [ ] **Step 2: Run the test and confirm imports fail.**

Run:

```powershell
node --test src/features/design-tasks/utils/designWorkspaceApi.test.js
```

Expected: FAIL because the query builders and mappers do not exist.

- [ ] **Step 3: Add endpoint constants, keys, builders, mappers, and hooks.**

Add these endpoint constants:

```js
SUBMISSION_SCORES: '/api/design/submission-scores',
PSD_FILES: '/api/design/psd-files',
```

Add keys:

```js
submissionScores: (query = {}) => [...designTasksKeys.all, 'submission-scores', query],
psdFiles: (query = {}) => [...designTasksKeys.all, 'psd-files', query],
```

Build query values with the existing normalizers and map only display-safe values:

```js
export function buildPsdFilesQuery(filters = {}) {
  return cleanObject({
    search: trimText(filters.search),
    role: trimUpper(filters.role === 'all' ? '' : filters.role),
    designerId: filters.designerId === 'all' ? undefined : filters.designerId,
    taskStatus: trimUpper(filters.taskStatus === 'all' ? '' : filters.taskStatus),
    dateFrom: trimText(filters.dateFrom),
    dateTo: trimText(filters.dateTo),
    sortBy: trimText(filters.sortBy),
    sortOrder: trimText(filters.sortOrder),
    page: Math.max(Number(filters.page) || 1, 1),
    limit: Math.max(Number(filters.pageSize) || 20, 1),
  })
}
```

Use identical pagination handling for `buildSubmissionScoresQuery`, adding `scoreLevel` and `scoreStatus`. Map `asset.originalFilename` through `displayNoId`, format the listing with code/title fallback, and add a `downloadUrl` only when an asset ID exists.

Add query hooks with `placeholderData: keepPreviousData`:

```js
export function usePsdFilesQuery(filters = {}, options = {}) {
  const params = buildPsdFilesQuery(filters)
  return useQuery({
    queryKey: designTasksKeys.psdFiles(params),
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.DESIGN.PSD_FILES, { params })
        .then(unwrapApiData)
        .then(mapPsdFilesResponse),
    placeholderData: keepPreviousData,
    ...options,
  })
}
```

- [ ] **Step 4: Run focused tests and commit.**

Run:

```powershell
node --test src/features/design-tasks/utils/designWorkspaceApi.test.js src/features/design-tasks/utils/designTasksApi.test.js
```

Expected: PASS.

```powershell
git add src/services/endpoints.js src/features/design-tasks/api/designTasks.keys.js src/features/design-tasks/api/designTasks.queries.js src/features/design-tasks/utils/designTasksApi.js src/features/design-tasks/utils/designWorkspaceApi.test.js
git commit -m "feat(design): add PSD workspace query contracts"
```

### Task 5: Implement the two Operations pages and detail drawers

**Files:**

- Create: `C:\lng_system\lng-web\lng-web-fe-orders-targeted-evolution\src\features\design-tasks\components\QualityScoreDetailDrawer.jsx`
- Create: `C:\lng_system\lng-web\lng-web-fe-orders-targeted-evolution\src\features\design-tasks\components\PsdFileDetailDrawer.jsx`
- Create: `C:\lng_system\lng-web\lng-web-fe-orders-targeted-evolution\src\features\design-tasks\pages\QualityScoringPage.jsx`
- Create: `C:\lng_system\lng-web\lng-web-fe-orders-targeted-evolution\src\features\design-tasks\pages\PsdFileLibraryPage.jsx`
- Create: `C:\lng_system\lng-web\lng-web-fe-orders-targeted-evolution\src\features\design-tasks\pages\designWorkspacePagesComposition.test.js`

**Interfaces:**

- Consumes: Task 4 hooks and mappers, `useDesignAssigneesQuery`, `useOverrideSubmissionScoreMutation`, `useVoidSubmissionScoreMutation`, and existing Operations primitives.
- Produces: two read-only operations pages with reviewer-gated score correction and downloadable PSD file details.

- [ ] **Step 1: Write composition tests before creating the pages.**

```js
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

for (const page of ['QualityScoringPage.jsx', 'PsdFileLibraryPage.jsx']) {
  test(`${page} uses the Operations list system`, () => {
    const url = new URL(`./${page}`, import.meta.url)
    assert.equal(existsSync(url), true)
    const source = readFileSync(url, 'utf8')
    assert.equal(source.includes('<OperationsPageShell'), true)
    assert.equal(source.includes('<OperationsToolbar'), true)
    assert.equal(source.includes('<OperationsTable'), true)
    assert.equal(source.includes('<OperationsPagination'), true)
  })
}

test('Quality Scoring keeps destructive score changes reviewer-gated', () => {
  const source = readFileSync(new URL('./QualityScoringPage.jsx', import.meta.url), 'utf8')
  assert.equal(
    source.includes("hasAnyPermission(currentUser, ['DESIGN:REVIEW', 'DESIGN:WRITE'])"),
    true,
  )
  assert.equal(source.includes('useOverrideSubmissionScoreMutation'), true)
  assert.equal(source.includes('useVoidSubmissionScoreMutation'), true)
})

test('PSD File Library has download but no media mutation or delete control', () => {
  const source = readFileSync(new URL('./PsdFileLibraryPage.jsx', import.meta.url), 'utf8')
  assert.equal(source.includes('ENDPOINTS.MEDIA.ASSET_DOWNLOAD'), true)
  assert.equal(source.includes('useUploadMediaAssetMutation'), false)
  assert.equal(source.includes('Delete'), false)
})
```

- [ ] **Step 2: Run the composition tests and confirm they fail because both page files are missing.**

Run:

```powershell
node --test src/features/design-tasks/pages/designWorkspacePagesComposition.test.js
```

Expected: FAIL with missing page files.

- [ ] **Step 3: Implement the two drawers with existing MUI Drawer and score editor patterns.**

`QualityScoreDetailDrawer` must render the score state and reuse the existing editor instead of reimplementing mutation forms:

```jsx
<SubmissionScoreEditor
  key={`${row.id}:${row.score.finalPoints}:${row.score.scoreLevel}`}
  submission={{ id: row.submission.id, score: { id: row.id, ...row.score } }}
  canReview={canReview}
  isSubmitting={isSubmitting}
  onOverride={onOverride}
  onVoid={(voidReason) => onVoid(row.task.id, row.submission.id, voidReason)}
/>
```

`PsdFileDetailDrawer` must use the existing download endpoint and browser-safe blob flow:

```js
async function handleDownload() {
  const response = await apiClient.get(ENDPOINTS.MEDIA.ASSET_DOWNLOAD(row.assetId), {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = row.filename || 'psd-file'
  anchor.click()
  URL.revokeObjectURL(url)
}
```

The drawer shows filename, MIME type, size, role, listing, task status, designer, version, and timestamps. It has no preview placeholder and no mutation controls.

- [ ] **Step 4: Implement Quality Scoring with URL-backed filters and a dense table.**

Use the same `useSearchParams`, `useDebounce`, `OperationsToolbar`, and `OperationsPagination` pattern as `DesignTasksPage`. The table columns must be:

```js
const columns = [
  { key: 'file', label: 'Submission file', width: '250px' },
  { key: 'listing', label: 'Listing / task', width: '230px' },
  { key: 'designer', label: 'Designer', width: '170px' },
  { key: 'version', label: 'Version', width: '90px', align: 'center' },
  { key: 'approvedAt', label: 'Approved', width: '150px' },
  { key: 'points', label: 'Points', width: '100px', align: 'right' },
  { key: 'level', label: 'Level', width: '120px' },
  { key: 'status', label: 'Status', width: '120px' },
  { key: 'actions', label: '', width: '72px', align: 'right' },
]
```

Use `useSubmissionScoresQuery(filters)`. Toolbar inputs are search, designer select from `useDesignAssigneesQuery({ taskType: 'PSD_TEMPLATE' })`, score level, score status, date range, and refresh. Render IDs only as React row keys and mutation variables. Invalidating either override or void must refresh `designTasksKeys.submissionScores()` and `designTasksKeys.scoreSummary()`.

- [ ] **Step 5: Implement PSD File Library with URL-backed filters and a download detail action.**

Use `usePsdFilesQuery(filters)`. Its table columns must be:

```js
const columns = [
  { key: 'filename', label: 'File name', width: '260px' },
  { key: 'role', label: 'Role', width: '130px' },
  { key: 'listing', label: 'Listing / task', width: '240px' },
  { key: 'designer', label: 'Designer', width: '170px' },
  { key: 'version', label: 'Version', width: '90px', align: 'center' },
  { key: 'uploadedAt', label: 'Uploaded', width: '150px' },
  { key: 'size', label: 'Size', width: '110px', align: 'right' },
  { key: 'actions', label: '', width: '72px', align: 'right' },
]
```

Toolbar inputs are search, role, designer, task status, date range, and refresh. Use `row.rowKey` as the Operations table key. Render the primary table action as a view icon that opens the detail drawer; download stays in the drawer to keep the dense row calm.

- [ ] **Step 6: Run focused frontend tests and commit.**

Run:

```powershell
node --test src/features/design-tasks/pages/designWorkspacePagesComposition.test.js src/features/design-tasks/utils/designWorkspaceApi.test.js
```

Expected: PASS.

```powershell
git add src/features/design-tasks/components/QualityScoreDetailDrawer.jsx src/features/design-tasks/components/PsdFileDetailDrawer.jsx src/features/design-tasks/pages/QualityScoringPage.jsx src/features/design-tasks/pages/PsdFileLibraryPage.jsx src/features/design-tasks/pages/designWorkspacePagesComposition.test.js
git commit -m "feat(design): add PSD quality and file workspaces"
```

### Task 6: Wire navigation and verify the integrated workflow

**Files:**

- Modify: `C:\lng_system\lng-web\lng-web-fe-orders-targeted-evolution\src\constants\routes.js`
- Modify: `C:\lng_system\lng-web\lng-web-fe-orders-targeted-evolution\src\routes\index.jsx`
- Modify: `C:\lng_system\lng-web\lng-web-fe-orders-targeted-evolution\src\layouts\sidebarNavigation.js`
- Modify: `C:\lng_system\lng-web\lng-web-fe-orders-targeted-evolution\src\layouts\sidebarNavigation.test.js`
- Modify: `C:\lng_system\lng-web\lng-web-fe-orders-targeted-evolution\src\i18n\locales\en\common.json`
- Modify: `C:\lng_system\lng-web\lng-web-fe-orders-targeted-evolution\src\i18n\locales\vi\common.json`

**Interfaces:**

- Consumes: the page default exports from Task 5 and existing sidebar permission filtering.
- Produces: two Design Workspace leaves and protected route targets available to the same users as Design Tasks.

- [ ] **Step 1: Extend the sidebar test to expect the new leaves and locale keys.**

Change the Design leaf expectations to include `quality-scoring` and `psd-file-library` immediately after `design-task-list`. Add this permission assertion:

```js
assert.deepEqual(
  collectLeafIds(filterNavigationByUser(SIDEBAR_NAVIGATION, { permissions: ['DESIGN:WORK'] })),
  ['dashboard', 'design-task-list', 'quality-scoring', 'psd-file-library'],
)
```

Also require `locale.nav.items.qualityScoring` and `locale.nav.items.psdFileLibrary` to be strings in both locale files.

- [ ] **Step 2: Run the sidebar test and confirm it fails before route and label changes.**

Run:

```powershell
node --test src/layouts/sidebarNavigation.test.js
```

Expected: FAIL because the two leaves and locale labels are absent.

- [ ] **Step 3: Add routes, lazy imports, labels, and permission-filtered sidebar leaves.**

Add route constants:

```js
PORTAL_QUALITY_SCORING: '/portal/design/quality-scoring',
PORTAL_PSD_FILES: '/portal/design/psd-files',
```

Add lazy imports and protected routes using the same `requireAnyPermissions` list as `DesignTasksPage`:

```jsx
{ path: 'portal/design/quality-scoring', element: requireAnyPermissions(['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW', 'DESIGN_TASKS:READ'], <QualityScoringPage />) },
{ path: 'portal/design/psd-files', element: requireAnyPermissions(['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW', 'DESIGN_TASKS:READ'], <PsdFileLibraryPage />) },
```

Add the two `Design Workspace` children with the existing `design` and `products` icon vocabulary. Use `labelKey: 'nav.items.qualityScoring'` and `labelKey: 'nav.items.psdFileLibrary'`; both use exactly the existing Design Tasks `allowedRoles` and `requiredPermissions` values. Add English labels `Quality Scoring`, `PSD File Library` and Vietnamese labels `Chấm điểm chất lượng`, `Kho file PSD`.

- [ ] **Step 4: Run navigation and frontend quality checks.**

Run:

```powershell
node --test src/layouts/sidebarNavigation.test.js src/features/design-tasks/utils/designWorkspaceApi.test.js src/features/design-tasks/pages/designWorkspacePagesComposition.test.js
npm run lint
npm run build
```

Expected: all commands exit with code 0.

- [ ] **Step 5: Perform browser verification against a live authenticated Design user.**

Check all of the following at desktop width:

1. Design Workspace shows exactly Design Tasks, Quality Scoring, and PSD File Library for a Design read user.
2. Both pages keep controls in a single toolbar row, show no raw IDs, and preserve an understandable empty/error state.
3. Quality Scoring opens details and only reveals Override/Void to a reviewer.
4. PSD File Library opens details and downloads its referenced file through the existing asset download endpoint.
5. A non-Design user cannot navigate to either route.

- [ ] **Step 6: Commit the frontend wiring and record the two backend/frontend commit hashes.**

```powershell
git add src/constants/routes.js src/routes/index.jsx src/layouts/sidebarNavigation.js src/layouts/sidebarNavigation.test.js src/i18n/locales/en/common.json src/i18n/locales/vi/common.json
git commit -m "feat(navigation): add PSD quality workspaces"
git log --oneline -3
```

## Self-Review

### Spec coverage

- PSD-only scope is enforced in both aggregate repositories and asserted in repository/service tests: Task 2.
- Quality Scoring filters, table, detail, reviewer-only Override/Void, and no duplicate lifecycle actions: Tasks 1, 4, and 5.
- PSD File Library filters, flattened role links, metadata, details, and download only: Tasks 1, 2, 4, and 5.
- Existing Design RBAC, media download, and no generic media manager or media mutation: Tasks 2, 3, 5, and 6.
- Routes, sidebar labels, permission filtering, and no raw IDs: Task 6 plus mapper tests in Task 4.
- Backend, frontend, and browser verification: Tasks 3, 4, 5, and 6.

### Placeholder scan

No incomplete implementation markers or generic test directions remain. Optional image preview is explicitly excluded from scope rather than left as work.

### Type consistency

- Backend list responses use `{ items, total, page, limit }`; frontend mappers normalize the same envelope.
- `scoreStatus` is `ACTIVE`, `VOIDED`, or `ALL`; `role` is `REFERENCE`, `SUBMISSION`, or `APPROVED` across validator, repository, query builder, and UI.
- `assetId` is only used for DTO/action flow; user-facing names come from `originalFilename`, listing code/title, and designer name.
