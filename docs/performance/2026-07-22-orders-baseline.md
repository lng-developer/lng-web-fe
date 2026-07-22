# Orders Targeted Evolution Baseline

Captured on 2026-07-22 against the local `/portal/orders` route on branch `refactor/orders-targeted-evolution-impl`, the isolated implementation branch descended from the approved plan branch.

## Automated checks

| Check                                                         | Exit code | Observed result                                                                                                                   |
| ------------------------------------------------------------- | --------: | --------------------------------------------------------------------------------------------------------------------------------- |
| Source lint: `npx eslint src vite.config.js eslint.config.js` |         0 | 0 lint findings                                                                                                                   |
| Node tests: `node --test "src/**/*.test.js"`                  |         1 | 492 tests: 491 passed, 1 failed, 0 skipped; 1285.148 ms. The unrelated API-coverage test is missing four `/api/reports/*` routes. |
| Production build: `npm run build`                             |         0 | 1437 modules transformed; completed in 1.17 s                                                                                     |
| Orders chunk: `dist/assets/OrdersPage-B6NpeweW.js`            |         0 | 89,257 bytes (89.25 kB; 26.26 kB gzip)                                                                                            |

## Operator journeys

Request counts below are local API requests, including CORS preflight requests.

| Journey                                       | Request count | Observation                                                                                                                                                    |
| --------------------------------------------- | ------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial load                                  |             6 | `OPTIONS` and `GET` for `/api/shops?page=1&limit=100`, `/api/orders/workbench?page=1&limit=10&tab=ALL`, and `/api/orders/summary`; 814 records shown.          |
| Change channel tab                            |             2 | Selecting `New Orders` requested `OPTIONS` and `GET /api/orders/workbench?page=1&limit=10&tab=NEW_ORDER`; URL became `?tab=new`.                               |
| Change seller filter                          |             4 | Selecting `J2510 Design QC Lead` requested `OPTIONS` and `GET` for the seller-scoped workbench and summary endpoints; response displayed `0 records`.          |
| Change page                                   |             2 | Moving to page 2 requested `OPTIONS` and `GET /api/orders/workbench?page=2&limit=10&tab=NEW_ORDER`; URL became `?tab=new&page=2`.                              |
| Expand one order row                          |             0 | Returned rows already rendered their detail panels. No dedicated expand control was present; clicking order ID `4088418130` copied it and made no API request. |
| Open and close customer dialog without saving |             0 | `Buyer` opened `Update Customer` for Nicole Capulli; `Cancel` closed it with no mutation request.                                                              |

## Visual captures

- Desktop (1440x900, loaded `/portal/orders` with 20 rendered table rows): `docs/performance/2026-07-22-orders-baseline-desktop-1440x900.png` (223,050 bytes)
- Mobile (390x844): `docs/performance/2026-07-22-orders-baseline-mobile-390x844.png`

## Targeted UX audit

