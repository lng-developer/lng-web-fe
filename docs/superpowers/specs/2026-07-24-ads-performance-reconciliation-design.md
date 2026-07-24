# Ads Performance & Reconciliation Design

## Status

Approved for planning from the July 24, 2026 Ads audit and corrected against the live frontend repository.

## Execution Location

- Frontend implementation belongs in the current checkout `C:\lng_system\lng-web\lng-web-fe`, currently on `develop`.
- Backend contract verification and these documents remain in `C:\lng_system\lng-web\lng-web-be`, currently on `develop`.
- Do not create or switch branches or worktrees for this feature.
- `C:\lng_system\lng-web\lng-web-fe-v3\.stitch` is design reference material only; it is not the implementation repository.
- Preserve the existing frontend changes in `src/features/finance/pages/FinancePage.jsx` and `docs/superpowers/plans/2026-07-23-finance-data-imports.md`.

## Problem

V3 stores campaign-level Ads data and exposes report aggregates, but the frontend only shows Ads Spend inside the daily profit report. Operators cannot see Ads effectiveness, seller attribution quality, or the latest Ads import health in one view.

## Goal

Add an Ads view to the existing Reports page that monitors spend and attributed performance, highlights unassigned seller data, and links operators to the existing Finance Data Imports workbench for row evidence, batch errors, and reprocessing.

## Why This Fits the Current Frontend

The frontend already has:

- `ReportsPage` at `/portal/reports`;
- an existing navigation convention for `/portal/reports?report=ads`;
- MUI, Tailwind, TanStack Query, shared operations components, and authenticated `apiClient`;
- Finance Data Imports at `/portal/finance/imports`, including batch detail and reprocess controls;
- Ads channel query support and endpoint constants.

Creating a second Ads route, another import drawer, or a new application foundation would duplicate existing code.

## Route and Authorization

- Route: `/portal/reports?report=ads`
- Performance data requires `REPORTS:READ`.
- Import-health and campaign-evidence panels appear only when the user also has `FINANCE:READ`.
- Reprocessing remains exclusively in Finance Data Imports and continues to require `FINANCE:WRITE`.
- No new sidebar leaf is added; the existing Reports item remains active for `?report=ads`.

## Page Composition

### Shared Filters

The Ads view uses the current Report filters:

- date range;
- shop id;
- sales channel;
- marketplace.

The selected report view and channel stay in the URL. Money is grouped by returned currency and is never summed across currencies.

### Performance KPIs

For each currency, show:

- Spend;
- Attributed Sales;
- Attributed Orders;
- ROAS: `attributedSalesAmount / spendAmount`, unavailable when spend is zero;
- CPC: `spendAmount / clicks`, unavailable when clicks are zero;
- CTR and conversion rate from the backend DTO where available.

Amounts remain integer minor units until display formatting.

### Daily Trend

Use `GET /api/reports/ads/daily`. Display Spend and Attributed Sales over time using the frontend's existing dependency-free SVG chart pattern. Missing days remain gaps rather than fabricated imports.

### Channel and Seller Breakdown

Use:

- `GET /api/reports/ads/channel-performance`;
- `GET /api/reports/ads/by-seller`.

The channel table shows spend, sales, orders, impressions, clicks, CTR, conversion, CPA, and new buyers. The seller table shows the same operational metrics and renders `UNASSIGNED` as a warning with text, not color alone.

### Import Health and Campaign Evidence

When the user has `FINANCE:READ`:

- request the latest `ADS` import batch using the existing Finance Imports query;
- show status, filename, processed/valid/skipped/error counts, and completion time;
- request a bounded page of imported Ads rows for recent campaign evidence;
- link to `/portal/finance/imports` for full data inspection, batch details, import, and reprocess.

The Reports page does not duplicate import dialogs, raw row drawers, batch drawers, or reprocess mutations.

Evidence-backed warning states are:

- `UNASSIGNED_SELLER` for a null or `UNASSIGNED` seller employee code;
- `PARTIAL_IMPORT` for `PARTIAL_FAILED`;
- `FAILED_IMPORT` for `FAILED`;
- `PROCESSING` for `PROCESSING`.

The UI does not claim a persisted `MATCHED` state because none exists in the backend.

## Existing API Contract

| Purpose           | Endpoint                                         | Permission     |
| ----------------- | ------------------------------------------------ | -------------- |
| Channel summary   | `GET /api/reports/ads/channel-performance`       | `REPORTS:READ` |
| Seller summary    | `GET /api/reports/ads/by-seller`                 | `REPORTS:READ` |
| Daily trend       | `GET /api/reports/ads/daily`                     | `REPORTS:READ` |
| Campaign evidence | `GET /api/finance/imported-data/ads`             | `FINANCE:READ` |
| Latest batch      | `GET /api/finance/import-batches?sourceType=ADS` | `FINANCE:READ` |

## Non-Goals

- Campaign creation, editing, pausing, or budget management.
- Direct marketplace Ads API synchronization.
- Seller remapping mutations.
- Order-level Ads allocation.
- A new Ads backend module, endpoint, model, or collection.
- A separate `/portal/finance/ads` route.
- Duplicating Finance Data Imports controls inside Reports.

## Loading and Error Behavior

- Performance panels load independently and expose visible errors.
- A failed panel does not silently render as zero.
- No rows is an empty state, distinct from an import failure.
- Finance-only panels are omitted without `FINANCE:READ`; this is not shown as a request failure.
- `401` follows the shared refresh/login behavior and `403` follows the existing protected-route behavior.

## Backend Follow-Up Gate

Do not extend the backend for this slice. Add backend work only when real usage proves one of these needs:

1. campaign evidence requires server aggregation beyond the existing paginated imported rows;
2. operators need an auditable seller-remapping command;
3. Etsy listing-level identity cannot fit the existing campaign key;
4. reconciliation requires persisted state instead of evidence-derived warnings.

## Testing Strategy

- Node unit tests for currency isolation, ROAS/CPC zero denominators, and quality-state derivation.
- Query composition tests for the two missing Ads report endpoints.
- Reports composition tests for the Ads tab, URL state, conditional Finance panels, shared operations components, and no duplicate reprocess UI.
- Existing sidebar test proves the Reports item remains active for `?report=ads`.
- Browser verification covers desktop, narrow viewport, keyboard focus, loading, empty, error, unassigned seller, mixed currency, and link to Finance Data Imports.
- Backend finance/report route tests remain the contract gate.

## Acceptance Criteria

- `/portal/reports?report=ads` shows live V3 Ads performance by currency.
- Users can inspect daily, channel, and seller performance with shared filters.
- `UNASSIGNED` sellers and failed/partial import health are visible.
- Users with `FINANCE:READ` can inspect recent campaign evidence and continue to Finance Data Imports.
- Users without `FINANCE:READ` still see authorized report performance without leaking Finance data.
- No new dependency, route, sidebar leaf, backend contract, import workflow, or duplicate Ads storage is introduced.
