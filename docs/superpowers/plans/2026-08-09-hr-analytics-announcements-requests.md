# HR Analytics, Announcements, and Request Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scoped 1/7/30-day employee analytics, align announcements with the backend contract, and open complete leave/overtime request details.

**Architecture:** Extend one HR dashboard endpoint with validated range and semantic scope while deriving actual profile access on the server. Reuse one frontend analytics component for Operations and Team, keep announcements on their focused route, and use existing list DTOs as request drawer data.

**Tech Stack:** Express 5, Mongoose 9, Jest 30, React 19, TypeScript 6, Ant Design 6, TanStack Query 5, Recharts 3, Vitest 4.

## Global Constraints

- Dashboard ranges are exactly `1`, `7`, or `30` days.
- Backend derives department/team access from authenticated permission scopes; the client cannot request an unrestricted team ID.
- Announcement attachments use existing MediaAsset IDs.
- Request actions remain gated by backend-provided capabilities.
- No new frontend dependency; add Vietnamese and English copy together.
- Preserve unrelated staged changes in `lng-web-fe`.

---

### Task 1: Add scoped HR analytics contract

**Files:**

- Create: `C:/Users/stack/Task/lng-web-be/src/modules/hr/validators/hrDashboard.validator.js`
- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/controllers/hrDashboard.controller.js`
- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/services/hrDashboard.service.js`
- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/repositories/employeeProfile.repository.js`
- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/repositories/attendance.repository.js`
- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/repositories/leave.repository.js`
- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/repositories/overtime.repository.js`
- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/routes/index.js`
- Test: `C:/Users/stack/Task/lng-web-be/src/test/hr/services/hrDashboard.service.test.js`
- Test: `C:/Users/stack/Task/lng-web-be/src/test/hr/routes/hrModule.contract.test.js`

**Interfaces:**

- `GET /api/hr/dashboard?rangeDays=1|7|30&scope=operations|team`.
- Response: `{ range, employeeStats, attendanceSeries, requestStats }`.
- `attendanceSeries[]`: `{ dateKey, present, late, absent, onLeave, missingCheckOuts }`.
- `requestStats`: leave/overtime counts grouped as pending, approved, and closed.

- [ ] **Step 1: Write failing validation and scope tests**

```js
expect(validateDashboard({ rangeDays: 7, scope: 'team' }).value).toEqual({
  rangeDays: 7,
  scope: 'team',
})
expect(validateDashboard({ rangeDays: 14, scope: 'team' }).details).toBeDefined()
```

Create two teams and prove a team-scoped caller sees only their profiles/attendance/requests while operations sees its allowed aggregate.

- [ ] **Step 2: Run the dashboard tests and confirm the current one-day global contract fails**

Run: `npx jest src/test/hr/services/hrDashboard.service.test.js src/test/hr/routes/hrModule.contract.test.js --runInBand`

- [ ] **Step 3: Reuse existing HR scope filters**

Extract or reuse the same profile-scope resolution already used by schedule, leave, overtime, and workspace services. Resolve permitted profile IDs once, then pass them into repository aggregations. Never accept `teamId` in the dashboard query.

- [ ] **Step 4: Aggregate daily series with one query per domain**

Attendance groups by `workDateKey`; leave/overtime group by status for the inclusive date range. Fill missing days with zeroes in the service so FE receives a stable ordered series.

- [ ] **Step 5: Run focused and architecture tests**

Run: `npx jest src/test/hr/services/hrDashboard.service.test.js src/test/hr/routes/hrModule.contract.test.js src/test/architecture.contract.test.js --runInBand`

- [ ] **Step 6: Commit analytics backend**

```powershell
git add src/modules/hr/validators/hrDashboard.validator.js src/modules/hr/controllers/hrDashboard.controller.js src/modules/hr/services/hrDashboard.service.js src/modules/hr/repositories/employeeProfile.repository.js src/modules/hr/repositories/attendance.repository.js src/modules/hr/repositories/leave.repository.js src/modules/hr/repositories/overtime.repository.js src/modules/hr/routes/index.js src/test/hr/services/hrDashboard.service.test.js src/test/hr/routes/hrModule.contract.test.js
git commit -m "feat(hr): add scoped employee analytics"
```

### Task 2: Build one reusable Operations/Team analytics view

**Files:**

- Modify: `C:/Users/stack/Task/lng-web-fe/src/features/hr/api/hrTimeApi.ts`
- Create: `C:/Users/stack/Task/lng-web-fe/src/features/hr/components/HrAnalyticsDashboard.tsx`
- Create: `C:/Users/stack/Task/lng-web-fe/src/features/hr/components/HrAnalyticsDashboard.module.scss`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/features/hr/pages/HrOverviewPage.tsx`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/features/hr/pages/TeamWorkspacePage.tsx`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/shared/i18n/locales/en/common.json`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/shared/i18n/locales/vi/common.json`
- Test: `C:/Users/stack/Task/lng-web-fe/src/test/hr/pages/HrWorkspacePage.test.tsx`
- Test: `C:/Users/stack/Task/lng-web-fe/src/test/hr/pages/TeamWorkspacePage.test.tsx`

**Interfaces:**

- `getHrDashboard({ rangeDays, scope })` returns the exact typed analytics DTO.
- `HrAnalyticsDashboard({ scope: 'operations' | 'team' })` owns only range selection and query presentation.

- [ ] **Step 1: Write failing range and page tests**

```tsx
await user.click(screen.getByRole('radio', { name: /30 days/i }))
expect(getHrDashboard).toHaveBeenLastCalledWith({ rangeDays: 30, scope: 'operations' })
expect(screen.queryByRole('button', { name: /add announcement/i })).not.toBeInTheDocument()
```

Team test asserts `scope: 'team'` and the same three chart headings.

- [ ] **Step 2: Run tests and confirm old one-day dashboard behavior fails**

Run: `npm run test:ui -- src/test/hr/pages/HrWorkspacePage.test.tsx src/test/hr/pages/TeamWorkspacePage.test.tsx`

- [ ] **Step 3: Implement the shared chart dashboard**

Use an Ant Segmented control with `[1, 7, 30]`, employee status composition, stacked attendance series, and grouped leave/OT workload. Provide a visually hidden/text summary table for chart values.

- [ ] **Step 4: Replace only dashboard views**

`HrOverviewPage(view="dashboard")` renders analytics only. `TeamWorkspacePage(view="dashboard")` renders scoped analytics; existing approvals and members views stay operational.

- [ ] **Step 5: Run tests and commit**

Run: `npm run test:ui -- src/test/hr/pages/HrWorkspacePage.test.tsx src/test/hr/pages/TeamWorkspacePage.test.tsx`

```powershell
git add src/features/hr/api/hrTimeApi.ts src/features/hr/components/HrAnalyticsDashboard.tsx src/features/hr/components/HrAnalyticsDashboard.module.scss src/features/hr/pages/HrOverviewPage.tsx src/features/hr/pages/TeamWorkspacePage.tsx src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/hr/pages/HrWorkspacePage.test.tsx src/test/hr/pages/TeamWorkspacePage.test.tsx
git commit --only -m "feat(hr): add operations and team analytics" -- src/features/hr/api/hrTimeApi.ts src/features/hr/components/HrAnalyticsDashboard.tsx src/features/hr/components/HrAnalyticsDashboard.module.scss src/features/hr/pages/HrOverviewPage.tsx src/features/hr/pages/TeamWorkspacePage.tsx src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/hr/pages/HrWorkspacePage.test.tsx src/test/hr/pages/TeamWorkspacePage.test.tsx
```

### Task 3: Align announcement list, detail, and editor with BE

**Files:**

- Modify: `C:/Users/stack/Task/lng-web-fe/src/features/hr/api/hrTimeApi.ts`
- Create: `C:/Users/stack/Task/lng-web-fe/src/features/hr/components/AnnouncementEditorModal.tsx`
- Create: `C:/Users/stack/Task/lng-web-fe/src/features/hr/components/AnnouncementDetailDrawer.tsx`
- Create: `C:/Users/stack/Task/lng-web-fe/src/features/hr/components/AnnouncementEditorModal.module.scss`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/features/hr/pages/HrOverviewPage.tsx`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/shared/i18n/locales/en/common.json`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/shared/i18n/locales/vi/common.json`
- Test: `C:/Users/stack/Task/lng-web-fe/src/test/hr/pages/HrWorkspacePage.test.tsx`

