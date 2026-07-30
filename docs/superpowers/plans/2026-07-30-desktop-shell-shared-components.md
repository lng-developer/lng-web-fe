# Desktop Shell and Shared Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop-only LNG Web application shell, persistent light/dark/system theming, and the minimum shared component set approved in the desktop foundation spec.

**Architecture:** A small theme provider owns appearance resolution and passes project tokens into Ant Design `ConfigProvider`. A routed `AppShell` owns desktop navigation, top-bar controls, breadcrumbs, and the content outlet. Product-level shared components wrap only repeated visual patterns; Ant Design primitives remain unwrapped.

**Tech Stack:** React 19, TypeScript 6, Ant Design 6, React Router 7, i18next, SCSS modules, Vitest, Testing Library.

## Global Constraints

- Desktop only, targeting widths from 1280px upward.
- Use the existing Industrial Operations Core anchors: primary `#E83B4A`, background `#F6F7F9`, light surface `#FFFFFF`, strong text `#171A1F`.
- Support `light`, `dark`, and `system` appearance modes stored in `localStorage`.
- Do not add a frontend dependency.
- Do not create wrappers for Ant Design `Button`, `Input`, `Table`, `Modal`, or `Drawer`.
- Do not add mobile navigation, backend preference sync, feature-specific menus, or a color picker.
- Keep permission decisions out of the shell until backend-provided permissions are wired.

---

## File Map

- `src/shared/theme/theme.ts`: appearance types, storage, system resolution, and Ant Design theme creation.
- `src/shared/theme/ThemeProvider.tsx`: theme state and document synchronization.
- `src/shared/theme/ThemeSwitch.tsx`: labeled light/dark/system selector.
- `src/app/providers/AppProviders.tsx`: composes theme, i18n, Ant Design app, and query providers.
- `src/app/layout/AppShell.tsx`: desktop sidebar, top bar, breadcrumbs, and route outlet.
- `src/app/layout/AppShell.module.scss`: fixed-fluid desktop layout.
- `src/app/router/router.tsx`: parent shell route and `/foundation` child route.
- `src/shared/ui/PageHeader.tsx`: page heading and actions pattern.
- `src/shared/ui/SectionCard.tsx`: bordered grouping surface.
- `src/shared/ui/StatusTag.tsx`: operational semantic tag.
- `src/shared/ui/EmptyState.tsx`: empty content pattern.
- `src/shared/ui/FeedbackAlert.tsx`: success, warning, and error feedback pattern.
- `src/features/foundation/FoundationPage.tsx`: shared component showcase.
- `src/features/foundation/FoundationPage.module.scss`: desktop showcase grid.
- `src/shared/i18n/locales/{vi,en}/common.json`: shell, theme, and foundation copy.

---

### Task 1: Persistent Ant Design Theme Foundation

**Files:**

- Create: `src/shared/theme/theme.ts`
- Create: `src/shared/theme/theme.test.ts`
- Create: `src/shared/theme/ThemeProvider.tsx`
- Create: `src/shared/theme/ThemeProvider.test.tsx`
- Create: `src/shared/theme/ThemeSwitch.tsx`
- Modify: `src/app/providers/AppProviders.tsx`

**Interfaces:**

- Produces: `type Appearance = 'light' | 'dark' | 'system'`
- Produces: `resolveAppearance(appearance: Appearance, systemIsDark: boolean): 'light' | 'dark'`
- Produces: `createAppTheme(resolved: 'light' | 'dark'): ThemeConfig`
- Produces: `useThemePreference(): { appearance: Appearance; resolved: 'light' | 'dark'; setAppearance: (value: Appearance) => void }`
- Produces: `<ThemeSwitch />`

- [ ] **Step 1: Write failing unit tests for resolution and project tokens**

```ts
import { describe, expect, it } from 'vitest'

import { createAppTheme, resolveAppearance } from './theme'

describe('theme foundation', () => {
  it('resolves explicit and system appearances', () => {
    expect(resolveAppearance('light', true)).toBe('light')
    expect(resolveAppearance('dark', false)).toBe('dark')
    expect(resolveAppearance('system', true)).toBe('dark')
  })

  it('keeps the LNG primary color in both themes', () => {
    expect(createAppTheme('light').token?.colorPrimary).toBe('#E83B4A')
    expect(createAppTheme('dark').token?.colorPrimary).toBe('#E83B4A')
  })
})
```

- [ ] **Step 2: Run the unit test and confirm RED**

Run: `npx vitest run src/shared/theme/theme.test.ts`

