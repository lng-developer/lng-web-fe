# QC Review Correctness and Performance Design

## Goal

Make the QC Review queue truthful, predictable, and lighter to render without changing its workflow or adding shared abstractions.

## Scope

- Keep the existing filters, status tabs, queue table, expanded details, and QC decision flow.
- Export the current backend-filtered queue, not selected rows.
- Remove row-selection state and checkboxes because the export endpoint accepts filters only.
- Let the backend own row scope and pagination through `qcStatus` and `tab` query parameters.
- Keep detail panels expanded, but mount one image-review dialog for the page instead of one dialog per panel.
- Disable a reject decision after a task has already been rejected.
- Persist all active queue filters in the URL.

## Non-goals

- No new table component, route, dependency, API endpoint, or general-purpose filter framework.
- No redesign of the QC Review screen.
- No selected-row export until the backend exposes an export contract that accepts task IDs.
- No lazy row expansion; operators retain the currently visible expanded task details.

## Decisions

### Export and selection

`buildQcExportQuery(taskFilters)` is the sole export source. The export button text must describe the current filtered queue and must not include a selected-row count. The selection column and `selectedTaskIds` state are removed because they do not affect an API action.

### Row scope and pagination

`buildQcTaskQuery` already maps QC tabs to backend `qcStatus` or `tab` parameters. `QcPage` will display the returned items directly after mapping them with `mapProductionTaskToQcRow`; it will not apply `filterQcRowsByStatusTab` again. This keeps `tasksQuery.data.total`, page controls, and displayed rows under one server-owned contract.

### Image review dialog lifecycle

`QcPage` owns `{ task, open }` preview state and renders one `QcImageReviewDialog`. `QcDetailPanel` receives an `onPreview` callback and no longer imports or renders that dialog. This removes dialog-local effects and state trees from every always-expanded row while retaining the same user interaction.

### Decision eligibility

`canSubmitQcReject` returns false for both `PASSED` and `REJECTED` statuses. All existing detail and image-review actions consume this helper, so no caller-specific guard is needed.

### URL state

One queue-URL helper writes `status`, `channel`, `search`, `sellerCode`, `shopId`, `dateFrom`, `dateTo`, `page`, and `limit`, omitting default or empty values. Local state initializes from that helper. Changing a filter resets page to one; pagination updates only page and limit while retaining active filter parameters.

## Data Flow

```text
URL state -> taskFilters -> buildQcTaskQuery -> /api/production/tasks
                                               -> mapped rows -> OperationsTable

URL state -> taskFilters -> buildQcExportQuery -> export mutation

QcDetailPanel preview action -> QcPage preview state -> one QcImageReviewDialog
```

## Error Handling

- Preserve the existing snackbar for export failures and QC mutation failures.
- Preserve existing loading, empty, and refresh states.
- Do not silently client-filter server rows; a backend scope mismatch remains observable through the queue result and can be corrected at the API contract.

## Testing

- Extend `qcApi.test.js` for reject eligibility and URL/query mapping.
- Update `qcPageComposition.test.js` to protect against reintroducing row selection, client status filtering, or per-row image dialogs.
- Run focused QC tests, then `npm.cmd run lint` and `npm.cmd run build`.

## Scope Review

This is one module-level change: `src/features/qc`. It intentionally reuses the existing operations components and production query/mutation hooks. No backend work is required because the planned query parameters and export filter contract already exist.
