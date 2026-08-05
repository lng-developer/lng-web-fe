# Auth Management Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Auth administration screens in the approved order without mixing employee provisioning into account administration.

**Architecture:** A focused page owns each administrative resource. Auth API wrappers remain in `src/features/auth`, TanStack Query owns server state, and route-level pages compose existing shared UI components.

**Tech Stack:** React, React Router, TanStack Query, Ant Design, react-i18next, Vitest.

## Global Constraints

- Reuse the shared API client and existing Auth endpoints.
- No account creation UI in Auth; HR staff provisioning owns it.
- Use i18n for all user-visible strings.
- Do not add dependencies, stage, or commit.

---

### Task 1: Account detail and security

**Files:**

- Create: `src/features/auth/account/AccountDetailPage.tsx`
- Create: `src/features/auth/account/AccountSecurityPage.tsx`
- Create: `src/features/auth/account/accountManagementApi.ts`
- Modify: `src/features/auth/AccessExplorerPage.tsx`
- Modify: `src/app/router/router.tsx`
- Modify: Auth i18n files and focused tests

**Interfaces:**

- Consumes: `GET /api/auth/accounts/:accountId`
- Produces: account email/status management and security operations through Auth write APIs.

- [ ] Write failing page and API wrapper tests, then run them.
- [ ] Implement the smallest API wrappers and pages that make the tests pass.
- [ ] Verify focused tests, lint, build, and whitespace validation.

### Task 2: Roles

**Files:**

- Create: `src/features/auth/roles/*`
- Modify: router, sidebar, Auth i18n, and focused tests

- [ ] Implement the roles catalog and role-permission edit flow against `/api/auth/roles`.

### Task 3: Permissions

**Files:**

- Create: `src/features/auth/permissions/*`
- Modify: router, sidebar, Auth i18n, and focused tests

- [ ] Implement the permission catalog against `/api/auth/permissions`.

### Task 4: Scopes

**Files:**

- Create: `src/features/auth/scopes/*`
- Modify: router, sidebar, Auth i18n, and focused tests

- [ ] Implement scope registry and its separate scoped role-policy route against `/api/auth/scopes` and `/api/auth/scoped-role-permissions`.