Expected: FAIL because `./theme` does not exist.

- [ ] **Step 3: Implement the pure theme functions**

```ts
import { theme, type ThemeConfig } from 'antd'

export type Appearance = 'light' | 'dark' | 'system'
export type ResolvedAppearance = Exclude<Appearance, 'system'>

export const THEME_STORAGE_KEY = 'lng-web-appearance'

export function resolveAppearance(
  appearance: Appearance,
  systemIsDark: boolean,
): ResolvedAppearance {
  return appearance === 'system' ? (systemIsDark ? 'dark' : 'light') : appearance
}

export function createAppTheme(resolved: ResolvedAppearance): ThemeConfig {
  return {
    algorithm: resolved === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#E83B4A',
      colorBgLayout: resolved === 'dark' ? '#111318' : '#F6F7F9',
      colorText: resolved === 'dark' ? '#F3F4F6' : '#171A1F',
      borderRadius: 8,
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    components: { Table: { headerBg: resolved === 'dark' ? '#1C2027' : '#F6F7F9' } },
  }
}
```

- [ ] **Step 4: Run the pure unit test and confirm GREEN**

Run: `npx vitest run src/shared/theme/theme.test.ts`

Expected: 2 tests PASS.

- [ ] **Step 5: Write a failing provider persistence test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { ThemeProvider } from './ThemeProvider'
import { ThemeSwitch } from './ThemeSwitch'

