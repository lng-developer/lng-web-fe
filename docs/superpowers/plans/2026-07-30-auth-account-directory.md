# Auth Account Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Accounts the entry point for account lifecycle management and keep Access Explorer as a focused account detail editor.

**Architecture:** Reuse the existing account-list query and table for the new `/auth/accounts` route. Move the access editor under `/auth/accounts/:accountId/access`, retain the former paths as redirects, and update navigation/breadcrumbs without adding a policy CRUD screen.

**Tech Stack:** React, React Router, TanStack Query, Ant Design, SCSS modules, react-i18next, Vitest.

## Global Constraints

- Reuse the shared API client and existing Auth endpoints.
- Use i18n for every user-visible string.
- Do not add dependencies, create a branch, stage, or commit.
- Keep Access Policies deferred until role, permission, and scope CRUD are explicitly requested.

---

### Task 1: Create the Accounts directory route

**Files:**

- Modify: `src/features/auth/AccessExplorerPage.test.tsx`
- Modify: `src/features/auth/AccessExplorerPage.tsx`
- Modify: `src/app/router/router.tsx`

**Interfaces:**

- Consumes: `loadAccessAccounts(): Promise<AccessList<Account>>`
- Produces: `/auth/accounts` directory with links to `/auth/accounts/:accountId/access`

- [ ] **Step 1: Write a failing route behavior test**

```tsx
expect(screen.getByRole('link', { name: /manage access/i })).toHaveAttribute(
  'href',
  '/auth/accounts/account-1/access',
)
```

- [ ] **Step 2: Run the focused test and verify it fails because the new detail route is absent.**

Run: `npm test -- --run src/features/auth/AccessExplorerPage.test.tsx`

- [ ] **Step 3: Change the directory link and add the `/auth/accounts` route.**

```tsx
{ path: 'auth/accounts', element: <AccessExplorerPage /> }
```

- [ ] **Step 4: Re-run the focused test and verify it passes.**

### Task 2: Preserve existing URLs and navigation

**Files:**

- Modify: `src/app/router/router.tsx`
- Modify: `src/app/layout/AppShell.tsx`
- Modify: `src/app/layout/AppShell.test.tsx`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`

**Interfaces:**

- Consumes: canonical `auth/accounts` and `auth/accounts/:accountId/access` routes
- Produces: legacy redirects and Accounts navigation label

- [ ] **Step 1: Write a failing navigation test for the Accounts link.**

```tsx
expect(screen.getByRole('link', { name: /accounts/i })).toHaveAttribute('href', '/auth/accounts')
```

- [ ] **Step 2: Run the focused test and verify it fails because the link does not exist.**

Run: `npm test -- --run src/app/layout/AppShell.test.tsx`

- [ ] **Step 3: Add the Accounts menu entry, correct breadcrumb selection, and redirects from `/auth/access`.**

```tsx
{ path: 'auth/access', element: <Navigate to="/auth/accounts" replace /> }
{ path: 'auth/access/:accountId', element: <Navigate to="../accounts/:accountId/access" replace /> }
```

- [ ] **Step 4: Re-run the focused test and verify it passes.**

### Task 3: Verify the migration

**Files:**

- Test: `src/features/auth/AccessExplorerPage.test.tsx`
- Test: `src/app/layout/AppShell.test.tsx`

- [ ] **Step 1: Run Auth and shell focused tests.**

Run: `npm test -- --run src/features/auth/AccessExplorerPage.test.tsx src/features/auth/access/AccessEditorPage.test.tsx src/app/layout/AppShell.test.tsx`

- [ ] **Step 2: Run lint, production build, and whitespace validation.**

Run: `npm run lint && npm run build && git diff --check`
