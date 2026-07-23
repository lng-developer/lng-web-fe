# PSD quality scoring and file library design

**Status:** Approved design, awaiting implementation-plan review
**Date:** 2026-07-23
**Scope:** Portal > Design Workspace only

## Goal

Give the PSD workflow two focused operational pages without turning the shared media module into a general-purpose file manager:

1. **Quality Scoring** audits the score attached to an approved PSD submission.
2. **PSD File Library** finds and downloads files that are referenced by a PSD task.

The existing **Design Tasks** page remains the place to assign work, submit a file, approve or reject a submission, and create the automatic score. These pages do not duplicate that lifecycle.

## Decisions

- Only `PSD_TEMPLATE` tasks are in scope. IDEA, CLONE, MOCKUP, PNG_ASSET, order attachments, and files from other modules are excluded.
- The solution uses the existing React, MUI, TanStack Query, Operations layout primitives, shared API client, and media download endpoint. No dependency is added.
- A score is created automatically after approval. Quality Scoring is an audit and correction workspace, not another approval queue.
- Media is read-only from these pages. There is no direct delete, move, rename, or upload action. File-library date filtering and ordering use the Design-owned **added-to-task** timestamp, not Media-asset creation time; this keeps the read model within the Public Port boundary.
- Opaque identifiers are returned only for actions and navigation. They are never rendered as user-facing table values.

## Navigation and access

Under **Design Workspace**, show these items in order:

1. Design Tasks
2. Quality Scoring
3. PSD File Library

Routes:

- `/portal/design/tasks`
- `/portal/design/quality-scoring`
- `/portal/design/psd-files`

Both new routes and navigation items use the same read gate as Design Tasks:

`DESIGN:READ`, `DESIGN:WRITE`, `DESIGN:WORK`, `DESIGN:REVIEW`, or `DESIGN_TASKS:READ`.

Listing and detail access are read-only. Score override and void reuse the current backend review gate, which permits `DESIGN:REVIEW` or `DESIGN:WRITE`. Download uses the existing media read authorization.

## Quality Scoring

### Intent

One row represents one scored PSD submission. The default view is active scores. Voided scores stay available through the score-status filter for auditability.

### Page structure

- Operations header: **Quality Scoring** with a concise audit-focused subtitle.
- Single-row Operations toolbar, wrapping only on narrow screens:
  - search by filename, listing title/code, or task reference
  - designer
  - score level
  - score status: Active, Voided, All
  - approved/scored date range
  - refresh
- Dense Operations table:
  - Submission file
  - Listing / task context
  - Designer
  - Version
  - Approved at
  - Points
  - Score level
  - Audit status
  - Actions
- Detail drawer:
  - file metadata and download action
  - submission and approval timestamps
  - automatic base score, final score, score level, and scorer
  - override or void audit details
  - reviewer-only Override score and Void score actions

No MongoDB identifiers, fabricated progress charts, or duplicate approve/reject controls appear here.

## PSD File Library

### Intent

One row represents one PSD-task file relationship, not a generic media record. A single media asset can appear more than once when it has different roles or is linked to different PSD tasks. This preserves a clear task history.

### Page structure

- Operations header: **PSD File Library** with a concise scope subtitle.
- Single-row Operations toolbar:
  - search by filename, listing title/code, or task reference
  - file role: Reference, Submission, Approved
  - designer
  - task status
  - added-to-task date range
  - refresh
- Dense Operations table:
  - File name
  - Role
  - Listing / task context
  - Designer
  - Submission version when applicable
  - Added to Design
  - File size
  - Actions
- Detail drawer:
  - filename, MIME type, size, and added-to-task time
  - linked PSD task, listing, submission version, and role
  - Download action

PSD files do not get a fake in-browser preview. Image assets may be previewed later only if a safe existing asset-preview pattern is already available; this is not part of the initial scope.

## Backend contract additions

The current backend supplies a score aggregate at `GET /api/design/score-summary`, individual score changes, task-level submission history, and single-asset download. It has no paginated score-record list or PSD-scoped file-library list. Add only these two Design read endpoints.

### `GET /api/design/submission-scores`

Returns paginated score records for `PSD_TEMPLATE` submissions only.

Query:

- `search`
- `designerId`
- `scoreLevel`
- `scoreStatus=ACTIVE|VOIDED|ALL`, default `ACTIVE`
- `dateFrom`, `dateTo`
- `page`, `limit`
- `sortBy`, `sortOrder`

Response shape:

```json
{
  "items": [
    {
      "id": "score-id",
      "task": { "id": "task-id", "taskType": "PSD_TEMPLATE", "status": "APPROVED" },
      "listing": { "id": "listing-id", "code": "SKU-001", "title": "Listing title" },
      "submission": {
        "id": "submission-id",
        "version": 2,
        "approvedAt": "2026-07-23T00:00:00.000Z"
      },
      "file": {
        "id": "asset-id",
        "originalFilename": "template.psd",
        "mimeType": "application/octet-stream",
        "size": 1024
      },
      "designer": { "id": "account-id", "name": "Designer name" },
      "score": {
        "basePoints": 3,
        "finalPoints": 3,
        "scoreLevel": "STANDARD",
        "status": "ACTIVE",
        "scoredAt": "2026-07-23T00:00:00.000Z",
        "scorer": { "name": "Reviewer name" },
        "override": null
      }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

The existing override and void endpoints remain unchanged:

- `PATCH /api/design/submission-scores/:scoreId/override`
- `PATCH /api/design/tasks/:taskId/submissions/:submissionId/score/void`

### `GET /api/design/psd-files`

Returns paginated PSD file relationships only. The server enforces the PSD task scope instead of trusting a frontend task-type query.

Query:

- `search`
- `role=REFERENCE|SUBMISSION|APPROVED`
- `designerId`
- `taskStatus`
- `dateFrom`, `dateTo`
- `page`, `limit`
- `sortBy`, `sortOrder`

Response shape:

```json
{
  "items": [
    {
      "rowKey": "asset-task-role-submission",
      "asset": {
        "id": "asset-id",
        "originalFilename": "template.psd",
        "mimeType": "application/octet-stream",
        "size": 1024,
        "createdAt": "2026-07-23T00:00:00.000Z"
      },
      "role": "APPROVED",
      "linkedAt": "2026-07-23T00:00:00.000Z",
      "task": { "id": "task-id", "taskType": "PSD_TEMPLATE", "status": "APPROVED" },
      "listing": { "id": "listing-id", "code": "SKU-001", "title": "Listing title" },
      "designer": { "id": "account-id", "name": "Designer name" },
      "submission": {
        "id": "submission-id",
        "version": 2,
        "submittedAt": "2026-07-23T00:00:00.000Z"
      }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

File download continues to use `GET /api/media/assets/:assetId/download`.

## Error and empty states

- Loading uses the existing Operations table skeleton behavior.
- API failures keep filters visible and show a concise retryable error state.
- Empty Quality Scoring explains that no PSD scores match the active filters.
- Empty PSD File Library explains that no PSD-linked files match the active filters.

## Acceptance criteria

1. The sidebar exposes the two new routes only to users with Design read access.
2. Quality Scoring lists only PSD-template submission scores and supports the agreed filters, pagination, details, override, and void actions.
3. PSD File Library lists only files connected to PSD-template tasks and supports the agreed filters, pagination, details, and download action.
4. No raw MongoDB ID is shown in either page.
5. No generic media library, file mutation, duplicate approval flow, or new UI dependency is introduced.
6. Backend contract tests, focused frontend mapper/query tests, and the narrowest relevant build/lint checks pass before delivery.
