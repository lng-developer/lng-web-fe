# Schedule Workspace Filters Design

## Goal

Make `/hr/schedule` a permission-safe configuration workspace, with complete assignment filters and a holiday list that follows its selected year.

## Scope

- Render only Schedule and Calendar tabs that the current user can read.
- Keep invalid or stale `tab` URL values on the first permitted tab.
- Add Assignment filters for employee, shift, work location, status, and effective-date overlap.
- Change the employee selector from a fixed 100-row list to debounced server search.
- Apply the selected Holiday year to the holiday list by sending `dateFrom` and `dateTo`.
- Add Assignment `effectiveFrom` and `effectiveTo` query params in the backend, matching assignments that overlap the requested range.

## Non-goals

- Do not delete shifts, locations, assignments, or overrides.
- Do not add a new search endpoint; reuse the existing employee profile list query with `q`.
- Do not change attendance, My Time, or API write contracts.

## Data flow

- The Schedule page derives visible tabs from existing permission helpers before rendering `OperationsTabs`.
- Assignment URL state carries `profileId`, `shiftId`, `workLocationId`, `status`, `effectiveFrom`, and `effectiveTo`.
- The backend validates effective-date filters and applies overlap matching: an assignment is returned when it starts on or before the requested end, and ends on or after the requested start (or has no end).
- The Holiday URL year becomes `dateFrom=YYYY-01-01` and `dateTo=YYYY-12-31` in the existing list request.
- Employee search remains debounced by the shared HR list-query hook; no client-side all-employee preload is used for the Assignment filter.

## Verification

- Unit tests cover tab visibility and URL fallback, holiday year query construction, and assignment date-overlap filter construction.
- Backend repository/service tests cover effective-date filtering.
- Run narrow FE tests, targeted ESLint, backend affected tests, and `git diff --check`.
