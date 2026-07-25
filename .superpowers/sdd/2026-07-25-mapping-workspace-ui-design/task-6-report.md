# Task 6 Report — Rule Evaluation API Integration

## Status

Complete. The Mapping rule workflow now uses the shared API client and centralized
endpoint constants for rule preview, conflict evaluation, and history. The Task 5
`MappingRuleDialog` is wired into the rule inventory for every evaluator-supported
rule type; vendor routing keeps its existing editor because the backend evaluation
schema does not support that rule type.

## Backend contracts verified

Verified against the backend mapping routes, validator, and public port:

- `POST /api/mapping/rule-preview`
- `POST /api/mapping/rule-conflicts`
- `GET /api/mapping/:ruleType/:id/history`
- Preview and conflict requests accept `{ ruleType, rule, samples? }`.
- Evaluator-supported types are `skuNormalize`, `skuConfig`, `semanticRules`, and
  `valueAliases`.
- History returns newest-first `{ items }` audit entries containing event, actor,
  before/after snapshots, and timestamp.

## Implementation

- Added centralized rule-preview, rule-conflict, and rule-history endpoint constants.
- Added `mappingKeys.ruleHistory(type, id)` and a history query hook.
- Added preview and conflict mutation hooks using the shared API client.
- Extended save/status invalidation to refresh both the active rule family and the
  exact rule-history key when an id is available.
- Replaced the unused evaluator-rule legacy dialog path with Task 5
  `MappingRuleDialog`, wired to `mutateAsync` callbacks for preview, conflict checks,
  and save.
- Added a localized rule-history dialog with loading, error, empty, event, timestamp,
  actor, and readable before/after states.
- Added safe history mapping that omits raw account and entity identifiers from
  rendered changes.
- Added focused contract, hook-wiring, invalidation, and history-mapper tests.

## Verification

- Focused mutation/mapper tests: 14/14 passed.
- Full mapping test suite: 43/43 passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- Locale JSON parsing: passed for English and Vietnamese.
- `git diff --check`: passed; only the repository's existing LF-to-CRLF notices were
  printed.
- Browser smoke test on isolated ports `4174` (FE) and `3001` (BE):
  - Login and `/portal/mapping` navigation passed.
  - Value Alias inventory loaded and exposed the new history actions.
  - History dialog rendered its loading and error states correctly.
  - The backend returned `Forbidden` for the demo manager's history request, so the
    create/preview/save/status/history write flow could not be executed with that
    account.
  - Only the isolated Task 6 processes were stopped afterward. Existing user servers
    on ports `5173` and `3000` were not restarted or stopped.

## Notes and concerns

- This repository does not configure Vitest; its existing mapping tests use the
  dependency-free Node test runner, so Task 6 follows that convention and adds no
  dependency.
- The supplied demo manager can read the rule inventory but receives `Forbidden` for
  rule history. A write-authorized account is still required for the complete manual
  mutation flow.
- The unrelated pre-existing `package-lock.json` modification was intentionally not
  staged or committed.

## Fix round 1/5

### Reviewer findings (verbatim)

> 1) Manual acceptance / authorization: scoped managers can see global mapping rules but GET history returns Forbidden for them because backend global history checks global MAPPING:READ. Diagnose the least invasive root-cause fix across FE/BE that preserves permission/security policy and Public Port; history must be available for every rule the user is permitted to see/edit, or UI must correctly avoid unreachable action only if that is the validated intended policy. The plan requires browser flow; use safe existing server only.
>
> 2) Save/status UX: required loading/success/error UX. Add clear loading indicators and explicit user-facing success/error feedback for save and status toggle; do not just disable controls/close.
>
> 3) API hook tests: replace source-string assertions with runnable behavior tests that exercise the API call and onSuccess invalidation, using existing node:test patterns/no new dependency. If hooks are inherently untestable without React runtime, extract minimal tested request/invalidation helper used by hook; test actual implementation rather than text.

### Root cause and authorization fix

Mapping list repositories intentionally include global rules alongside the shops that
a scoped reader can access. `assertRuleReadAccess`, however, treated a global rule as
readable only with a global permission. That made history and evaluation stricter than
the list that exposed the same rule.

The backend service now allows global-rule reads when the authenticated context has
either global or shop-scoped `MAPPING:READ`. Shop-owned rules still require access to
that exact shop through the Auth Public Port, and global-rule writes remain restricted
to global `MAPPING:WRITE`. A focused Jest regression test proves that a scoped reader
can load the history of a visible global rule while the existing cross-shop denial
test remains green.

### Save and status feedback

- Save buttons now show an inline progress spinner and a localized saving label.
- Status toggles show a spinner on the row being updated.
- Successful creates, updates, and status changes show localized success toasts.
- Failed saves and status changes show localized error toasts; dialog-level errors
  remain visible for correction.
- The implementation reuses the installed Notistack provider and existing snackbar
  variants; no dependency was added.

### Runnable API behavior tests

The source-string assertions were replaced by dependency-injected request and
invalidation helpers that are used by the React Query hooks themselves. Node tests now
execute the preview, conflict, history, vendor-candidate, and vendor-reorder requests,
assert method/path/body and response unwrapping, and exercise the exact rule-family plus
history invalidation performed by mutation `onSuccess`.

### Fix-round verification

- Backend mapping service, route, and authentication suites: 60/60 passed.
- Backend changed service syntax check: passed.
- Frontend mapping suite: 44/44 passed.
- Frontend `npm run lint`: passed.
- Frontend `npm run build`: passed with the existing large-chunk advisory only.
- Frontend and backend `git diff --check`: passed with only repository LF-to-CRLF
  notices.
