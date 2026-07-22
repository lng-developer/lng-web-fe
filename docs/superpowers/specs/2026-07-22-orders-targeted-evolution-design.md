# Orders Targeted Evolution Design

**Date:** 2026-07-22
**Status:** Approved
**Scope:** `src/features/orders`

## Goal

Improve consistency, maintainability, accessibility, and measured performance of the Orders screen without redesigning it. The current layout, palette, workflow, API contracts, URL behavior, and permission model remain the baseline.

## Constraints

- Preserve the visible layout and existing operator workflow unless a concrete UX defect justifies a change.
- Preserve backend endpoints, DTOs, mappers, query semantics, route state, and permission gates.
- Reuse MUI, TanStack Query, the current theme, and existing shared components.
- Do not add frontend dependencies.
- Create a shared abstraction only when at least two real consumers need it.
- Keep server state in TanStack Query and transient form state inside the owning dialog or component.
- Validate every visible change against desktop and mobile baseline captures.

## Component Architecture

`OrdersPage` remains the only orchestration layer. It owns URL-derived page state, list and summary queries, tab and pagination composition, and stable refresh callbacks. It passes display-ready data and event handlers to feature components.

```text
src/features/orders/
├── pages/
│   └── OrdersPage.jsx
├── components/
│   ├── OrdersControls.jsx
│   ├── OrdersTable.jsx
│   ├── OrderExpandedDetail.jsx
│   └── OrderDialogs.jsx
└── utils/
    └── ordersFilters.js
```

Responsibilities:

- `OrdersControls`: tabs, filters, and the import trigger. It receives values and callbacks and does not own server queries.
- `OrdersTable`: table composition, columns, cells, row actions, and expanded-row activation.
- `OrderExpandedDetail`: product, customization, fulfillment, vendor matching, and notes.
- `OrderDialogs`: import, customer, shipping, and case dialogs. These stay together initially and split only if the file remains too large or a dialog gains another consumer.
- `ordersFilters.js`: parsing and building URL-backed filter state using existing filter utilities. Browser URL mechanics do not remain in page JSX.

Dependency direction:

```text
Page -> feature components -> shared operations/common components
Page -> feature queries and utilities
Feature components -X-> page
Shared components -X-> feature
```

No new context, reducer, factory, generic form framework, or workflow abstraction is introduced.

## Data Flow and State

```text
URL search parameters
    -> OrdersPage filters and active tab
    -> buildOrderListQuery / buildOrderSummaryQuery
    -> TanStack Query
    -> mapped orders, pagination, and summary
    -> controls, table, and expanded detail
```

- URL search parameters remain the source of truth for tab, channel, search, date, and pagination.
- Changing filters resets pagination according to the current behavior.
- Existing deferred search behavior is retained; no new debounce abstraction is added.
- Dialogs keep local draft state and reset it when closed or when their selected order changes.
- Server payloads are not copied into page state solely for display.
- Mutations invalidate the nearest relevant query key instead of refetching the entire application.
- One stable refresh callback flows from the page to the table and detail components.
- Detail queries remain disabled until the related UI is opened.
- Mutation errors keep dialogs open and preserve user input.

The pilot must preserve URL restoration after refresh, filter and tab behavior, expanded rows, dialog behavior, API calls, and backend-derived authorization.

## UI and UX Direction

This is targeted evolution, not a redesign. The current Orders screen is the visual baseline.

- Continue using the existing operations page shell, tabs, toolbar, table, pagination, and status components.
- Source spacing, typography, borders, radii, and status colors from existing tokens and theme values.
- Use the same action name in its button, dialog title, and success message.
- Limit each action region to one visually primary action.
- Keep Order IDs, tracking codes, and SKUs in the existing mono treatment; use the UI font for operator-facing content.
- Use status colors semantically rather than decoratively.
- Give icon-only actions a tooltip and accessible name.
- Preserve the current table density, expanded-row interaction, sidebar, navigation, palette, and font family.
- Keep sticky headers and horizontal scrolling inside the shared operations table boundary.
- Put decision-critical information first and keep raw IDs or debug details in secondary detail surfaces.
- Retain table headers in empty states and give errors a retry action scoped to the failed query.
- Prevent loading and paging states from causing avoidable table-height jumps.

Responsive and accessibility requirements:

- Preserve the desktop layout.
- Allow table content to scroll horizontally on narrow screens while controls wrap and remain reachable.
- Keep visible keyboard focus.
- Dialogs trap focus, close with Escape, and restore focus to their trigger.
- Confirm destructive actions.
- Respect reduced-motion preferences and add no decorative animation.

## Error Handling

- Query errors render an actionable retry for the failed Orders query.
- Empty results distinguish an empty queue from a failed request.
- Mutation errors retain draft input and use the existing notification path.
- Authentication and authorization errors continue through the shared API and route handling.
- Failed lazy routes and application-level failures remain owned by shared route error handling.

## Verification Strategy

### Baseline

Before implementation:

- Run lint, the Node test suite, and the production build.
- Record pre-existing failures separately from pilot regressions.
- Capture the Orders screen at representative desktop and mobile widths.
- Record request counts for initial load, tab changes, filtering, paging, and row expansion.
- Record the current Orders route chunk and relevant render observations.

### During implementation

- Run the narrowest utility or component checks after each extraction.
- Prefer behavior and contract tests over new source-string composition assertions.
- Do not add large snapshots or implementation-detail tests.
- Compare visible output against the baseline after every UI-affecting change.

### Completion criteria

- The overall UI and workflow remain unchanged.
- URL state, API contracts, query behavior, and permission gates remain unchanged.
- Representative journeys do not increase their request count.
- No dependency is added.
- `OrdersPage.jsx` contains orchestration and page composition rather than embedded feature implementations.
- Extracted components have one clear responsibility and no reverse dependency on the page.
- No single-consumer shared abstraction is introduced.
- Desktop, mobile, keyboard, loading, error, and empty states are verified.
- Source lint, relevant tests, and the production build pass, with unrelated baseline failures reported separately.

## Delivery Order

1. Capture baseline and protect existing contracts.
2. Consolidate URL and filter utilities.
3. Extract Orders controls.
4. Extract the Orders table.
5. Extract expanded order details.
6. Extract order dialogs.
7. Fix only evidence-backed consistency, accessibility, responsive, or performance issues.
8. Run full verification and report before-and-after evidence.

Each step must remain independently reviewable and preserve behavior.
