# Sales-channel filter task 1 report

## Delivered

- Added compact `All` / `Amazon` / `Etsy` selectors to Orders, Scale, and QC.
- `all` omits `channel` from the URL and `salesChannelCode` from list, summary, and QC export queries; Amazon and Etsy map to `AMAZON` and `ETSY`.
- Replaced Scale's URL-derived channel sub-tab assumption. Etsy-only row presentation remains active only for the Etsy selection.
- Kept Amazon/Etsy deep links and reset pagination to page 1 on every channel change.
- Removed the Orders route-channel override so a selector change cannot be superseded by a stale URL snapshot.

## Files

- `src/features/orders/components/OrdersControls.jsx`
- `src/features/orders/pages/OrdersPage.jsx`
- `src/features/orders/utils/ordersPageComposition.test.js`
- `src/features/scale/pages/ScalePage.jsx`
- `src/features/scale/pages/scalePageComposition.test.js`
- `src/features/scale/utils/scaleApi.js`
- `src/features/scale/utils/scaleApi.test.js`
- `src/features/qc/pages/QcPage.jsx`
- `src/features/qc/pages/qcPageComposition.test.js`
- `src/features/qc/utils/qcApi.js`
- `src/features/qc/utils/qcApi.test.js`
- `docs/superpowers/plans/2026-07-23-sales-channel-ui-filter.md`
- `docs/superpowers/specs/2026-07-23-sales-channel-ui-filter-design.md`

## TDD evidence

- RED: the required focused command initially reported 88 passing and 13 failing tests. Every failure was an expected missing sales-channel URL/query/toolbar behavior; no unrelated test failed.
- GREEN: the required focused command reported 101 passing and 0 failing tests.
- Additional Orders regression: `node --test src/features/orders/utils/ordersPageComposition.test.js` reported 36 passing and 0 failing tests.

## Verification

- `npm run lint`: passed.
- `npm run build`: passed. Vite emitted its existing chunk-size warning only.
- `git diff --check`: passed.

## Self-review

- No dependencies or shared component were added.
- No `.stitch/` file or existing sidebar code was changed.
- Query builders emit only recognized backend channel codes; `all` never emits `salesChannelCode=ALL`.

## Commit

`feat(filters): add sales channel queue filters`

## Review follow-up

- RED: `node --test src/features/scale/utils/scaleApi.test.js` reported 15 passing and 1 failing test because explicit `channel: 'all'` fell back to the stale legacy `salesChannelCode`.
- Fixed `buildProductionTaskQuery` so legacy `salesChannelCode` is used only when `channel` is absent; explicit `all` now omits it for both task and summary queries.
- GREEN: focused Scale suite reported 16 passing and 0 failing tests. The required combined suite reported 102 passing and 0 failing tests; lint and build passed (with the existing Vite chunk-size warning).

## State-sync follow-up

- RED: the three source-level router synchronization regressions reported 71 passing and 3 failing tests. The failures showed Scale/QC effects depended on local `channel`, and Orders had no `location.search` filter synchronization effect.
- Fixed Scale and QC to synchronize from parsed `location.search` only. Orders now refreshes filters from `readOrdersFilters(location.search)` when React Router search changes while mounted.
- Removed unused `SCALE_SUB_TABS` and `QC_PLATFORM_TABS` exports after confirming no callers remain.
- GREEN: the three composition suites reported 74 passing and 0 failing tests. The complete focused suite reported 138 passing and 0 failing tests; lint and build passed (with the existing Vite chunk-size warning).