**Interfaces:**

- `Announcement` includes attachments, audience IDs, reminder, event details, timestamps, and capabilities from the BE DTO.
- Editor emits only BE fields; uploaded files become `{ mediaId: asset.id, filename, mimeType }`.

- [ ] **Step 1: Write failing conditional payload tests**

```tsx
await user.selectOptions(screen.getByLabelText(/status/i), 'SCHEDULED')
await user.click(screen.getByRole('button', { name: /save/i }))
expect(await screen.findByText(/schedule time is required/i)).toBeVisible()
```

Also test targeted audience requirement, EVENT fields, media ID mapping, edit preload, detail opening, and capability-hidden edit/delete actions.

- [ ] **Step 2: Run the announcement page tests**

Run: `npm run test:ui -- src/test/hr/pages/HrWorkspacePage.test.tsx`

- [ ] **Step 3: Type the full contract and reuse media upload**

Reuse the already exported `uploadMediaAsset(file)` from the existing media API. Do not modify that API or create an HR-specific storage path. Keep media IDs in the announcement payload.

- [ ] **Step 4: Implement focused route behavior**

Only `view="announcements"` queries and renders announcements and Add Announcement. Clicking a row/card opens the detail drawer. Create/edit invalidates the announcement query.

- [ ] **Step 5: Run tests and commit**

