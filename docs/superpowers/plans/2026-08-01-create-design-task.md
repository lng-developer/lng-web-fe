# Create Design Task Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dynamic single-task creation flow for all Design task types while preserving the existing bulk PSD workflow.

**Architecture:** Add the generic create contract to the existing Design API client. Keep form state and conditional validation in a focused `CreateDesignTaskModal`; keep reference uploads, task creation, cache invalidation, permissions, and feedback orchestration in `DesignWorkbenchPage`.

**Tech Stack:** React, TypeScript, Ant Design, TanStack Query, Vitest, Testing Library, existing shared API client.

## Global Constraints

- Reuse existing Catalog and Design API clients; do not add dependencies or raw URLs.
- Show `Create design task` only for `DESIGN:WRITE`.
- Keep `Create PSD tasks` as the separate bulk action.
- Never ask users to enter Media asset IDs manually.
- Upload all reference files successfully before creating the task.
- Preserve form state on upload or create failure.
- Backend Joi validation, Shop scope, and RBAC remain authoritative.
- Submit one implementation commit after all tasks and verification are complete.

---

### Task 1: Generic Design task API contract

**Files:**

- Modify: `src/features/portal/design/api/designApi.ts`
- Modify: `src/test/portal/design/api/designApi.test.ts`

**Interfaces:**

- Produces: `CreateDesignTaskInput`
- Produces: `createDesignTask(input: CreateDesignTaskInput): Promise<DesignTask>`

- [ ] **Step 1: Write the failing API test**

Add a test that calls:

```ts
await createDesignTask({
  listingId: 'listing-1',
  taskType: 'IDEA',
  priority: 'HIGH',
  brief: 'Create a graduation concept',
  note: 'Use references',
  referenceAssetIds: ['asset-1'],
  expectedOutputs: ['MOCKUP', 'PNG_ASSET'],
})

expect(apiClient.post).toHaveBeenCalledWith('/api/design/tasks', {
  listingId: 'listing-1',
  taskType: 'IDEA',
  priority: 'HIGH',
  brief: 'Create a graduation concept',
  note: 'Use references',
  referenceAssetIds: ['asset-1'],
  expectedOutputs: ['MOCKUP', 'PNG_ASSET'],
})
```

- [ ] **Step 2: Run the API test and verify RED**

Run:

```powershell
npm run test:unit -- src/test/portal/design/api/designApi.test.ts
```

Expected: FAIL because `createDesignTask` is not exported.

- [ ] **Step 3: Add the minimal API type and function**

```ts
export type CreateDesignTaskInput = {
  listingId: string
  taskType: 'PSD_TEMPLATE' | 'MOCKUP' | 'PNG_ASSET' | 'IDEA' | 'CLONE'
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  brief?: string
  note?: string
  referenceAssetIds?: string[]
  expectedOutputs?: Array<'PSD_TEMPLATE' | 'MOCKUP' | 'PNG_ASSET' | 'IDEA'>
  sourceListingId?: string
  sourceInternalTemplateId?: string
}

export const createDesignTask = async (input: CreateDesignTaskInput) =>
  unwrap<DesignTask>(await apiClient.post('/api/design/tasks', input))
```

- [ ] **Step 4: Run the API test and verify GREEN**

Run the command from Step 2. Expected: PASS.

---

### Task 2: Dynamic task creation modal

**Files:**

- Create: `src/features/portal/design/pages/CreateDesignTaskModal.tsx`
- Create: `src/test/portal/design/pages/CreateDesignTaskModal.test.tsx`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`

**Interfaces:**

- Consumes: Catalog `Listing`, `InternalTemplate`; Design `CreateDesignTaskInput`.
- Produces: `CreateDesignTaskDraft = Omit<CreateDesignTaskInput, 'referenceAssetIds'> & { referenceFiles: UploadFile[] }`.
- Produces: `CreateDesignTaskModal({ open, listings, templates, saving, onClose, onSubmit })`.

- [ ] **Step 1: Write failing conditional-form tests**

Test the real modal behavior:

```tsx
render(<CreateDesignTaskModal open listings={listings} templates={templates} saving={false} onClose={vi.fn()} onSubmit={onSubmit} />)

// IDEA
select task type IDEA
click Create
expect required validation for Brief

// CLONE
select task type CLONE
click Create
expect required validation for Source

