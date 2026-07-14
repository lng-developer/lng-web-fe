# Scale Pagination Design

## Scope

Replace the page-specific Scale pagination buttons with the MUI Pagination component demonstrated in the project UI Kit. Add server-side page-size selection and an accurate visible-item range.

## Behavior

- Default to 10 tasks per page.
- Allow 10, 20, or 50 tasks per page.
- Show the current range as `from-to of total` and display `0-0 of 0` for an empty result.
- Changing page size resets the current page to 1 and collapses the expanded row.
- Changing filters, tabs, search, or date range continues to reset the page to 1.
- If a response makes the current page greater than the new total page count, move to the last valid page.
- MUI Pagination owns previous, next, page-window, ellipsis, current-page, and disabled states.

## Data Flow

- `page` and `pageSize` remain local Scale page state.
- Both values are included in the Production API query as `page` and `limit`.
- Pagination calculations use the normalized `total`, `page`, and `limit` returned by the API mapper where available.
- No client-side array slicing is added.

## UI and Accessibility

- Use MUI `Pagination`, `Select`, and `MenuItem` components.
- Use Tailwind classes for static layout, spacing, and dimensions.
- Add Vietnamese and English labels for range text and page-size controls.
- Keep pagination responsive by allowing controls to wrap without overlapping filters.

## Verification

- Unit-test range calculation for empty, first, middle, and last pages.
- Extend the Production query test to confirm a selected page size is sent as `limit`.
- Run focused tests, full lint, production build, diff checks, and the Scale route smoke check.
