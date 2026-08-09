# Payroll Settings, Bulk Adjustments, and Payslip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist editable payroll settings, apply them at runtime, support bulk employee adjustments, and render complete historical payslips.

**Architecture:** Store one versioned MongoDB settings document and pass its immutable snapshot into each calculation instead of using module-load constants. Keep PayrollPage as orchestration while extracting settings, adjustment, and payslip components.

**Tech Stack:** Express 5, Mongoose 9, Joi 18, Jest 30, MongoMemoryServer, React 19, TypeScript 6, Ant Design 6, TanStack Query 5, Vitest 4.

## Global Constraints

- FINALIZED and PAID payroll records are immutable.
- New and rerun DRAFT/SHADOW calculations use the currently active settings.
- Store integer money and basis points; convert display values only at the frontend adapter boundary.
- Do not expose identity documents, address, bank details, or insurance identifiers on payslips.
- No new frontend dependency; all copy must be present in Vietnamese and English.
- Preserve unrelated staged changes in `lng-web-fe`.

---

### Task 1: Persist and update versioned payroll settings

**Files:**

- Create: `C:/Users/stack/Task/lng-web-be/src/modules/hr/models/payrollSettings.model.js`
- Create: `C:/Users/stack/Task/lng-web-be/src/modules/hr/repositories/payrollSettings.repository.js`
- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/services/payrollConfig.service.js`
- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/controllers/payroll.controller.js`
- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/validators/payroll.validator.js`
- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/routes/index.js`
- Test: `C:/Users/stack/Task/lng-web-be/src/test/hr/services/payrollConfig.service.test.js`
- Test: `C:/Users/stack/Task/lng-web-be/src/test/hr/routes/payroll.routes.test.js`

**Interfaces:**

- `getPayrollSettings(): Promise<PayrollSettingsDto>`.
- `updatePayrollSettings(payload, auth): Promise<PayrollSettingsDto>`.
- `PUT /api/hr/payroll-settings` body is the complete settings payload plus `expectedVersion`.

- [ ] **Step 1: Write persistence, validation, and stale-version tests**

```js
const current = await service.getPayrollSettings()
const updated = await service.updatePayrollSettings(
  {
    ...current,
    expectedVersion: current.version,
    workHoursPerDay: 7.5,
  },
  { accountId },
)
expect(updated).toMatchObject({ version: current.version + 1, workHoursPerDay: 7.5 })
await expect(
  service.updatePayrollSettings({ ...current, expectedVersion: current.version }, { accountId }),
).rejects.toMatchObject({ statusCode: 409 })
```

Route tests must prove READ cannot PUT and WRITE can PUT.

- [ ] **Step 2: Run the focused tests and confirm missing model/route failures**

Run: `npx jest src/test/hr/services/payrollConfig.service.test.js src/test/hr/routes/payroll.routes.test.js --runInBand`

- [ ] **Step 3: Implement the singleton model and CAS repository**

```js
const payrollSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'ACTIVE', unique: true, immutable: true },
    settings: { type: mongoose.Schema.Types.Mixed, required: true },
    version: { type: Number, default: 0, min: 0 },
    updatedByAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  },
  { timestamps: true, versionKey: false },
)
```

Use `findOneAndUpdate({ key: 'ACTIVE', version: expectedVersion }, { $set: ..., $inc: { version: 1 } })`. Return the existing defaults with `version: 0` when no document exists; the first PUT upserts only when `expectedVersion === 0`.

- [ ] **Step 4: Add complete Joi validation and the PUT route**

Validate company identity, enum uniqueness, non-negative basis points, finite integer money, and strictly increasing PIT thresholds. Route PUT through `requirePayrollWrite`.

- [ ] **Step 5: Run focused and architecture tests**

Run: `npx jest src/test/hr/services/payrollConfig.service.test.js src/test/hr/routes/payroll.routes.test.js src/test/architecture.contract.test.js --runInBand`

Expected: PASS.

- [ ] **Step 6: Commit settings persistence**

