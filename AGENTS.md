# Agent Instructions - LNG Web FE

This repo is the frontend for the LNG Web POD FBM system.

## UI Work

- Use the installed `taste-skill` for UI creation, redesign, and visual polish.
- Follow `DESIGN.md` for design tokens, typography, operational high-density rules, and shared UI component specifications.
- Keep screens operational and dense: dashboards, queues, workbenches, tables, filters, and detail panels matter more than marketing sections.
- Follow `CONVENTIONS.md` for feature structure, naming, API hooks, routing, styling, and shared helpers.
- Do not put every capability of a domain into one page. Split distinct operator jobs into focused routes/screens; use tabs, drawers, or detail views only when they preserve one coherent workflow.
- Organize code by feature and subfeature: keep each screen, its API adapter, query hooks, types, and screen-specific components in a focused folder rather than accumulating a large flat module.
- Within a feature, use bounded-domain folders (for example `accounts`, `roles`, `permissions`) with `api/`, `pages/`, and `components/` only when needed. Co-locate a page's `.module.scss` and `.test.tsx` beside that page; keep route guards in `guards/`. Do not leave a growing collection of unrelated page, API, test, and style files at the feature root.
- Keep tests outside production feature folders under `src/test/<feature>/`, mirroring the feature's domain structure (for example `src/test/auth/accounts/`). Use absolute `@/features/*` imports from those tests. Keep a page's `.module.scss` next to its page source.
- Prefer existing Ant Design v6 components, SCSS Modules, shared UI primitives (@/shared/ui), TanStack Query, Zustand, and local components before adding anything new.
- Do not add frontend dependencies for basic layout, icons, forms, tables, or simple motion unless the user explicitly asks.
- Treat backend API contracts as stable unless evidence says otherwise. Build typed adapters and focused TanStack Query hooks around them; avoid duplicating server state in component state, refetching unnecessarily, or creating ad hoc data-fetching paths.
- Keep local state minimal and UI-only (for example: filters, selected rows, drawer state). Derive display data with memoization only when it prevents meaningful repeated work.
- All user-facing UI copy must use the existing i18n setup (`useTranslation` and `src/shared/i18n/locales/*/common.json`); add matching Vietnamese and English keys in the same change. Do not hard-code labels, placeholders, feedback, empty states, or navigation text, except backend-provided values and literal technical codes.

## Shared UI Source

- Before creating UI, hooks, API helpers, types, or utilities, inspect `src/shared` and reuse the appropriate existing resource when possible.
- Import shared resources through their existing `@/shared/*` public path.
- If no component covers the requirement, add it under the relevant `src/shared/*` area when it is generic, independent of one feature's API/domain, and plausibly reusable by other screens.
- Keep code inside its feature folder when it encodes one screen's domain behavior, data shape, or interaction flow.
- Do not duplicate shared resources inside feature folders.

## Backend Contract

- Treat `C:\Users\stack\Task\lng-web-be\docs` as the API contract source.
- Keep auth and RBAC permission checks tied to backend-provided permissions, not hardcoded role names.
- Use the shared API client and endpoint constants instead of ad hoc `fetch` or raw URLs.

## Verification

- Run the narrowest meaningful check after edits:

```bash
npm run lint
npm run build
```

## Autonomous Tooling & Workflow Protocols

Agents operating on this repository must automatically adopt the following integrated workflows on every user request without requiring explicit prompt activation:

1. **Architecture & Impact Analysis (CodeGraph MCP):**
   - Automatically use `codegraph_explore` MCP tool for symbol lookup, cross-file caller/callee paths, and blast-radius analysis before editing shared contracts, routes, or cross-cutting hooks.
   - Avoid slow, token-heavy grep/read polling loops when structural knowledge graph queries can map dependencies in one round-trip.

2. **Anti-Bloat & YAGNI (Ponytail):**
   - Implement the smallest, cleanest change that fully solves the problem.
   - Strictly reuse existing helpers, UI primitives, and hooks in `@/shared/*`.
   - Never add new dependencies or create speculative wrapper/abstraction layers without explicit instructions.

3. **Engineering Rigor & Verification (Superpowers):**
   - **Systematic Debugging:** Trace root causes and verify hypotheses with evidence before modifying code.
   - **Plan First for Complex Tasks:** Draft and follow clear step-by-step milestones for multi-file refactoring or major features.
   - **Strict Verification:** Always run `npm run lint`, `npm run build`, and narrow unit/UI test suites before claiming any task is done. Evidence before assertions always.

4. **UI/UX Design Intelligence (UI-UX Pro Max & Taste Skill):**
   - Leverage UI/UX data guidance for data visualization, dashboard hierarchy, and complex operational workbenches.
   - **Authoritative Constraint:** All UI code must strictly adhere to `DESIGN.md` (high-density B2B operational rules, compact tables, theme tokens). Never introduce low-density consumer styles, glassmorphism, or non-standard visual clutter.

## Agent skills

### Domain docs

This is a single-context repository. See `docs/agents/domain.md`.
