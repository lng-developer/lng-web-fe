# Table quick actions

## Scope

Add a fixed `Action` column to the four Catalog and Design tables: Listings, Product Types, Internal Templates, and Design Queue. Existing row-click detail behavior remains available.

## Interaction

- Show one primary action that best matches the row's current state and the user's permissions.
- Put secondary actions in an ellipsis menu when a row has more than one valid action.
- Stop action clicks from triggering the row's detail drawer.
- Hide actions the user cannot perform; never render disabled controls as a substitute for permission checks.
- Keep the column fixed to the right so it remains reachable on horizontally scrolling tables.

## Actions by table

- Listings: `View`; `Edit` for Catalog writers; `Approve` or `Reject` only when valid for the current QC state.
- Product Types: `Edit` for users with global `CATALOG:WRITE`.
- Internal Templates: `Edit` for users with global `CATALOG:WRITE`.
- Design Queue: primary lifecycle action by state (`Assign`, `Start`, `Submit`, or `Review`); secondary valid actions remain in the menu. Actions reuse the existing detail form or mutation flow rather than duplicating business logic.

## Safety and feedback

- Existing backend permission and state validation remains authoritative.
- Mutations keep the existing loading, success, error, and query invalidation behavior.
- Destructive or rejection actions keep confirmation/reason requirements.

## Verification

- UI tests cover action visibility by permission and status.
- UI tests verify action clicks do not trigger row detail behavior.
- Run FE lint, unit tests, UI tests, and production build.