```powershell
git add src/modules/hr/models/payrollSettings.model.js src/modules/hr/repositories/payrollSettings.repository.js src/modules/hr/services/payrollConfig.service.js src/modules/hr/controllers/payroll.controller.js src/modules/hr/validators/payroll.validator.js src/modules/hr/routes/index.js src/test/hr/services/payrollConfig.service.test.js src/test/hr/routes/payroll.routes.test.js
git commit -m "feat(hr): persist payroll settings"
```

### Task 2: Apply settings per run and snapshot calculation inputs

**Files:**

- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/services/payrollCalculation.service.js`
- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/services/payroll.service.js`
- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/services/payrollAdjustment.service.js`
- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/dtos/payroll.dto.js`
- Test: `C:/Users/stack/Task/lng-web-be/src/test/hr/services/payrollCalculation.service.test.js`
- Test: `C:/Users/stack/Task/lng-web-be/src/test/hr/services/payroll.lifecycle.test.js`
- Test: `C:/Users/stack/Task/lng-web-be/src/test/hr/dtos/payroll.dto.test.js`

**Interfaces:**

- `calculatePayrollResult(inputs, settings)` accepts one explicit immutable settings object.
- `inputSnapshot.payrollSettings` contains the exact settings used.
- Adjustment service validates `type` and `code` against the active settings at request time.

- [ ] **Step 1: Write failing runtime-settings and history tests**

```js
const first = calculatePayrollResult(inputs, {
  ...defaults,
  insuranceRates: { social: 800, health: 150, unemployment: 100 },
})
const second = calculatePayrollResult(inputs, {
  ...defaults,
  insuranceRates: { social: 900, health: 150, unemployment: 100 },
})
expect(second.insurance.social).toBeGreaterThan(first.insurance.social)
expect(first.inputSnapshot.payrollSettings.insuranceRates.social).toBe(800)
```

Also prove a finalized result remains unchanged after settings update.

- [ ] **Step 2: Run focused tests and observe module-load constants failing the new expectation**

Run: `npx jest src/test/hr/services/payrollCalculation.service.test.js src/test/hr/services/payroll.lifecycle.test.js src/test/hr/dtos/payroll.dto.test.js --runInBand`

- [ ] **Step 3: Pass settings explicitly through calculation**

Remove calculation constants captured from `getPayrollSettings()` at module load. Destructure validated settings inside `calculatePayrollResult`, include a deep-frozen `payrollSettings` snapshot, and have payroll service load settings once per run before mapping profiles.

- [ ] **Step 4: Make DTO workday conversion snapshot-aware**

```js
const workUnitScale = result.inputSnapshot?.payrollSettings?.workUnitScale || DEFAULT_PAYROLL_SETTINGS.workUnitScale;
workDays: result.workUnits / workUnitScale,
```

- [ ] **Step 5: Validate adjustment enums in the service boundary**

Load active settings before create/update/bulk operations and reject values not present in `adjustmentTypes` or `adjustmentCodes`. Keep Joi structural validation synchronous.

- [ ] **Step 6: Run focused tests and commit**

Run: `npx jest src/test/hr/services/payrollCalculation.service.test.js src/test/hr/services/payroll.lifecycle.test.js src/test/hr/dtos/payroll.dto.test.js --runInBand`

```powershell
git add src/modules/hr/services/payrollCalculation.service.js src/modules/hr/services/payroll.service.js src/modules/hr/services/payrollAdjustment.service.js src/modules/hr/dtos/payroll.dto.js src/test/hr/services/payrollCalculation.service.test.js src/test/hr/services/payroll.lifecycle.test.js src/test/hr/dtos/payroll.dto.test.js
git commit -m "feat(hr): snapshot payroll calculation settings"
```

### Task 3: Add typed settings API and PayrollSettingsDrawer

**Files:**

