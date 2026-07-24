# Task 3 report: Internal Templates page extraction

## Scope

- Added `src/features/listings/pages/InternalTemplatesPage.jsx`.
- Removed Internal Templates state, queries, detail fetch, mutations, table, pagination, and dialog wiring from `ListingPage.jsx`.
- Kept the existing workspace selector behavior: `?view=internal-templates` now returns the dedicated page; product types and listing management remain in their existing branches.

## Behavior retained

- Search, status, product-type filtering, page state, refresh, and pagination still use `useCatalogInternalTemplatesQuery`.
- Product-type options still use `useListingProductTypesQuery`.
- Create, edit, toggle-status, validation, snackbar handling, and `InternalTemplateDialog` remain intact.
- Edit continues to load the direct detail through the shared `apiClient` and existing `ENDPOINTS.CATALOG.INTERNAL_TEMPLATE`, then applies `unwrapApiData` and `mapInternalTemplateResponse`. No duplicate endpoint implementation was introduced.
- The original dense table and controls were transferred to the dedicated page.

## TDD evidence

1. Updated `listingPageComposition.test.js` to require `InternalTemplatesPage.jsx` and forbid legacy ownership strings in `ListingPage.jsx`.
2. Red: `node --test src/features/listings/pages/listingPageComposition.test.js` failed because the dedicated page did not exist.
3. Green: the same command passed with 12/12 tests after the extraction.

## Verification

- `node --test src/features/listings/pages/listingPageComposition.test.js` — 12 passed, 0 failed.
- `npx eslint src/features/listings/pages/ListingPage.jsx src/features/listings/pages/InternalTemplatesPage.jsx` — passed.
- `npm run lint` — passed.
- `npm run build` — passed; Vite emitted the repository's existing chunk-size warning for the 671 kB main chunk.
- `git diff --check` — passed.

## Concerns

- No authenticated browser session was available for manual interaction verification. The extracted UI keeps the prior markup and handlers, and build/lint/composition checks pass.
- An unrelated untracked `docs/superpowers/plans/2026-07-24-catalog-pages-refactor.md` was present before Task 3 staging and is intentionally excluded from the commit.

## P2 formatting follow-up

- Ran Prettier write on all Task 3 source/test files, expanding the extracted page's compressed JSX and handlers into the repository's normal readable style.
- `npx prettier --check src/features/listings/pages/InternalTemplatesPage.jsx src/features/listings/pages/ListingPage.jsx src/features/listings/pages/listingPageComposition.test.js` — passed.
- Re-ran the composition test (12/12), targeted ESLint, and `git diff --check` — passed.
