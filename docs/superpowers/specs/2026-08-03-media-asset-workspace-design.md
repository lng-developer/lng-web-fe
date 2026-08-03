# Media Asset Workspace Design

## Goal

Provide a global operations workspace for authorized staff to find, inspect, upload, preview, and download media assets without exposing MongoDB ObjectIDs or navigating through another business module.

## Scope

- Global access controlled by `MEDIA:READ` and `MEDIA:WRITE`.
- Paginated asset listing with operational filters.
- Authenticated preview and download using the existing shared media helpers.
- Upload through the existing multipart media endpoint.
- Read-only detail modal opened by selecting a row.
- No permanent delete, manual discard, bulk action, or ownership reassignment.

## Backend Contract

Add `GET /api/media/assets`, protected by `MEDIA:READ`.

Query parameters:

- `q`: case-insensitive filename search.
- `mimeGroup`: `IMAGE`, `DOCUMENT`, `ARCHIVE`, or `OTHER`.
- `provider`, `resourceType`, `ownerType`.
- `status`: `ACTIVE` or `DISCARDED`.
- `dateFrom`, `dateTo`.
- `page`, `limit`.

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "internal-only",
        "originalFilename": "design.psd",
        "mimeType": "application/octet-stream",
        "size": 1024,
        "provider": "local",
        "resourceType": "raw",
        "ownerType": "DESIGN_TASK",
        "status": "ACTIVE",
        "downloadUrl": "/api/media/assets/internal-only/download",
        "createdAt": "2026-08-03T00:00:00.000Z"
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 20 }
  }
}
```

The ID remains in the API for actions and row keys but is never rendered as user-facing content. The list query stays inside the Media repository and does not resolve owners through other modules.

## Frontend

Add route `/portal/media` and a permission-aware Portal navigation item.

The page contains:

1. A compact page header with an Upload button when the account has `MEDIA:WRITE`.
2. A shared filter bar with debounced filename search, file group, provider, resource type, owner type, status, and date range.
3. A DataTable with preview/file icon, filename, file type, human-readable size, provider/source, owner type, created date, status, and icon actions.
4. A centered detail modal opened by clicking a row.
5. A centered upload modal using Ant Design Upload with one file, client-side size feedback, progress state, and disabled submit while uploading.

Images use `AuthenticatedMediaImage`. Other files use the existing icon set. Downloads use `downloadMediaAsset`.

## Interaction Rules

- Changing a filter resets pagination to page 1.
- Search input updates immediately and applies after the shared 200 ms debounce.
- Row selection opens details; action buttons stop row propagation.
- Failed list loading remains inline with retry.
- Upload success uses the product success toast and refreshes the current page.
- Upload and download failures use the product error toast with the normalized backend message.
- No UI displays asset, owner, or shop ObjectIDs.

## Testing

- Backend repository/service/controller tests cover filters, pagination, authorization, and DTO shape.
- Frontend API tests cover query serialization and multipart upload.
- Workspace tests cover permissions, filters, row details, preview/download, upload success, and loading/error/empty states.
- Final gates: focused tests, FE typecheck/lint/build, and the relevant BE test suites.

## Non-goals

- Asset editing, replacement, hard deletion, bulk deletion, or storage migration.
- Gallery mode, folder taxonomy, tags, duplicate cleanup, and usage graphs.
- Cross-module owner enrichment or a new dependency.
