# Design Submission, Avatar, and PSD Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Submit design files, display authenticated employee avatars, and remove listing titles from PSD Files.

**Architecture:** Extend the existing HR public profile contract once, forward the protected avatar URL through Design DTOs, and reuse one shared frontend avatar renderer. Extract only the submit modal from the existing workbench; preserve current upload and mutation functions.

**Tech Stack:** Express 5, Mongoose 9, Jest 30, React 19, TypeScript 6, Ant Design 6, TanStack Query 5, Vitest 4, SCSS modules.

## Global Constraints

- No new frontend dependency.
- Preserve existing multipart/media storage and task submit APIs.
- Persist asset IDs only; never persist signed vendor URLs.
- Use existing `@/shared/*` resources, API client, TanStack Query, and i18n.
- Add matching Vietnamese and English copy in the same change.
- Preserve unrelated staged changes in `lng-web-fe`.

---

### Task 1: Expose authenticated avatars through the HR-to-Design contract

**Files:**

- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/repositories/employeeProfile.repository.js`
- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/public.js`
- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/design/services/designTask.service.js`
- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/design/dtos/designTask.dto.js`
- Test: `C:/Users/stack/Task/lng-web-be/src/test/hr/public.contract.test.js`
- Test: `C:/Users/stack/Task/lng-web-be/src/test/design/services/designTask.service.test.js`

**Interfaces:**

- Produces: `PublicEmployeeProfile.avatarUrl: string | null`, where an asset-backed avatar is `/api/hr/employee-profiles/:profileId/avatar`.
- Produces: Design assignee/task `avatarUrl` without changing `assignedDesignerId`, which remains an Account ID.

- [ ] **Step 1: Write failing HR and Design contract tests**

```js
expect(profile).toMatchObject({
  id: profileId,
  accountId,
  avatarUrl: `/api/hr/employee-profiles/${profileId}/avatar`,
})
expect(result.items[0]).toMatchObject({
  id: accountId,
  avatarUrl: `/api/hr/employee-profiles/${profileId}/avatar`,
})
```

- [ ] **Step 2: Run the focused tests and confirm the URL is missing**

Run: `npx jest src/test/hr/public.contract.test.js src/test/design/services/designTask.service.test.js --runInBand`

Expected: FAIL because the public projection/DTO currently omits avatar fields.

- [ ] **Step 3: Extend the existing public projection and DTO**

```js
const PUBLIC_PROFILE_PROJECTION =
  '_id accountId employeeCode fullName departmentId teamId status isProfileUpdated avatarAssetId avatarUrl'

function avatarUrl(profile) {
  return profile.avatarAssetId
    ? `/api/hr/employee-profiles/${toId(profile)}/avatar`
    : profile.avatarUrl || null
}
```

Return this value from `toPublicProfileDto`; let `getAssignees()` and `toProfileDto()` forward it. Do not expose `avatarAssetId` outside HR.

- [ ] **Step 4: Run focused and architecture tests**

Run: `npx jest src/test/hr/public.contract.test.js src/test/design/services/designTask.service.test.js src/test/architecture.contract.test.js --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit the backend contract**

```powershell
git add src/modules/hr/repositories/employeeProfile.repository.js src/modules/hr/public.js src/modules/design/services/designTask.service.js src/modules/design/dtos/designTask.dto.js src/test/hr/public.contract.test.js src/test/design/services/designTask.service.test.js
git commit -m "feat(design): expose employee avatars"
```

### Task 2: Add one shared authenticated EmployeeAvatar

**Files:**

- Create: `C:/Users/stack/Task/lng-web-fe/src/shared/ui/EmployeeAvatar.tsx`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/shared/ui/index.ts`
- Test: `C:/Users/stack/Task/lng-web-fe/src/test/shared/ui/EmployeeAvatar.test.tsx`

**Interfaces:**

- Produces: `EmployeeAvatar({ name, avatarUrl, size, className })`.
- Consumes: existing `AuthenticatedMediaImage` and Ant Design `Avatar`.

- [ ] **Step 1: Write a failing renderer/fallback test**

```tsx
const { rerender } = render(
  <EmployeeAvatar name="Nguyen An" avatarUrl="/api/hr/employee-profiles/p1/avatar" />,
)
expect(screen.getByRole('img', { name: 'Nguyen An' })).toBeInTheDocument()
rerender(<EmployeeAvatar name="Nguyen An" avatarUrl={null} />)
expect(screen.getByText('NA')).toBeInTheDocument()
```

- [ ] **Step 2: Run the test and confirm the component is missing**

Run: `npm run test:unit -- src/test/shared/ui/EmployeeAvatar.test.tsx`

Expected: FAIL on the missing module.

- [ ] **Step 3: Implement the smallest shared wrapper**

```tsx
export function EmployeeAvatar({ name, avatarUrl, size = 32, className }: Props) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  return (
    <Avatar
      size={size}
      className={className}
      src={avatarUrl ? <AuthenticatedMediaImage downloadUrl={avatarUrl} alt={name} /> : undefined}
    >
      {initials}
    </Avatar>
  )
}
```

- [ ] **Step 4: Run the shared UI test**

