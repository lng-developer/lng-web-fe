# Orders UX audit follow-up

## Goal

Resolve the four evidence-backed Orders audit defects without changing API contracts or query ownership.

## Task 1: Add failing regression checks

**Files:**

- Modify: `src/features/orders/utils/ordersPageComposition.test.js`

Add checks that fail until:

1. the mobile tab strip does not create its own horizontal scroll surface;
2. Refresh and order-timeline icon actions each expose both an accessible name and tooltip; and
3. every keyboard-focused Orders control exposes a visible focus indicator; and
4. a rejected workbench query renders a scoped retry action.

Run: `node --test src/features/orders/utils/ordersPageComposition.test.js` (expect failure before fixes).

## Task 2: Contain horizontal scroll and add icon help

**Files:**

- Modify: `src/features/orders/components/OrdersControls.jsx`
- Modify: `src/features/orders/components/OrdersTable.jsx`

Use existing MUI primitives only. Keep the tab labels reachable without adding a second horizontal scroll surface; wrap or otherwise use the existing responsive toolbar pattern. Add `Tooltip` wrappers to Refresh and timeline controls while retaining their current `aria-label`s, and ensure their keyboard focus state is visibly distinguishable.

## Task 3: Render scoped workbench error/retry

**Files:**

- Modify: `src/features/orders/pages/OrdersPage.jsx`
- Modify: `src/features/orders/components/OrdersTable.jsx`

Pass the existing workbench query error state to the table and render an in-table retry action that calls `ordersQuery.refetch` only. Do not alter endpoint constants, mutations, or summary query ownership.

## Verification

Run:

```powershell
node --test src/features/orders/utils/ordersPageComposition.test.js
npx eslint src/features/orders/pages/OrdersPage.jsx src/features/orders/components/OrdersControls.jsx src/features/orders/components/OrdersTable.jsx
npm run build
```