- Modify: `C:/Users/stack/Task/lng-web-fe/src/features/hr/api/hrTimeApi.ts`
- Create: `C:/Users/stack/Task/lng-web-fe/src/features/hr/components/PayrollSettingsDrawer.tsx`
- Create: `C:/Users/stack/Task/lng-web-fe/src/features/hr/components/PayrollSettingsDrawer.module.scss`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/features/hr/pages/PayrollPage.tsx`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/shared/i18n/locales/en/common.json`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/shared/i18n/locales/vi/common.json`
- Test: `C:/Users/stack/Task/lng-web-fe/src/test/hr/api/hrTimeApi.test.ts`
- Create: `C:/Users/stack/Task/lng-web-fe/src/test/hr/pages/PayrollPage.test.tsx`

**Interfaces:**

- `PayrollSettings` has exact nested `company`, `otRateBasisPoints`, `insuranceRates`, and PIT tuple types plus `version`.
- `updatePayrollSettings(input: PayrollSettings & { expectedVersion: number })` sends PUT.

- [ ] **Step 1: Write failing API and page tests**

```ts
await updatePayrollSettings({ ...settings, expectedVersion: 2 })
expect(apiClient.put).toHaveBeenCalledWith(
  '/api/hr/payroll-settings',
  expect.objectContaining({ expectedVersion: 2 }),
)
```

Render the page with WRITE permission and assert Settings opens grouped company, OT, insurance, and tax fields.

- [ ] **Step 2: Run tests and confirm the current loose types/UI fail**

Run: `npm run test:unit -- src/test/hr/api/hrTimeApi.test.ts`

Run: `npm run test:ui -- src/test/hr/pages/PayrollPage.test.tsx`

- [ ] **Step 3: Implement typed adapters and grouped drawer**

Use Form.List for PIT brackets and tag-style Select for enums. Convert displayed percentages with `basisPoints / 100` and save with `Math.round(percent * 100)`. Keep server values in query state; do not copy them into Zustand.

- [ ] **Step 4: Handle optimistic conflicts**

On HTTP 409, keep the drawer open, invalidate `['hr-payroll', 'settings']`, and show the localized stale-version message.

- [ ] **Step 5: Run tests and commit**

Run: `npm run test:unit -- src/test/hr/api/hrTimeApi.test.ts`

Run: `npm run test:ui -- src/test/hr/pages/PayrollPage.test.tsx`

```powershell
git add src/features/hr/api/hrTimeApi.ts src/features/hr/components/PayrollSettingsDrawer.tsx src/features/hr/components/PayrollSettingsDrawer.module.scss src/features/hr/pages/PayrollPage.tsx src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/hr/api/hrTimeApi.test.ts src/test/hr/pages/PayrollPage.test.tsx
git commit --only -m "feat(hr): manage payroll settings" -- src/features/hr/api/hrTimeApi.ts src/features/hr/components/PayrollSettingsDrawer.tsx src/features/hr/components/PayrollSettingsDrawer.module.scss src/features/hr/pages/PayrollPage.tsx src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/hr/api/hrTimeApi.test.ts src/test/hr/pages/PayrollPage.test.tsx
```

### Task 4: Add bulk employee adjustment UI

**Files:**

- Create: `C:/Users/stack/Task/lng-web-fe/src/features/hr/components/PayrollAdjustmentModal.tsx`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/features/hr/pages/PayrollPage.tsx`
- Test: `C:/Users/stack/Task/lng-web-fe/src/test/hr/pages/PayrollPage.test.tsx`

**Interfaces:**

- Single employee uses `createPayrollAdjustment`.
- Multiple employees use `createBulkPayrollAdjustments({ profileIds, month, year, type, code, name, amount, note })` exactly once.

- [ ] **Step 1: Write a failing bulk submission test**

```tsx
await user.selectOptions(screen.getByLabelText(/employees/i), ['p1', 'p2'])
await user.click(screen.getByRole('button', { name: /save adjustment/i }))
expect(createBulkPayrollAdjustments).toHaveBeenCalledTimes(1)
expect(createBulkPayrollAdjustments).toHaveBeenCalledWith(
  expect.objectContaining({ profileIds: ['p1', 'p2'] }),
)
```

- [ ] **Step 2: Run the page test and confirm single-profile behavior fails it**

Run: `npm run test:ui -- src/test/hr/pages/PayrollPage.test.tsx`

- [ ] **Step 3: Implement searchable avatar options and one bulk mutation**

Use `EmployeeAvatar`, existing employee profile data, and settings-provided adjustment enums. Select-all applies only to currently filtered options. Display selected count before submit.

- [ ] **Step 4: Run the test and commit**

Run: `npm run test:ui -- src/test/hr/pages/PayrollPage.test.tsx`

