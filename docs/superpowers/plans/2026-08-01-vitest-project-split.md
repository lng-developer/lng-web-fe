# Vitest Project Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make narrow test runs fast and keep one stable full-suite CI gate.

**Architecture:** Split pure TypeScript tests into a Node project and component/browser-state tests into a jsdom project. Keep the application smoke test independent from the production route tree, while preserving a small route contract test for lazy-loading policy.

**Tech Stack:** Vitest 4, React Testing Library, React Router, TypeScript

## Global Constraints

- Add no dependency.
- Keep tests under `src/test`.
- Preserve `npm test` as the full-suite command.
- Use four workers for the stable UI gate; the measured two-worker run exceeded five minutes.

---

### Task 1: Split Vitest projects and scripts

**Files:**

- Modify: `vite.config.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: existing `src/test/**/*.test.ts` and `src/test/**/*.test.tsx` layout
- Produces: Vitest projects named `unit` and `ui`; scripts `test:unit`, `test:ui`, `test:portal`, and `test:ci`

- [ ] **Step 1: Run the future project command and confirm it fails**

Run: `npm test -- --project unit`
Expected: FAIL because no project named `unit` exists.

- [ ] **Step 2: Configure the projects**

Use Node for pure `.test.ts` files, excluding the three files that require browser APIs. Use jsdom plus `src/test/setup.ts` for `.test.tsx` and those three explicit browser-state tests.

- [ ] **Step 3: Add narrow scripts**

Add `test:unit`, `test:ui`, `test:portal`, and `test:ci`; keep `npm test` as the full-suite entry point.

- [ ] **Step 4: Verify both projects independently**

Run: `npm run test:unit` and `npm run test:ui`
Expected: PASS with no duplicated or missing test files.

### Task 2: Decouple the application smoke test from production routes

**Files:**

- Modify: `src/test/app/App.test.tsx`
- Create: `src/test/app/router/LazyRouteContract.test.tsx`

**Interfaces:**

- Consumes: `AppShell`, `NotFoundPage`, `FoundationPage`, and production `appRoutes`
- Produces: a lightweight shell smoke test and an isolated lazy-route contract test

- [ ] **Step 1: Move the lazy-route assertion into its own test file**

The contract test imports `appRoutes` and asserts that business routes expose `lazy`, while Foundation exposes `element`.

- [ ] **Step 2: Give App smoke a minimal memory-router tree**

Use a local loader with a complete account fixture, an index redirect, Foundation child, and wildcard Not Found route. Remove auth API mocks and the `appRoutes` import.

- [ ] **Step 3: Run only the two affected tests**

Run: `npx vitest run src/test/app/App.test.tsx src/test/app/router/LazyRouteContract.test.tsx --project ui`
Expected: PASS.

### Task 3: Verify the stable gate

**Files:**

- No code changes

**Interfaces:**

- Consumes: `test:unit`, `test:ui`, and `test:ci`
- Produces: timing and pass/fail evidence for the new workflow

- [ ] **Step 1: Run the Portal slice**

Run: `npm run test:portal`
Expected: PASS.

- [ ] **Step 2: Run the stable full suite**

Run: `npm run test:ci`
Expected: PASS without the previous five-minute serial timeout.

- [ ] **Step 3: Run source gates**

Run: `npm run lint`, `npm run typecheck`, and `npm run build`
Expected: PASS; the existing bundle-size warning is acceptable.
