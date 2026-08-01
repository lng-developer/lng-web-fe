# Create Design Task

## Goal

Add a usable frontend flow for creating every backend-supported Design task type while preserving the existing bulk PSD creation workflow.

## User interface

The Design workbench header has two separate actions:

- `Create design task` opens one dynamic modal for a single task.
- `Create PSD tasks` keeps the existing candidate-based bulk workflow.

The single-task modal starts with target Listing and task type. It shows only fields relevant to the selected type:

| Task type      | Required fields                                                        | Optional fields                                          |
| -------------- | ---------------------------------------------------------------------- | -------------------------------------------------------- |
| `PSD_TEMPLATE` | Target Listing                                                         | Priority, brief, note, reference files, expected outputs |
| `MOCKUP`       | Target Listing                                                         | Priority, brief, note, reference files, expected outputs |
| `PNG_ASSET`    | Target Listing                                                         | Priority, brief, note, reference files, expected outputs |
| `IDEA`         | Target Listing, brief                                                  | Priority, note, reference files, expected outputs        |
| `CLONE`        | Target Listing, exactly one source Listing or source Internal Template | Priority, brief, note, reference files, expected outputs |

The source selector for `CLONE` uses one source mode at a time so contradictory source IDs cannot be submitted. Expected outputs are selected from the backend-supported output types.

## Data flow

1. Load writable Catalog Listings and Internal Templates through existing shared API clients.
2. The user selects the task type and completes the dynamic form.
3. Upload reference files through the existing Design asset endpoint.
4. If every upload succeeds, call `POST /api/design/tasks` with the resulting `referenceAssetIds`.
5. On success, close and reset the modal, then invalidate Design list, detail, summary, workload, candidate, and submission queries.
6. On failure, keep the form values and show the API error so the user can correct or retry.

No asset IDs are entered manually. The frontend does not send hidden or stale type-specific fields after the task type changes.

## Contract and authorization

The request uses the shared API client and backend-supported fields only:

- `listingId`
- `taskType`
- `priority`
- `brief`
- `note`
- `referenceAssetIds`
- `expectedOutputs`
- `sourceListingId`
- `sourceInternalTemplateId`

The action is visible only with `DESIGN:WRITE`. Frontend checks improve usability, but backend Joi validation, Shop scope, and RBAC remain authoritative. User content is rendered as text, not HTML.

## Error and loading states

- Disable submit while files or task creation are pending.
- Require a non-empty brief for `IDEA`.
- Require one source for `CLONE` and prevent both source types from being sent.
- Do not call task creation if any reference upload fails.
- Preserve form state after upload or create failure.
- Display the existing feedback toast without exposing stack traces or secrets.

## Testing

- API unit test verifies `POST /api/design/tasks` payload.
- Component tests verify modal isolation and conditional fields.
- Component tests verify `IDEA` cannot submit without a brief.
- Component tests verify `CLONE` cannot submit without a source.
- Component test verifies uploaded asset IDs are included before task creation.
- Existing Design workbench regression tests remain green.

## Out of scope

- A multi-step wizard.
- Separate modal implementations per task type.
- New backend endpoints or dependencies.
- Editing an existing Design task.
- Changing the Design lifecycle, scoring, or approval behavior.
