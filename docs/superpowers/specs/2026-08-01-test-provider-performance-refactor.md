# Test Provider Performance Refactor

## Goal

Reduce the FE UI suite wall time without weakening coverage or changing production behavior.

## Scope

- Add one test-only render helper that creates a fresh QueryClient per render with query retries disabled.
- Keep the default wrapper minimal; add i18n, Ant Design App, and theme only when a tested component requires them.
- Migrate the five slowest areas first: Design Workbench, PSD File Workspace, Access Control, Catalog Listing, and Organization.
- Keep assertions and production API mocks at their current behavioral boundaries.
- Remove deprecated Ant Design Space usage and provider warnings encountered in migrated tests when the fix is local and behavior-preserving.

## Non-goals

- No production component redesign.
- No global Vitest isolation changes.
- No reduced test coverage, skipped tests, or inflated per-test timeouts as performance fixes.
- No migration of all UI tests until the first benchmark proves value.

## Verification

- Record baseline: 58 files, 174 tests, 234.81 seconds.
- Run each migrated file alone and together.
- Run the full UI suite with the same four-worker command.
- Target less than 180 seconds without new warnings or failures.
- Run lint and build after the refactor.