Run: `npm run test:ui -- src/test/hr/pages/HrWorkspacePage.test.tsx`

```powershell
git add src/features/hr/api/hrTimeApi.ts src/features/hr/components/AnnouncementEditorModal.tsx src/features/hr/components/AnnouncementDetailDrawer.tsx src/features/hr/components/AnnouncementEditorModal.module.scss src/features/hr/pages/HrOverviewPage.tsx src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/hr/pages/HrWorkspacePage.test.tsx
git commit --only -m "feat(hr): align announcement workflows" -- src/features/hr/api/hrTimeApi.ts src/features/hr/components/AnnouncementEditorModal.tsx src/features/hr/components/AnnouncementDetailDrawer.tsx src/features/hr/components/AnnouncementEditorModal.module.scss src/features/hr/pages/HrOverviewPage.tsx src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/hr/pages/HrWorkspacePage.test.tsx
```

### Task 4: Open leave and overtime request details

**Files:**

- Create: `C:/Users/stack/Task/lng-web-fe/src/features/hr/components/TimeRequestDetailDrawer.tsx`
- Create: `C:/Users/stack/Task/lng-web-fe/src/features/hr/components/TimeRequestDetailDrawer.module.scss`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/features/hr/api/hrTimeApi.ts`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/features/hr/pages/TimeRequestsPage.tsx`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/features/hr/pages/TeamWorkspacePage.tsx`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/shared/i18n/locales/en/common.json`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/shared/i18n/locales/vi/common.json`
- Create: `C:/Users/stack/Task/lng-web-fe/src/test/hr/pages/TimeRequestsPage.test.tsx`
- Test: `C:/Users/stack/Task/lng-web-fe/src/test/hr/pages/TeamWorkspacePage.test.tsx`

**Interfaces:**

- `TimeRequestDetailDrawer` consumes the existing discriminated union `{ kind: 'leave' | 'overtime'; request }`.
- It never enables actions absent from `request.capabilities`.

- [ ] **Step 1: Write failing row-open and capability tests**

```tsx
await user.click(await screen.findByRole('row', { name: /nguyen an annual/i }))
expect(screen.getByRole('dialog', { name: /request details/i })).toBeVisible()
expect(screen.getByText('Family trip')).toBeVisible()
expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
```

- [ ] **Step 2: Run tests and confirm rows do not open details**

Run: `npm run test:ui -- src/test/hr/pages/TimeRequestsPage.test.tsx src/test/hr/pages/TeamWorkspacePage.test.tsx`

- [ ] **Step 3: Implement the drawer from existing DTO fields**

Render `EmployeeAvatar`, organization context, dates/times, reason, attachments, status, decision, cancellation, and the available actor/timestamp history. Stop action-button clicks from bubbling into row open.

- [ ] **Step 4: Add a BE endpoint only if the test fixture exposes a missing required field**

The current leave/overtime list DTOs already contain requester avatar, organization, reason, decision, attachments, timestamps, and capabilities. Keep the plan FE-only unless a concrete missing field is proven during the failing-test step.

- [ ] **Step 5: Run full phase verification**

Run: `npx jest src/test/hr/services/hrDashboard.service.test.js src/test/hr/routes/hrModule.contract.test.js src/test/hr/services/announcement.service.test.js src/test/architecture.contract.test.js --runInBand`

Run: `npm run test:unit -- src/test/hr/api/hrTimeApi.test.ts`

Run: `npm run test:ui -- src/test/hr/pages/HrWorkspacePage.test.tsx src/test/hr/pages/TeamWorkspacePage.test.tsx src/test/hr/pages/TimeRequestsPage.test.tsx`

Run: `npm run lint`

Run: `npm run build`

- [ ] **Step 6: Commit request details**

```powershell
git add src/features/hr/components/TimeRequestDetailDrawer.tsx src/features/hr/components/TimeRequestDetailDrawer.module.scss src/features/hr/api/hrTimeApi.ts src/features/hr/pages/TimeRequestsPage.tsx src/features/hr/pages/TeamWorkspacePage.tsx src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/hr/pages/TimeRequestsPage.test.tsx src/test/hr/pages/TeamWorkspacePage.test.tsx
git commit --only -m "feat(hr): open request details" -- src/features/hr/components/TimeRequestDetailDrawer.tsx src/features/hr/components/TimeRequestDetailDrawer.module.scss src/features/hr/api/hrTimeApi.ts src/features/hr/pages/TimeRequestsPage.tsx src/features/hr/pages/TeamWorkspacePage.tsx src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/hr/pages/TimeRequestsPage.test.tsx src/test/hr/pages/TeamWorkspacePage.test.tsx
```
