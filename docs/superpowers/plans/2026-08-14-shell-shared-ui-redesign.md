# Shell Shared UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the app shell and shared UI primitives with a modern polished operational style while preserving dense enterprise workflows.

**Architecture:** Keep the current React 19, Vite, React Router, Ant Design, TanStack Query, and i18n architecture. Implement the redesign through theme tokens, existing SCSS modules, and small component edits only where inline style or accessibility behavior must move into the shared system. Keep shared component prop APIs stable.

**Tech Stack:** React 19, Vite, TypeScript, Ant Design, SCSS modules, React Router 7, TanStack Query 5, Vitest, Testing Library.

## Global Constraints

- Light mode remains primary; dark mode remains compatible.
- Surfaces gain clearer layering through borders, tonal fills, and restrained shadows.
- Metrics become more prominent without becoming oversized dashboard cards.
- Tables remain dense and scannable.
- Motion is subtle, functional, and disabled under reduced-motion preferences.
- Radius stays close to the existing 8px system unless Ant Design component internals require a small local exception.
- Do not add dependencies.
- Do not replace Ant Design or the existing routing/query/i18n architecture.
- Do not redesign individual business workflows page by page.
- Do not change backend/API contracts.
- Preserve public prop APIs of shared components unless a task explicitly states the small additive change.
- Keep user-facing copy in the existing i18n setup when new visible text is added.

---

## File Structure

- Modify `src/shared/theme/theme.ts`: Ant Design token polish for light/dark surfaces, table/menu/input/card/drawer defaults.
- Modify `src/app/layout/AppShell.tsx`: add a skip link and semantic main target; keep shell data flow unchanged.
- Modify `src/app/layout/AppShell.module.scss`: modern polished rail/sidebar/header/content surfaces, focus states, reduced-motion coverage.
- Modify `src/app/layout/AppRail.tsx`: no API changes; only class/ARIA behavior if tests require it.
- Modify `src/app/layout/AppSidebar.tsx`: no API changes; keep contextual group open behavior unchanged.
- Modify `src/shared/ui/PageHeader.tsx`: move inline style into classes and preserve props.
- Modify `src/shared/ui/MetricCard.tsx`: add Space key activation for clickable cards if touched.
- Modify `src/shared/ui/sharedUi.module.scss`: shared surface language for cards, metrics, tables, filters, drawers/tabs/loading/empty/feedback.
- Modify `src/test/app/layout/AppShell.test.tsx`: cover skip link/main region if implementation adds it.
- Modify `src/test/shared/ui/sharedUi.test.tsx`: cover `MetricCard` Space activation and existing shared component rendering.

---

### Task 1: Shell And Theme Polish

**Files:**

- Modify: `src/shared/theme/theme.ts`
- Modify: `src/app/layout/AppShell.tsx`
- Modify: `src/app/layout/AppShell.module.scss`
- Test: `src/test/app/layout/AppShell.test.tsx`
- Test: `src/test/app/layout/AppRail.test.tsx`
- Test: `src/test/app/layout/AppSidebar.test.tsx`

**Interfaces:**

- Consumes: existing `AppShell`, `AppRail`, `AppSidebar`, `createAppTheme(resolved)`, and Ant Design `ThemeConfig`.
- Produces: same exported `createAppTheme(resolved)` signature and same shell component props. Adds DOM id `main-content` and class `styles.skipLink` if the skip link is implemented.

- [ ] **Step 1: Add the focused shell accessibility test**

Add this assertion to the first test in `src/test/app/layout/AppShell.test.tsx` after the banner assertion:

```tsx
expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
  'href',
  '#main-content',
)
expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
```

- [ ] **Step 2: Run shell tests to verify the new expectation fails**

Run:

```bash
npm run test:unit -- src/test/app/layout/AppShell.test.tsx src/test/app/layout/AppRail.test.tsx src/test/app/layout/AppSidebar.test.tsx
```

Expected: `AppShell.test.tsx` fails because the skip link or `main` region id is not present yet.

- [ ] **Step 3: Implement shell semantic hook without changing data flow**

In `src/app/layout/AppShell.tsx`, add a skip link as the first child inside the root `Layout`, and make the content wrapper a named main region:

```tsx
return (
  <Layout className={styles.shell}>
    <a className={styles.skipLink} href="#main-content">
      {t('shell.skipToContent')}
    </a>
    <AppRail
      cores={cores}
      activeCore={activeCore}
      contextCollapsed={collapsed}
      onCoreChange={changeCore}
      onContextCollapsedChange={setCollapsed}
    />
    ...
    <Content
      id="main-content"
      role="main"
      className={`${styles.content} ${isFixedWorkspace ? styles.contentFixed : ''}`}
    >
      <div className={`${styles.workspace} ${isFixedWorkspace ? styles.workspaceFixed : ''}`}>
        <Outlet />
      </div>
    </Content>
  </Layout>
)
```

