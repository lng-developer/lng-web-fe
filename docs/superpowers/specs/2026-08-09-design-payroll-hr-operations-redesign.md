# Design, Payroll, and HR Operations Redesign

**Date:** 2026-08-09

**Repositories:** `C:\Users\stack\Task\lng-web-fe`, `C:\Users\stack\Task\lng-web-be`

## Goal

Redesign the design-file submission and HR workflows around the real backend contracts, remove hard-coded payroll rules, expose complete payslips, and add scoped employee analytics without replacing existing upload, authorization, or server-state patterns.

## Delivery Strategy

Deliver three independently testable phases:

1. Design submission, employee avatars, and PSD file list cleanup.
2. Persisted payroll settings, bulk adjustments, and employee payslips.
3. HR analytics, announcements, and request details.

Each phase must preserve unrelated staged work in the frontend repository. Frontend changes use the existing shared API client, TanStack Query, Ant Design, Recharts, shared media helpers, shared UI components, and i18n catalogs. Backend changes remain inside the existing design, HR, media, and organization module boundaries.

## Phase 1: Design Submission and PSD Files

### Submit Design Files Modal

The modal header shows the listing SKU, task type, task status, and assigned designer. The assigned designer uses the real employee avatar and falls back to initials only when no avatar exists or authenticated media loading fails.

For `PSD_TEMPLATE` tasks, the body contains two explicit upload areas:

- A required `.psd` or `.zip` design package, limited to 2 GB.
- An optional PNG, JPEG, or WebP preview image.

Each selected file shows its filename and size with replace and remove controls. The existing multipart upload, progress reporting, cancellation, and submit mutation remain authoritative. Other task types retain the existing multi-file drag-and-drop upload. The note is a separate optional field. The fixed footer contains Cancel and Submit, and Submit remains disabled until required files are present.

### Avatar Contract

The HR public profile contract exposes an authenticated avatar URL derived from `avatarAssetId`, while preserving the legacy `avatarUrl` fallback. Design assignee and task DTOs forward this URL. No signed vendor URL is persisted or exposed as a stored frontend field.

The frontend extends its design assignee and assigned-designer types with `avatarUrl`. It reuses the authenticated media helper in the assignee selector, task rows, PSD file designer cells, and the task detail drawer.

### PSD File List

The listing column displays only SKU/code and no listing title. The search placeholder becomes “Search file or SKU”. The backend may continue matching title to preserve compatibility with existing consumers.

## Phase 2: Payroll

### Persisted Payroll Settings

Create a singleton MongoDB payroll-settings record with a stable key, `version`, update actor, and timestamps. Seed or fall back to the existing defaults when no record exists.

- `GET /api/hr/payroll-settings` requires `HR_PAYROLL:READ` and returns the active record.
- `PUT /api/hr/payroll-settings` requires `HR_PAYROLL:WRITE`, requires `expectedVersion`, validates the complete replacement payload, and returns conflict when the version is stale.

The settings contain:

- Company name, logo URL, address, tax code, payroll email, payroll phone, and currency.
- Formula version, work hours per day, unit/rate scales, and probation rate.
- OT basis-point rates for weekday, weekend, holiday, and their night variants.
- Social, health, and unemployment insurance rates plus the insurance cap.
- Personal and dependant deductions and progressive PIT brackets.
- Paid leave types and adjustment types/codes.

The API stores integer money and basis-point values. The frontend displays readable currency and percentages and converts them only at the adapter boundary. Validation rejects invalid numeric ranges, unordered PIT thresholds, duplicate or empty enums, and incomplete required company identity.

Payroll validators must resolve the active adjustment enums per request instead of capturing them at process startup. A settings update affects new calculations immediately without restarting the server.

### Calculation and Historical Integrity

Every shadow or persisted payroll run loads one active settings value and passes it explicitly through the calculation. The exact calculation settings are stored in the immutable payroll input snapshot. New or rerun DRAFT/SHADOW calculations use the latest settings. FINALIZED and PAID runs and results are never recalculated.

Historical payslips display rates from their saved snapshot. Legacy results without a settings snapshot show the persisted money amounts but omit rate labels instead of applying current settings retroactively.

### Payroll Administration UI

The payroll page exposes a settings editor to users with `HR_PAYROLL:WRITE`; read-only users see the active settings without edit controls. The editor groups company identity, working time, overtime, insurance, tax, leave, and adjustment configuration. Save uses optimistic concurrency and refreshes the payroll-settings query.