// isolation
expect(screen.getAllByRole('dialog')).toHaveLength(1)
```

Add a submission case proving that `referenceFiles`, expected outputs, priority, brief, and the selected source are returned through `onSubmit` without technical asset-ID inputs.

- [ ] **Step 2: Run the component test and verify RED**

```powershell
npm run test:ui -- src/test/portal/design/pages/CreateDesignTaskModal.test.tsx
```

Expected: FAIL because the modal does not exist.

- [ ] **Step 3: Implement one Ant Design modal**

Use `Form`, `Select`, `Input.TextArea`, and `Upload.Dragger` already installed. The modal contains:

```ts
const TASK_TYPES = ['PSD_TEMPLATE', 'MOCKUP', 'PNG_ASSET', 'IDEA', 'CLONE']
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
const OUTPUT_TYPES = ['PSD_TEMPLATE', 'MOCKUP', 'PNG_ASSET', 'IDEA']
```

Behavior:

- Listing, task type, and priority are always visible; priority defaults to `NORMAL`.
- Brief is required only when `taskType === 'IDEA'`.
- When `taskType === 'CLONE'`, show `sourceMode` (`LISTING` or `TEMPLATE`) and exactly one matching source selector.
- Clear the inactive source field when source mode changes.
- Hide and omit all source fields for non-CLONE task types.
- Accept multiple reference files through `beforeUpload={() => false}`.
- Disable modal confirmation when `saving` is true; use `Form.validateFields()` before `onSubmit`.
- Reset fields and files only after the parent closes the modal following success or explicit cancel.

Add concise EN/VI keys for labels, validation messages, source modes, outputs, references, and the create action.

- [ ] **Step 4: Run component tests and verify GREEN**

Run the command from Step 2. Expected: all modal tests PASS.

---

### Task 3: Workbench integration and upload-before-create flow

**Files:**

- Modify: `src/features/portal/design/pages/DesignWorkbenchPage.tsx`
- Modify: `src/test/portal/design/pages/DesignWorkbenchPage.test.tsx`

**Interfaces:**

- Consumes: `CreateDesignTaskModal`, `createDesignTask`, `uploadDesignAsset`.
- Consumes: Catalog `listListings({ page: 1, limit: 100 })` and `getListingOptions()`.

- [ ] **Step 1: Extend the Design workbench mocks and write failing integration tests**

Add Catalog API mocks for target/source Listings and Internal Templates. Add Design API mocks for `createDesignTask` and `uploadDesignAsset`.

Prove these behaviors:

```ts
click Create design task
expect exactly one dialog

select listing, IDEA, brief, outputs, and one File
submit
expect(uploadDesignAsset).toHaveBeenCalledWith(file)
expect(createDesignTask).toHaveBeenCalledWith(expect.objectContaining({
  listingId: 'listing-1',
  taskType: 'IDEA',
  referenceAssetIds: ['asset-1'],
}))
```

Also prove that a rejected upload prevents `createDesignTask` and leaves the dialog open.

- [ ] **Step 2: Run the page test and verify RED**

```powershell
npm run test:ui -- src/test/portal/design/pages/DesignWorkbenchPage.test.tsx
```

Expected: FAIL because the header action and integration do not exist.

- [ ] **Step 3: Add the minimal workbench orchestration**

- Add `createTaskOpen` state.
- Load Listings and listing options only while the modal is open.
- Add a `Create design task` header button before `Create PSD tasks` for `DESIGN:WRITE` only.
- In one mutation, upload `referenceFiles` with `Promise.all`, then call:

```ts
createDesignTask({
  ...draft,
  referenceAssetIds: assets.map(({ id }) => id),
})
```

- On success: close/reset the modal, invalidate `designKeys.all`, and show the existing success toast.
- On failure: leave the modal open and show the sanitized API error through the existing toast.
- Render `CreateDesignTaskModal` independently from bulk candidate, assign, submit, approve, reject, cancel, and detail UI states.

- [ ] **Step 4: Run page tests and verify GREEN**

Run the command from Step 2. Expected: all Design workbench tests PASS.

---

### Task 4: Full verification and single implementation commit

**Files:**

- Verify all files changed in Tasks 1-3.
- Preserve unrelated working-tree changes.

- [ ] **Step 1: Run focused tests**

```powershell
npm run test:unit -- src/test/portal/design/api/designApi.test.ts
npm run test:ui -- src/test/portal/design/pages/CreateDesignTaskModal.test.tsx src/test/portal/design/pages/DesignWorkbenchPage.test.tsx
```

Expected: all PASS.

- [ ] **Step 2: Run repository checks**

```powershell
npm run lint
npm run test:unit
npm run test:ui
npm run build
git diff --check
```

Expected: lint, tests, build, and diff check PASS. Existing Vite chunk-size warning may remain; no new dependency is added.

- [ ] **Step 3: Security and scope review**

Confirm:

- Only `DESIGN:WRITE` sees the create actions.
- No user-supplied HTML is rendered.
- No raw asset ID input is exposed.
- No create call occurs after a failed upload.
- The payload contains only the active task type's fields.
- No BE or database mutation is performed during automated FE tests.

- [ ] **Step 4: Stage only plan-owned implementation files**

```powershell
git add src/features/portal/design/api/designApi.ts src/features/portal/design/pages/CreateDesignTaskModal.tsx src/features/portal/design/pages/DesignWorkbenchPage.tsx src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/portal/design/api/designApi.test.ts src/test/portal/design/pages/CreateDesignTaskModal.test.tsx src/test/portal/design/pages/DesignWorkbenchPage.test.tsx docs/superpowers/plans/2026-08-01-create-design-task.md
git diff --cached --check
```

- [ ] **Step 5: Create one implementation commit**

```powershell
git commit -m "feat(design): add generic task creation"
```
