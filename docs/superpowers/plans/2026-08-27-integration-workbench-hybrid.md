# Integration Workbench Hybrid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Integrations into compact master-detail workbenches that make Imports, Amazon Extension, and Finance data easy to scan and act on.

**Architecture:** Keep the existing `IntegrationWorkbenchPage` queries, URL-backed Import state, permission guards, and mutations. Compose the existing data into page-local master-detail regions; reuse the existing drawer only as the narrow-screen fallback. Avoid backend work unless an implementation check proves a required displayed field is absent.

**Tech Stack:** React 19, Ant Design 6, TanStack Query 5, React Router 7, SCSS modules, i18next, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-27-integration-workbench-design.md`

## Global Constraints

- No new dependency, endpoint, permission, or query-key contract.
- Use existing shared UI, i18n, semantic theme tokens, and status tags.
- Preserve all current upload, retry, token, command, schedule, finance-import, and mapping operations.
- Keep top-level inactive workbench queries disabled and active import polling bounded to the selected detail.
- Add matching English and Vietnamese keys for new visible copy.

### Refactor prerequisite: bounded workbench ownership

Before the remaining visual tasks, split the route shell from the three existing operator flows without changing their API contracts:

- `IntegrationWorkbenchPage.tsx` owns route-account resolution and the active top-level tab only.
- `IntegrationImportsWorkbench.tsx` owns URL-backed import filters, upload mutation, import jobs, and the import detail panel.
- `IntegrationExtensionWorkbench.tsx` owns extension token, agent command, schedule, and polling state.
- `IntegrationFinanceWorkbench.tsx` owns the finance-source filter state, data queries, and Ads mapping mutation.

Each workbench receives `account` and `active`; its queries are enabled only while active. Keep page-local styles and current test behavior intact; do not introduce a cross-domain context or new API layer.

---

### Task 1: Imports master-detail workspace

**Files:**

- Modify: `src/features/portal/integrations/pages/IntegrationWorkbenchPage.tsx:506-666,1451-1518`
- Modify: `src/features/portal/integrations/pages/ImportJobPanel.tsx:44-355`
- Modify: `src/features/portal/integrations/pages/IntegrationWorkbenchPage.module.scss`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`
- Test: `src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx`

**Interfaces:**

- Consumes: the existing `selectedJobId` URL parameter, `jobs.data`, `ImportJobPanel`, `ImportIssueQueue`, and job mutations.
- Produces: an Imports summary strip, a table master region, and a contextual selected-job detail region that retains the current retry and raw-record behavior.

- [ ] **Step 1: Write the failing Imports selection test**

```tsx
it('shows the selected import in the contextual detail region', async () => {
  renderWorkbench('/portal/integrations', account(['ORDERS:WRITE']))
  fireEvent.click(await screen.findByText('manual-orders.csv'))
  expect(await screen.findByRole('complementary', { name: 'Import job details' })).toBeVisible()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd exec -- vitest run src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx --project ui --maxWorkers=1 --testNamePattern=selected import`

Expected: FAIL because selected job content only renders in a drawer.

- [ ] **Step 3: Add the compact Imports workspace**

Keep the existing table and filters as the master region. Add a three-state summary derived from the loaded jobs list, wrap the table and selected detail in `styles.workbenchSplit`, and render `ImportJobPanel` in contextual mode when a job is selected. Preserve `ImportIssueQueue` after the split region.

- [ ] **Step 4: Make `ImportJobPanel` presentation-aware**

Add a narrow `presentation?: 'drawer' | 'panel'` prop. Keep its existing query, mutation, and modal behavior unchanged; when `presentation` is `panel`, render the existing detail body in an `<aside aria-label="Import job details">` rather than `DetailDrawer`. Use the drawer presentation at the existing narrow breakpoint.

- [ ] **Step 5: Add i18n and responsive SCSS**

Add the summary and detail-region labels to both locale files. Use a 360–440px panel grid track at wide widths and stack content below 1100px without horizontal page overflow.

- [ ] **Step 6: Run focused Imports tests**

Run: `npm.cmd exec -- vitest run src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx --project ui --maxWorkers=1 --testNamePattern="selected import|upload action scoped"`