The adjustment modal supports one employee or multiple employees. Bulk mode selects searchable employees with real avatars and sends one request to the existing `/api/hr/payroll-adjustments/bulk` endpoint. The shared adjustment fields are type, code, name, amount, note, month, and year. The UI shows the selected count and any employee-level failures returned by the server.

### Employee Payslip

`/hr/me/payroll` renders one printable payslip-style document for the selected month. It contains:

- Company identity from the saved payroll settings snapshot.
- Employee avatar, name, code, title, department, team, employment type, and start date.
- Payroll period, workdays, status, finalized date, and paid date.
- Salary earned from work, allowance breakdown, OT breakdown, and earning adjustments.
- Social, health, and unemployment insurance, PIT, and deduction adjustments.
- Gross income, total deductions, and net income.

The self-service contract may enrich the result with current non-sensitive employment display data. It must not expose identity documents, personal address, bank details, or insurance identifiers. All labels are localized in Vietnamese and English.

## Phase 3: HR Operations

### Scoped Analytics

Extend the HR dashboard contract to accept `rangeDays` limited to `1`, `7`, or `30`, plus a semantic scope of `operations` or `team`. The backend derives permitted department/team scope from the authenticated permission grants; it never trusts an arbitrary team identifier supplied by the frontend.

The response contains:

- Range metadata and employee-status totals.
- Daily attendance series for present, late, absent, on leave, and missing checkout.
- Leave and overtime totals grouped by pending, approved, and rejected/cancelled states.

The Operations overview uses the allowed company/department scope. The Team overview uses the caller’s allowed team scope. Both pages use the same typed adapter and Recharts components for employee composition, attendance trends, and leave/OT workload. A segmented 1/7/30-day control changes the query key and request.

The Operations dashboard no longer renders announcement content or an Add Announcement button. Announcements remain a focused route at `/hr/operations/announcements`.

### Announcements

The announcement route supports list, detail, create, edit, and delete according to backend capabilities. Its editor maps the complete backend contract:

- Title, content, category, priority, status, and pinned state.
- Company-wide or targeted department/employee audience.
- Scheduled publication and reminder times.
- Event start/end, location, and mandatory state when category is `EVENT`.
- Attachments uploaded through the existing media API and persisted as `mediaId`, filename, and MIME type references.

Conditional validation requires an audience for targeted announcements, `scheduledAt` for `SCHEDULED`, and valid event dates. Clicking an announcement opens a detail drawer. Mutating controls are hidden when the returned capabilities do not allow them.

### Request Details

Leave and overtime table rows open a detail drawer. The drawer renders employee avatar and organization context, requested dates/times, request type, reason, attachments, status, decision/rejection/cancellation information, and available actor history from the existing DTO.

Approve, reject, edit, and cancel controls continue to depend only on backend-provided capabilities. The frontend reuses the complete list item as the detail source. A new backend detail endpoint is added only if contract tests prove that a required field is intentionally absent from the list DTO.

## Error Handling

- Settings conflicts keep the form open, refresh the latest version, and tell the user that another editor changed the configuration.
- Upload cancellation aborts active multipart work and leaves no submitted task mutation.
- Bulk adjustment responses retain employee-level success/failure evidence.
- Dashboard and detail failures use existing feedback and retry patterns without replacing already loaded page state.
- Forms render backend validation messages through the shared feedback system.

## Accessibility and Responsive Behavior

All modal and drawer controls have accessible labels, keyboard focus order, visible focus state, and text alternatives for avatars and charts. Charts include textual summaries for values that cannot be inferred by screen readers. Tables remain the fallback operational representation where chart-only presentation would hide exact values. Layouts stack on narrow screens without horizontal action loss.

## Verification

Each phase adds the smallest focused tests that prove its new behavior:

- Design DTO/avatar contract, submit-modal required-file behavior, and absence of listing title in PSD rows.
- Payroll settings validation, optimistic concurrency, runtime calculation changes, immutable historical snapshots, bulk adjustment submission, and complete payslip breakdown.
- Scoped 1/7/30-day analytics, announcement conditional payloads, removal of the dashboard announcement action, and request drawer opening/capability gates.

Run focused frontend tests and backend HR/design tests after each phase. Before completion, run frontend lint/build and the backend focused suites plus architecture contracts. Report unrelated baseline failures separately.

## Explicit Non-Goals

- No new frontend dependency.
- No replacement of multipart/media storage.
- No client-selected unrestricted team scope.
- No recalculation of finalized or paid payroll.
- No sensitive employee identity, bank, address, or insurance identifiers on payslips.
- No separate request-detail API unless the existing DTO is insufficient.