Add `shell.skipToContent` to both locale files with:

```json
"skipToContent": "Skip to main content"
```

and Vietnamese:

```json
"skipToContent": "Bỏ qua tới nội dung chính"
```

Place the keys under the existing `shell` object.

- [ ] **Step 4: Polish theme tokens**

Update `src/shared/theme/theme.ts` while keeping `createAppTheme(resolved): ThemeConfig`.

Use these token values as the implementation target:

```ts
token: {
  colorPrimary: '#E83B4A',
  colorInfo: '#1677FF',
  colorSuccess: '#16A34A',
  colorWarning: '#D97706',
  colorError: '#DC2626',
  colorBgBase: isDark ? '#0B0F14' : '#F7F8FA',
  colorBgContainer: isDark ? '#141A22' : '#FFFFFF',
  colorBgElevated: isDark ? '#111827' : '#FFFFFF',
  colorBgLayout: isDark ? '#0B0F14' : '#EEF2F6',
  colorFillQuaternary: isDark ? '#182131' : '#F5F7FA',
  colorText: isDark ? '#E5E7EB' : '#111827',
  colorTextSecondary: isDark ? '#CBD5E1' : '#374151',
  colorTextTertiary: isDark ? '#94A3B8' : '#64748B',
  colorBorder: isDark ? '#334155' : '#CBD5E1',
  colorBorderSecondary: isDark ? '#263244' : '#E2E8F0',
  colorSplit: isDark ? '#1F2937' : '#E5E7EB',
  borderRadius: 8,
  borderRadiusLG: 10,
  boxShadowSecondary: isDark
    ? '0 18px 44px rgb(0 0 0 / 34%)'
    : '0 18px 44px rgb(15 23 42 / 10%)',
  fontFamily: 'Inter, system-ui, sans-serif',
}
```

Keep component overrides local and boring:

```ts
components: {
  Button: { controlHeight: 36 },
  Card: { headerBg: 'transparent' },
  Drawer: { paddingLG: 20 },
  Input: { controlHeight: 36 },
  Menu: {
    itemBorderRadius: 8,
    itemHeight: 38,
    itemBg: isDark ? '#141A22' : '#FFFFFF',
    itemSelectedBg: isDark ? '#1F2937' : '#F1F5F9',
    itemColor: isDark ? '#E5E7EB' : '#111827',
    itemSelectedColor: isDark ? '#F9FAFB' : '#111827',
  },
  Table: {
    cellPaddingBlock: 10,
    cellPaddingInline: 12,
    headerBg: isDark ? '#0F172A' : '#F8FAFC',
    rowHoverBg: isDark ? '#182131' : '#F8FAFC',
  },
}
```

- [ ] **Step 5: Polish shell SCSS**

Update `src/app/layout/AppShell.module.scss` with these targets:

```scss
.skipLink {
  position: fixed;
  z-index: 1000;
  top: 10px;
  left: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--ant-color-bg-elevated);
  color: var(--ant-color-primary);
  box-shadow: var(--ant-box-shadow-secondary);
  transform: translateY(-140%);
  transition: transform 160ms ease-out;
}

.skipLink:focus-visible {
  transform: translateY(0);
  outline: 2px solid var(--ant-color-primary);
  outline-offset: 2px;
}
```

Then tune the existing selectors, not new components:

- `.rail`: add `box-shadow: 1px 0 0 rgb(15 23 42 / 3%)`.
- `.railBrand`: keep 36px, use 8px radius, remove decorative over-scaling.
- `.railButtonActive`: keep primary red, add `box-shadow: 0 10px 22px color-mix(in srgb, var(--ant-color-primary) 28%, transparent)`.
- `.sidebar`: keep sticky and widths, use `background: var(--ant-color-bg-container)`.
- `.contextTitle`: keep 64px, add subtle background fill.
- `.header`: keep 64px, use a clearer elevated surface and `box-shadow: 0 1px 0 var(--ant-color-border-secondary)`.
- `.navSearch`: keep `width: clamp(260px, 27vw, 360px)`.
- `.content`: use layered background through `linear-gradient(...)` plus `var(--ant-color-bg-layout)`, keep fixed chat behavior unchanged.
- Add `:focus-visible` rules for rail buttons, collapse button, and account button.
- Keep the existing `@media (prefers-reduced-motion: reduce)` block and include `.skipLink`.

