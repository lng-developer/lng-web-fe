# Frontend Test Gate Stabilization Plan

## Goal

Make the UI test gate finish reliably without weakening coverage, then retain the existing four-way CI shard gate.

## Scope

1. Reproduce the process-exit failure with the current UI suite.
2. Identify and fix the shared open handle or test-environment leak.
3. Keep the smallest worker count that is proven stable; do not raise timeouts or skip tests.
4. Verify every existing UI shard exits successfully before relying on it in CI.

## Verification

- Focused regression tests for the affected files.
- `npm run test:unit`.
- `npm run test:ui:ci -- --shard=1/4` through `4/4`, each with a clean process exit.
- `npm run test:ci`.
