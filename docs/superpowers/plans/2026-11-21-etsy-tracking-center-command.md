# Etsy Tracking Center Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Queue Etsy tracking batches from Tracking Center through the authenticated extension command queue.

**Architecture:** Tracking Center owns selection and preview; the integration command API owns validation, persistence and claiming; the extension executes the already-implemented `UPLOAD_TRACKING` rows. Add one shared HTTP contract shape without changing Amazon's submission path.

**Tech Stack:** React/TypeScript, Ant Design, React Query; Node.js/Express, Joi, Mongoose; Chrome MV3 extension.

**Spec:** `docs/superpowers/specs/2026-11-21-etsy-tracking-center-command-design.md`

## Global Constraints

- Reuse Tracking Center list and agent context; do not alter Amazon tracking submission.
- `UPLOAD_TRACKING` accepts 1–200 rows with string order IDs and tracking numbers.
- Etsy is pushed only by the extension after it claims the command.
- No new dependency.

## Review Focus

- Offline Etsy agents must never expose an enabled queue action.
- A shipment confirmed on Etsy must not become selectable.
- `VIETTEL_POST` only falls back to USPS for `92`/`42` tracking prefixes.
- Non-Etsy agents must never claim an Etsy tracking batch.
- A malformed row must reject the complete request without creating a partial command.

---

### Task 1: Add the backend command contract

**Files:**

- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\integration\extensionCommand\constants\extensionCommand.constants.js`
- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\integration\extensionCommand\models\extensionCommand.model.js`
- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\integration\extensionCommand\validators\extensionCommand.validator.js`
- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\integration\extensionCommand\services\extensionCommand.service.js`
- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\integration\extensionCommand\repositories\extensionCommand.repository.js`
- Test: `C:\Users\stack\Task\lng-web-be\src\modules\integration\extensionCommand\__tests__\extensionCommand.validator.test.js`
- Test: `C:\Users\stack\Task\lng-web-be\src\modules\integration\extensionCommand\__tests__\extensionCommand.service.test.js`

**Interfaces:**

- Consumes: `CreateEtsyTrackingCommandInput` from Task 2.
- Produces: a claimed command with `type: 'UPLOAD_TRACKING'` and `items` preserved.

- [ ] Write failing validator/service/repository tests for a valid one-row Etsy batch, invalid row rejection, and Etsy claim filtering.
- [ ] Run the focused Jest tests; verify they fail because the command is unsupported or items are dropped.
- [ ] Add bounded `items` persistence, validation, Etsy authorization and claim filtering.
- [ ] Re-run focused Jest tests; verify they pass.

### Task 2: Add Tracking Center Etsy batch UI

**Files:**

- Modify: `src/features/portal/integrations/api/integrationApi.ts`
- Modify: `src/features/portal/extensions/pages/ExtensionTrackingPage.tsx`
- Create: `src/features/portal/extensions/components/EtsyTrackingCommandModal.tsx`
- Test: `src/test/portal/extensions/components/EtsyTrackingCommandModal.test.tsx`

**Interfaces:**

- Consumes: `createExtensionCommand({ type: 'UPLOAD_TRACKING', shopId, agentId, items })`.
- Produces: a queued command ID and invalid/ready row feedback.

- [ ] Write failing component tests for Etsy-only action visibility, carrier fallback and submit payload.
- [ ] Run the focused Vitest test; verify it fails before the modal exists.
- [ ] Add provider-aware command types/API input and the modal, using the selected Tracking Center shop and agent.
- [ ] Re-run the focused test; verify it passes.

### Task 3: Integrate and verify the command boundary

**Files:**

- Modify: backend and frontend tests from Tasks 1–2 as necessary.

- [ ] Add a provider DTO/API test asserting `items` round-trip through create and claim responses.
- [ ] Run backend extension-command tests, frontend affected tests and each repository's full test command.
- [ ] Verify an Etsy tracking command is queueable in the Portal and claimable by the extension without performing a live Etsy push.