- [ ] **Step 6: Run shell tests**

Run:

```bash
npm run test:unit -- src/test/app/layout/AppShell.test.tsx src/test/app/layout/AppRail.test.tsx src/test/app/layout/AppSidebar.test.tsx src/test/shared/theme/theme.test.ts src/test/shared/theme/ThemeProvider.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit Task 1**

Run:

```bash
git add src/shared/theme/theme.ts src/app/layout/AppShell.tsx src/app/layout/AppShell.module.scss src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/app/layout/AppShell.test.tsx
git commit -m "style(shell): polish app frame surfaces"
```

---

### Task 2: Shared UI Primitive Polish

**Files:**

- Modify: `src/shared/ui/PageHeader.tsx`
- Modify: `src/shared/ui/MetricCard.tsx`
- Modify: `src/shared/ui/sharedUi.module.scss`
- Test: `src/test/shared/ui/sharedUi.test.tsx`
- Test: `src/test/shared/ui/UiTabs.test.tsx`

**Interfaces:**

- Consumes: existing shared UI exports from `src/shared/ui/index.ts`.
- Produces: same public prop API for `PageHeader`, `SectionCard`, `MetricCard`, `DataTable`, `FilterBar`, `DetailDrawer`, and `UiTabs`. Adds Space key activation to clickable `MetricCard`.

- [ ] **Step 1: Add the MetricCard keyboard behavior test**

Append this test to `src/test/shared/ui/sharedUi.test.tsx`:

```tsx
it('activates clickable metric cards with Enter and Space', () => {
  const onClick = vi.fn()
  render(<MetricCard label="Blocked" value={3} onClick={onClick} />)

  const metric = screen.getByRole('button', { name: /Blocked/i })
  fireEvent.keyDown(metric, { key: 'Enter' })
  fireEvent.keyDown(metric, { key: ' ' })

  expect(onClick).toHaveBeenCalledTimes(2)
})
```

- [ ] **Step 2: Run shared UI tests to verify the new expectation fails**

Run:

```bash
npm run test:unit -- src/test/shared/ui/sharedUi.test.tsx src/test/shared/ui/UiTabs.test.tsx
```

Expected: `activates clickable metric cards with Enter and Space` fails because Space is not handled yet.

- [ ] **Step 3: Move PageHeader inline styles into classes**

In `src/shared/ui/PageHeader.tsx`, keep the props and render structure, but use `sharedUi.module.scss` classes:

```tsx
import styles from './sharedUi.module.scss'

export function PageHeader({ title, description, updatedAt, actions }: PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderMain}>
        <Typography.Title level={2} className={styles.pageHeaderTitle}>
          {title}
        </Typography.Title>
        {(description || updatedAt) && (
          <div className={styles.pageHeaderMeta}>
            {description && <Typography.Text type="secondary">{description}</Typography.Text>}
            {description && updatedAt && <span aria-hidden="true">|</span>}
            {updatedAt && (
              <Typography.Text type="secondary">
                Cập nhật lúc: {new Date(updatedAt).toLocaleString()}
              </Typography.Text>
            )}
          </div>
        )}
      </div>
      {actions && <div className={styles.pageHeaderActions}>{actions}</div>}
    </header>
  )
}
```

Keep the Vietnamese `Cập nhật lúc:` text in this task because moving it to i18n would require changing the shared component contract or adding an internal translation dependency. Mark it for later only if the user asks.

- [ ] **Step 4: Add Space activation to MetricCard**

In `src/shared/ui/MetricCard.tsx`, replace the current inline `onKeyDown` handler with this local handler:

```tsx
const handleKeyDown = isClickable
  ? (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onClick?.()
      }
    }
  : undefined
```

Update the type import:

```tsx
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
```

If using the imported `KeyboardEvent`, type the handler as:

```tsx
const handleKeyDown = isClickable
  ? (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onClick?.()
      }
    }
  : undefined
```

Then render:

```tsx
onKeyDown = { handleKeyDown }
```

- [ ] **Step 5: Polish shared SCSS surfaces**

Update `src/shared/ui/sharedUi.module.scss` with these concrete targets:

```scss
.pageHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--ant-color-border-secondary);
}

.pageHeaderMain {
  min-width: 0;
}

.pageHeaderTitle {
  margin: 0 !important;
  color: var(--ant-color-text-heading);
  font-size: 24px !important;
  font-weight: 700 !important;
  letter-spacing: 0;
}

