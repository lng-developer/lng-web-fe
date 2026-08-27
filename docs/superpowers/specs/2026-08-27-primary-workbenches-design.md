# Primary Workbenches Design

## Scope

This first delivery improves the Operations Dashboard and Order Workbench only. It preserves the existing backend contracts, permission boundaries, routes, query keys, and i18n structure.

## Dashboard

Keep the existing operational KPIs, but make each card communicate one queue state, the current count, and one next action. The main content remains a dense operational view: decision-critical queues appear before charts, filters remain visible, and empty/loading/error states use the shared UI primitives.

## Orders

Keep one coherent order workflow: filter and queue selection on the left, order detail and row actions on the right. Do not add a second data source or duplicate server state. Existing TanStack Query hooks remain the source of truth; local state is limited to filters, selection, and panel state.

## Global constraints

- Reuse existing Ant Design, shared UI, SCSS modules, TanStack Query, and i18n.
- Add no dependencies.
- All visible copy has English and Vietnamese keys.
- Preserve table keyboard interaction, labels, focus visibility, reduced-motion behavior, and permission guards.
- Add only focused tests under `src/test/foundation/` and `src/test/portal/orders/`.