Expected: PASS.

### Task 2: Extension command-center selection model

**Files:**

- Modify: `src/features/portal/integrations/pages/IntegrationWorkbenchPage.tsx:669-1150`
- Modify: `src/features/portal/integrations/pages/IntegrationWorkbenchPage.module.scss`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`
- Test: `src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx`

**Interfaces:**

- Consumes: `extensionManagementAgents`, `extensionAgents`, `extensionCommands`, `extensionOrderSchedules`, and existing create/revoke/save mutations.
- Produces: selected-agent state used only for display, with commands, schedules, and connection data constrained to that agent.

- [ ] **Step 1: Write the failing agent selection test**

```tsx
it('focuses extension commands on the selected agent', async () => {
  renderWorkbench('/portal/integrations', account(['ORDERS:WRITE']))
  fireEvent.click(await screen.findByText('RDC 1'))
  expect(await screen.findByRole('heading', { name: 'RDC 1' })).toBeVisible()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd exec -- vitest run src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx --project ui --maxWorkers=1 --testNamePattern="selected agent"`

Expected: FAIL because extension operations are rendered as one unselected table.

- [ ] **Step 3: Add agent master-detail composition**

Use the current management-agent data as the left selectable list. Default to the first accessible agent, then show only its commands, automation schedule, and connection/token context on the right. Keep agent-wide health counts in a compact summary strip; retain current action permissions and command detail dialog.

- [ ] **Step 4: Add responsive and accessible treatment**

Use buttons or rows with `aria-pressed` for agent selection, visible focus styling, and stacked master-detail content under the existing narrow breakpoint. Keep icon-only controls labelled.

- [ ] **Step 5: Run focused Extension tests**

Run: `npm.cmd exec -- vitest run src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx --project ui --maxWorkers=1 --testNamePattern="selected agent|automation inside|extension"`

Expected: PASS.

### Task 3: Finance data detail context

**Files:**

- Modify: `src/features/portal/integrations/pages/IntegrationWorkbenchPage.tsx:1151-1339`
- Modify: `src/features/portal/integrations/pages/IntegrationWorkbenchPage.module.scss`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`
- Test: `src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx`

**Interfaces:**

- Consumes: existing Ads, Transactions, Settlements, and Ads mapping query results plus the mapping mutation.
- Produces: compact one-line source filters and contextual summary for a selected batch or mapping row without inventing payout amount or evidence data.

- [ ] **Step 1: Write the failing Finance detail test**

```tsx
it('shows the selected Ads batch in a finance detail region', async () => {
  renderWorkbench('/portal/integrations', account(['FINANCE:READ']))
  fireEvent.click(await screen.findByText('ads-spend-2026-08-12.csv'))
  expect(await screen.findByRole('complementary', { name: 'Finance import details' })).toBeVisible()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd exec -- vitest run src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx --project ui --maxWorkers=1 --testNamePattern="Finance detail"`

Expected: FAIL because finance tables do not keep selected-row context.

- [ ] **Step 3: Add selected finance context**

Keep each existing finance source and filter behavior. Add page-local selected batch/row state and render a right detail panel from existing fields only. Preserve Ads mapping as the action for pending mapping rows; omit variance and evidence visualizations until backend fields exist.

- [ ] **Step 4: Run focused Finance tests**

Run: `npm.cmd exec -- vitest run src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx --project ui --maxWorkers=1 --testNamePattern="Finance detail|Ads mapping|Amazon Ads import history"`

Expected: PASS.

### Task 4: Cross-workbench verification

**Files:**

- Test: `src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx`

**Interfaces:**

- Consumes: the completed three workbenches and existing mock API contracts.
- Produces: regression coverage for workbench scoping and selection behavior.

- [ ] **Step 1: Run the focused Integration test file**

Run: `npm.cmd exec -- vitest run src/test/portal/integrations/pages/IntegrationWorkbenchPage.test.tsx --project ui --maxWorkers=1`

- [ ] **Step 2: Run lint and build**

Run: `npm.cmd run lint` and `npm.cmd run build`.

- [ ] **Step 3: Inspect the final scoped diff**

Run: `git diff --check -- src/features/portal/integrations src/test/portal/integrations src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json`.
