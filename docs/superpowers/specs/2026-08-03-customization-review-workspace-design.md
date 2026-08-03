# Customization Review Workspace Design

**Date:** 2026-08-03
**Status:** Approved
**Target branch:** `refactor/fe-foundation`

## 1. Purpose

Add a Portal operations workspace for finding and resolving buyer customization payloads that block mapping or production. The workspace is an exception queue, not a general CRUD registry.

The page lives at `/portal/customizations` under Portal Operations. It complements the customization summary already shown inside Order Workbench; it does not duplicate full order management.

## 2. Users and Permissions

- Operators with readable Shop access use the workspace to inspect customization issues.
- Operators with writable Shop access retry processing or confirm manual review outcomes.
- `ORDERS:READ` grants list and detail access globally or for the exact Shop.
- `ORDERS:WRITE` grants actions globally or for the exact Shop.
- Backend scope filtering is authoritative. Frontend permission checks only hide or disable unavailable actions.

## 3. Default Queue Semantics

The default queue contains payloads with actionable states:

- `PENDING`
- `NEEDS_REVIEW`
- `FAILED`

`PARSED` payloads are excluded by default and become visible only when the operator explicitly includes completed history. Transitional model values such as `DOWNLOADING`, `DOWNLOADED`, and `EXTRACTING` may be displayed when present, but the UI must not imply that the backend enforces a sequential state machine.

One row represents the newest customization payload for one OrderItem. Older payload versions are not separate queue rows.

## 4. Information Architecture

### 4.1 Route and Navigation

- Route: `/portal/customizations`
- Navigation group: Portal Operations
- Navigation label: `Customization review` / `Duyệt tùy chỉnh`
- Route boundary: effective `ORDERS:READ`, with Shop scope enforced by backend list results.

### 4.2 Page Header and Summary

The header identifies the page as an operational review queue. Four compact metrics appear above the table:

- Needs review
- Failed
- Pending
- Oldest blocked item age

Summary counts follow the same readable Shop scope as the list. A summary failure must not prevent the queue from loading.

### 4.3 Filters

The toolbar reuses shared `SearchInput`, `FilterBar`, and `DateRangePicker` components.

Filters:

- Search by marketplace order number, SKU, customer name, or customer email.
- Shop.
- Payload status.
- Source or marketplace.
- Error code.
- Created date range.
- `Blocked only` toggle, enabled by default.

Search is debounced by 200 ms. Any filter change resets pagination to page 1. Empty filter values are omitted from API requests.

### 4.4 Queue Table

Columns:

1. Order: marketplace order number and shop name.
2. Customer and item: customer name, SKU, and product title when available.
3. Customization summary: compact text/options preview without raw payload data.
4. Assets: image/file count and processing health.
5. Status: semantic status tag.
6. Issue: human-readable error reason.
7. Waiting time: relative age derived from `createdAt` or the latest attempt timestamp.
8. Actions: one contextual primary action and an order navigation action.

MongoDB ObjectIDs, hashes, raw payloads, signed URLs, local paths, and provider storage identifiers must never be rendered.

Selecting a row opens the review modal. Action buttons stop row-click propagation.

## 5. Review Modal

The centered modal uses a wide desktop layout and presents all decision-making information without nested drawers or expanded table rows.

### 5.1 Customer Inputs

- Text inputs with business labels.
- Options such as size, color, material, or style.
- Customer-provided image references.
- A clear empty state when no usable input was parsed.

### 5.2 Assets

- Authenticated previews for extracted Media images.
- Original asset type and current processing status.
- Download result and MIME classification.
- ZIP inspection summary: file count, warnings, and errors.
- Extracted and failed image counts.

The modal may expose safe download actions through authenticated Media URLs. It must not expose raw source URLs or storage paths.

### 5.3 Diagnostics

- Human-readable issue title.
- Error code as secondary technical context.
- Error message sanitized by backend.
- Latest attempt time.
- Review actor and review time when present.
- Retry result or partial asset failures.

Error codes are mapped through i18n. Unknown codes fall back to the safe backend message.

## 6. Actions and State Rules

### 6.1 Retry Processing

The frontend calls one backend orchestration endpoint. The backend examines the latest payload and decides the next safe operation, such as parse, asset download, ZIP inspection, or image extraction.

The frontend must not chain technical processing endpoints itself.

Retry behavior:

- Requires `ORDERS:WRITE` for the exact Shop.
- Disables the action while pending.
- Is safe against accidental duplicate clicks.
- Invalidates queue, summary, and detail queries on success.
- Keeps the modal and its current information open on failure.

### 6.2 Manual Review Outcome

For `NEEDS_REVIEW`, an operator may:

- Confirm the normalized result as ready when the existing parsed data is sufficient.
- Mark processing as failed with a required reason when the payload cannot be safely resolved.

The backend records `reviewedBy` and `reviewedAt`. The first version does not include a free-form editor for raw customization or arbitrary parsed JSON.

