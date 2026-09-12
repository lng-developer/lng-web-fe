# Vendor Integration Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple operator-created Vendors from backend-native provider adapters through Manual, Generic API, and Native integration modes.

**Architecture:** Vendor remains a business record with no provider key. A single integration record per Vendor owns `mode`, optional `adapterKey`, endpoint, credentials, and connection status. Native adapter keys stay a backend enum; generic and manual modes do not add enum values.

**Tech Stack:** React 19, Ant Design, TanStack Query, React i18next, Node.js, Express, Mongoose, Joi, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-10-vendor-integration-modes-design.md`

## Global Constraints

- Use existing shared API client, i18n keys, feedback components, and TanStack Query invalidation.
- Do not add a dependency.
- Store credentials only in the existing encrypted backend fields; never return or log their plaintext values.
- Preserve existing Vendor assignments by backfilling before removing the legacy provider field.

---

### Task 1: Lock the frontend Vendor boundary

**Files:**

- Modify: `src/features/portal/vendors/pages/VendorEditorModal.tsx`
- Modify: `src/features/portal/vendors/api/vendorApi.ts`
- Modify: `src/test/portal/vendors/pages/VendorEditors.test.tsx`

**Interfaces:**

- Consumes: existing `createVendor(input)` and `updateVendor(vendorId, input)` API helpers.
- Produces: Vendor create and update requests without `providerKey`.

- [ ] **Step 1: Write the failing test**

Add an edit fixture with `providerKey: 'PRINTWAY'`, submit a name change, then assert the `updateVendor` payload does not have a `providerKey` property.

```ts
const payload = vi.mocked(updateVendor).mock.calls[0][1]
expect(payload).not.toHaveProperty('providerKey')
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project ui src/test/portal/vendors/pages/VendorEditors.test.tsx --testNamePattern="integration configuration"`

Expected: FAIL because the current editor includes `providerKey` in its update payload.

- [ ] **Step 3: Implement the minimum UI boundary**

Remove the provider Select and its option list from `VendorEditorModal`. On creation pass `providerKey: null` only until the backend contract removes the property; on edit explicitly omit it from the update payload. Keep fulfilment type, surcharge, and status unchanged.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npx vitest run --project ui src/test/portal/vendors/pages/VendorEditors.test.tsx --testNamePattern="integration configuration|unconfigured provider"`

Expected: both tests pass.

### Task 2: Add mode-aware integration contract in the backend

**Files:**

- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\vendor\constants\vendor.constants.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\vendor\models\vendor.model.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\vendor\models\vendorIntegrationConfig.model.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\vendor\validators\vendor.validator.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\vendor\dtos\vendor.dto.js`
- Test: `C:\lng_system\lng-web\lng-web-be\src\modules\vendor\__tests__\vendor.integration.test.js`

**Interfaces:**

- Consumes: `mode: 'MANUAL' | 'GENERIC_API' | 'NATIVE'` and optional `adapterKey` in integration create/update input.
- Produces: integration DTOs with `mode`, optional `adapterKey`, and redacted credentials.

- [ ] **Step 1: Write failing validation tests**

Cover three inputs: `MANUAL` without endpoint/credentials is valid; `NATIVE` without a valid `adapterKey` is invalid; `GENERIC_API` without its required HTTPS endpoint is invalid.

- [ ] **Step 2: Run the validation tests to verify they fail**

Run: `npm test -- vendor.integration.test.js`

Expected: FAIL because the current contract requires `providerKey` for every integration.

- [ ] **Step 3: Implement the mode contract**

Add `vendorIntegrationModes`. Replace integration `providerKey` validation/persistence with required `mode` and optional `adapterKey`; validate `adapterKey` against native provider keys only for `NATIVE`. Remove provider key from Vendor create/update schema and model.

- [ ] **Step 4: Run tests to verify the new contract**

Run: `npm test -- vendor.integration.test.js`

Expected: all mode-validation tests pass.

### Task 3: Migrate active vendor integrations safely

**Files:**

- Create: `C:\lng_system\lng-web\lng-web-be\src\modules\vendor\scripts\migrateVendorProviderKeysToIntegrations.js`
- Test: `C:\lng_system\lng-web\lng-web-be\src\modules\vendor\__tests__\vendor.integrationMigration.test.js`

**Interfaces:**

- Consumes: legacy `Vendor.providerKey` and existing `VendorIntegrationConfig` records.
- Produces: one `NATIVE` integration with matching `adapterKey` per legacy provider assignment, with no overwrite of an existing integration.

- [ ] **Step 1: Write a failing migration test**

Seed a vendor with `providerKey: 'PRINTWAY'` and no integration. Assert the dry run returns one planned `NATIVE` integration with `adapterKey: 'PRINTWAY'`. Seed an existing integration and assert it is skipped.

- [ ] **Step 2: Run it to verify RED**

Run: `npm test -- vendor.integrationMigration.test.js`

Expected: FAIL because no migration script exists.

- [ ] **Step 3: Implement a dry-run-first script**

Query legacy providers, create integration records only after an explicit non-dry-run flag, and report created/skipped/error counts. Never delete legacy data in this script.

- [ ] **Step 4: Run migration tests to verify GREEN**

Run: `npm test -- vendor.integrationMigration.test.js`

Expected: all backfill and skip assertions pass.

### Task 4: Render integration modes in the frontend

**Files:**

- Modify: `src/features/portal/vendors/api/vendorApi.ts`
- Modify: `src/features/portal/vendors/pages/VendorIntegrationModal.tsx`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`
- Test: `src/test/portal/vendors/pages/VendorIntegrationModal.test.tsx`