describe('ThemeProvider', () => {
  it('persists an explicit appearance', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeSwitch />
      </ThemeProvider>,
    )
    await user.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(localStorage.getItem('lng-web-appearance')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
```

If `@testing-library/user-event` is not installed, use `fireEvent.click` from the existing Testing Library package instead of adding a dependency.

- [ ] **Step 6: Run the provider test and confirm RED**

Run: `npx vitest run src/shared/theme/ThemeProvider.test.tsx`

Expected: FAIL because the provider and switch do not exist.

- [ ] **Step 7: Implement `ThemeProvider`, `useThemePreference`, and `ThemeSwitch`**

Use `window.matchMedia('(prefers-color-scheme: dark)')`, validate stored values against the three allowed strings, update `document.documentElement.dataset.theme`, and remove the media-query listener during cleanup. Render the switch as an Ant Design `Segmented<Appearance>` with translated labels.

- [ ] **Step 8: Replace the hardcoded `ConfigProvider` in `AppProviders`**

Compose providers in this order: `I18nextProvider` -> `ThemeProvider` -> `AntdApp` -> `QueryClientProvider`. `ThemeProvider` owns `ConfigProvider`, so `AppProviders` no longer defines color tokens.

- [ ] **Step 9: Run focused and existing tests**

Run: `npx vitest run src/shared/theme src/app/App.test.tsx`

Expected: all focused tests PASS.

- [ ] **Step 10: Commit**

```bash
git add src/shared/theme src/app/providers/AppProviders.tsx
git commit -m "feat(fe): add persistent application theming"
```

---

### Task 2: Desktop Application Shell and Routing

**Files:**

- Create: `src/app/layout/AppShell.tsx`
- Create: `src/app/layout/AppShell.module.scss`
- Create: `src/app/layout/AppShell.test.tsx`
- Modify: `src/app/router/router.tsx`
- Modify: `src/app/App.test.tsx`

**Interfaces:**

- Consumes: `<ThemeSwitch />` from Task 1.
- Produces: `<AppShell />` containing React Router `<Outlet />`.
- Produces: `/foundation` as the canonical showcase route and `/` redirecting to it.

- [ ] **Step 1: Write the failing shell test**

```tsx
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { appRoutes } from '@/app/router/router'

describe('AppShell', () => {
  it('renders desktop navigation and routed content', async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/foundation'] })
    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeVisible()
    expect(screen.getByRole('banner')).toBeVisible()
    expect(screen.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
```

- [ ] **Step 2: Run the shell test and confirm RED**

Run: `npx vitest run src/app/layout/AppShell.test.tsx`

Expected: FAIL because `AppShell` is absent and the current page owns its own header.

- [ ] **Step 3: Implement the minimum shell**

Use Ant Design `Layout`, `Menu`, `Breadcrumb`, `Button`, and `Avatar`. The sidebar starts at 248px, collapses to 72px, and the top bar is 56px high. The content area uses 32px gutters and a 1440px maximum width. Use React Router links; the logo links to `/foundation`.

The initial navigation contains one real item only: Foundation. Do not create fake future feature links.

- [ ] **Step 4: Nest the router under `AppShell`**

```tsx
export const appRoutes: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to="/foundation" replace /> },
      { path: 'foundation', element: <FoundationPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage />, errorElement: <RouteErrorPage /> },
]
```

- [ ] **Step 5: Remove page-owned application chrome from `FoundationPage`**

The page must return content only. `AppShell` owns the sidebar and top bar.

- [ ] **Step 6: Run shell and route tests**

Run: `npx vitest run src/app/layout/AppShell.test.tsx src/app/App.test.tsx`

Expected: all tests PASS, including root redirect, language switching, and 404 behavior.

- [ ] **Step 7: Commit**

```bash
git add src/app/layout src/app/router src/app/App.test.tsx src/features/foundation
git commit -m "feat(fe): add desktop application shell"
```

---

### Task 3: Product-Level Shared Components

**Files:**

- Create: `src/shared/ui/PageHeader.tsx`
- Create: `src/shared/ui/SectionCard.tsx`
- Create: `src/shared/ui/StatusTag.tsx`
- Create: `src/shared/ui/EmptyState.tsx`
- Create: `src/shared/ui/FeedbackAlert.tsx`
- Create: `src/shared/ui/sharedUi.test.tsx`
- Create: `src/shared/ui/index.ts`

**Interfaces:**

- Produces: `PageHeaderProps = Readonly<{ title: string; description?: string; actions?: ReactNode }>`
- Produces: `SectionCardProps = Readonly<{ title?: string; children: ReactNode; selected?: boolean }>`
- Produces: `StatusTagProps = Readonly<{ status: 'operational' | 'warning' | 'critical'; children: ReactNode }>`
- Produces: `EmptyStateProps = Readonly<{ title: string; description?: string; action?: ReactNode }>`
- Produces: `FeedbackAlertProps = Readonly<{ type: 'success' | 'warning' | 'error'; title: string; description?: string; action?: ReactNode }>`

- [ ] **Step 1: Write failing semantic rendering tests**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EmptyState, FeedbackAlert, PageHeader, StatusTag } from './index'

describe('shared UI', () => {
  it('renders page hierarchy and operational status', () => {
    render(
      <>
        <PageHeader title="Foundation" />
        <StatusTag status="operational">Operational</StatusTag>
      </>,
    )
    expect(screen.getByRole('heading', { name: 'Foundation' })).toBeVisible()
    expect(screen.getByText('Operational')).toBeVisible()
  })

  it('renders accessible empty and error states', () => {
    render(
      <>
        <EmptyState title="No personnel found" />
        <FeedbackAlert type="error" title="Connection failed" />
      </>,
    )
    expect(screen.getByText('No personnel found')).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent('Connection failed')
  })
})
```

- [ ] **Step 2: Run the shared UI test and confirm RED**

Run: `npx vitest run src/shared/ui/sharedUi.test.tsx`

Expected: FAIL because the barrel and components do not exist.

- [ ] **Step 3: Implement minimal shared patterns using Ant Design**

Use `Typography`, `Flex`, `Card`, `Tag`, `Empty`, and `Alert`. Map status colors to Ant Design semantic colors. `SectionCard` may add selected border styling through a small SCSS module; other patterns should use tokens and component props before custom CSS.

- [ ] **Step 4: Export the five components from `src/shared/ui/index.ts`**

Export components and their prop types. Do not add a generic polymorphic component or configuration registry.

- [ ] **Step 5: Run the shared UI test and confirm GREEN**

Run: `npx vitest run src/shared/ui/sharedUi.test.tsx`

Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/ui
git commit -m "feat(fe): add shared interface patterns"
```

---

### Task 3b: Remaining Stitch Foundation Patterns

**Files:**

- Create: `src/shared/ui/MetricCard.tsx`
- Create: `src/shared/ui/TableFooter.tsx`
- Create: `src/shared/ui/ConfirmDangerModal.tsx`
- Modify: `src/shared/ui/index.ts`
- Modify: `src/shared/ui/sharedUi.test.tsx`

**Interfaces:**

- Produces: `MetricCardProps = Readonly<{ label: string; value: string; status?: ReactNode }>`
- Produces: `TableFooterProps = Readonly<{ from: number; to: number; total: number; pageSize: number; onPageSizeChange?: (value: number) => void }>`
- Produces: `ConfirmDangerModalProps = Readonly<{ open: boolean; title: string; description: string; confirmLabel: string; loading?: boolean; onConfirm: () => void; onCancel: () => void }>`

- [ ] **Step 1: Write failing semantic tests**

Add assertions that a metric exposes its label and value, the table footer announces the visible result range, and the confirmation dialog exposes its destructive action.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npx vitest run src/shared/ui/sharedUi.test.tsx`

Expected: FAIL because the three exports do not exist.

- [ ] **Step 3: Implement the three bounded patterns**

Use Ant Design `Statistic`, `Pagination`, `Select`, and `Modal`. Keep tooltip, loading button, and disabled button states as direct Ant Design uses in the showcase; do not add wrappers for them.

- [ ] **Step 4: Run focused tests and commit**

```bash
npx vitest run src/shared/ui/sharedUi.test.tsx
git add src/shared/ui
git commit -m "feat(fe): add remaining foundation patterns"
```

---

### Task 4: Desktop Foundation Showcase and Localization

**Files:**

- Modify: `src/features/foundation/FoundationPage.tsx`
- Modify: `src/features/foundation/FoundationPage.module.scss`
- Modify: `src/shared/i18n/locales/vi/common.json`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales.test.ts`
- Modify: `src/app/App.test.tsx`

**Interfaces:**

- Consumes: all shared UI components from Task 3.
- Consumes: `AppShell` and theme controls from Tasks 1 and 2.
- Produces: `/foundation` desktop visual regression surface.

- [ ] **Step 1: Extend the application test with foundation states**

Add assertions for the localized page heading, button/input examples, an operational status, an empty state, and all three theme choices. Keep assertions semantic; do not test implementation class names.

- [ ] **Step 2: Run the application test and confirm RED**

Run: `npx vitest run src/app/App.test.tsx`

Expected: FAIL because the showcase sections and translated labels are absent.

- [ ] **Step 3: Add matching Vietnamese and English keys**

Add `shell`, `theme`, and expanded `foundation` objects with identical key paths. Include labels for Foundation navigation, breadcrumbs, appearance choices, component section names, status, empty state, and feedback messages.

- [ ] **Step 4: Compose the desktop showcase**

Use `PageHeader`, `SectionCard`, `StatusTag`, `EmptyState`, and `FeedbackAlert`. Render Ant Design buttons and inputs directly. Use a 12-column CSS grid with 24px gaps, compact section spacing, thin borders, and no responsive/mobile media query.

- [ ] **Step 5: Run locale parity and application tests**

Run: `npx vitest run src/shared/i18n/locales.test.ts src/app/App.test.tsx`

Expected: all tests PASS in Vietnamese and English.

- [ ] **Step 6: Run all automated quality gates**

```bash
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
```

Expected: all commands exit 0. A bundle-size warning from the full Ant Design import is acceptable until real feature routes provide meaningful code-splitting boundaries.

- [ ] **Step 7: Ask permission, then run desktop browser acceptance**

Start the Vite server only after user permission, then verify at 1280x1024 and 1440x1024:

- `/` redirects to `/foundation`.
- Sidebar collapse and expand work.
- Light, dark, and system modes update the document and persist after reload.
- Language switch updates shell and page copy.
- Foundation sections have no horizontal overflow.
- `/missing` still renders the localized 404 action.

- [ ] **Step 8: Force-refresh CodeGraph after the source replacement**

Run: `codegraph index --force --quiet && codegraph status`

Expected: the index reports only current TypeScript/TSX source files and is up to date.

- [ ] **Step 9: Commit**

```bash
git add src
git commit -m "feat(fe): build desktop foundation showcase"
```

---

### Task 5: Final Scope Audit

**Files:**

- No planned source changes.

**Interfaces:**

- Consumes: completed Tasks 1 through 4.
- Produces: final verification evidence and a clean branch handoff.

- [ ] **Step 1: Confirm excluded scope did not enter the implementation**

Run:

```bash
rg -n "color picker|mobile navigation|@media|useBreakpoint|role ===|userRole" src
npm ls @mui/material @emotion/react tailwindcss notistack react-hook-form --depth=0
```

Expected: no mobile/theme-picker/hardcoded-role implementation matches and no legacy UI dependencies installed. Translation prose containing the search words is acceptable only if it is not executable functionality.

- [ ] **Step 2: Run final verification on committed HEAD**

```bash
npm run lint
npm run typecheck
npm test
npm run build
git status --short
```

Expected: all quality gates exit 0 and the worktree is clean except explicitly retained `.stitch/designs` source artifacts if they have not been committed by a separate decision.

- [ ] **Step 3: Present integration options**

Use `superpowers:finishing-a-development-branch`. Do not merge, push, or remove the worktree without the user's explicit selection.
