# Frontend route registry

## Goal

Make one typed registry the source of truth for every frontend URL. Changing a URL must not require searching through router definitions, navigation structures, or individual screens.

## Scope

The registry covers browser routes only. Backend API paths remain owned by feature API adapters and are explicitly out of scope.

## Registry contract

`src/app/router/routes.ts` exports two views of the same route data:

- `routePaths`: router-relative paths, without a leading slash, for React Router route declarations.
- `routeLinks`: browser paths, with a leading slash, plus typed builders for route parameters and query strings.

Route builders encode dynamic IDs and query parameters centrally. For example, `routeLinks.orders.bySalesChannel('amazon')` produces the current orders URL, while vendor cost-center builders receive their IDs rather than callers composing strings.

## Consumers

- `src/app/router/router.tsx` uses `routePaths` for every real route and redirect source.
- `src/app/layout/appNavigation.ts` and `LegacySidebar.tsx` use `routeLinks` for all navigation targets.
- `src/features/hr/hrNavigation.ts` uses `routeLinks` for its route catalog.
- Screen-level navigation, redirects, return paths, and pathname comparisons use `routeLinks` or narrow route-prefix helpers from the registry.

The router continues to own components, loaders, error boundaries, and permission guards. The registry owns only URL identity and URL construction.

## Migration rules

1. Register every existing browser route before replacing consumers.
2. Preserve every current URL, parameter name, and redirect destination.
3. Use builders for parameterized routes; do not concatenate IDs or query strings at call sites.
4. Do not register legacy sidebar placeholders that have no implemented route; they continue to show the existing not-found behavior until their corresponding screen is built.
5. New frontend routes must be added to the registry before they are used by the router or UI.

## Verification

- Unit tests validate key links and dynamic builders.
- A source-level test ensures every concrete route declaration in `router.tsx` references `routePaths` rather than a literal path.
- Run the focused UI tests, `npm run lint`, and `npm run build`.