**Interfaces:**

- Consumes: `VendorIntegrationConfigInput` with `mode`, optional `adapterKey`, endpoint, auth, and credentials.
- Produces: mode-specific form values; native-only adapter selection.

- [ ] **Step 1: Write failing modal tests**

Assert `MANUAL` hides endpoint and credential inputs, `GENERIC_API` shows endpoint/auth inputs without native adapter options, and `NATIVE` requires an adapter key.

- [ ] **Step 2: Run the tests to verify RED**

Run: `npx vitest run --project ui src/test/portal/vendors/pages/VendorIntegrationModal.test.tsx`

Expected: FAIL because the current modal always requires a provider key and endpoint.

- [ ] **Step 3: Implement the smallest mode selector**

Add a translated mode Select. Render no connection fields for Manual; render endpoint and generic auth fields for Generic API; render the existing provider dropdown renamed to Native adapter for Native. Preserve encrypted secret handling and existing feedback behavior.

- [ ] **Step 4: Run the mode tests to verify GREEN**

Run: `npx vitest run --project ui src/test/portal/vendors/pages/VendorIntegrationModal.test.tsx`

Expected: all Manual, Generic API, and Native form assertions pass.

### Task 5: Guard fulfilment routing and verify delivery

**Files:**

- Modify: backend fulfilment submission service identified by provider-routing search.
- Test: backend fulfilment routing test adjacent to that service.
- Test: `src/test/portal/vendors/pages/VendorEditors.test.tsx`
- Test: `src/test/portal/vendors/pages/VendorIntegrationModal.test.tsx`

**Interfaces:**

- Consumes: an optional integration config for the selected vendor product.
- Produces: manual-queue handling for Manual/absent integrations, generic submission only for a valid Generic API contract, and adapter dispatch only for connected Native integrations.

- [ ] **Step 1: Locate the real provider-routing service and add failing routing tests**

Search backend source with `rg -n "providerKey|findIntegrationConfigByProvider|getVendorIntegrationCredential" src`. Add tests that reject automatic native dispatch without a connected Native integration and that do not select an adapter for Manual.

- [ ] **Step 2: Run the focused routing tests to verify RED**

Run the exact test command for the located routing test file.

Expected: FAIL because legacy code reads provider assignment from Vendor rather than integration mode.

- [ ] **Step 3: Implement guarded routing**

Resolve the Vendor integration first. Route only connected Native integrations to `adapterKey`; keep Manual in the existing operator-review path; reject unsupported Generic API contracts with a clear validation error.

- [ ] **Step 4: Run focused verification**

Run the focused frontend and backend tests, then run `npm run lint`, `npm run build`, and `git diff --check` from `C:\lng_system\lng-web\lng-web-fe`.

Expected: all checks exit with code 0, aside from documented pre-existing warnings.