Run: `npm run test:unit -- src/test/shared/ui/EmployeeAvatar.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the shared primitive without disturbing staged files**

```powershell
git add src/shared/ui/EmployeeAvatar.tsx src/shared/ui/index.ts src/test/shared/ui/EmployeeAvatar.test.tsx
git commit --only -m "feat(ui): add authenticated employee avatar" -- src/shared/ui/EmployeeAvatar.tsx src/shared/ui/index.ts src/test/shared/ui/EmployeeAvatar.test.tsx
```

### Task 3: Extract and redesign SubmitDesignFilesModal

**Files:**

- Create: `C:/Users/stack/Task/lng-web-fe/src/features/portal/design/components/SubmitDesignFilesModal.tsx`
- Create: `C:/Users/stack/Task/lng-web-fe/src/features/portal/design/components/SubmitDesignFilesModal.module.scss`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/features/portal/design/api/designApi.ts`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/features/portal/design/pages/DesignWorkbenchPage.tsx`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/shared/i18n/locales/en/common.json`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/shared/i18n/locales/vi/common.json`
- Test: `C:/Users/stack/Task/lng-web-fe/src/test/portal/design/pages/DesignWorkbenchPage.test.tsx`

**Interfaces:**

- `DesignAssignee` and `DesignTask.assignedDesigner` gain `avatarUrl?: string | null`.
- `SubmitDesignFilesModal` receives current file state and callbacks; it does not upload or mutate server state itself.

- [ ] **Step 1: Add failing interaction tests**

```tsx
await user.click(screen.getByRole('button', { name: /submit design files/i }))
expect(screen.getByText('SKU-001')).toBeVisible()
expect(screen.getByText(/design package/i)).toBeVisible()
expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
await user.upload(screen.getByLabelText(/design package/i), psdFile)
expect(screen.getByRole('button', { name: /submit/i })).toBeEnabled()
```

Also assert the assignee avatar uses the backend URL and that Cancel calls the existing abort path.

- [ ] **Step 2: Run the workbench test and confirm the new structure is absent**

Run: `npm run test:ui -- src/test/portal/design/pages/DesignWorkbenchPage.test.tsx`

Expected: FAIL on modal context/avatar assertions.

- [ ] **Step 3: Move only modal presentation into the new component**

```tsx
type Props = {
  task?: DesignTask
  open: boolean
  pending: boolean
  files: UploadFile[]
  packageFile?: File
  previewFile?: File
  note: string
  uploadProgress: number
  onFilesChange(files: UploadFile[]): void
  onPackageChange(file?: File): void
  onPreviewChange(file?: File): void
  onNoteChange(note: string): void
  onCancel(): void
  onSubmit(): void
}
```

Keep `uploadMultipartAsset`, `uploadDesignAsset`, `submitDesignTask`, progress state, and `AbortController` in `DesignWorkbenchPage`. Use `EmployeeAvatar` in the modal header, assignee options, task row, and drawer.

- [ ] **Step 4: Add all new copy to both locale files and run tests**

Run: `npm run test:ui -- src/test/portal/design/pages/DesignWorkbenchPage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the modal redesign**

```powershell
git add src/features/portal/design/components/SubmitDesignFilesModal.tsx src/features/portal/design/components/SubmitDesignFilesModal.module.scss src/features/portal/design/api/designApi.ts src/features/portal/design/pages/DesignWorkbenchPage.tsx src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/portal/design/pages/DesignWorkbenchPage.test.tsx
git commit --only -m "feat(design): redesign file submission modal" -- src/features/portal/design/components/SubmitDesignFilesModal.tsx src/features/portal/design/components/SubmitDesignFilesModal.module.scss src/features/portal/design/api/designApi.ts src/features/portal/design/pages/DesignWorkbenchPage.tsx src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/portal/design/pages/DesignWorkbenchPage.test.tsx
```

### Task 4: Remove PSD listing titles and add designer avatars

**Files:**

- Modify: `C:/Users/stack/Task/lng-web-fe/src/features/portal/design/pages/PsdFileWorkspacePage.tsx`
- Test: `C:/Users/stack/Task/lng-web-fe/src/test/portal/design/pages/PsdFileWorkspacePage.test.tsx`

**Interfaces:**

- `PsdFileListItem.designer` gains `avatarUrl?: string | null` only if the backend PSD DTO returns it; otherwise resolve it from the already-loaded assignee list by ID.

- [ ] **Step 1: Write a failing row test**

```tsx
expect(await screen.findByText('SKU-001')).toBeVisible()
expect(screen.queryByText('Legacy listing title')).not.toBeInTheDocument()
expect(screen.getByPlaceholderText(/search file or sku/i)).toBeVisible()
```

- [ ] **Step 2: Run the PSD page test**

Run: `npm run test:ui -- src/test/portal/design/pages/PsdFileWorkspacePage.test.tsx`

Expected: FAIL because title and old placeholder are present.

- [ ] **Step 3: Remove title rendering and reuse EmployeeAvatar**

Render listing code only. Build `assigneesById` with `useMemo` and use the matching assignee avatar for the designer cell without adding another request.

- [ ] **Step 4: Run phase verification**

Run: `npx vitest run src/test/portal/design --project unit && npx vitest run src/test/portal/design --project ui --maxWorkers=4`

Run: `npm run lint`

Run: `npm run build`

Expected: focused tests, lint, and build pass; report unrelated baseline failures separately.

- [ ] **Step 5: Commit the PSD cleanup**

```powershell
git add src/features/portal/design/pages/PsdFileWorkspacePage.tsx src/test/portal/design/pages/PsdFileWorkspacePage.test.tsx
git commit --only -m "fix(design): simplify PSD file listings" -- src/features/portal/design/pages/PsdFileWorkspacePage.tsx src/test/portal/design/pages/PsdFileWorkspacePage.test.tsx
```
