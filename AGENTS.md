# Agent Instructions - LNG Web FE

This repo is the frontend for the LNG Web POD FBM system.

## UI Work

- Use the installed `taste-skill` for UI creation, redesign, and visual polish.
- Keep screens operational and dense: dashboards, queues, workbenches, tables, filters, and detail panels matter more than marketing sections.
- Follow `CONVENTIONS.md` for feature structure, naming, API hooks, routing, styling, and shared helpers.
- Prefer existing MUI, Tailwind, SCSS, TanStack Query, Zustand, and local components before adding anything new.
- Do not add frontend dependencies for basic layout, icons, forms, tables, or simple motion unless the user explicitly asks.

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
