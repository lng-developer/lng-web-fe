# Catalog Listing Workbench Design

## Goal

Make effective PSD readiness trustworthy in the backend and provide an operational frontend workbench for managing shop-scoped Listings through setup and QC.

## Scope

### Included

- Correct Catalog list filters, summary counts, and automatic PSD Design Task creation to use effective PSD readiness.
- Preserve the existing Listing, Internal Template, Product Type Group, Media, Design, Order, and Production boundaries.
- Add one Catalog Listing workbench with summary metrics, filters, table, detail drawer, create/edit, approve, and reject flows.
- Enforce backend-provided `CATALOG:READ` and `CATALOG:WRITE` permissions, including exact shop scope.

### Excluded

- Product Type Group management UI.
- Internal Template, required-field, artwork-slot, or design-asset editor.
- Design Task workspace and normal PSD upload/review workflow.
- Direct Listing PSD upload in the frontend; the existing endpoint remains admin/backfill-only.
- New models, dependencies, or a generic Media manager.

## Backend Design

### Effective PSD readiness

The existing `resolvePsdReadiness(listing, template)` logic remains the single source of truth:

1. Active template with `requiresPsd=false` resolves to `NOT_REQUIRED`.
2. Listing direct PSD asset resolves to `PRESENT` with source `LISTING`.
3. Active template PSD asset resolves to `PRESENT` with source `TEMPLATE`.
4. Otherwise readiness resolves to `MISSING`.

Stored `Listing.psdStatus` remains available for backward compatibility and persistence workflows, but operational queue and count behavior must not infer readiness from it alone.

### Listing filters

`GET /api/catalog/listings` accepts an optional `psdReadinessStatus` query with:

```text
MISSING | PRESENT | NOT_REQUIRED
```

When absent, pagination continues through the existing repository query. When present, Catalog resolves effective readiness before applying the filter and paginating the result. The existing `psdStatus` filter remains supported for backward compatibility but the new frontend uses only `psdReadinessStatus`.

The effective filter and `noPsdCount` may load the already shop-filtered Listing set and resolve template readiness in memory for the current Catalog volume. This is an explicit bounded implementation; move it to an aggregation/read model only when measured volume makes it necessary.

### Listing summary

`GET /api/catalog/listings/summary` keeps its current response shape. `noPsdCount` counts only records whose effective readiness is `MISSING`; Listings resolved as `PRESENT` from a template or as `NOT_REQUIRED` are excluded.

Other summary metrics continue to use repository counts and the same shop-scoped filters.

### Automatic PSD Design Task creation

After manual Listing creation, Catalog resolves effective readiness using the associated active Internal Template. It creates or retrieves a PSD Design Task only when readiness is `MISSING`. Design task failure remains best-effort and must not roll back Listing creation.

### Authorization and compatibility

- Listing reads accept global or exact shop-scoped `CATALOG:READ`; `CATALOG:WRITE` also satisfies read.
- Listing mutations accept global or exact shop-scoped `CATALOG:WRITE`.
- Product Type Group and Internal Template mutations retain global `CATALOG:WRITE`. Their read endpoints accept any granted `CATALOG:READ` or `CATALOG:WRITE`, including scoped grants, because scoped Listing editors require global master-data options. These reads remain non-mutating and return the existing DTOs.
- Out-of-scope list and summary requests return scoped empty results; out-of-scope detail and mutation requests return forbidden.
- Existing API envelopes and Listing DTO fields remain unchanged except for the new accepted filter.

### Listing form options

`GET /api/catalog/listing-options` returns one read-only payload for the Listing editor:

```text
shops, productTypeGroups, internalTemplates
```

Shops are active and filtered to exact shop-scoped `CATALOG:READ` / `CATALOG:WRITE` grants; global Catalog readers receive all active Shops. Product Type Groups and Internal Templates are active global master data. Catalog obtains Shop records through a Shop public-port read helper, never through the Shop HTTP API. This avoids requiring `SHOPS:READ` and keeps HTTP modules uncoupled.

## Frontend Design

### Feature boundary

Create `src/features/portal/catalog` with:

