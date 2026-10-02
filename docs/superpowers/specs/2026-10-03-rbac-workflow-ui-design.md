# RBAC workflow UI design

## Goal

Align the frontend with the RBAC and workflow contracts now on backend `develop` without exposing team or production data outside the user's allowed scope.

## Scope

### Production scale and QC

The existing production workbench remains the single screen. Its controls and visible queues follow the permissions returned by `/api/auth/me`:

- `PRODUCTION:SCALE_WORK`: show only tasks the API returns for the assigned scale operator; allow scaled-output upload and submit-for-QC only for that assignee.
- `PRODUCTION:SCALE_ASSIGN`: show the scale queue and the CS assignment selector; do not show QC decisions.
- `PRODUCTION:QC_REVIEW`: show the QC queue and review controls; do not show scale upload or assignment controls.
- `PRODUCTION:WRITE`: retains the existing administrator behavior.

The UI is advisory only. Every action continues through the backend route, and a `403` refreshes the workbench so stale claims cannot leave an actionable control visible.

### Seller design requests

Seller order detail keeps the existing PSD-request action, but consumes the new response shape returned by `POST /api/orders/items/:orderItemId/request-psd`.

A focused Design Requests screen reads `/api/design/requests`:

- a Design Leader can see all requests, assign only an active design member, and track status;
- a designer sees only requests assigned to them and can move a request through `ASSIGNED -> IN_PROGRESS -> COMPLETED`;
- other users have no entry point and do not receive client-side role-name checks.

The screen uses the existing API client, query cache and table primitives. No duplicate order or production state is stored in the browser.

### HR personal and team workspaces

The current dirty HR implementation is preserved and completed rather than replaced:

- Personal routes call only `/hr/me/*` data and never request a team identifier.
- Team routes render only when the user has a backend-provided eligible team scope. A single eligible team is selected automatically; multiple teams require an explicit selection.
- Attendance, requests, schedule and member views all share that selected team context. The UI does not fall back to an unrestricted list when scope data is absent.

## Files and boundaries

- `src/features/portal/production/*`: API types and permission predicates for the existing workbench.
- `src/features/portal/orders/*` and `src/features/portal/design/*`: PSD-request response handling and the new design-request screen.
- `src/features/hr/*`, sidebar/navigation and HR query hooks: finish the existing personal/team scope work.
- Shared permission helpers are reused; new UI strings are added to both locale files.

## Error handling and verification

Mutations show the existing feedback toast and invalidate their relevant query keys. A forbidden response clears stale local selection and refetches rather than attempting a client-side workaround.

Tests cover the three production role predicates, seller/leader/designer request visibility and actions, plus Personal versus Team HR query inputs. Verification is targeted Vitest first, then lint, unit/UI suites and build before delivery.
