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