- `api/catalogApi.ts` for Catalog contracts and shared API-client calls.
- `api/catalogKeys.ts` for list, summary, detail, and Listing options query keys.
- `pages/CatalogListingWorkbenchPage.tsx` for the operational page.
- `pages/CatalogListingEditorModal.tsx` for create/edit.
- A local SCSS module for workbench layout and responsive behavior.

No general abstraction or new dependency is required. Reuse shared `PageHeader`, `SectionCard`, `FilterBar`, `DataTable`, `StatusTag`, feedback components, TanStack Query, and Ant Design controls.

### Navigation and permissions

Add `/portal/catalog` and show its navigation entry when the account has `CATALOG:READ` or `CATALOG:WRITE`, including scoped permissions. Route access follows the same backend-provided permission model.

Read users can inspect records. Write actions render only when `CATALOG:WRITE` is available for the Listing's shop or globally. The backend remains authoritative and rechecks every mutation.

### Page layout

The workbench contains:

1. Header with description and Refresh.
2. Metrics for Total, No PSD, Draft, Approved, and Rejected.
3. One filter bar with search, Shop, Sales Channel, QC Status, effective PSD Status, and Product Type Group.
4. A dense Listing table.
5. A detail drawer opened by selecting a row.

Table columns:

- Preview.
- SKU and title.
- Shop and sales channel.
- Product Type Group and Internal Template.
- Quantity sold and order count.
- Effective PSD readiness.
- QC status.
- Updated time.

Raw database IDs are never primary visible labels.

### Detail and mutation flows

The detail drawer shows Listing identity, setup data, preview/PSD references, effective PSD source, sales summary, approval/rejection metadata, and updated time.

For authorized write users:

- **Create** opens the Listing editor with Shop, channel, marketplace, SKU, title, Product Type Group, optional Internal Template, preview asset reference, cost, currency, and setup status.
- **Edit** exposes only fields accepted by the current PATCH contract; identity fields remain read-only.
- **Approve** appears only for `DRAFT` and requires confirmation.
- **Reject** appears only for `DRAFT` and requires a non-empty reason.

The workbench does not expose direct PSD upload. Missing PSD directs operations toward the later Design Task workspace without inventing an incomplete upload flow here.

### Query and state behavior

- Filter changes reset pagination to page 1.
- Search executes through the existing backend prefix search contract.
- Successful mutations invalidate list, summary, and selected detail queries.
- Mutation errors retain the current form or drawer state for retry.
- Loading, error, empty, and scoped-empty states use existing shared components.
- Desktop uses a dense table and 720-pixel detail drawer; narrow screens use two-column metrics, horizontal table scrolling, and a full-width drawer.

## Error Handling

- Validation errors display server messages next to the relevant form or through the existing feedback pattern.
- Duplicate Listing identity, inactive references, mismatched template/product group, invalid QC transitions, and forbidden shop scope are not hidden or converted into generic success states.
- Reject cannot submit a whitespace-only reason.
- A failed best-effort PSD Design Task creation is logged by BE while the successfully created Listing remains available.

## Verification

### Backend

- Effective filter excludes template-backed and `NOT_REQUIRED` Listings from `MISSING`.
- Summary `noPsdCount` uses effective readiness under global and scoped access.
- Manual Listing creation does not create a PSD Design Task when template readiness is `PRESENT` or `NOT_REQUIRED`.
- Manual Listing creation still creates a task when readiness is `MISSING`.
- Existing Catalog and architecture tests remain green.

### Frontend

- API tests cover list/summary/detail/options and every mutation endpoint.
- Page tests cover permission-aware navigation and write actions.
- Filter tests verify `psdReadinessStatus` and pagination reset.
- Editor tests cover create/edit field boundaries.
- QC tests cover draft-only approve/reject and mandatory rejection reason.
- Successful mutations refresh list, summary, and detail.
- Run focused Catalog tests, full lint, and production build.

## Delivery

Backend and frontend are separate repositories and receive one implementation commit each after their respective checks pass. The backend safety work is completed before frontend implementation depends on the corrected contract.