### 6.3 Order Navigation

Every row and modal provides `Open order`. Navigation targets Order Workbench with enough query state to locate the exact OrderItem without exposing an ObjectID in visible UI copy.

## 7. Backend Contract Changes

Existing customization module boundaries remain unchanged. Customization owns normalized data, asset references, errors, review state, and readiness; it does not own orders, vendor mapping, production tasks, or binary storage.

### 7.1 Queue Endpoint

Extend `GET /api/customizations` with operational query fields:

```text
q, shopId, status, source, errorCode, blockedOnly,
dateFrom, dateTo, page, limit
```

The list DTO adds safe operational context:

- Marketplace order number.
- Shop name.
- Customer name and email.
- SKU and product title.
- Compact customer-input summary.
- Asset, extracted-image, and failed-image counts.
- Current issue and timestamps.

The DTO excludes raw customization, hashes, unredacted URLs, local paths, owner IDs, Media provider IDs, and internal MongoDB IDs except opaque identifiers required for API actions.

### 7.2 Summary Endpoint

Add `GET /api/customizations/summary` using the same readable Shop scope and optional Shop/date filters. It returns counts for actionable statuses and the oldest blocked timestamp.

### 7.3 Retry Endpoint

Add:

```text
POST /api/customizations/:payloadId/retry
```

The service reloads the latest payload, validates Shop write scope, chooses the next safe processing step, and returns the updated safe DTO. It must reuse existing parser, download, inspection, extraction, and Media public ports rather than duplicate their logic.

### 7.4 Review Endpoints

Reuse the existing `parsed`, `needs-review`, and `failed` service behavior where valid. Controller contracts may be tightened so manual outcomes consistently record reviewer identity and time. No delete endpoint is added.

## 8. Frontend Architecture

Feature location:

```text
src/features/portal/customization/
  api/
  pages/
  components/
  model/
```

Responsibilities:

- Feature API: list, summary, detail, retry, and review calls.
- Query keys: queue filters, summary filters, and payload detail.
- Page: filter state, pagination, table, and selected payload.
- Review modal: information layout and mutation actions.
- Presentation model: status tone, error labels, input summary, asset counts, and waiting-time formatting.

Reuse existing shared components and dependencies. Do not add a new table, form, upload, date, icon, state, or animation dependency.

The route and review modal are dynamically imported. Small shared controls remain static imports.

## 9. Loading, Empty, and Error States

- Initial page load uses table and metric skeletons.
- Filtering keeps the previous table visible while the next query loads where TanStack Query supports it.
- Empty actionable queue: positive message indicating no customization currently blocks fulfillment.
- Empty filtered result: neutral message with a clear-filter action.
- Page load failure: persistent inline product error with retry.
- Mutation success or failure: shared product toast.
- Validation errors: displayed beside the relevant reason or review field.
- Modal action failure never clears loaded payload data or operator input.

## 10. Internationalization

All visible strings are added to EN and VI locale files, including:

- Navigation and page labels.
- Status labels.
- Error-code descriptions.
- Filters and columns.
- Empty/loading/error states.
- Retry and review feedback.

Backend error messages are fallbacks, not primary user-facing copy for known error codes.

## 11. Explicit Non-Goals

- Creating customization payloads manually.
- Editing raw marketplace payloads.
- Editing arbitrary parsed JSON.
- Deleting payloads or Media assets.
- Building a new workflow engine or transition matrix.
- Bulk retry or bulk review in the first version.
- Replacing customization information in Order Workbench.
- Cross-module repository imports.
- Persisting a duplicate queue or exception collection.

## 12. Testing and Acceptance Criteria

### Backend

- List filtering and pagination are deterministic.
- Shop-scoped readers only receive readable payloads.
- Summary respects the same Shop scope as the queue.
- Retry selects the correct next safe operation for representative payload states.
- Duplicate retry requests do not corrupt state or create duplicate Media records.
- DTOs exclude raw and storage-sensitive fields.
- Manual review records reviewer and timestamp.
- Existing customization and architecture suites remain green.

### Frontend

- Default queue requests only actionable payloads.
- Filters reset pagination and omit empty values.
- Scoped permissions hide or disable unauthorized actions.
- Rows and modal show business identifiers, never ObjectIDs.
- Retry success refreshes summary, list, and detail.
- Retry failure retains modal state.
- `Open order` targets the correct OrderItem context.
- Loading, positive-empty, filtered-empty, and error states render correctly.
- EN and VI labels are available.
- Focused tests, typecheck, lint, and production build pass.

## 13. Delivery Boundary

Implementation is complete when the workspace, safe backend read models, retry orchestration, review actions, route, navigation, i18n, and focused tests are merged into `refactor/fe-foundation` and the temporary worktree is removed after post-merge verification.

The implementation should produce one clean FE module commit and, only when backend contract changes are required, one clean BE module commit.
