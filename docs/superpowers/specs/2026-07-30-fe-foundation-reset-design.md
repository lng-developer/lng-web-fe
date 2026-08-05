# FE Foundation Reset Design

## Goal

Replace the current frontend implementation with a minimal TypeScript foundation, then rebuild each operational screen as an independently testable feature against the existing backend contracts.

## Scope

- Delete the current `src` implementation in the reset commit.
- Keep the repository, Git history, Vite configuration, quality tooling, environment examples, and backend repository unchanged.
- Preserve reusable contracts and language data through Git history and the salvage manifest below; do not copy old JavaScript implementations into the new foundation.
- Deliver only a runnable foundation in the first implementation slice. Authentication and business screens are later slices.

## Technology

- React 19 and TypeScript on Vite.
- Ant Design 6 and `@ant-design/icons` for enterprise UI.
- React Router for routing.
- TanStack Query for server state.
- Axios through one shared API client.
- Zustand only when state must outlive a component or cross route boundaries.
- Ant Design Form for forms; do not add React Hook Form.
- Zod only at trust boundaries that need runtime validation.
- Ant Design tokens plus CSS Modules or SCSS; remove MUI, Emotion, Tailwind, and Notistack.
- Vitest and React Testing Library for the rebuilt application.

## Target Structure

```text
src/
  app/
    providers/
    router/
  layouts/
  shared/
    api/
    config/
    i18n/
    ui/
    utils/
  features/
  main.tsx
```

`app` composes the application. `shared` contains framework-neutral infrastructure and primitives. `features` owns business behavior and may depend on `shared`, while `shared` must never import from `features`.

## Salvage Manifest

The following old sources are reference contracts, recoverable from the parent commit after `src` is deleted:

- `src/i18n/locales/vi/common.json` and `src/i18n/locales/en/common.json`: retain common terminology, authentication copy, system errors, and stable domain vocabulary. Screen-specific keys return only with the screen that owns them.
- `src/i18n/locales/i18nParity.test.js`: preserve the VN/EN key-parity invariant in the new test stack.
- `src/services/endpoints.js` and `src/services/endpoints.contract.test.js`: preserve backend endpoint names and contract coverage.
- `src/services/axiosInstance.js` and `src/services/apiError.js`: preserve observed authentication refresh semantics and normalized error behavior, but rewrite them in TypeScript.
- `src/constants/app.js`, `src/constants/env.js`, and `src/constants/routes.js`: preserve stable environment, storage, auth-response, and route contracts only.
- `src/lib/queryClient.js` and `src/lib/dayjs.js`: preserve validated runtime defaults where still applicable.
- `src/assets/images/logo-lng.png`: preserve the LNG brand asset.
- Existing auth/RBAC and API coverage tests: use as characterization evidence when rebuilding those slices.

Old pages, components, layouts, stores, MUI theme code, Tailwind styles, and screen-specific adapters are not salvage targets.

## Foundation Slice

The first implementation slice must provide:

- A TypeScript entry point and application provider composition.
- Ant Design theme tokens with light mode as the initial supported mode.
- TanStack Query and React Router providers.
- Typed environment access and one Axios API client.
- VN/EN initialization with a language switch and parity protection.
- A single responsive `Foundation ready` route with an error boundary and not-found behavior.
- No authentication, navigation shell, dashboard, or business feature.

## Rebuild Order

1. Foundation.
2. Login, token refresh, current-session restoration, and protected routes.
3. Application shell and permission-derived navigation.
4. Dashboard.
5. Operational features one screen at a time, chosen by business priority.

Each slice restores only the locale keys, endpoint contracts, permissions, and domain adapters it needs.

## Error Handling

- Normalize transport and backend errors once in the shared API layer.
- Route rendering failures use one application error boundary.
- Feature-level empty, loading, forbidden, and failure states remain owned by the feature.
- Authentication failures may clear tokens and redirect only after the authentication slice exists.

## Verification

The reset is acceptable only when:

- Git history still contains the pre-reset implementation and the worktree is on `refactor/fe-foundation`.
- No MUI, Emotion, Tailwind, Notistack, or old feature import remains.
- Type checking, lint, unit tests, and production build pass.
- VN and EN expose identical retained keys.
- The foundation route renders at desktop and mobile widths without console errors.
- The API client reads `VITE_API_BASE_URL` and does not embed raw backend URLs.

## Delivery Boundaries

- Do not modify the backend during the foundation slice.
- Do not add speculative abstractions, Pro Components, Redux, Next.js, micro-frontends, or a custom component library.
- Commit the destructive reset separately from later screen implementations so it remains reviewable and reversible.