| Gate                                                               | Result | Evidence                                                                                                                                                                                                                                                                                                                          | Owning file                                                                                           |
| ------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Desktop layout matches baseline                                    | PASS   | The extracted page renders the baseline 11 headers and operational rows locally; Task 4–6 reviews verified the moves were mechanical.                                                                                                                                                                                             | `src/features/orders/pages/OrdersPage.jsx`                                                            |
| Mobile controls wrap and remain reachable                          | PASS   | At 390x844, document `scrollWidth === clientWidth`; search, filters, Refresh, and Import were within x=32..358.                                                                                                                                                                                                                   | `src/features/orders/components/OrdersControls.jsx`                                                   |
| Only table content scrolls horizontally                            | DEFECT | At 390x844 the table surface is correctly `overflow-x:auto` (326px client / 1410px content), but the tab strip also has `overflowX: 'auto'`. Reproduce: open `/portal/orders` at 390px and inspect the tab strip; expected horizontal scrolling to be limited to the table surface.                                               | `src/features/orders/components/OrdersControls.jsx`                                                   |
| Keyboard focus visible                                             | DEFECT | Orders-specific focus visibility was not verified: the only observed `Mui-focusVisible` state was the sidebar toggle, not an Orders control or table action. Reproduce: load `/portal/orders`, Tab through Refresh, Import, timeline, Buyer, Case, and Replace; expected each focused Orders control to show a visible indicator. | `src/features/orders/components/OrdersControls.jsx`, `src/features/orders/components/OrdersTable.jsx` |
| Icon-only actions accessible name and tooltip                      | DEFECT | `OrderTimelineButton` has an accessible name but no `title`/`Tooltip`; toolbar Refresh has an accessible name but no tooltip. Reproduce: keyboard-focus either action and wait for hover/focus help; expected a visible tooltip for every icon-only action.                                                                       | `src/features/orders/components/OrdersTable.jsx`, `src/features/orders/components/OrdersControls.jsx` |
| Empty results retain headers                                       | PASS   | Searching `__audit_no_match__` locally retained all 11 table headers and displayed `No data`.                                                                                                                                                                                                                                     | `src/components/operations/OperationsTable.jsx`                                                       |
| Query errors expose scoped retry                                   | DEFECT | `OrdersPage` passes only `isLoading`, rows, pagination, and refresh to `OrdersTable`; neither query error state nor a scoped retry UI is rendered. Reproduce: force `useOrderWorkbenchQuery` to reject; expected an in-table error state with retry that calls `ordersQuery.refetch` only.                                        | `src/features/orders/pages/OrdersPage.jsx`, `src/features/orders/components/OrdersTable.jsx`          |
| Paging does not collapse table height                              | PASS   | `OperationsPageShell` reserves a `flex-1 min-h-0` table region and `OperationsTable` owns that region; baseline paging journey changed pages without a height collapse.                                                                                                                                                           | `src/components/operations/OperationsPageShell.jsx`                                                   |
| Loading/tab/paging/expansion request counts do not exceed baseline | PASS   | The extracted controls/table/detail/dialog components do not own workbench or summary queries; query ownership remains in `OrdersPage`, preserving the baseline request topology.                                                                                                                                                 | `src/features/orders/pages/OrdersPage.jsx`                                                            |

## After verification

Verified on 2026-07-22 at commit `abe4b7f`, after the component extraction and targeted UX follow-up.

| Check                | Before                          | After                                                                            |
| -------------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| Orders-focused tests | Not recorded separately         | 65 passed, 0 failed; exit `0`                                                    |
| Source lint          | 0 findings; exit `0`            | 0 findings; exit `0`                                                             |
| Full Node suite      | 492 total: 491 passed, 1 failed | 502 total: 501 passed, 1 failed; the same unrelated API-coverage failure remains |
| Production build     | 1,437 modules; 1.17 s; exit `0` | 1,441 modules; 1.36 s; exit `0`                                                  |
| Orders chunk         | 89,257 bytes; 26.26 kB gzip     | 90,105 bytes; 26.44 kB gzip (+848 bytes raw)                                     |
| `OrdersPage.jsx`     | 2,547 lines                     | 164 lines; orchestration and query ownership only                                |

The remaining full-suite failure is `backend endpoint registry covers every backend non-health route`. Its missing routes are unchanged and unrelated to Orders:

- `GET /api/reports/ads/by-seller`
- `GET /api/reports/ads/channel-performance`
- `GET /api/reports/ads/daily`
- `GET /api/reports/buyers/insights`

### Source outcomes

- URL parsing and serialization moved to `ordersFilters.js`.
- Controls, table, expanded detail, and dialogs moved to dedicated Orders components while workbench and summary queries remain in `OrdersPage`.
- The follow-up removed the second mobile horizontal scroll surface, added accessible tooltips and visible keyboard focus to icon actions, and added an in-table retry scoped to `ordersQuery.refetch`.
- No dependency, new design system, shared speculative abstraction, API contract change, RBAC change, or broad visual redesign was added.

### Browser evidence limitation

The active verification environment did not expose a callable in-app browser connector. The original desktop/mobile screenshots and six baseline request-count journeys above are preserved as before evidence; no new interaction counts or after screenshots are claimed. The focused composition tests verify URL state, query ownership, mobile tab overflow, tooltip labels, focus styles, and scoped retry wiring, but they do not replace a live browser journey.

Accepted visible changes are limited to the audited accessibility/error-state fixes. The prior visual captures remain at:

- `docs/performance/2026-07-22-orders-baseline-desktop-1440x900.png`
- `docs/performance/2026-07-22-orders-baseline-mobile-390x844.png`
