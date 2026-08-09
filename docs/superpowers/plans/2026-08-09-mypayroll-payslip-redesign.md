# MyPayroll Payslip Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild MyPayroll as the approved responsive payslip and show employee avatars in the HR Payroll results table.

**Architecture:** Keep `PayrollResult` as the only data source and restyle the existing `PayslipStatement` rather than introducing a second payslip model. Use one co-located SCSS module for the document layout and reuse `EmployeeAvatar` in both MyPayroll and the HR results table.

**Tech Stack:** React, TypeScript, Ant Design, SCSS modules, i18next, Vitest, Testing Library.

## Global Constraints

- Add no frontend dependency.
- Do not recalculate payroll totals in the frontend.
- Render missing optional values as `—` and real numeric zero as zero.
- Keep Vietnamese and English locale keys aligned.
- Preserve unrelated staged and working-tree changes.

---

### Task 1: Responsive payslip document

**Files:**

- Modify: `src/features/hr/pages/PayslipStatement.tsx`
- Create: `src/features/hr/pages/PayslipStatement.module.scss`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`
- Test: `src/test/hr/pages/PayslipStatement.test.tsx`

**Interfaces:**

- Consumes: `PayrollResult`, `EmployeeAvatar`, `formatMoney(value: number): string`.
- Produces: `PayslipStatement({ result, periodLabel, formatMoney }): JSX.Element` with semantic employee, income, deduction, and totals sections.

- [ ] **Step 1: Extend the focused test with the approved visual information hierarchy**

Add assertions that the component renders the avatar URL/name, payroll period, employee metadata, overtime breakdown labels and amounts, allowance rows, all three insurance rows including zero, gross income, total deductions, net income, and `—` for missing optional values.

```tsx
expect(screen.getByTestId('payslip-employee')).toHaveTextContent('Nguyen An')
expect(screen.getByTestId('payslip-income')).toHaveTextContent('hrOperations.payroll.gross')
expect(screen.getByTestId('payslip-deductions')).toHaveTextContent('0')
expect(screen.getByTestId('payslip-net')).toHaveTextContent('19100000 VND')
expect(screen.getByText('—')).toBeInTheDocument()
```

- [ ] **Step 2: Run the test and verify the new structure fails**

Run: `npx vitest run src/test/hr/pages/PayslipStatement.test.tsx`

Expected: FAIL because the current component does not expose the approved sections and metadata structure.

- [ ] **Step 3: Implement the minimum document layout**

Replace the nested generic cards with one document surface containing:

```tsx
<article className={styles.payslip}>
  <header className={styles.header}>...</header>
  <section data-testid="payslip-employee" className={styles.employeePanel}>
    ...
  </section>
  <div className={styles.breakdown}>
    <section data-testid="payslip-income" className={styles.income}>
      ...
    </section>
    <section data-testid="payslip-deductions" className={styles.deductions}>
      ...
    </section>
  </div>
  <footer data-testid="payslip-net" className={styles.totals}>
    ...
  </footer>
</article>
```

Render `overtimeBreakdown` as nested rows using `rateClass`, approved minutes, and amount. Render allowances from `allowanceBreakdown`. Keep gross, deductions, and net values directly from `PayrollResult`; do not sum them again.

Use the SCSS module for a four-column metadata grid, two-column desktop breakdown, stacked mobile layout, green income accent, red deduction accent, paper surface, and dark-shell compatibility.

- [ ] **Step 4: Add matching locale labels**

Add the same keys under `hrOperations.payroll` in both locale files for employee code, department, team, job title, period, currency, income section, deduction section, totals, approved minutes, and optional company contacts.

- [ ] **Step 5: Run the focused test**

Run: `npx vitest run src/test/hr/pages/PayslipStatement.test.tsx`

Expected: PASS.

### Task 2: Employee avatar in HR Payroll results

**Files:**

- Modify: `src/features/hr/pages/PayrollPage.tsx`
- Create: `src/test/hr/pages/PayrollPage.source.test.ts`

**Interfaces:**

- Consumes: `PayrollResult.employee.avatarUrl`, `fullName`, `employeeCode`, and shared `EmployeeAvatar`.
- Produces: HR Payroll employee cells containing avatar, full name, and employee code with initials fallback handled by `EmployeeAvatar`.

- [ ] **Step 1: Write the failing source contract test**

```ts
const source = readFileSync('src/features/hr/pages/PayrollPage.tsx', 'utf8')
expect(source).toContain('EmployeeAvatar')
expect(source).toContain('avatarUrl={item.employee?.avatarUrl}')
expect(source).toContain('item.employee?.employeeCode')
```

- [ ] **Step 2: Run the source contract test and verify it fails**

Run: `npx vitest run src/test/hr/pages/PayrollPage.source.test.ts`

Expected: FAIL because the HR Payroll table currently renders only a text name/code fallback.

- [ ] **Step 3: Render the shared avatar and identity text in the employee column**

Import `EmployeeAvatar` from `@/shared/ui` and replace the employee column renderer with a compact flex row containing the avatar, full name, and employee code. Keep the existing `Me` fallback when both identity fields are absent.

- [ ] **Step 4: Run the source contract test**

Run: `npx vitest run src/test/hr/pages/PayrollPage.source.test.ts`

Expected: PASS.

### Task 3: Final verification

**Files:**

- Verify all files modified by Tasks 1–2.

**Interfaces:**

- Consumes: completed payslip and payroll employee cell.
- Produces: verified production-ready working-tree changes.

- [ ] **Step 1: Run focused lint**

Run: `npx eslint src/features/hr/pages/PayslipStatement.tsx src/features/hr/pages/PayrollPage.tsx src/test/hr/pages/PayslipStatement.test.tsx src/test/hr/pages/PayrollPage.source.test.ts`

Expected: exit 0.

- [ ] **Step 2: Run focused tests**

Run: `npx vitest run src/test/hr/pages/PayslipStatement.test.tsx src/test/hr/pages/PayrollPage.source.test.ts`

Expected: both files pass.

- [ ] **Step 3: Run typecheck and production build**

Run: `npm run typecheck && npm run build`

Expected: exit 0; Vite may retain the existing chunk-size warning.

- [ ] **Step 4: Check locale parity and whitespace**

Run the existing HR locale parity check for `hrOperations`, then run `git diff --check`.

Expected: no missing HR locale keys and no whitespace errors.