.pageHeaderMeta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
  color: var(--ant-color-text-tertiary);
  font-size: 13px;
}

.pageHeaderActions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
}
```

Then tune existing selectors:

- `.sectionCard`: use `border-radius: 8px`, `box-shadow: 0 10px 28px rgb(15 23 42 / 5%)`, and no `transform` on hover.
- `.selectedCard`: keep primary outline but use `box-shadow: 0 0 0 1px var(--ant-color-primary), 0 12px 30px rgb(15 23 42 / 8%)`.
- `.metricCard`: keep min-height near `76px`, use cleaner surface fill, stronger value contrast, and no viewport-scaled font size.
- `.metricIcon`: keep `44px` touch target.
- `.metricValue`: use `font-size: 20px`, not `clamp(...)`.
- `.metricLabel`: allow `white-space: normal` only if it does not make cards jump; otherwise keep ellipsis.
- `.dataTable :global(.ant-table-container)`: keep radius 8-10px, subtle shadow, and dense borders.
- `.dataTable :global(.ant-table-thead > tr > th)`: keep centered text only if current callers depend on it; otherwise use inherited alignment from column config.
- `.filterBar`: add `padding: 12px`, border, radius, background surface.
- `.filterBarActions`: make actions align right on desktop and stretch only below 960px.
- `.uiTabs`: keep segmented style, polish active background and focus visibility.
- `.loadingtable`: align with new section card border/radius.
- `.feedbackAlert`, `.bulkActionBar`, `.commandItem`: align radius and focus states.
- Add an `@media (max-width: 640px)` block for `.pageHeader` and `.pageHeaderActions` so actions wrap without overflow.
- Extend `@media (prefers-reduced-motion: reduce)` to cover `.sectionCard`, `.metricCard`, `.commandItem`, and `.dataTable :global(.ant-table-container)`.

- [ ] **Step 6: Run shared UI tests**

Run:

```bash
npm run test:unit -- src/test/shared/ui/sharedUi.test.tsx src/test/shared/ui/UiTabs.test.tsx src/test/shared/ui/DateRangePicker.test.tsx src/test/shared/ui/EmployeeAvatar.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

Run:

```bash
git add src/shared/ui/PageHeader.tsx src/shared/ui/MetricCard.tsx src/shared/ui/sharedUi.module.scss src/test/shared/ui/sharedUi.test.tsx
git commit -m "style(shared-ui): polish operational primitives"
```

---

### Task 3: Final Verification And Visual Smoke

**Files:**

- Modify only if Task 1 or Task 2 verification reveals a real bug in touched files.
- Do not stage unrelated `.env.development` changes.

**Interfaces:**

- Consumes: committed Task 1 and Task 2 changes.
- Produces: verified branch state with focused tests, lint, and build results.

- [ ] **Step 1: Run focused layout and shared UI tests**

Run:

```bash
npm run test:unit -- src/test/app/layout/AppShell.test.tsx src/test/app/layout/AppRail.test.tsx src/test/app/layout/AppSidebar.test.tsx src/test/shared/ui/sharedUi.test.tsx src/test/shared/ui/UiTabs.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS, or only unrelated baseline failures that are reported with exact file paths.

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS, or only unrelated baseline failures that are reported with exact file paths.

- [ ] **Step 4: Start dev server for visual smoke**

Run:

```bash
npm run dev:local
```

Expected: Vite prints a local URL, normally `http://localhost:5173/`.

Open at least these routes if the local auth/session allows it:

- `/operations-dashboard`
- `/portal/orders`
- `/portal/production`
- `/portal/vendors`
- `/portal/chat`

Check:

- Rail/sidebar/header render without overlap.
- Header actions remain visible at desktop and tablet widths.
- Content and fixed chat workspace still fill height correctly.
- Metric cards, filters, and tables look aligned and dense.
- Focus ring is visible on rail/sidebar/header controls.
- Reduced-motion CSS exists for touched animated selectors.

- [ ] **Step 5: Stop the dev server**

Stop the Vite process from the terminal session with `Ctrl+C`.

- [ ] **Step 6: Confirm git scope**

Run:

```bash
git status --short
```

Expected: only intended tracked files from Task 1/2 are modified or committed. `.env.development` may remain dirty from before and must not be staged unless the user explicitly asks.

- [ ] **Step 7: Commit verification fixes if needed**

Only if Step 1-4 required fixes, run:

```bash
git add <touched-files>
git commit -m "fix(ui): address shell shared polish regressions"
```

If no fixes were required, do not create an empty commit.