- Existing servers on ports `5173` and `3000` were inspected read-only and left
  untouched. The FE server does not serve this worktree's Task 6 code, so browser
  acceptance of the fix would require restarting or replacing a user-owned server,
  which this review round explicitly prohibited. No server was restarted.
- The unrelated pre-existing `package-lock.json` modification remains unstaged and
  uncommitted.

## Fix round 2/5

### Transaction, conflict, scoped-authoring, and audit fixes

- The documented local Docker MongoDB runs without a replica set, so the mapping
  transaction wrapper now retries the same unit of work without a session only for
  MongoDB's explicit transaction-not-supported (`code: 20`) error. Transaction-capable
  deployments retain the original atomic `withTransaction` path; unrelated failures
  still propagate.
- All four rule updates now read the current entity inside the transaction/session and
  classify audit events from the persisted before/after snapshots. A full-form update
  that changes only `status` records `STATUS_CHANGED`; vendor-routing reorder remains
  unchanged.
- Conflict evaluation accepts an optional `ruleId` and excludes that same rule. SKU
  normalize conflicts now compare the production matching keys (pattern type, segment
  index, and candidate value) rather than the display-only `segmentRole`.
- Evaluator-backed authoring forms now use the existing shop selector for all four
  evaluator rule types and submit the selected shop on create. On edit, the shared
  save helper omits immutable `shopId`, preserving backend global-write controls and
  avoiding an invalid immutable-field patch.

### Runnable regression coverage

- Backend service tests cover standalone-Mongo fallback, non-transaction errors not
  falling back, self-conflict exclusion, production SKU conflict semantics, and
  full-form status-only audit classification.
- Frontend Node tests cover shop-scoped evaluator payloads, edit conflict `ruleId`,
  and immutable-shop omission on update.

### Fix-round verification

- Backend mapping service suite: 45/45 passed.
- Focused frontend mapping contract tests: 8/8 passed.
- Frontend and backend `git diff --check`: passed; only existing LF-to-CRLF notices
  were printed.
- The unrelated pre-existing `package-lock.json` modification remains unstaged and
  uncommitted.

## Fix round 3/5

### Mapping-owned authorable scope resolution

- Added `GET /api/mapping/authorable-shops`, guarded by `MAPPING:WRITE`, as the
  Mapping-owned read contract for evaluator authoring scopes. The Mapping service
  resolves active shop scopes through the Auth Public Port, which in turn enriches
  those scopes from the authentic Shop resource.
- A caller with global `MAPPING:WRITE` receives all active registered shops plus
  `canCreateGlobal: true`. A scoped caller receives only the exact shop scopes for
  which they hold scoped `MAPPING:WRITE`, with `canCreateGlobal: false`.
- The endpoint does not require Listings, Shops, or Finance permissions. Existing
  backend global-write authorization remains unchanged; no scoped permission can
  create or move a rule into the global scope.
- The frontend rule inventory now uses the Mapping contract instead of the Listings
  shop query. All four evaluator forms share the returned shop options, and only
  callers authorized for global creation see the optional `Global` choice.
- Shop is optional during creation so an authorized global writer can select
  `Global`. During edits, the shop field is disabled and the existing save helper
  continues to omit `shopId`, enforcing scope immutability in both UI and transport.

### Regression coverage

- Backend tests cover the endpoint permission middleware and response contract,
  exact scoped-shop filtering, deduplication, and pagination across all registered
  shops for a global writer.
- Frontend tests cover the Mapping endpoint request, conditional `Global` option,
  shop-only options for scoped writers, optional scope on all four evaluator forms,
  and edit-time scope locking.

### Fix-round verification

- Backend focused Mapping route/service/architecture suites: 87/87 passed.
- Backend Auth suites: 115 passed, 12 skipped (24 suites passed, 1 skipped).
- Frontend Mapping tests: 49/49 passed.
- Frontend `npm run lint`: passed.
- Frontend `npm run build`: passed with only the existing large-chunk advisory.
- Production backend files passed `node -c`; frontend and backend
  `git diff --check` passed with only line-ending notices.
- A broader backend Mapping directory sweep passed 149/151 tests. The two failures
  are pre-existing expectations in `fulfillmentPlan.service.test.js` for
  `designPublic.createPsdTemplateTaskFromListing`; neither the failing service nor
  that integration was changed in this fix.
- No dependencies were added. The unrelated pre-existing frontend
  `package-lock.json` modification remains unstaged and uncommitted.

## Fix round 4/5

### Scoped authoring select composition

- Fixed the shared evaluator form renderer so a shop selector never invents the
  generic empty `All / not set` option. Shop options now come exclusively from the
  Mapping authorable-shops contract.
- When the contract returns scoped shops without Global, create mode marks Shop
  required, defaults the form to the first permitted shop, and applies the same
  requirement in the Zod submission schema.
- When the contract explicitly includes Global, the empty value remains available
  under the explicit `Global` label and Shop remains optional.
- Edit behavior remains unchanged: the existing rule scope stays selected, disabled,
  and omitted from the update body.

### Regression and verification

- Added a runnable composition regression covering Mapping payload mapping, rendered
  select configuration, scoped default selection, scoped validation, and explicit
  Global behavior.
- Frontend Mapping tests: 50/50 passed.
- Frontend production build: passed with only the existing large-chunk advisory.
- The first lint pass found only import ordering in the new test; the import was
  corrected before the final verification.
- No backend files or dependencies changed. The unrelated pre-existing
  `package-lock.json` modification remains unstaged and uncommitted.
