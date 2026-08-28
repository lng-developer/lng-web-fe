# HR Time Requests layer migration

## Purpose

Use the HR Time Requests flow as the first, behavior-preserving migration from the existing feature-first structure to the proposed layer-first structure. The migration establishes a repeatable pattern for the remaining HR flows without moving them in this change.

## Scope

Move the Time Requests page, its screen-only UI, its screen controller hook, its request types, and its API functions. Move the request editor modal to HR-shared UI because it is also consumed by the monthly schedule calendar.

Do not change routes, backend endpoints, permissions, translations, business behavior, or the attendance, payroll, and schedule APIs that are not required by this flow.

## Target structure

```text
src/
  layout/hr/
    template/time-requests/
      index.tsx
      useTimeRequests.ts
      components/
        RequestMetrics.tsx
        RequestTabs.tsx
        RequestDetailDrawer.tsx
    component/TimeRequestEditorModal/
      index.tsx
  services/hr/time-requests/
    type.ts
    leave-balances/index.ts
    leave-requests/index.ts
    overtime-requests/index.ts
    request-editor/index.ts
  styles/hr/time-requests/
    TimeRequests.module.scss
```

`type.ts` owns the Time Requests domain types shared by more than one request method, including leave requests, overtime requests, leave balances, request kind, and shared employee/capability shapes. A method folder adds a local `type.ts` only when it introduces a DTO not shared elsewhere in the Time Requests service.

## UI and state boundaries

`layout/hr/template/time-requests/index.tsx` is the route-rendered screen. It composes the header, metrics, tabs, detail drawer, and editor modal. It must not contain table-column definitions or API calls.

`useTimeRequests.ts` owns TanStack Query calls, mutation invalidation, permission-derived capabilities, local editor/detail state, action handlers, and display mappers. It imports only from the Time Requests service and shared app utilities.

The screen-specific components own their individual markup:

- `RequestMetrics` renders four summary cards.
- `RequestTabs` renders leave and overtime tables with their column definitions and row interactions.
- `RequestDetailDrawer` renders request details.

`TimeRequestEditorModal` becomes `layout/hr/component/TimeRequestEditorModal` because both Time Requests and the monthly schedule calendar consume it. Its public props remain compatible so the schedule flow is not behaviorally changed.

## Data and error flow

Service methods use the existing shared API client and backend endpoint constants. No page or UI component calls the API client directly.

The controller uses existing TanStack Query keys rooted at `['hr-time']` (or equivalent centralized key helpers if introduced only for this flow), so existing invalidation behavior remains intact. Successful decisions and editor mutations invalidate the time-request queries. Existing translated success and error toast messages remain the visible feedback.

## Routing and compatibility

The current HR module router remains the only route entry point in this migration. Its `hr/*` URL, lazy-loading behavior, and child-page selection remain unchanged. The internal HR action page changes only its lazy import to the new Time Requests template.

All current consumers of `TimeRequestEditorModal` and migrated request types are updated to their new public import paths. The old Time Requests files are removed after imports and tests no longer reference them; no compatibility re-export layer is retained.

## Tests and verification

Move or update Time Requests tests under `src/test/hr/time-requests/` to import the new layout and service paths. Retain behavior coverage for list loading, permissions, create/edit/cancel/approve/reject interactions, and detail rendering. Update direct API tests to target the service methods.

Run the narrow relevant test files first, then `npm run lint` and `npm run build`. The migration is complete only if the original Time Requests behavior is unchanged and no imports still target its removed legacy files.

## Follow-up rule

Future HR migrations follow the same split: UI/controller in `layout/hr`, feature API and types in `services/hr`, and styles in `styles/hr`. A resource is raised to `layout/hr/component` only when used by multiple HR templates; it becomes app-wide shared only when reused outside HR.
