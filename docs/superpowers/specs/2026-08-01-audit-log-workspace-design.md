# Audit Log Workspace Design

## Scope

- Add a read-only System workspace at `/auth/audit-log` for accounts with `AUDIT:READ`.
- Reuse the backend audit list/detail APIs and existing shared table, filters, date range, status, loading, and feedback components.
- Allow local FE instances on arbitrary `localhost` or `127.0.0.1` ports in non-production environments. Production remains an exact allowlist.

## UX

- Dense table with time, actor, action, entity, scope, outcome, and source.
- Filters for search-relevant backend fields: action, entity type/id, outcome, source, and date range.
- Cursor pagination uses a single “Load more” action.
- Selecting a row opens a centered read-only detail modal with request context, changes, and metadata.
- All visible text supports Vietnamese and English.

## Boundaries

- No audit mutation, export, or speculative analytics.
- Audit remains a System workspace and is hidden without `AUDIT:READ`.
- Notification remains a separate module and branch.