```powershell
git add src/features/hr/components/PayrollAdjustmentModal.tsx src/features/hr/pages/PayrollPage.tsx src/test/hr/pages/PayrollPage.test.tsx
git commit --only -m "feat(hr): add bulk payroll adjustments" -- src/features/hr/components/PayrollAdjustmentModal.tsx src/features/hr/pages/PayrollPage.tsx src/test/hr/pages/PayrollPage.test.tsx
```

### Task 5: Render a complete snapshot-backed employee payslip

**Files:**

- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/dtos/payroll.dto.js`
- Modify: `C:/Users/stack/Task/lng-web-be/src/modules/hr/services/payroll.service.js`
- Test: `C:/Users/stack/Task/lng-web-be/src/test/hr/dtos/payroll.dto.test.js`
- Create: `C:/Users/stack/Task/lng-web-fe/src/features/hr/components/PayslipCard.tsx`
- Create: `C:/Users/stack/Task/lng-web-fe/src/features/hr/components/PayslipCard.module.scss`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/features/hr/api/hrTimeApi.ts`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/features/hr/pages/PayrollPage.tsx`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/shared/i18n/locales/en/common.json`
- Modify: `C:/Users/stack/Task/lng-web-fe/src/shared/i18n/locales/vi/common.json`
- Test: `C:/Users/stack/Task/lng-web-fe/src/test/hr/pages/PayrollPage.test.tsx`

**Interfaces:**

- Self payroll result returns payroll-relevant employee display fields and the full persisted calculation breakdown.
- `PayslipCard({ result })` renders snapshot company/currency/rates and current non-sensitive employee display data.

- [ ] **Step 1: Write failing backend DTO and frontend payslip tests**

Assert DTO includes `salaryFromWork`, breakdowns, `insurance`, `personalIncomeTax`, snapshot settings, job title, department/team names, employment type, start date, and avatar URL. Assert UI renders each earning/deduction and does not render sensitive identifiers.

- [ ] **Step 2: Run focused tests and confirm current FE casts/hard-coded labels fail**

Run: `npx jest src/test/hr/dtos/payroll.dto.test.js --runInBand`

Run: `npm run test:ui -- src/test/hr/pages/PayrollPage.test.tsx`

- [ ] **Step 3: Enrich only self-service payroll DTOs**

Use current HR profile and organization public APIs in `listMyPayrolls`; do not add sensitive fields to admin register DTOs. Preserve persisted financial fields as the source of truth.

- [ ] **Step 4: Replace inline payslip markup with PayslipCard**

Render company header, employee section, earnings, deductions, totals, status, finalized date, and paid date. Map breakdown objects/arrays; do not cast to `Record<string, number>` and do not hard-code insurance percentages.

- [ ] **Step 5: Run phase verification**

Run: `npx jest src/test/hr/services/payrollConfig.service.test.js src/test/hr/services/payrollCalculation.service.test.js src/test/hr/services/payroll.lifecycle.test.js src/test/hr/dtos/payroll.dto.test.js src/test/hr/routes/payroll.routes.test.js src/test/architecture.contract.test.js --runInBand`

Run: `npm run test:unit -- src/test/hr/api/hrTimeApi.test.ts`

Run: `npm run test:ui -- src/test/hr/pages/PayrollPage.test.tsx`

Run: `npm run lint`

Run: `npm run build`

- [ ] **Step 6: Commit backend and frontend payslip changes separately**

```powershell
# lng-web-be
git add src/modules/hr/dtos/payroll.dto.js src/modules/hr/services/payroll.service.js src/test/hr/dtos/payroll.dto.test.js
git commit -m "feat(hr): enrich employee payslips"

# lng-web-fe
git add src/features/hr/components/PayslipCard.tsx src/features/hr/components/PayslipCard.module.scss src/features/hr/api/hrTimeApi.ts src/features/hr/pages/PayrollPage.tsx src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/hr/pages/PayrollPage.test.tsx
git commit --only -m "feat(hr): render complete employee payslips" -- src/features/hr/components/PayslipCard.tsx src/features/hr/components/PayslipCard.module.scss src/features/hr/api/hrTimeApi.ts src/features/hr/pages/PayrollPage.tsx src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/hr/pages/PayrollPage.test.tsx
```
